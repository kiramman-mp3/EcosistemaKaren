const jwt = require('jsonwebtoken');
const { ForbiddenException } = require('../../domain/exceptions/DomainExceptions');

const STAFF_ON_WEB_MESSAGE = 'Las cuentas del personal de la tienda no pueden ingresar al portal web. Usa la app de bodega.';

class AuthController {
  constructor(registerUserUC, loginUserUC, tokenBlacklistRepo = null, jwtSecret = process.env.JWT_SECRET) {
    this.registerUserUC = registerUserUC;
    this.loginUserUC = loginUserUC;
    this.tokenBlacklistRepo = tokenBlacklistRepo;
    this.jwtSecret = jwtSecret;
  }

  async register(req, res, next) {
    try {
      const result = await this.registerUserUC.execute(req.body);
      if (req.get('x-session-mode') === 'cookie') this.setSessionCookie(res, result.token);
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente.',
        data: this.responseData(req, result)
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const result = await this.loginUserUC.execute(req.body);
      // El modo cookie es el del portal web, que es solo para clientes.
      if (req.get('x-session-mode') === 'cookie' && result.user?.rol !== 'CLIENTE') {
        throw new ForbiddenException(STAFF_ON_WEB_MESSAGE);
      }
      if (req.get('x-session-mode') === 'cookie') this.setSessionCookie(res, result.token);
      res.json({
        success: true,
        message: 'Autenticación exitosa.',
        data: this.responseData(req, result)
      });
    } catch (err) {
      next(err);
    }
  }

  setSessionCookie(res, token) {
    res.cookie('karen_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  responseData(req, result) {
    return req.get('x-session-mode') === 'cookie'
      ? { user: result.user }
      : result;
  }

  me(req, res) {
    res.json({ success: true, data: { user: req.user } });
  }

  async logout(req, res) {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');
    const rawToken = scheme === 'Bearer' && token ? token : req.cookies?.karen_session;

    if (rawToken && this.tokenBlacklistRepo && this.jwtSecret) {
      try {
        const payload = jwt.verify(rawToken, this.jwtSecret, { ignoreExpiration: true });
        if (payload?.jti) {
          const expDate = payload.exp
            ? new Date(payload.exp * 1000)
            : new Date(Date.now() + 24 * 60 * 60 * 1000);
          await this.tokenBlacklistRepo.revoke(payload.jti, payload.id || null, expDate);
        }
      } catch {
        // Ignora tokens malformados en logout
      }
    }

    res.clearCookie('karen_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });
    res.status(204).end();
  }
}

module.exports = AuthController;
