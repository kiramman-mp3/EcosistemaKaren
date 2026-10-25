const crypto = require('node:crypto');
const {
  UnauthorizedException,
  ServiceUnavailableException
} = require('../../../domain/exceptions/DomainExceptions');

const SERVICE_KEY_HEADER = 'x-store-key';

function safeEqual(actual, expected) {
  const actualHash = crypto.createHash('sha256').update(actual).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

// Autentica las llamadas de servicio a servicio (store-api -> portal-api) con una API key
// compartida. Es independiente de los JWT de usuario. Sin clave configurada el canal interno
// queda deshabilitado en lugar de aceptar todo.
function createServiceAuth(expectedKey) {
  return function serviceAuth(req, res, next) {
    if (!expectedKey) {
      return next(new ServiceUnavailableException('El canal interno de la tienda no está configurado.'));
    }
    const supplied = req.get(SERVICE_KEY_HEADER) || '';
    if (!supplied || !safeEqual(supplied, expectedKey)) {
      return next(new UnauthorizedException('Clave de servicio inválida.'));
    }
    return next();
  };
}

module.exports = { createServiceAuth, SERVICE_KEY_HEADER };
