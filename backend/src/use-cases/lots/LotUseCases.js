const { NotFoundException, ValidationException, ForbiddenException } = require('../../domain/exceptions/DomainExceptions');
const Lot = require('../../domain/entities/Lot');
const Alert = require('../../domain/entities/Alert');
const { classifyExpiryDays, isExpiryAlertLevel } = require('../../domain/policies/BusinessRules');
const { toDateOnly } = require('../../domain/policies/BusinessDates');
const { assertCanChangePrice, assertValidPrice } = require('../products/ProductUseCases');

class GetLots {
  constructor(lotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute() {
    return await this.lotRepository.findAllActive();
  }
}

class GetPublicLotAvailability {
  constructor(lotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute({ productoId } = {}) {
    const lots = await this.lotRepository.findAllActive();
    return lots
      .filter(lot => !productoId || lot.productoId === productoId)
      .filter(lot => lot.calcularDiasParaVencer() > 0 && lot.cantidadDisponible > 0)
      .map(lot => ({
        id: lot.id,
        productoId: lot.productoId,
        fechaCaducidad: toDateOnly(lot.fechaCaducidad),
        cantidadIngresada: lot.cantidadIngresada,
        cantidadDisponible: lot.cantidadDisponible,
        estado: lot.estado
      }));
  }
}

class IngresarLote {
  constructor(lotRepository, productRepository, alertRepository, alertStreamManager) {
    this.lotRepository = lotRepository;
    this.productRepository = productRepository;
    this.alertRepository = alertRepository;
    this.alertStreamManager = alertStreamManager;
  }

  async execute(lotData, actor) {
    if (!actor || !['BODEGUERO', 'ADMIN'].includes(actor.rol)) {
      throw new ForbiddenException('Solo BODEGUERO o ADMIN puede ingresar lotes.');
    }
    if (!lotData.fechaElaboracion) {
      throw new ValidationException('La fechaElaboracion es obligatoria para registrar un lote.');
    }
    if (lotData.costoUnitario === undefined || lotData.costoUnitario === null || lotData.costoUnitario === '') {
      throw new ValidationException('El costoUnitario es obligatorio para registrar un lote.');
    }
    // Nuevo PVP opcional junto con el lote: solo el ADMIN, y se guarda en la misma transacción.
    const { nuevoPrecioVenta, ...lotFields } = lotData;
    const hasNewPrice = nuevoPrecioVenta !== undefined && nuevoPrecioVenta !== null && nuevoPrecioVenta !== '';
    if (hasNewPrice) assertCanChangePrice(actor);
    const newPrice = hasNewPrice ? assertValidPrice(nuevoPrecioVenta) : null;

    const product = await this.productRepository.findById(lotFields.productoId);
    if (!product) {
      throw new NotFoundException(`El producto con ID '${lotFields.productoId}' no fue encontrado.`);
    }

    const newLot = new Lot(lotFields);
    newLot.productoNombre = product.nombre;
    newLot.codigoBarras = product.codigoBarras;

    // Alerta de caducidad si el lote vence pronto.
    const buildAlert = (lot) => {
      const dias = lot.calcularDiasParaVencer();
      const nivel = classifyExpiryDays(dias);
      if (!isExpiryAlertLevel(nivel)) return null;
      return new Alert({
        loteId: lot.id,
        diasParaVencer: dias,
        nivel,
        numeroLote: lot.numeroLote,
        productoNombre: product.nombre,
        ubicacion: lot.ubicacion
      });
    };

    // El repositorio de PostgreSQL guarda lote y alerta en una sola transacción; los demás
    // (en memoria) la guardan después por separado.
    const savedLot = await this.lotRepository.save(newLot, actor.id, buildAlert, { nuevoPrecioVenta: newPrice });
    const alert = 'alertaGenerada' in savedLot ? savedLot.alertaGenerada : buildAlert(savedLot);
    if (alert) {
      if (!('alertaGenerada' in savedLot) && this.alertRepository) {
        await this.alertRepository.save(alert);
      }

      // Transmitir evento en tiempo real vía SSE
      if (this.alertStreamManager) {
        this.alertStreamManager.broadcastAlert({
          tipo: 'NUEVO_LOTE_CADUCIDAD_CERCANA',
          loteId: savedLot.id,
          numeroLote: savedLot.numeroLote,
          productoNombre: product.nombre,
          diasParaVencer: alert.diasParaVencer,
          nivel: alert.nivel,
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

  async execute(lotId, nuevaUbicacion, actor) {
    if (!actor || !['BODEGUERO', 'PERCHERO', 'ADMIN'].includes(actor.rol)) {
      throw new ForbiddenException('No tiene autorización para trasladar lotes.');
    }
    if (typeof this.lotRepository.changeLocationWithAudit === 'function') {
      return this.lotRepository.changeLocationWithAudit(lotId, nuevaUbicacion, actor.id);
    }
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

  async execute(lotId, cantidad, razon, actor) {
    if (!actor || !['BODEGUERO', 'PERCHERO', 'ADMIN'].includes(actor.rol)) {
      throw new ForbiddenException('No tiene autorización para registrar mermas.');
    }
    if (typeof this.lotRepository.registerWasteWithAudit === 'function') {
      return this.lotRepository.registerWasteWithAudit(lotId, cantidad, razon, actor.id);
    }
    const lot = await this.lotRepository.findById(lotId);
    if (!lot) {
      throw new NotFoundException(`El lote con ID '${lotId}' no existe.`);
    }

    lot.registrarMerma(cantidad, razon);
    return await this.lotRepository.update(lot);
  }
}

class GetInventoryMovements {
  constructor(lotRepository) { this.lotRepository = lotRepository; }

  async execute(filters, actor) {
    if (!actor || !['BODEGUERO', 'PERCHERO', 'ADMIN'].includes(actor.rol)) {
      throw new ForbiddenException('No tiene autorización para consultar movimientos.');
    }
    const safeFilters = validateAuditFilters(filters, true);
    return this.lotRepository.findMovements(safeFilters);
  }
}

class GetWastes {
  constructor(lotRepository) { this.lotRepository = lotRepository; }

  async execute(filters, actor) {
    if (!actor || !['BODEGUERO', 'PERCHERO', 'ADMIN'].includes(actor.rol)) {
      throw new ForbiddenException('No tiene autorización para consultar mermas.');
    }
    return this.lotRepository.findWastes(validateAuditFilters(filters, false));
  }
}

// Días que abarca cada período del resumen, contados como días completos del negocio: "hoy" empieza
// a la medianoche de hoy y "7d" a la de hace seis días, así un período siempre incluye el día en curso.
const SUMMARY_PERIOD_DAYS = Object.freeze({ hoy: 1, '7d': 7, '30d': 30 });

/** Inicio del período en la zona horaria del negocio (process.env.TZ). */
function summaryPeriodStart(periodo, now = new Date()) {
  const days = SUMMARY_PERIOD_DAYS[periodo];
  if (!days) throw new ValidationException('El período debe ser hoy, 7d o 30d.');
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
}

class GetInventorySummary {
  constructor(lotRepository, clock = () => new Date()) {
    this.lotRepository = lotRepository;
    this.clock = clock;
  }

  // Totales del mismo período para todas las cifras: antes el reporte sumaba las ventas de los últimos
  // 200 movimientos (horas) y la merma de las últimas 200 bajas (semanas), que no se podían comparar.
  async execute({ periodo = '7d' } = {}, actor) {
    if (!actor || !['BODEGUERO', 'PERCHERO', 'ADMIN'].includes(actor.rol)) {
      throw new ForbiddenException('No tiene autorización para consultar el resumen de inventario.');
    }
    const hasta = this.clock();
    const desde = summaryPeriodStart(periodo, hasta);
    const totals = await this.lotRepository.summarizeInventory({ desde, hasta });
    return { periodo, desde: desde.toISOString(), hasta: hasta.toISOString(), ...totals };
  }
}

function validateAuditFilters(filters = {}, allowType) {
  const result = {};
  if (filters.loteId) {
    const uuid = String(filters.loteId);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
      throw new ValidationException('El filtro loteId debe ser un UUID válido.');
    }
    result.loteId = uuid;
  }
  if (allowType && filters.tipo) {
    const type = String(filters.tipo).toUpperCase();
    const allowed = ['INGRESO', 'TRASLADO', 'MERMA', 'RESERVA', 'LIBERACION', 'VENTA', 'VENCIMIENTO', 'AJUSTE'];
    if (!allowed.includes(type)) throw new ValidationException('El tipo de movimiento no es válido.');
    result.tipo = type;
  }
  if (filters.limit !== undefined) {
    const limit = Number(filters.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new ValidationException('El límite debe ser un entero entre 1 y 500.');
    }
    result.limit = limit;
  }
  return result;
}

class ObtenerAlertasCaducidad {
  constructor(lotRepository, alertRepository = null) {
    this.lotRepository = lotRepository;
    this.alertRepository = alertRepository;
  }

  async execute(filters = {}) {
    if (this.alertRepository && typeof this.alertRepository.findAll === 'function') {
      const persisted = await this.alertRepository.findAll(filters);
      const hasFilters = filters && Object.keys(filters).length > 0;
      if ((persisted && persisted.length > 0) || hasFilters) {
        return persisted;
      }
    }

    const activeLots = await this.lotRepository.findForExpiryAlerts();
    const alerts = [];

    for (const lot of activeLots) {
      const dias = lot.calcularDiasParaVencer();
      const nivel = classifyExpiryDays(dias);
      if (nivel !== 'NORMAL') {
        alerts.push({
          id: `alerta-${lot.id}`,
          loteId: lot.id,
          numeroLote: lot.numeroLote,
          productoNombre: lot.productoNombre || 'Producto',
          codigoBarras: lot.codigoBarras,
          diasParaVencer: dias,
          nivel,
          ubicacion: lot.ubicacion,
          cantidadDisponible: lot.cantidadDisponible,
          cantidadReservada: lot.cantidadReservada,
          fechaCaducidad: toDateOnly(lot.fechaCaducidad)
        });
      }
    }

    return alerts.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  }
}

class AtenderAlertaCaducidad {
  constructor(alertRepository) {
    this.alertRepository = alertRepository;
  }

  async execute(alertId) {
    if (!alertId) {
      throw new ValidationException('El ID de la alerta es requerido.');
    }
    if (!this.alertRepository || typeof this.alertRepository.findById !== 'function') {
      throw new ValidationException('Repositorio de alertas no disponible.');
    }
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException(`La alerta con ID '${alertId}' no existe.`);
    }
    return await this.alertRepository.markAsAttended(alertId);
  }
}

class ExpireLots {
  constructor(lotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute() {
    return this.lotRepository.markExpiredLots();
  }
}

module.exports = {
  GetLots,
  GetPublicLotAvailability,
  IngresarLote,
  UpdateLotLocation,
  RegisterMerma,
  GetInventoryMovements,
  GetWastes,
  GetInventorySummary,
  summaryPeriodStart,
  SUMMARY_PERIOD_DAYS,
  ObtenerAlertasCaducidad,
  AtenderAlertaCaducidad,
  ExpireLots
};
