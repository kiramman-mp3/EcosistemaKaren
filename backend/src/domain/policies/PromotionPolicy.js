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

function calculateDaysUntilExpiry(expiry, referenceDate = new Date()) {
  return daysUntil(expiry, referenceDate);
}

module.exports = {
  buildPromotionCacheKey,
  assertPromotableLot,
  normalizeDate,
  calculateDaysUntilExpiry
};
