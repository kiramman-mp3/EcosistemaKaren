const { NotFoundException, ValidationException, ForbiddenException } = require('../../domain/exceptions/DomainExceptions');
const { GeminiError, GeminiErrorType } = require('../../adapters/ai/GeminiAdapter');
const {
  buildPromotionCacheKey,
  assertPromotableLot
} = require('../../domain/policies/PromotionPolicy');
const metrics = require('../../infrastructure/metrics/AiMetricsCollector');

// ─── Metric helper (metrics failures must never fail the business workflow) ─
function safeMetric(fn) {
  try {
    fn();
  } catch (_) {
    // Ignore metric tracking failures
  }
}

const GENERATOR_ROLES = new Set(['BODEGUERO', 'PERCHERO', 'ADMIN']);

// ─────────────────────────────────────────────────────────────────────────────
// GenerarPromocionesIA Use Case
// ─────────────────────────────────────────────────────────────────────────────
class GenerarPromocionesIA {
  /**
   * @param {object} lotRepository
   * @param {object} promotionRepository
   * @param {object} geminiAdapter      - GeminiAdapter instance
   * @param {object} promotionCache     - PromotionCache instance
   * @param {object} productRepository  - to resolve precio_venta for cache key
   */
  constructor(lotRepository, promotionRepository, geminiAdapter, promotionCache, productRepository) {
    this.lotRepository = lotRepository;
    this.promotionRepository = promotionRepository;
    this.geminiAdapter = geminiAdapter;
    this.cache = promotionCache;
    this.productRepository = productRepository;
  }

  /**
   * @param {{ loteId: string }} input
   * @param {{ id: string, rol: string }} requestingUser  - authenticated user
   * @returns {Promise<object>}  saved promotion (PENDIENTE_APROBACION)
   */
  async execute(input, requestingUser) {
    const ucStart = Date.now();
    safeMetric(() => metrics.incRequest());
    try {
      return await this._execute(input || {}, requestingUser);
    } finally {
      safeMetric(() => metrics.recordUcLatency(Date.now() - ucStart));
    }
  }

  async _execute({ loteId }, requestingUser) {
    if (!requestingUser || !GENERATOR_ROLES.has(requestingUser.rol)) {
      throw new ForbiddenException('El usuario no puede generar promociones con IA.');
    }

    // ── 1. Input validation ──────────────────────────────────────────────
    if (!loteId) {
      throw new ValidationException('Debe proporcionar el loteId para generar la promoción.');
    }

    // ── 2. Load and verify lot ───────────────────────────────────────────
    const lot = await this.lotRepository.findById(loteId);
    if (!lot) {
      throw new NotFoundException(`El lote con ID '${loteId}' no existe.`);
    }

    const { diasParaVencer, nivelAlerta } = assertPromotableLot(lot);

    // ── 3. Resolve product price for cache key ───────────────────────────
    const product = await this.productRepository.findById(lot.productoId);
    if (!product) {
      throw new NotFoundException(`El producto del lote '${lot.numeroLote}' no existe.`);
    }
    const precioVenta = product.precioVenta;

    // ── 4. Build cache key ───────────────────────────────────────────────
    const cacheKey = buildPromotionCacheKey({
      loteId: lot.id,
      fechaCaducidad: lot.fechaCaducidad,
      cantidadDisponible: lot.cantidadDisponible,
      precioVenta,
      promptVersion: this.geminiAdapter.promptVersion,
      modelName: this.geminiAdapter.modelName,
    });

    // ── 5. Call Gemini (with cache + anti-stampede) ──────────────────────
    let generatedData;
    let cacheHit;

    try {
      const cacheResult = await this.cache.getOrGenerate(cacheKey, async () => {
        safeMetric(() => metrics.incCacheMiss());
        const geminiStart = Date.now();
        try {
          const data = await this.geminiAdapter.generarEstrategiaPromocional({
            loteId: lot.id,
            numeroLote: lot.numeroLote,
            productoNombre: lot.productoNombre || product.nombre,
            diasParaVencer,
            cantidadDisponible: lot.cantidadDisponible,
            ubicacion: lot.ubicacion,
            nivelAlerta,
          });
          safeMetric(() => metrics.incSuccess());
          return data;
        } finally {
          safeMetric(() => metrics.recordGeminiLatency(Date.now() - geminiStart));
        }
      });

      generatedData = cacheResult.result;
      cacheHit = cacheResult.cacheHit;

      if (cacheHit) {
        safeMetric(() => metrics.incCacheHit());
      }

    } catch (err) {
      if (err instanceof GeminiError) {
        safeMetric(() => {
          switch (err.type) {
            case GeminiErrorType.CONFIG:           metrics.incError('CONFIG'); break;
            case GeminiErrorType.TIMEOUT:          metrics.incTimeout(); metrics.incError('TIMEOUT'); break;
            case GeminiErrorType.RATE_LIMIT:       metrics.incError('RATE_LIMIT'); break;
            case GeminiErrorType.INVALID_RESPONSE: metrics.incError('INVALID_RESPONSE'); break;
            default:                               metrics.incError('EXTERNAL');
          }
        });
      } else {
        safeMetric(() => metrics.incError('EXTERNAL'));
      }
      throw err; // re-throw; controller maps to HTTP codes
    }

    // ── 5.1 Enforce domain discount rules for alert level ────────────────
    const [minDesc, maxDesc] = nivelAlerta === 'ROJO' ? [20, 50] : [5, 30];
    const pct = Number(generatedData.descuentoPorcentaje);
    if (!Number.isInteger(pct) || pct < minDesc || pct > maxDesc) {
      throw new GeminiError(
        `El porcentaje de descuento (${pct}%) está fuera del rango permitido para ${nivelAlerta} (${minDesc}–${maxDesc}%).`,
        GeminiErrorType.INVALID_RESPONSE,
      );
    }

    // ── 6. Persist as PENDIENTE_APROBACION (never publish directly) ───────
    const promotion = await this.promotionRepository.savePending({
      loteId: lot.id,
      descuentoPorcentaje: pct,
      frasePromocional: generatedData.frasePromocional,
      razonIa: generatedData.razonIa,
      modeloIa: this.geminiAdapter.modelName,
      promptVersion: this.geminiAdapter.promptVersion,
      cacheKey,
      cacheHit,
    });

    if (!promotion._isDuplicate) {
      safeMetric(() => metrics.incPromotionPending());
    }
    return promotion;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GetPromotions Use Case  (public — approved only)
// ─────────────────────────────────────────────────────────────────────────────
class GetPromotions {
  constructor(promotionRepository) {
    this.promotionRepository = promotionRepository;
  }

  async execute() {
    return this.promotionRepository.findAllApproved();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GetPendingPromotions Use Case  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────
class GetPendingPromotions {
  constructor(promotionRepository) {
    this.promotionRepository = promotionRepository;
  }

  async execute() {
    return this.promotionRepository.findAllPending();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ApprovePromotion Use Case  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────
class ApprovePromotion {
  constructor(promotionRepository) {
    this.promotionRepository = promotionRepository;
  }

  /**
   * @param {{ promotionId: string }} input
   * @param {{ id: string, rol: string }} adminUser
   */
  async execute({ promotionId }, adminUser) {
    if (!adminUser || adminUser.rol !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede aprobar promociones.');
    }
    if (!promotionId) {
      throw new ValidationException('Debe proporcionar el promotionId.');
    }

    const promo = await this.promotionRepository.findById(promotionId);
    if (!promo) {
      throw new NotFoundException(`La promoción con ID '${promotionId}' no existe.`);
    }

    if (promo.estado !== 'PENDIENTE_APROBACION') {
      throw new ValidationException(
        `No se puede aprobar una promoción en estado '${promo.estado}'. Solo se pueden aprobar borradores en PENDIENTE_APROBACION.`
      );
    }

    const approved = await this.promotionRepository.approve(promotionId, adminUser.id);
    safeMetric(() => metrics.incPromotionApproved());
    return approved;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RejectPromotion Use Case  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────
class RejectPromotion {
  constructor(promotionRepository) {
    this.promotionRepository = promotionRepository;
  }

  /**
   * @param {{ promotionId: string, motivoRechazo: string }} input
   * @param {{ id: string, rol: string }} adminUser
   */
  async execute({ promotionId, motivoRechazo }, adminUser) {
    if (!adminUser || adminUser.rol !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede rechazar promociones.');
    }
    if (!promotionId) {
      throw new ValidationException('Debe proporcionar el promotionId.');
    }
    if (!motivoRechazo || !motivoRechazo.trim()) {
      throw new ValidationException('Debe proporcionar un motivoRechazo para rechazar la promoción.');
    }
    if (motivoRechazo.trim().length > 500) {
      throw new ValidationException('El motivoRechazo no puede superar los 500 caracteres.');
    }

    const promo = await this.promotionRepository.findById(promotionId);
    if (!promo) {
      throw new NotFoundException(`La promoción con ID '${promotionId}' no existe.`);
    }

    if (promo.estado !== 'PENDIENTE_APROBACION') {
      throw new ValidationException(
        `No se puede rechazar una promoción en estado '${promo.estado}'. Solo borradores PENDIENTE_APROBACION.`
      );
    }

    const rejected = await this.promotionRepository.reject(promotionId, adminUser.id, motivoRechazo.trim());
    safeMetric(() => metrics.incPromotionRejected());
    return rejected;
  }
}

module.exports = {
  GenerarPromocionesIA,
  GetPromotions,
  GetPendingPromotions,
  ApprovePromotion,
  RejectPromotion,
};
