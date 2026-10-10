const { ValidationException } = require('../exceptions/DomainExceptions');

/**
 * Promotion domain entity.
 * Supports approval workflow: PENDIENTE_APROBACION → APROBADA | RECHAZADA
 */
class Promotion {
  constructor({
    id,
    loteId,
    descuentoPorcentaje,
    frasePromocional,
    razonIa,
    activa = false,
    estado = 'PENDIENTE_APROBACION',
    modeloIa,
    promptVersion,
    cacheKey,
    cacheHit = false,
    aprobadaPor,
    aprobadaAt,
    rechazadaPor,
    rechazadaAt,
    motivoRechazo,
    productoNombre,
    numeroLote,
    fechaCaducidad,
    cantidadDisponible,
    created_at,
  }) {
    if (!loteId) {
      throw new ValidationException('El loteId es obligatorio para la promoción.');
    }

    const pct = parseFloat(descuentoPorcentaje);
    if (isNaN(pct) || pct < 5 || pct > 50) {
      throw new ValidationException('El porcentaje de descuento debe estar entre 5% y 50%.');
    }

    if (!frasePromocional || typeof frasePromocional !== 'string' || !frasePromocional.trim()) {
      throw new ValidationException('La frase promocional es requerida.');
    }
    if (frasePromocional.trim().length > 180) {
      throw new ValidationException('La frase promocional no puede superar los 180 caracteres.');
    }
    if (!razonIa || typeof razonIa !== 'string' || !razonIa.trim()) {
      throw new ValidationException('La razón de IA es requerida.');
    }
    if (razonIa.trim().length > 500) {
      throw new ValidationException('La razón de IA no puede superar los 500 caracteres.');
    }

    const validStates = ['PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA'];
    if (!validStates.includes(estado)) {
      throw new ValidationException(`Estado de promoción inválido: ${estado}`);
    }

    this.id = id;
    this.loteId = loteId;
    this.descuentoPorcentaje = pct;
    this.frasePromocional = frasePromocional.trim();
    this.razonIa = razonIa.trim();
    this.activa = Boolean(activa);
    this.estado = estado;

    // AI metadata (safe to expose to ADMIN, not to public)
    this.modeloIa = modeloIa || null;
    this.promptVersion = promptVersion || null;
    this.cacheKey = cacheKey || null;
    this.cacheHit = Boolean(cacheHit);

    // Approval audit fields
    this.aprobadaPor = aprobadaPor || null;
    this.aprobadaAt = aprobadaAt || null;
    this.rechazadaPor = rechazadaPor || null;
    this.rechazadaAt = rechazadaAt || null;
    this.motivoRechazo = motivoRechazo || null;
    this.productoNombre = productoNombre || null;
    this.numeroLote = numeroLote || null;
    this.fechaCaducidad = fechaCaducidad || null;
    this.cantidadDisponible = cantidadDisponible === undefined ? null : Number(cantidadDisponible);

    this.created_at = created_at || new Date();
  }

  isApproved()  { return this.estado === 'APROBADA'; }
  isPending()   { return this.estado === 'PENDIENTE_APROBACION'; }
  isRejected()  { return this.estado === 'RECHAZADA'; }

  /**
   * Returns a safe public-facing object (hides internal metadata).
   */
  toPublicDTO() {
    return {
      id: this.id,
      loteId: this.loteId,
      descuentoPorcentaje: this.descuentoPorcentaje,
      frasePromocional: this.frasePromocional,
      activa: this.activa,
      created_at: this.created_at,
    };
  }

  toOperationalDTO() {
    return {
      id: this.id,
      loteId: this.loteId,
      descuentoPorcentaje: this.descuentoPorcentaje,
      frasePromocional: this.frasePromocional,
      razonIa: this.razonIa,
      activa: this.activa,
      estado: this.estado,
      cacheHit: this.cacheHit,
      productoNombre: this.productoNombre,
      numeroLote: this.numeroLote,
      fechaCaducidad: this.fechaCaducidad,
      cantidadDisponible: this.cantidadDisponible,
      motivoRechazo: this.motivoRechazo,
      created_at: this.created_at,
    };
  }
}

module.exports = Promotion;
