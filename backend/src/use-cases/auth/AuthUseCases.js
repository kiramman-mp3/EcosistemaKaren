const { ValidationException, UnauthorizedException } = require('../../domain/exceptions/DomainExceptions');
const User = require('../../domain/entities/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
      { id: savedUser.id, nombre: savedUser.nombre, email: savedUser.email, rol: savedUser.rol },
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
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas (usuario no encontrado).');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || '');
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales incorrectas (contraseña inválida).');
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
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
