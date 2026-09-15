class DomainException extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class NotFoundException extends DomainException {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

class ValidationException extends DomainException {
  constructor(message = 'Error de validación de datos') {
    super(message, 400);
  }
}

class OverbookingException extends DomainException {
  constructor(message = 'Stock insuficiente o reserva no disponible') {
    super(message, 409);
  }
}

class UnauthorizedException extends DomainException {
  constructor(message = 'No autorizado') {
    super(message, 401);
  }
}

module.exports = {
  DomainException,
  NotFoundException,
  ValidationException,
  OverbookingException,
  UnauthorizedException
};
