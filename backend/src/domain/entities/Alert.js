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
    ubicacion,
    codigoBarras,
    fechaCaducidad,
    cantidadDisponible,
    cantidadReservada,
    loteEstado
  }) {
    if (!loteId) {
      throw new ValidationException('El loteId es requerido para generar una alerta.');
    }

    const nivelesValidos = ['AMARILLO', 'ROJO', 'VENCIDO'];
    const nivelUpper = nivel ? nivel.toUpperCase() : 'AMARILLO';
    if (!nivelesValidos.includes(nivelUpper)) {
      throw new ValidationException(`Nivel de alerta inválido '${nivel}'.`);
    }

    this.id = id;
    this.loteId = loteId;
    this.diasParaVencer = parseInt(diasParaVencer, 10);
    this.nivel = nivelUpper; // AMARILLO | ROJO | VENCIDO
    this.atendida = Boolean(atendida);
    this.created_at = created_at || new Date();
    this.createdAt = this.created_at;

    // Extra DTO props for SSE payload & frontend client
    this.numeroLote = numeroLote || null;
    this.productoNombre = productoNombre || null;
    this.ubicacion = ubicacion || null;
    this.codigoBarras = codigoBarras || null;
    this.fechaCaducidad = fechaCaducidad || null;
    this.cantidadDisponible = cantidadDisponible !== undefined && cantidadDisponible !== null ? Number(cantidadDisponible) : null;
    this.cantidadReservada = cantidadReservada !== undefined && cantidadReservada !== null ? Number(cantidadReservada) : null;
    this.loteEstado = loteEstado || null;
  }
}

module.exports = Alert;
