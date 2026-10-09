const jwt = require('jsonwebtoken');
const {
  UnauthorizedException,
  ForbiddenException
} = require('../../../domain/exceptions/DomainExceptions');

function createAuthMiddleware(jwtSecret) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET es obligatorio para iniciar el servidor.');
  }

  function authenticate(req, res, next) {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(new UnauthorizedException('Debe autenticarse con un token Bearer válido.'));
    }

    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      if (!payload || typeof payload !== 'object' || !payload.id || !payload.rol) {
        throw new Error('Token sin identidad o rol.');
      }

      req.user = {
        id: payload.id,
        email: payload.email,
        rol: String(payload.rol).toUpperCase()
      };
      return next();
    } catch {
      return next(new UnauthorizedException('El token es inválido o ha expirado.'));
    }
  }

  function authorize(...allowedRoles) {
    const normalizedRoles = allowedRoles.map(role => role.toUpperCase());
    return (req, res, next) => {
      if (!req.user) {
        return next(new UnauthorizedException());
      }
      if (!normalizedRoles.includes(req.user.rol)) {
        return next(new ForbiddenException());
      }
      return next();
    };
  }

  return { authenticate, authorize };
}

module.exports = createAuthMiddleware;
