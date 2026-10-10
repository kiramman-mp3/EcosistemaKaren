const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config();

const GeminiAdapter = require('../src/adapters/ai/GeminiAdapter');
const { GeminiError, GeminiErrorType } = require('../src/adapters/ai/GeminiAdapter');
const PromotionCache = require('../src/infrastructure/cache/PromotionCache');
const metrics = require('../src/infrastructure/metrics/AiMetricsCollector');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const {
  GenerarPromocionesIA,
  GetPromotions,
  GetPendingPromotions,
  ApprovePromotion,
  RejectPromotion,
} = require('../src/use-cases/promotions/PromotionUseCases');
const Lot = require('../src/domain/entities/Lot');
const Promotion = require('../src/domain/entities/Promotion');
const { getPool } = require('../src/infrastructure/db/postgres');
const { PostgresPromotionRepository } = require('../src/adapters/repositories/PostgresRepositories');
const { buildPromotionCacheKey } = require('../src/domain/policies/PromotionPolicy');

// ── Mock Gemini Adapter for controlled use case tests ────────────────────────
class MockGeminiAdapter {
  constructor({
    returnData = { descuentoPorcentaje: 25, frasePromocional: '¡25% de Descuento Especial!', razonIa: 'Rotación por cercanía a fecha límite.' },
    shouldTimeout = false,
    shouldRateLimit = false,
    shouldInvalidJson = false,
    delayMs = 0,
  } = {}) {
    this.returnData = returnData;
    this.shouldTimeout = shouldTimeout;
    this.shouldRateLimit = shouldRateLimit;
    this.shouldInvalidJson = shouldInvalidJson;
    this.delayMs = delayMs;
    this.callCount = 0;
    this._promptVersion = 'v3';
    this._modelName = 'gemini-3.8-flash';
  }

  get promptVersion() { return this._promptVersion; }
  get modelName() { return this._modelName; }

  async generarEstrategiaPromocional(params) {
    this.callCount++;
    if (this.delayMs > 0) {
      await new Promise(r => setTimeout(r, this.delayMs));
    }
    if (this.shouldTimeout) {
      throw new GeminiError('Timeout de Gemini excedido.', GeminiErrorType.TIMEOUT);
    }
    if (this.shouldRateLimit) {
      throw new GeminiError('Cuota excedida 429.', GeminiErrorType.RATE_LIMIT);
    }
    if (this.shouldInvalidJson) {
      throw new GeminiError('Markdown no permitido o JSON inválido.', GeminiErrorType.INVALID_RESPONSE);
    }
    return this.returnData;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Respuesta estructurada válida
// ─────────────────────────────────────────────────────────────────────────────
test('1. GeminiAdapter: parsea respuesta JSON estructurada válida', () => {
  const adapter = new GeminiAdapter('mock-key');
  const validJson = JSON.stringify({
    descuentoPorcentaje: 30,
    frasePromocional: '¡Oferta Relámpago! Aprovecha 30% en lácteos.',
    razonIa: 'Lote próximo a caducar en 4 días, se requiere rotación rápida.'
  });

  const parsed = adapter._parseAndValidate(validJson, 20, 50);
  assert.equal(parsed.descuentoPorcentaje, 30);
  assert.equal(parsed.frasePromocional, '¡Oferta Relámpago! Aprovecha 30% en lácteos.');
  assert.equal(parsed.razonIa, 'Lote próximo a caducar en 4 días, se requiere rotación rápida.');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. JSON inválido, markdown y fuera del esquema rechazados con INVALID_RESPONSE
// ─────────────────────────────────────────────────────────────────────────────
test('2. GeminiAdapter: rechaza Markdown, bloques ``` y salidas fuera del esquema', () => {
  const adapter = new GeminiAdapter('mock-key');

  // Caso: bloque markdown ```json
  const markdownFenced = '```json\n{"descuentoPorcentaje": 25, "frasePromocional": "Test", "razonIa": "Razón"}\n```';
  assert.throws(
    () => adapter._parseAndValidate(markdownFenced, 20, 50),
    err => err.type === GeminiErrorType.INVALID_RESPONSE
  );

  // Caso: no es JSON
  assert.throws(
    () => adapter._parseAndValidate('No soy un JSON', 20, 50),
    err => err.type === GeminiErrorType.INVALID_RESPONSE
  );

  // Caso: descuento fuera de rango (ej. 60% cuando el max es 50%)
  const outOfRange = JSON.stringify({
    descuentoPorcentaje: 60,
    frasePromocional: 'Descuento alto',
    razonIa: 'Razón válida'
  });
  assert.throws(
    () => adapter._parseAndValidate(outOfRange, 20, 50),
    err => err.type === GeminiErrorType.INVALID_RESPONSE
  );

  // Caso: frasePromocional vacía
  const emptyPhrase = JSON.stringify({
    descuentoPorcentaje: 30,
    frasePromocional: '   ',
    razonIa: 'Razón válida'
  });
  assert.throws(
    () => adapter._parseAndValidate(emptyPhrase, 20, 50),
    err => err.type === GeminiErrorType.INVALID_RESPONSE
  );

  // Caso: frase mayor a 180 caracteres
  const longPhrase = JSON.stringify({
    descuentoPorcentaje: 30,
    frasePromocional: 'A'.repeat(181),
    razonIa: 'Razón válida'
  });
  assert.throws(
    () => adapter._parseAndValidate(longPhrase, 20, 50),
    err => err.type === GeminiErrorType.INVALID_RESPONSE
  );

  const extraField = JSON.stringify({
    descuentoPorcentaje: 30,
    frasePromocional: 'Oferta válida',
    razonIa: 'Razón válida',
    estado: 'APROBADA'
  });
  assert.throws(
    () => adapter._parseAndValidate(extraField, 20, 50),
    err => err.type === GeminiErrorType.INVALID_RESPONSE
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Timeout y cancelación
// ─────────────────────────────────────────────────────────────────────────────
test('3. GeminiAdapter: cancela la petición y lanza TIMEOUT al superar GEMINI_TIMEOUT_MS', async () => {
  // Inicializa con timeout de 30ms y modelo falso que tarda más
  const mockClient = { models: {
    generateContent: ({ config }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text: '{}' }), 500);
        if (config.abortSignal) {
          config.abortSignal.addEventListener('abort', () => {
            clearTimeout(timer);
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }
      });
    }
  } };
  const adapter = new GeminiAdapter('mock-api-key', { timeoutMs: 30, client: mockClient });

  await assert.rejects(
    () => adapter.generarEstrategiaPromocional({
      loteId: 'lote-1',
      numeroLote: 'LOT-01',
      productoNombre: 'Yogurt',
      diasParaVencer: 3,
      cantidadDisponible: 10,
      ubicacion: 'PERCHA',
      nivelAlerta: 'ROJO'
    }),
    err => err instanceof GeminiError && err.type === GeminiErrorType.TIMEOUT
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Error 429 de cuota o rate limit
// ─────────────────────────────────────────────────────────────────────────────
test('4. GeminiAdapter: mapea error 429 o quota a RATE_LIMIT', async () => {
  const adapter = new GeminiAdapter('mock-api-key', { client: { models: {
    generateContent: () => Promise.reject(new Error('Resource has been exhausted (e.g. check quota) 429'))
  } } });

  await assert.rejects(
    () => adapter.generarEstrategiaPromocional({
      loteId: 'lote-1',
      numeroLote: 'LOT-01',
      productoNombre: 'Yogurt',
      diasParaVencer: 3,
      cantidadDisponible: 10,
      ubicacion: 'PERCHA',
      nivelAlerta: 'ROJO'
    }),
    err => err instanceof GeminiError && err.type === GeminiErrorType.RATE_LIMIT
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Ausencia de GEMINI_API_KEY lanza CONFIG sin devolver datos falsos
// ─────────────────────────────────────────────────────────────────────────────
test('5. GeminiAdapter: lanza CONFIG controlado si GEMINI_API_KEY no existe y no genera mock', async () => {
  const adapter = new GeminiAdapter('');

  await assert.rejects(
    () => adapter.generarEstrategiaPromocional({
      loteId: 'lote-1',
      numeroLote: 'LOT-01',
      productoNombre: 'Yogurt',
      diasParaVencer: 3,
      cantidadDisponible: 10,
      ubicacion: 'PERCHA',
      nivelAlerta: 'ROJO'
    }),
    err => err instanceof GeminiError && err.type === GeminiErrorType.CONFIG
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cache hit y cache miss
// ─────────────────────────────────────────────────────────────────────────────
test('6. PromotionCache: registra cache miss en la primera consulta y cache hit en la segunda', async () => {
  const cache = new PromotionCache(60);
  let generatorCalls = 0;
  const expensiveGenerator = async () => {
    generatorCalls++;
    return { descuentoPorcentaje: 25, frasePromocional: 'Oferta 25%', razonIa: 'Motivo' };
  };

  const first = await cache.getOrGenerate('test-key-1', expensiveGenerator);
  assert.equal(first.cacheHit, false);
  assert.equal(generatorCalls, 1);

  const second = await cache.getOrGenerate('test-key-1', expensiveGenerator);
  assert.equal(second.cacheHit, true);
  assert.equal(generatorCalls, 1); // No volvió a llamar al generador
  assert.equal(second.result.descuentoPorcentaje, 25);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Invalidación cuando cambia el lote
// ─────────────────────────────────────────────────────────────────────────────
test('7. Use Case: genera claves distintas e invalida caché si cambia cantidad o caducidad', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 30;
  // 4 días para vencer -> alerta ROJO
  lot.fechaCaducidad = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

  const mockAi = new MockGeminiAdapter({
    returnData: { descuentoPorcentaje: 30, frasePromocional: 'Promo Inicial', razonIa: 'Razón' }
  });
  const cache = new PromotionCache(60);
  const uc = new GenerarPromocionesIA(memory.lotRepository, memory.promotionRepository, mockAi, cache, memory.productRepository);

  const promo1 = await uc.execute({ loteId: lot.id }, { id: 'user-1', rol: 'BODEGUERO' });
  assert.equal(promo1.cacheHit, false);
  assert.equal(mockAi.callCount, 1);

  // Segunda llamada idéntica -> Cache hit
  const promo2 = await uc.execute({ loteId: lot.id }, { id: 'user-1', rol: 'BODEGUERO' });
  assert.equal(promo2.cacheHit, true);
  assert.equal(mockAi.callCount, 1);

  // Cambiamos la cantidad disponible del lote (evento de venta o ajuste)
  lot.cantidadDisponible = 15;
  const promo3 = await uc.execute({ loteId: lot.id }, { id: 'user-1', rol: 'BODEGUERO' });
  assert.equal(promo3.cacheHit, false); // Nueva clave -> no usa caché obsoleta
  assert.equal(mockAi.callCount, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Dos solicitudes concurrentes para la misma clave (anti-stampede + no duplicados)
// ─────────────────────────────────────────────────────────────────────────────
test('8. Anti-stampede: dos llamadas concurrentes con la misma clave comparten generación', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 20;
  lot.fechaCaducidad = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const mockAi = new MockGeminiAdapter({
    returnData: { descuentoPorcentaje: 35, frasePromocional: 'Promo Concurrente', razonIa: 'Anti-stampede' },
    delayMs: 50 // Simula tiempo de red
  });
  const cache = new PromotionCache(60);
  const uc = new GenerarPromocionesIA(memory.lotRepository, memory.promotionRepository, mockAi, cache, memory.productRepository);

  // Lanzar dos solicitudes concurrentes
  const [res1, res2] = await Promise.all([
    uc.execute({ loteId: lot.id }, { id: 'user-1', rol: 'BODEGUERO' }),
    uc.execute({ loteId: lot.id }, { id: 'user-2', rol: 'PERCHERO' }),
  ]);

  // Gemini sólo se invocó 1 vez gracias a anti-stampede
  assert.equal(mockAi.callCount, 1);
  assert.equal(res1.descuentoPorcentaje, 35);
  assert.equal(res2.descuentoPorcentaje, 35);

  // En el repositorio no se crearon dos borradores duplicados
  const pending = await memory.promotionRepository.findAllPending();
  assert.equal(pending.filter(p => p.loteId === lot.id).length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Rechazo de lote vencido, sin stock o normal (>14 días)
// ─────────────────────────────────────────────────────────────────────────────
test('9. Use Case: rechaza lotes vencidos, agotados, sin stock o fuera de alerta ROJO/AMARILLO', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  const mockAi = new MockGeminiAdapter();
  const cache = new PromotionCache(60);
  const uc = new GenerarPromocionesIA(memory.lotRepository, memory.promotionRepository, mockAi, cache, memory.productRepository);

  // Lote vencido
  lot.estado = 'ACTIVO';
  lot.fechaCaducidad = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await assert.rejects(
    () => uc.execute({ loteId: lot.id }, { id: 'u1', rol: 'ADMIN' }),
    err => err.message.includes('vencido')
  );

  // Lote sin stock disponible
  lot.fechaCaducidad = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  lot.cantidadDisponible = 0;
  await assert.rejects(
    () => uc.execute({ loteId: lot.id }, { id: 'u1', rol: 'ADMIN' }),
    err => err.message.includes('no tiene unidades disponibles')
  );

  // Lote en estado MERMA
  lot.cantidadDisponible = 10;
  lot.estado = 'MERMA';
  await assert.rejects(
    () => uc.execute({ loteId: lot.id }, { id: 'u1', rol: 'ADMIN' }),
    err => err.message.includes('MERMA')
  );

  // Lote con caducidad NORMAL (ej. 25 días)
  lot.estado = 'ACTIVO';
  lot.fechaCaducidad = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
  await assert.rejects(
    () => uc.execute({ loteId: lot.id }, { id: 'u1', rol: 'ADMIN' }),
    err => err.message.includes('Solo se permiten promociones IA para lotes ROJO')
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Generación en estado PENDIENTE_APROBACION
// ─────────────────────────────────────────────────────────────────────────────
test('10. Generación inicial crea la promoción como PENDIENTE_APROBACION e inactiva', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 15;
  lot.fechaCaducidad = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // ROJO

  const mockAi = new MockGeminiAdapter({
    returnData: { descuentoPorcentaje: 25, frasePromocional: 'Frase ROJO', razonIa: 'Razón' }
  });
  const uc = new GenerarPromocionesIA(memory.lotRepository, memory.promotionRepository, mockAi, new PromotionCache(60), memory.productRepository);

  const promo = await uc.execute({ loteId: lot.id }, { id: 'user-bode', rol: 'BODEGUERO' });
  assert.equal(promo.estado, 'PENDIENTE_APROBACION');
  assert.equal(promo.activa, false);
  assert.equal(promo.isPending(), true);
  assert.equal(promo.isApproved(), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Aprobación y Rechazo por ADMIN
// ─────────────────────────────────────────────────────────────────────────────
test('11. Flujo de aprobación por ADMIN activa la promoción y registra auditoría', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 15;
  lot.fechaCaducidad = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const mockAi = new MockGeminiAdapter();
  const ucGen = new GenerarPromocionesIA(memory.lotRepository, memory.promotionRepository, mockAi, new PromotionCache(60), memory.productRepository);
  const promoDraft = await ucGen.execute({ loteId: lot.id }, { id: 'user-bode', rol: 'BODEGUERO' });

  const adminUser = { id: 'admin-uuid-123', rol: 'ADMIN' };
  const ucApprove = new ApprovePromotion(memory.promotionRepository);

  const approved = await ucApprove.execute({ promotionId: promoDraft.id }, adminUser);
  assert.equal(approved.estado, 'APROBADA');
  assert.equal(approved.activa, true);
  assert.equal(approved.aprobadaPor, adminUser.id);
  assert.ok(approved.aprobadaAt);
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Rechazo con motivo
// ─────────────────────────────────────────────────────────────────────────────
test('12. Rechazo por ADMIN exige motivo, cambia a RECHAZADA y permanece inactiva', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 15;
  lot.fechaCaducidad = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000); // AMARILLO

  const mockAi = new MockGeminiAdapter({
    returnData: { descuentoPorcentaje: 15, frasePromocional: 'Frase AMARILLO', razonIa: 'Razón' }
  });
  const ucGen = new GenerarPromocionesIA(memory.lotRepository, memory.promotionRepository, mockAi, new PromotionCache(60), memory.productRepository);
  const promoDraft = await ucGen.execute({ loteId: lot.id }, { id: 'user-bode', rol: 'BODEGUERO' });

  const adminUser = { id: 'admin-uuid-123', rol: 'ADMIN' };
  const ucReject = new RejectPromotion(memory.promotionRepository);

  // Exige motivo no vacío
  await assert.rejects(
    () => ucReject.execute({ promotionId: promoDraft.id, motivoRechazo: '' }, adminUser),
    err => err.message.includes('motivoRechazo')
  );

  const rejected = await ucReject.execute({ promotionId: promoDraft.id, motivoRechazo: 'Margen insuficiente' }, adminUser);
  assert.equal(rejected.estado, 'RECHAZADA');
  assert.equal(rejected.activa, false);
  assert.equal(rejected.rechazadaPor, adminUser.id);
  assert.equal(rejected.motivoRechazo, 'Margen insuficiente');
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Imposibilidad de aprobar o rechazar dos veces
// ─────────────────────────────────────────────────────────────────────────────
test('13. No se puede aprobar o rechazar dos veces una misma promoción', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 15;
  lot.fechaCaducidad = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const mockAi = new MockGeminiAdapter();
  const ucGen = new GenerarPromocionesIA(memory.lotRepository, memory.promotionRepository, mockAi, new PromotionCache(60), memory.productRepository);
  const promoDraft = await ucGen.execute({ loteId: lot.id }, { id: 'u1', rol: 'BODEGUERO' });

  const ucApprove = new ApprovePromotion(memory.promotionRepository);
  const admin = { id: 'admin-1', rol: 'ADMIN' };

  await ucApprove.execute({ promotionId: promoDraft.id }, admin);

  // Segundo intento de aprobar debe fallar
  await assert.rejects(
    () => ucApprove.execute({ promotionId: promoDraft.id }, admin),
    err => err.message.includes('No se puede aprobar')
  );

  // Intento de rechazar una ya aprobada debe fallar
  const ucReject = new RejectPromotion(memory.promotionRepository);
  await assert.rejects(
    () => ucReject.execute({ promotionId: promoDraft.id, motivoRechazo: 'Cambio de opinión' }, admin),
    err => err.message.includes('No se puede rechazar')
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Promociones pendientes o rechazadas no aparecen en GET /promotions
// ─────────────────────────────────────────────────────────────────────────────
test('14. GET /promotions sólo retorna promociones APROBADAS y activas', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 15;
  lot.fechaCaducidad = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const mockAi = new MockGeminiAdapter();
  const ucGen = new GenerarPromocionesIA(memory.lotRepository, memory.promotionRepository, mockAi, new PromotionCache(60), memory.productRepository);
  const draft1 = await ucGen.execute({ loteId: lot.id }, { id: 'u1', rol: 'BODEGUERO' });

  const getPublicPromos = new GetPromotions(memory.promotionRepository);

  // Mientras sea PENDIENTE_APROBACION, no aparece en el catálogo público
  let publicList = await getPublicPromos.execute();
  assert.equal(publicList.some(p => p.id === draft1.id), false);

  // Aprobamos la promoción
  await new ApprovePromotion(memory.promotionRepository).execute({ promotionId: draft1.id }, { id: 'admin-1', rol: 'ADMIN' });

  // Ahora sí aparece
  publicList = await getPublicPromos.execute();
  assert.equal(publicList.some(p => p.id === draft1.id), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Métricas de IA se incrementan correctamente
// ─────────────────────────────────────────────────────────────────────────────
test('15. AiMetricsCollector: contadores y métricas de latencia se actualizan', () => {
  const before = metrics.snapshot();

  metrics.incRequest();
  metrics.incSuccess();
  metrics.incTimeout();
  metrics.incCacheHit();
  metrics.incCacheMiss();
  metrics.incPromotionPending();
  metrics.incPromotionApproved();
  metrics.incPromotionRejected();
  metrics.incError('RATE_LIMIT');
  metrics.recordGeminiLatency(150);
  metrics.recordUcLatency(200);

  const after = metrics.snapshot();
  assert.equal(after.counters.gemini_requests_total, before.counters.gemini_requests_total + 1);
  assert.equal(after.counters.gemini_success_total, before.counters.gemini_success_total + 1);
  assert.equal(after.counters.gemini_timeouts_total, before.counters.gemini_timeouts_total + 1);
  assert.equal(after.counters.gemini_cache_hits_total, before.counters.gemini_cache_hits_total + 1);
  assert.equal(after.counters.gemini_cache_misses_total, before.counters.gemini_cache_misses_total + 1);
  assert.equal(after.counters.promotions_pending_total, before.counters.promotions_pending_total + 1);
  assert.equal(after.counters.promotions_approved_total, before.counters.promotions_approved_total + 1);
  assert.equal(after.counters.promotions_rejected_total, before.counters.promotions_rejected_total + 1);
  assert.ok(after.gemini_latency.count > 0);
  assert.ok(after.uc_latency.count > 0);
});

test('16. Casos de uso aplican autorización aunque se invoquen fuera del router', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 15;
  lot.fechaCaducidad = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const generator = new GenerarPromocionesIA(
    memory.lotRepository,
    memory.promotionRepository,
    new MockGeminiAdapter(),
    new PromotionCache(60),
    memory.productRepository
  );

  await assert.rejects(
    () => generator.execute({ loteId: lot.id }, { id: 'client-1', rol: 'CLIENTE' }),
    error => error.statusCode === 403
  );

  const draft = await generator.execute({ loteId: lot.id }, { id: 'staff-1', rol: 'BODEGUERO' });
  await assert.rejects(
    () => new ApprovePromotion(memory.promotionRepository).execute(
      { promotionId: draft.id },
      { id: 'staff-1', rol: 'BODEGUERO' }
    ),
    error => error.statusCode === 403
  );
});

test('17. No aprueba un borrador obsoleto si cambió el stock y oculta promociones vencidas', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.cantidadDisponible = 15;
  lot.fechaCaducidad = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const generator = new GenerarPromocionesIA(
    memory.lotRepository,
    memory.promotionRepository,
    new MockGeminiAdapter(),
    new PromotionCache(60),
    memory.productRepository
  );
  const draft = await generator.execute({ loteId: lot.id }, { id: 'staff-1', rol: 'BODEGUERO' });
  const approve = new ApprovePromotion(memory.promotionRepository);

  lot.cantidadDisponible = 14;
  await assert.rejects(
    () => approve.execute({ promotionId: draft.id }, { id: 'admin-1', rol: 'ADMIN' }),
    error => error.message.includes('cambió')
  );

  lot.cantidadDisponible = 15;
  await approve.execute({ promotionId: draft.id }, { id: 'admin-1', rol: 'ADMIN' });
  assert.equal(
    (await new GetPromotions(memory.promotionRepository).execute()).some(item => item.id === draft.id),
    true
  );

  lot.fechaCaducidad = new Date(Date.now() - 86400000);
  assert.equal(
    (await new GetPromotions(memory.promotionRepository).execute()).some(item => item.id === draft.id),
    false
  );
});

test('18. PromotionCache valida límites y acota el número de entradas', async () => {
  assert.throws(() => new PromotionCache(0), /entero positivo/);
  assert.throws(() => new PromotionCache(60, -1), /entero positivo/);
  const cache = new PromotionCache(60, 2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.get('a'), null);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Integración real con PostgreSQL (transacciones, duplicados y aprobación)
// ─────────────────────────────────────────────────────────────────────────────
test('19. PostgreSQL Integración: guarda borrador con lock consultivo y maneja transacciones de aprobación', async (t) => {
  let pool;
  try {
    pool = getPool();
    await pool.query('SELECT 1');
  } catch (err) {
    t.skip('PostgreSQL no disponible para prueba de integración');
    return;
  }

  const pgRepo = new PostgresPromotionRepository(pool);
  let productId = null;
  t.after(async () => {
    if (productId) {
      await pool.query('DELETE FROM productos WHERE id = $1', [productId]).catch(() => {});
    }
    await pool.end();
  });

  const categoryRes = await pool.query('SELECT id FROM categorias LIMIT 1');
  if (categoryRes.rows.length === 0) {
    t.skip('No hay categorías en PostgreSQL para preparar la prueba');
    return;
  }
  productId = randomUUID();
  const loteId = randomUUID();
  const barcode = `TEST-${Date.now()}-${Math.random()}`;
  await pool.query(`
    INSERT INTO productos
      (id, categoria_id, codigo_barras, nombre, precio_venta, min_stock_alerta)
    VALUES ($1, $2, $3, 'Producto integración IA', 2.50, 1)
  `, [productId, categoryRes.rows[0].id, barcode]);
  await pool.query(`
    INSERT INTO lotes
      (id, producto_id, numero_lote, fecha_caducidad, cantidad_ingresada,
       cantidad_disponible, cantidad_reservada, ubicacion, estado)
    VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '5 days', 20, 20, 0, 'BODEGA', 'ACTIVO')
  `, [loteId, productId, `LOT-TEST-${Date.now()}`]);
  const lotRes = await pool.query(`
    SELECT l.fecha_caducidad as "fechaCaducidad",
           l.cantidad_disponible as "cantidadDisponible",
           p.precio_venta as "precioVenta"
    FROM lotes l JOIN productos p ON p.id = l.producto_id WHERE l.id = $1
  `, [loteId]);
  const lotRow = lotRes.rows[0];
  const testPromptVersion = `test-${Date.now()}`;
  const testCacheKey = buildPromotionCacheKey({
    loteId,
    fechaCaducidad: lotRow.fechaCaducidad,
    cantidadDisponible: Number(lotRow.cantidadDisponible),
    precioVenta: Number(lotRow.precioVenta),
    promptVersion: testPromptVersion,
    modelName: 'gemini-3.8-flash'
  });

  // 1. Guardar primer borrador
  const draft = await pgRepo.savePending({
    loteId,
    descuentoPorcentaje: 25,
    frasePromocional: 'Oferta de prueba PG',
    razonIa: 'Justificación en PG',
    modeloIa: 'gemini-3.8-flash',
    promptVersion: testPromptVersion,
    cacheKey: testCacheKey,
    cacheHit: false,
  });

  assert.ok(draft.id);
  assert.equal(draft.estado, 'PENDIENTE_APROBACION');
  assert.equal(draft.activa, false);

  // 2. Intento concurrente / repetido con la misma clave no duplica
  const duplicateDraft = await pgRepo.savePending({
    loteId,
    descuentoPorcentaje: 25,
    frasePromocional: 'Oferta repetida',
    razonIa: 'Justificación',
    modeloIa: 'gemini-3.8-flash',
    promptVersion: testPromptVersion,
    cacheKey: testCacheKey,
    cacheHit: false,
  });

  assert.equal(duplicateDraft.id, draft.id);

  // 3. Aprobar en transacción
  const adminRes = await pool.query("SELECT id FROM usuarios WHERE rol = 'ADMIN' LIMIT 1");
  const adminId = adminRes.rows[0]?.id || 'd8a7b6c5-1111-2222-3333-444455556668';

  const approved = await pgRepo.approve(draft.id, adminId);
  assert.equal(approved.estado, 'APROBADA');
  assert.equal(approved.activa, true);

  // 4. Segundo intento de aprobación falla
  await assert.rejects(
    () => pgRepo.approve(draft.id, adminId),
    err => err.message.includes('No se puede aprobar')
  );

  // 5. Limpieza de registro de prueba
});
