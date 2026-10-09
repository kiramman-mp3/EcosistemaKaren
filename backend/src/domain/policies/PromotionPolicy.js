const crypto = require('crypto');
const { ValidationException } = require('../exceptions/DomainExceptions');
const { classifyExpiryDays } = require('./BusinessRules');

const PROMOTABLE_LEVELS = new Set(['ROJO', 'AMARILLO']);

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationException('La fecha de caducidad del lote no es válida.');
  }
  return date.toISOString().slice(0, 10);
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
  const ref = new Date(referenceDate);
  const date = expiry instanceof Date ? new Date(expiry) : new Date(expiry);
  const startToday = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
  const expiryDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.ceil((expiryDay - startToday) / 86400000);
}

module.exports = {
  buildPromotionCacheKey,
  assertPromotableLot,
  normalizeDate,
  calculateDaysUntilExpiry
};
