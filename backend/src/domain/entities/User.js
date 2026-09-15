const { ValidationException } = require('../exceptions/DomainExceptions');

class User {
  constructor({ id, nombre, email, rol, passwordHash, created_at }) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new ValidationException('El nombre de usuario es obligatorio.');
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new ValidationException('El correo electrónico no es válido.');
    }

    const rolesValidos = ['CLIENTE', 'BODEGUERO', 'PERCHERO', 'ADMIN'];
    const roleUpper = rol ? rol.toUpperCase() : 'CLIENTE';
    if (!rolesValidos.includes(roleUpper)) {
      throw new ValidationException(`El rol ${rol} no es un rol válido de usuario.`);
    }

    this.id = id;
    this.nombre = nombre.trim();
    this.email = email.trim().toLowerCase();
    this.rol = roleUpper;
    this.passwordHash = passwordHash;
    this.created_at = created_at || new Date();
  }
}

module.exports = User;
