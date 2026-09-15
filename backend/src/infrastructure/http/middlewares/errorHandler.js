const { DomainException } = require('../../../domain/exceptions/DomainExceptions');

function errorHandler(err, req, res, next) {
  if (err instanceof DomainException) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message
    });
  }

  console.error('❌ Error no controlado en servidor:', err);
  return res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: 'Ha ocurrido un error interno en el servidor.'
  });
}

module.exports = errorHandler;
