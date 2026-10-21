const { ValidationException, UnauthorizedException } = require('../../domain/exceptions/DomainExceptions');
const User = require('../../domain/entities/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

// Hash bcrypt (cost 10) de una contraseña aleatoria que nadie conoce.
const DUMMY_PASSWORD_HASH = '$2a$10$veVfRmIrMq4Ua1XLpCiKnO2Jvbwn54u2sVtAxdts9kZ8MC8Cnd476';

class RegisterUser {
  constructor(userRepository, jwtSecret) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
  }

  async execute({ nombre, email, password }) {
    if (!password || password.length < 8) {
      throw new ValidationException('La contraseña debe tener al menos 8 caracteres.');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ValidationException(`El correo electrónico '${email}' ya está registrado.`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ nombre, email, rol: 'CLIENTE', passwordHash });
    const savedUser = await this.userRepository.save(user);

    const token = jwt.sign(
      { id: savedUser.id, nombre: savedUser.nombre, email: savedUser.email, rol: savedUser.rol, jti: crypto.randomUUID() },
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
  constructor(userRepository, jwtSecret) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
  }

  async execute({ email, password }) {
    if (!email || !password) {
      throw new ValidationException('Debe ingresar email y contraseña.');
    }

    const user = await this.userRepository.findByEmail(email);
    // Mismo mensaje y mismo costo de bcrypt exista o no el correo: evita enumerar cuentas.
    const isMatch = await bcrypt.compare(password, user?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, jti: crypto.randomUUID() },
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
