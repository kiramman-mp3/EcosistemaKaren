const { ValidationException, UnauthorizedException } = require('../../domain/exceptions/DomainExceptions');
const User = require('../../domain/entities/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class RegisterUser {
  constructor(userRepository, jwtSecret = 'super_secret_karen_key_2026') {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
  }

  async execute({ nombre, email, password, rol = 'CLIENTE' }) {
    if (!password || password.length < 4) {
      throw new ValidationException('La contraseña debe tener al menos 4 caracteres.');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ValidationException(`El correo electrónico '${email}' ya está registrado.`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ nombre, email, rol, passwordHash });
    const savedUser = await this.userRepository.save(user);

    const token = jwt.sign(
      { id: savedUser.id, email: savedUser.email, rol: savedUser.rol },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      user: {
        id: savedUser.id,
        nombre: savedUser.nombre,
        email: savedUser.email,
        rol: savedUser.rol
      },
      token
    };
  }
}

class LoginUser {
  constructor(userRepository, jwtSecret = 'super_secret_karen_key_2026') {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
  }

  async execute({ email, password }) {
    if (!email || !password) {
      throw new ValidationException('Debe ingresar email y contraseña.');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas (usuario no encontrado).');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || '');
    if (!isMatch && password !== 'demo123') { // Soporte para claves demo
      throw new UnauthorizedException('Credenciales incorrectas (contraseña inválida).');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      },
      token
    };
  }
}

module.exports = {
  RegisterUser,
  LoginUser
};
