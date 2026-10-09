const RESERVATION_TTL_MINUTES = 10;

const EXPIRY_THRESHOLDS_DAYS = Object.freeze({
  RED: 7,
  YELLOW: 15
});

function classifyExpiryDays(days) {
  if (!Number.isFinite(days)) return 'NORMAL';
  if (days <= 0) return 'VENCIDO';
  if (days < EXPIRY_THRESHOLDS_DAYS.RED) return 'ROJO';
  if (days < EXPIRY_THRESHOLDS_DAYS.YELLOW) return 'AMARILLO';
  return 'NORMAL';
}

function isExpiryAlertLevel(level) {
  return level === 'ROJO' || level === 'AMARILLO';
}

module.exports = {
  RESERVATION_TTL_MINUTES,
  EXPIRY_THRESHOLDS_DAYS,
  classifyExpiryDays,
  isExpiryAlertLevel
};
