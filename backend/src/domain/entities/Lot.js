const { ValidationException, OverbookingException } = require('../exceptions/DomainExceptions');
const { classifyExpiryDays } = require('../policies/BusinessRules');

class Lot {
  constructor({
    id,
    productoId,
    numeroLote,
    fechaElaboracion,
    fechaCaducidad,
    costoUnitario,
    cantidadIngresada,
    cantidadDisponible,
    cantidadReservada,
    ubicacion,
    estado,
    created_at,
    updated_at,
    productoNombre,
    codigoBarras
  }) {
    if (!productoId) {
      throw new ValidationException('El productoId es obligatorio para un lote.');
    }

    if (!numeroLote || typeof numeroLote !== 'string' || !numeroLote.trim()) {
      throw new ValidationException('El número de lote es obligatorio.');
    }

    if (!fechaCaducidad) {
      throw new ValidationException('La fecha de caducidad es obligatoria.');
    }

    const expirationDate = new Date(fechaCaducidad);
    if (Number.isNaN(expirationDate.getTime())) {
      throw new ValidationException('La fecha de caducidad no es válida.');
    }

    let productionDate = null;
    if (fechaElaboracion !== undefined && fechaElaboracion !== null && fechaElaboracion !== '') {
      productionDate = new Date(fechaElaboracion);
      if (Number.isNaN(productionDate.getTime())) {
        throw new ValidationException('La fecha de elaboración no es válida.');
      }
      if (productionDate >= expirationDate) {
        throw new ValidationException('La fecha de elaboración debe ser anterior a la fecha de caducidad.');
      }
    }

    let unitCost = null;
    if (costoUnitario !== undefined && costoUnitario !== null && costoUnitario !== '') {
      unitCost = Number(costoUnitario);
      if (!Number.isFinite(unitCost) || unitCost <= 0) {
        throw new ValidationException('El costo unitario debe ser un número mayor a cero.');
      }
      unitCost = Math.round(unitCost * 10000) / 10000;
    }

    const ingresada = parseInt(cantidadIngresada, 10);
    if (isNaN(ingresada) || ingresada < 0) {
      throw new ValidationException('La cantidad ingresada debe ser un número entero mayor o igual a cero.');
    }

    this.id = id;
    this.productoId = productoId;
    this.numeroLote = numeroLote.trim();
    this.fechaElaboracion = productionDate;
    this.fechaCaducidad = expirationDate;
    this.costoUnitario = unitCost;
    this.cantidadIngresada = ingresada;
    this.cantidadDisponible = cantidadDisponible !== undefined ? parseInt(cantidadDisponible, 10) : ingresada;
    this.cantidadReservada = cantidadReservada !== undefined ? parseInt(cantidadReservada, 10) : 0;
    this.ubicacion = ubicacion || 'BODEGA'; // BODEGA | PERCHA
    this.estado = estado || 'ACTIVO'; // ACTIVO | VENCIDO | AGOTADO | MERMA
    this.created_at = created_at || new Date();
    this.updated_at = updated_at || new Date();

    // Propiedades virtuales/extra opcionales para DTOs
    this.productoNombre = productoNombre || null;
    this.codigoBarras = codigoBarras || null;
  }

  calcularDiasParaVencer(referencia = new Date()) {
    const inicioHoy = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
    const caducidad = new Date(this.fechaCaducidad.getFullYear(), this.fechaCaducidad.getMonth(), this.fechaCaducidad.getDate());
    const diffMs = caducidad - inicioHoy;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  obtenerNivelAlerta() {
    return classifyExpiryDays(this.calcularDiasParaVencer());
  }

  reservar(cantidad) {
    const qty = parseInt(cantidad, 10);
    if (qty <= 0) throw new ValidationException('La cantidad a reservar debe ser positiva.');
    if (this.cantidadDisponible < qty) {
      throw new OverbookingException(`Stock insuficiente en lote ${this.numeroLote}. Disponible: ${this.cantidadDisponible}, Solicitado: ${qty}`);
    }

    this.cantidadDisponible -= qty;
    this.cantidadReservada += qty;
    if (this.cantidadDisponible === 0 && this.cantidadReservada === 0) {
      this.estado = 'AGOTADO';
    }
  }

  liberar(cantidad) {
    const qty = parseInt(cantidad, 10);
    if (qty <= 0) throw new ValidationException('La cantidad a liberar debe ser positiva.');
    const releaseQty = Math.min(qty, this.cantidadReservada);
    this.cantidadReservada -= releaseQty;
    this.cantidadDisponible += releaseQty;
    if (this.estado === 'AGOTADO' && this.cantidadDisponible > 0) {
      this.estado = 'ACTIVO';
    }
  }

  confirmarVentaReservada(cantidad) {
    const qty = parseInt(cantidad, 10);
    const confirmQty = Math.min(qty, this.cantidadReservada);
    this.cantidadReservada -= confirmQty;
    if (this.cantidadDisponible === 0 && this.cantidadReservada === 0) {
      this.estado = 'AGOTADO';
    }
  }

  registrarMerma(cantidad, razon) {
    const qty = parseInt(cantidad, 10);
    if (qty <= 0) throw new ValidationException('La cantidad de merma debe ser mayor a cero.');
    if (!razon || typeof razon !== 'string' || razon.trim().length < 3 || razon.trim().length > 500) {
      throw new ValidationException('La razón de la merma debe tener entre 3 y 500 caracteres.');
    }
    if (this.cantidadDisponible < qty) {
      throw new ValidationException(`No se puede dar de baja ${qty} unidades. Disponible libre: ${this.cantidadDisponible}`);
    }

    this.cantidadDisponible -= qty;
    if (this.cantidadDisponible === 0 && this.cantidadReservada === 0) {
      this.estado = 'MERMA';
    }
  }

  cambiarUbicacion(nuevaUbicacion) {
    const ubi = nuevaUbicacion ? nuevaUbicacion.toUpperCase() : '';
    if (ubi !== 'BODEGA' && ubi !== 'PERCHA') {
      throw new ValidationException('La ubicación debe ser BODEGA o PERCHA.');
    }
    this.ubicacion = ubi;
  }
}

module.exports = Lot;
