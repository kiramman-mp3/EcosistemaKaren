const { NotFoundException, ValidationException } = require('../../domain/exceptions/DomainExceptions');
const Lot = require('../../domain/entities/Lot');
const Alert = require('../../domain/entities/Alert');

class GetLots {
  constructor(lotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute() {
    return await this.lotRepository.findAllActive();
  }
}

class IngresarLote {
  constructor(lotRepository, productRepository, alertRepository, alertStreamManager) {
    this.lotRepository = lotRepository;
    this.productRepository = productRepository;
    this.alertRepository = alertRepository;
    this.alertStreamManager = alertStreamManager;
  }

  async execute(lotData) {
    const product = await this.productRepository.findById(lotData.productoId);
    if (!product) {
      throw new NotFoundException(`El producto con ID '${lotData.productoId}' no fue encontrado.`);
    }

    const newLot = new Lot(lotData);
    newLot.productoNombre = product.nombre;
    newLot.codigoBarras = product.codigoBarras;

    const savedLot = await this.lotRepository.save(newLot);

    // Generar alerta de caducidad si vence pronto
    const dias = savedLot.calcularDiasParaVencer();
    if (dias < 15) {
      const nivel = dias < 7 ? 'ROJO' : 'AMARILLO';
      const alert = new Alert({
        loteId: savedLot.id,
        diasParaVencer: dias,
        nivel: nivel,
        numeroLote: savedLot.numeroLote,
        productoNombre: product.nombre,
        ubicacion: savedLot.ubicacion
      });

      if (this.alertRepository) {
        await this.alertRepository.save(alert);
      }

      // Transmitir evento en tiempo real vía SSE
      if (this.alertStreamManager) {
        this.alertStreamManager.broadcastAlert({
          tipo: 'NUEVO_LOTE_CADUCIDAD_CERCANA',
          loteId: savedLot.id,
          numeroLote: savedLot.numeroLote,
          productoNombre: product.nombre,
          diasParaVencer: dias,
          nivel: nivel,
          ubicacion: savedLot.ubicacion
        });
      }
    }

    return savedLot;
  }
}

class UpdateLotLocation {
  constructor(lotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute(lotId, nuevaUbicacion) {
    const lot = await this.lotRepository.findById(lotId);
    if (!lot) {
      throw new NotFoundException(`El lote con ID '${lotId}' no existe.`);
    }

    lot.cambiarUbicacion(nuevaUbicacion);
    return await this.lotRepository.update(lot);
  }
}

class RegisterMerma {
  constructor(lotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute(lotId, cantidad, razon) {
    const lot = await this.lotRepository.findById(lotId);
    if (!lot) {
      throw new NotFoundException(`El lote con ID '${lotId}' no existe.`);
    }

    lot.registrarMerma(cantidad, razon);
    return await this.lotRepository.update(lot);
  }
}

class ObtenerAlertasCaducidad {
  constructor(lotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute() {
    const activeLots = await this.lotRepository.findAllActive();
    const alerts = [];

    for (const lot of activeLots) {
      const dias = lot.calcularDiasParaVencer();
      if (dias < 15) {
        alerts.push({
          loteId: lot.id,
          numeroLote: lot.numeroLote,
          productoNombre: lot.productoNombre || 'Producto',
          diasParaVencer: dias,
          nivel: dias < 7 ? 'ROJO' : 'AMARILLO',
          ubicacion: lot.ubicacion,
          cantidadDisponible: lot.cantidadDisponible,
          fechaCaducidad: lot.fechaCaducidad
        });
      }
    }

    return alerts.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  }
}

module.exports = {
  GetLots,
  IngresarLote,
  UpdateLotLocation,
  RegisterMerma,
  ObtenerAlertasCaducidad
};
