const crypto = require('crypto');
const { ValidationException } = require('../exceptions/DomainExceptions');
const { classifyExpiryDays } = require('./BusinessRules');
const { toDateOnly, daysUntil } = require('./BusinessDates');

const PROMOTABLE_LEVELS = new Set(['ROJO', 'AMARILLO']);

function normalizeDate(value) {
  const date = toDateOnly(value);
  if (!date) {
    throw new ValidationException('La fecha de caducidad del lote no es válida.');
  }
  return date;
}

function buildPromotionCacheKey({
  loteId,
  fechaCaducidad,
  cantidadDisponible,
  precioVenta,
  promptVersion,
  modelName
}) {
  const raw = [
    loteId,
    normalizeDate(fechaCaducidad),
    Number(cantidadDisponible),
    Number(precioVenta),
    promptVersion,
    modelName
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function assertPromotableLot(lot, referenceDate = new Date()) {
  if (!lot) {
    throw new ValidationException('El lote requerido para la promoción no existe.');
  }
  if (lot.estado !== 'ACTIVO') {
    throw new ValidationException(
      `El lote '${lot.numeroLote || lot.id}' está en estado ${lot.estado} y no puede promocionarse.`
    );
  }
  if (Number(lot.cantidadDisponible) <= 0) {
    throw new ValidationException(
      `El lote '${lot.numeroLote || lot.id}' no tiene unidades disponibles para promover.`
    );
  }

  const days = typeof lot.calcularDiasParaVencer === 'function'
    ? lot.calcularDiasParaVencer(referenceDate)
    : calculateDaysUntilExpiry(lot.fechaCaducidad, referenceDate);
  const level = classifyExpiryDays(days);
  if (!PROMOTABLE_LEVELS.has(level)) {
    const reason = level === 'VENCIDO'
      ? 'está vencido'
      : `tiene ${days} días hasta caducar`;
    throw new ValidationException(
      `El lote '${lot.numeroLote || lot.id}' ${reason}. Solo se permiten promociones IA para lotes ROJO o AMARILLO.`
    );
  }
  return { diasParaVencer: days, nivelAlerta: level };
}

// Reglas que el ADMIN debe cumplir al fijar los límites de una oferta (al editar el borrador y otra
// vez al aprobarlo, porque el lote pudo cambiar entre medio).
function assertOfferTerms({ stockOferta, vigenteHasta }, lot, referenceDate = new Date()) {
  if (stockOferta !== null && stockOferta !== undefined && lot
      && Number(stockOferta) > Number(lot.cantidadDisponible)) {
    throw new ValidationException(
      `El stock de oferta (${stockOferta}) no puede superar las ${lot.cantidadDisponible} unidades disponibles del lote.`
    );
  }
  if (vigenteHasta && new Date(vigenteHasta).getTime() <= referenceDate.getTime()) {
    throw new ValidationException('La fecha y hora de fin de la oferta debe ser futura.');
  }
}

const units = (n) => `${n} ${n === 1 ? 'unidad' : 'unidades'}`;

/**
 * Motivo por el que una línea de reserva no puede llevarse con descuento, o null si cabe.
 * `committed` son las unidades de la oferta ya comprometidas por otras reservas (pendientes o confirmadas).
 */
function offerLimitViolation(offer, quantity, committed, referenceDate = new Date()) {
  if (offer.vigenteHasta && new Date(offer.vigenteHasta).getTime() <= referenceDate.getTime()) {
    return 'La oferta ya terminó.';
  }
  if (offer.limitePorPedido && quantity > offer.limitePorPedido) {
    return `Esta oferta admite hasta ${units(offer.limitePorPedido)} por pedido.`;
  }
  if (offer.stockOferta) {
    const remaining = Math.max(0, offer.stockOferta - committed);
    if (quantity > remaining) {
      if (remaining === 0) return 'Las unidades de esta oferta ya se agotaron.';
      return `${remaining === 1 ? 'Solo queda' : 'Solo quedan'} ${units(remaining)} con este descuento.`;
    }
  }
  return null;
}

function calculateDaysUntilExpiry(expiry, referenceDate = new Date()) {
  return daysUntil(expiry, referenceDate);
}

module.exports = {
  buildPromotionCacheKey,
  assertPromotableLot,
  normalizeDate,
  calculateDaysUntilExpiry,
  assertOfferTerms,
  offerLimitViolation
};
