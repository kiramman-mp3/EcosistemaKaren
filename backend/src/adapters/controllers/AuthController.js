class AuthController {
  constructor(registerUserUC, loginUserUC) {
    this.registerUserUC = registerUserUC;
    this.loginUserUC = loginUserUC;
  }

  async register(req, res, next) {
    try {
      const result = await this.registerUserUC.execute(req.body);
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const result = await this.loginUserUC.execute(req.body);
      res.json({
        success: true,
        message: 'Autenticación exitosa.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
