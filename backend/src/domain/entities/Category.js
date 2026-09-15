const { ValidationException } = require('../exceptions/DomainExceptions');

class Category {
  constructor({ id, nombre, descripcion, created_at }) {
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      throw new ValidationException('El nombre de la categoría es obligatorio y debe tener al menos 2 caracteres.');
    }

    this.id = id;
    this.nombre = nombre.trim();
    this.descripcion = descripcion ? descripcion.trim() : null;
    this.created_at = created_at || new Date();
  }
}

module.exports = Category;
