const { ValidationException } = require('../exceptions/DomainExceptions');

class Alert {
  constructor({
    id,
    loteId,
    diasParaVencer,
    nivel,
    atendida = false,
    created_at,
    numeroLote,
    productoNombre,
    ubicacion
  }) {
    if (!loteId) {
      throw new ValidationException('El loteId es requerido para generar una alerta.');
    }

    const nivelesValidos = ['AMARILLO', 'ROJO'];
    const nivelUpper = nivel ? nivel.toUpperCase() : 'AMARILLO';
    if (!nivelesValidos.includes(nivelUpper)) {
      throw new ValidationException(`Nivel de alerta inválido '${nivel}'.`);
    }

    this.id = id;
    this.loteId = loteId;
    this.diasParaVencer = parseInt(diasParaVencer, 10);
    this.nivel = nivelUpper; // AMARILLO | ROJO
    this.atendida = Boolean(atendida);
    this.created_at = created_at || new Date();

    // Extra DTO props for SSE payload
    this.numeroLote = numeroLote || null;
    this.productoNombre = productoNombre || null;
    this.ubicacion = ubicacion || null;
  }
}

module.exports = Alert;
