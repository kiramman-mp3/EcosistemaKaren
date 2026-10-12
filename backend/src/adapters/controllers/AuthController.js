class AuthController {
  constructor(registerUserUC, loginUserUC) {
    this.registerUserUC = registerUserUC;
    this.loginUserUC = loginUserUC;
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

  logout(req, res) {
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
