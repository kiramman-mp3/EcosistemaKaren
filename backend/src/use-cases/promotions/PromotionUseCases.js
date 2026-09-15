const { NotFoundException, ValidationException } = require('../../domain/exceptions/DomainExceptions');

class GenerarPromocionesIA {
  constructor(lotRepository, promotionRepository, geminiAdapter) {
    this.lotRepository = lotRepository;
    this.promotionRepository = promotionRepository;
    this.geminiAdapter = geminiAdapter;
  }

  async execute({ loteId }) {
    if (!loteId) {
      throw new ValidationException('Debe proporcionar el loteId para generar la promoción.');
    }

    const lot = await this.lotRepository.findById(loteId);
    if (!lot) {
      throw new NotFoundException(`El lote con ID '${loteId}' no existe.`);
    }

    const diasParaVencer = lot.calcularDiasParaVencer();
    
    // Invocación a Gemini AI con prompt optimizado y fallback local
    const promoIa = await this.geminiAdapter.generarEstrategiaPromocional({
      loteId: lot.id,
      numeroLote: lot.numeroLote,
      productoNombre: lot.productoNombre || 'Producto',
      diasParaVencer,
      cantidadDisponible: lot.cantidadDisponible,
      ubicacion: lot.ubicacion
    });

    const promotion = await this.promotionRepository.save({
      loteId: lot.id,
      descuentoPorcentaje: promoIa.descuentoPorcentaje,
      frasePromocional: promoIa.frasePromocional,
      razonIa: promoIa.razonIa,
      activa: true
    });

    return promotion;
  }
}

class GetPromotions {
  constructor(promotionRepository) {
    this.promotionRepository = promotionRepository;
  }

  async execute() {
    return await this.promotionRepository.findAllActive();
  }
}

module.exports = {
  GenerarPromocionesIA,
  GetPromotions
};
