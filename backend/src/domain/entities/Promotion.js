const { ValidationException } = require('../exceptions/DomainExceptions');

class Promotion {
  constructor({
    id,
    loteId,
    descuentoPorcentaje,
    frasePromocional,
    razonIa,
    activa = true,
    created_at
  }) {
    if (!loteId) {
      throw new ValidationException('El loteId es obligatorio para la promoción.');
    }

    const pct = parseFloat(descuentoPorcentaje);
    if (isNaN(pct) || pct <= 0 || pct > 90) {
      throw new ValidationException('El porcentaje de descuento debe estar entre 1% y 90%.');
    }

    if (!frasePromocional || typeof frasePromocional !== 'string' || !frasePromocional.trim()) {
      throw new ValidationException('La frase promocional es requerida.');
    }

    this.id = id;
    this.loteId = loteId;
    this.descuentoPorcentaje = pct;
    this.frasePromocional = frasePromocional.trim();
    this.razonIa = razonIa ? razonIa.trim() : null;
    this.activa = Boolean(activa);
    this.created_at = created_at || new Date();
  }
}

module.exports = Promotion;
