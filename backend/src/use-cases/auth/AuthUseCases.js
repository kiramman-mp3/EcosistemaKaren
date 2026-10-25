const { ValidationException, UnauthorizedException, ConflictException } = require('../../domain/exceptions/DomainExceptions');
const User = require('../../domain/entities/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

// Costo de bcrypt: configurable con BCRYPT_ROUNDS, entre 10 y 14 (12 por defecto). Cada +1 duplica el
// tiempo de cifrado, tanto para quien inicia sesión como para quien intenta adivinar contraseñas.
function bcryptRounds(env = process.env) {
  const configured = Number(env.BCRYPT_ROUNDS);
  return Number.isInteger(configured) ? Math.min(14, Math.max(10, configured)) : 12;
}

class RegisterUser {
  constructor(userRepository, jwtSecret, { rounds = bcryptRounds() } = {}) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
    this.rounds = rounds;
  }

  async execute({ nombre, email, password }) {
    if (!password || password.length < 8) {
      throw new ValidationException('La contraseña debe tener al menos 8 caracteres.');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(`El correo electrónico '${email}' ya está registrado.`);
    }

    const passwordHash = await bcrypt.hash(password, this.rounds);
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
  constructor(userRepository, jwtSecret, { rounds = bcryptRounds() } = {}) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
    this.rounds = rounds;
    this.dummyHash = null;
  }

  // Hash de una contraseña aleatoria que nadie conoce, con el mismo costo que las cuentas reales: así
  // comparar contra un correo inexistente tarda lo mismo que contra uno existente.
  _dummyPasswordHash() {
    if (!this.dummyHash) this.dummyHash = bcrypt.hash(crypto.randomUUID(), this.rounds);
    return this.dummyHash;
  }

  // Las cuentas creadas con un costo menor se actualizan al costo actual cuando inician sesión
  // (es el único momento en que se conoce la contraseña). Si falla no impide el acceso.
  async _upgradeHash(user, password) {
    if (typeof this.userRepository.updatePasswordHash !== 'function') return;
    try {
      if (bcrypt.getRounds(user.passwordHash) < this.rounds) {
        await this.userRepository.updatePasswordHash(user.id, await bcrypt.hash(password, this.rounds));
      }
    } catch {
      // Se reintenta en el siguiente inicio de sesión.
    }
  }

  async execute({ email, password }) {
    if (!email || !password) {
      throw new ValidationException('Debe ingresar email y contraseña.');
    }

    const user = await this.userRepository.findByEmail(email);
    // Mismo mensaje y mismo costo de bcrypt exista o no el correo: evita enumerar cuentas.
    const isMatch = await bcrypt.compare(password, user?.passwordHash || await this._dummyPasswordHash());
    if (!user || !isMatch) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    await this._upgradeHash(user, password);

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
  LoginUser,
  bcryptRounds
};
