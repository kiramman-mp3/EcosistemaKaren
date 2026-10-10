const crypto = require('node:crypto');
const helmet = require('helmet');
const hpp = require('hpp');
const { rateLimit } = require('express-rate-limit');
const { ValidationException } = require('../../../domain/exceptions/DomainExceptions');

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requestId(req, res, next) {
  const supplied = req.get('x-request-id');
  req.id = supplied && /^[A-Za-z0-9._:-]{1,100}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

function containsDangerousKey(value) {
  if (!value || typeof value !== 'object') return false;
  for (const key of Object.keys(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) return true;
    if (containsDangerousKey(value[key])) return true;
  }
  return false;
}

function rejectDangerousKeys(req, res, next) {
  if (containsDangerousKey(req.body) || containsDangerousKey(req.query) || containsDangerousKey(req.params)) {
    return next(new ValidationException('La solicitud contiene propiedades no permitidas.'));
  }
  return next();
}

function normalizeJsonBody(req, res, next) {
  const hasBody = req.headers['content-length'] !== undefined || req.headers['transfer-encoding'] !== undefined;
  if (hasBody && ['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    const error = new Error('El cuerpo de la solicitud debe usar Content-Type application/json.');
    error.statusCode = 415;
    return next(error);
  }
  if (req.body === undefined) req.body = {};
  return next();
}

function validateProductionSecurity(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const origins = (env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('CORS_ORIGINS debe contener orígenes explícitos en producción.');
  }
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || env.JWT_SECRET.includes('change_me')) {
    throw new Error('JWT_SECRET debe ser un secreto aleatorio de al menos 32 caracteres en producción.');
  }
  if (env.SWAGGER_ENABLED === 'true' && (!env.SWAGGER_PASSWORD || env.SWAGGER_PASSWORD.length < 16)) {
    throw new Error('SWAGGER_PASSWORD debe tener al menos 16 caracteres en producción.');
  }
}

function cookieCsrfProtection(allowedOrigins, production) {
  return (req, res, next) => {
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (!production || !unsafe || !req.cookies?.karen_session) return next();
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      const error = new Error('Origen inválido para una operación autenticada mediante cookie.');
      error.statusCode = 403;
      return next(error);
    }
    return next();
  };
}

function limiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: req => req.method === 'OPTIONS',
    handler(req, res) {
      res.status(429).json({
        success: false,
        error: 'TooManyRequests',
        message,
        requestId: req.id,
      });
    },
  });
}

function createSecurityMiddlewares(env = process.env) {
  const general = limiter({
    windowMs: positiveInteger(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    limit: positiveInteger(env.RATE_LIMIT_MAX, 300),
    message: 'Demasiadas solicitudes. Intente nuevamente más tarde.',
  });
  const auth = limiter({
    windowMs: positiveInteger(env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    limit: positiveInteger(env.AUTH_RATE_LIMIT_MAX, 10),
    message: 'Demasiados intentos de autenticación. Espere antes de volver a intentarlo.',
  });
  const reservations = limiter({
    windowMs: positiveInteger(env.RESERVATION_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    limit: positiveInteger(env.RESERVATION_RATE_LIMIT_MAX, 60),
    message: 'Se alcanzó el límite temporal de operaciones de reserva.',
  });
  const ai = limiter({
    windowMs: positiveInteger(env.AI_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000),
    limit: positiveInteger(env.AI_RATE_LIMIT_MAX, 10),
    message: 'Se alcanzó el límite temporal de solicitudes de IA.',
  });
  return {
    requestId,
    headers: helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
    hpp: hpp(),
    normalizeJsonBody,
    rejectDangerousKeys,
    general,
    auth,
    reservations,
    ai,
  };
}

module.exports = {
  createSecurityMiddlewares,
  requestId,
  rejectDangerousKeys,
  normalizeJsonBody,
  validateProductionSecurity,
  cookieCsrfProtection,
};
