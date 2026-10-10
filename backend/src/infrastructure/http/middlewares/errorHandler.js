const { DomainException } = require('../../../domain/exceptions/DomainExceptions');

function errorHandler(err, req, res, next) {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'PayloadTooLarge',
      message: 'El cuerpo de la solicitud excede el límite permitido.',
      requestId: req.id
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'InvalidJson',
      message: 'El cuerpo JSON de la solicitud no es válido.',
      requestId: req.id
    });
  }

  if (err instanceof DomainException) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message,
      ...(Array.isArray(err.details) ? { details: err.details } : {}),
      requestId: req.id
    });
  }

  if (Number.isInteger(err?.statusCode) && err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'HttpRequestError',
      message: err.message,
      requestId: req.id
    });
  }

  console.error('❌ Error no controlado en servidor:', err);
  return res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: 'Ha ocurrido un error interno en el servidor.',
    requestId: req.id
  });
}

module.exports = errorHandler;
