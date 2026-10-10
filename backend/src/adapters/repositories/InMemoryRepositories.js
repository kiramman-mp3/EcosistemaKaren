const { randomUUID } = require('node:crypto');
const Category = require('../../domain/entities/Category');
const Product = require('../../domain/entities/Product');
const Lot = require('../../domain/entities/Lot');
const User = require('../../domain/entities/User');
const Reservation = require('../../domain/entities/Reservation');
const Alert = require('../../domain/entities/Alert');
const Promotion = require('../../domain/entities/Promotion');
const {
  buildPromotionCacheKey,
  assertPromotableLot
} = require('../../domain/policies/PromotionPolicy');
const {
  NotFoundException,
  ValidationException,
  OverbookingException,
  ForbiddenException
} = require('../../domain/exceptions/DomainExceptions');

class InMemoryRepositories {
  constructor() {
    this.categories = [];
    this.products = [];
    this.lots = [];
    this.users = [];
    this.reservations = [];
    this.alerts = [];
    this.promotions = [];
    this.movements = [];
    this.wastes = [];

    this.seed();
  }

  seed() {
    const catLacteos = new Category({ id: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nombre: 'Lácteos', descripcion: 'Productos lácteos frescos y pasteurizados' });
    const catCarnes = new Category({ id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', nombre: 'Carnes', descripcion: 'Carnes de res, pollo y embutidos' });
    const catPan = new Category({ id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f', nombre: 'Panadería', descripcion: 'Pan artesanal recién horneado' });
    const catVerduras = new Category({ id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c70', nombre: 'Verduras', descripcion: 'Verduras frescas de granja' });
    const catFrutas = new Category({ id: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c71', nombre: 'Frutas', descripcion: 'Frutas seleccionadas' });
    const catConservas = new Category({ id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c72', nombre: 'Conservas', descripcion: 'Conservas y enlatados de calidad' });

    this.categories.push(catLacteos, catCarnes, catPan, catVerduras, catFrutas, catConservas);

    const prods = [
      { id: 'c8a4d2e1-1111-2222-3333-444455556666', aliasId: 'prod-01', categoriaId: catLacteos.id, codigoBarras: '7861000100011', nombre: 'Leche Entera Pasteurizada 1 Litro', descripcion: 'Leche pasteurizada UHT alta calidad', precioVenta: 0.95, minStockAlerta: 20 },
      { id: 'c8a4d2e1-1111-2222-3333-444455556667', aliasId: 'prod-02', categoriaId: catLacteos.id, codigoBarras: '786999900011', nombre: 'Yogurt Griego Toni Natural 500g', descripcion: 'Yogurt natural griego descremado', precioVenta: 2.50, minStockAlerta: 15 },
      { id: 'c8a4d2e1-1111-2222-3333-444455556668', aliasId: 'prod-03', categoriaId: catCarnes.id, codigoBarras: '7861234567890', nombre: 'Corte Lomo Fino de Res Premium', descripcion: 'Corte de res tierno y magro de primera', precioVenta: 6.80, minStockAlerta: 10 },
      { id: 'c8a4d2e1-1111-2222-3333-444455556669', aliasId: 'prod-04', categoriaId: catCarnes.id, codigoBarras: '7861234567891', nombre: 'Pechuga de Pollo Fresca en Filetes', descripcion: 'Pechuga de pollo sin piel ni hueso', precioVenta: 3.90, minStockAlerta: 15 },
      { id: 'c8a4d2e1-1111-2222-3333-444455556670', aliasId: 'prod-05', categoriaId: catPan.id, codigoBarras: '7861234567892', nombre: 'Pan Artesanal de Masa Madre', descripcion: 'Horneado cada mañana con fermentación natural', precioVenta: 1.85, minStockAlerta: 10 },
      { id: 'c8a4d2e1-1111-2222-3333-444455556671', aliasId: 'prod-06', categoriaId: catVerduras.id, codigoBarras: '7861234567893', nombre: 'Brócoli Fresco Orgánico de Granja', descripcion: 'Brócoli seleccionado de cosecha diaria', precioVenta: 1.10, minStockAlerta: 15 },
      { id: 'c8a4d2e1-1111-2222-3333-444455556672', aliasId: 'prod-07', categoriaId: catVerduras.id, codigoBarras: '7861234567894', nombre: 'Tomate Riñón de Invernadero', descripcion: 'Tomate rojo jugoso para ensaladas', precioVenta: 0.85, minStockAlerta: 20 },
      { id: 'c8a4d2e1-1111-2222-3333-444455556673', aliasId: 'prod-08', categoriaId: catFrutas.id, codigoBarras: '7861234567895', nombre: 'Manzana Gala Roja Importada', descripcion: 'Manzanas frescas crujientes y dulces', precioVenta: 2.20, minStockAlerta: 20 },
      { id: 'c8a4d2e1-1111-2222-3333-444455556674', aliasId: 'prod-09', categoriaId: catConservas.id, codigoBarras: '7861234567896', nombre: 'Atún en Aceite de Oliva 160g', descripcion: 'Lomo de atún sólido en aceite de oliva virgen', precioVenta: 1.65, minStockAlerta: 25 }
    ];

    for (const p of prods) {
      const prod = new Product(p);
      prod.aliasId = p.aliasId;
      this.products.push(prod);
    }

    const now = new Date();

    const lotsData = [
      { id: 'b9a8f7e6-1111-2222-3333-444455556666', productoId: prods[1].id, productoAliasId: 'prod-02', numeroLote: 'LOT-YG-2026-01', days: 4, qty: 50, disp: 45, ubi: 'PERCHA', prod: prods[1] },
      { id: 'b9a8f7e6-1111-2222-3333-444455556667', productoId: prods[0].id, productoAliasId: 'prod-01', numeroLote: 'LOT-VT-2026-02', days: 12, qty: 100, disp: 90, ubi: 'BODEGA', prod: prods[0] },
      { id: 'b9a8f7e6-1111-2222-3333-444455556668', productoId: prods[2].id, productoAliasId: 'prod-03', numeroLote: 'LOT-CR-2026-03', days: 6, qty: 25, disp: 18, ubi: 'PERCHA', prod: prods[2] },
      { id: 'b9a8f7e6-1111-2222-3333-444455556669', productoId: prods[3].id, productoAliasId: 'prod-04', numeroLote: 'LOT-PL-2026-04', days: 5, qty: 40, disp: 32, ubi: 'PERCHA', prod: prods[3] },
      { id: 'b9a8f7e6-1111-2222-3333-444455556670', productoId: prods[4].id, productoAliasId: 'prod-05', numeroLote: 'LOT-PN-2026-05', days: 2, qty: 30, disp: 24, ubi: 'PERCHA', prod: prods[4] },
      { id: 'b9a8f7e6-1111-2222-3333-444455556671', productoId: prods[5].id, productoAliasId: 'prod-06', numeroLote: 'LOT-BR-2026-06', days: 7, qty: 50, disp: 40, ubi: 'PERCHA', prod: prods[5] },
      { id: 'b9a8f7e6-1111-2222-3333-444455556672', productoId: prods[6].id, productoAliasId: 'prod-07', numeroLote: 'LOT-TM-2026-07', days: 5, qty: 80, disp: 65, ubi: 'PERCHA', prod: prods[6] },
      { id: 'b9a8f7e6-1111-2222-3333-444455556673', productoId: prods[7].id, productoAliasId: 'prod-08', numeroLote: 'LOT-MN-2026-08', days: 15, qty: 60, disp: 50, ubi: 'BODEGA', prod: prods[7] },
      { id: 'b9a8f7e6-1111-2222-3333-444455556674', productoId: prods[8].id, productoAliasId: 'prod-09', numeroLote: 'LOT-AT-2026-09', days: 90, qty: 100, disp: 85, ubi: 'BODEGA', prod: prods[8] }
    ];

    for (const ld of lotsData) {
      const lot = new Lot({
        id: ld.id,
        productoId: ld.productoId,
        numeroLote: ld.numeroLote,
        fechaElaboracion: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        fechaCaducidad: new Date(now.getTime() + ld.days * 24 * 60 * 60 * 1000),
        costoUnitario: Math.round(ld.prod.precioVenta * 0.7 * 10000) / 10000,
        cantidadIngresada: ld.qty,
        cantidadDisponible: ld.disp,
        cantidadReservada: 0,
        ubicacion: ld.ubi,
        estado: 'ACTIVO',
        productoNombre: ld.prod.nombre,
        codigoBarras: ld.prod.codigoBarras
      });
      lot.productoAliasId = ld.productoAliasId;
      this.lots.push(lot);
    }

    const demoPasswordHash = '$2a$10$Ndinx2G0HgZgjtc4N3Q4B.2dHgih47xC7LtiJ.if4rsg3wp/RMtP.';
    this.users.push(
      new User({
        id: 'd8a7b6c5-1111-2222-3333-444455556666',
        nombre: 'Cliente Demo',
        email: 'cliente@karen.com',
        rol: 'CLIENTE',
        passwordHash: demoPasswordHash
      }),
      new User({
        id: 'd8a7b6c5-1111-2222-3333-444455556667',
        nombre: 'Nancy Alvares (Bodega)',
        email: 'bodega@karen.com',
        rol: 'BODEGUERO',
        passwordHash: demoPasswordHash
      }),
      new User({
        id: 'd8a7b6c5-1111-2222-3333-444455556668',
        nombre: 'Admin Supermercado',
        email: 'admin@karen.com',
        rol: 'ADMIN',
        passwordHash: demoPasswordHash
      })
    );

    // Reserva demo activa para pruebas de caja SIACI y retiro móvil
    this.reservations.push(
      new Reservation({
        id: 'res-demo-01',
        usuarioId: 'd8a7b6c5-1111-2222-3333-444455556666',
        codigoRetiro: 'KR-X7Y9Z2',
        estado: 'PENDIENTE',
        fechaExpiracion: new Date(Date.now() + 30 * 60 * 1000),
        detalles: [
          {
            id: 'det-01',
            productoId: prods[1].id,
            productoNombre: 'Yogurt Griego Toni Natural 500g',
            loteId: lotsData[0].id,
            cantidad: 2,
            precioUnitario: 2.50
          },
          {
            id: 'det-02',
            productoId: prods[0].id,
            productoNombre: 'Leche Entera Pasteurizada 1 Litro',
            loteId: lotsData[1].id,
            cantidad: 3,
            precioUnitario: 0.95
          }
        ]
      })
    );
    this.lots[0].cantidadReservada = 2;
    this.lots[1].cantidadReservada = 3;

    // Promociones IA iniciales activas (aprobadas por defecto para catálogo demo)
    this.promotions.push(
      new Promotion({
        id: 'promo-ia-01',
        loteId: lotsData[0].id,
        descuentoPorcentaje: 40,
        frasePromocional: '¡Oferta Flash IA! 40% OFF en Yogurt Griego Toni 500g antes de su fecha FEFO.',
        razonIa: 'Lote crítico con 4 días restantes en percha y alta rotación sugerida.',
        activa: true,
        estado: 'APROBADA'
      }),
      new Promotion({
        id: 'promo-ia-02',
        loteId: lotsData[4].id,
        descuentoPorcentaje: 35,
        frasePromocional: '¡Horneado del día! 35% de descuento en Pan Artesanal de Masa Madre.',
        razonIa: 'Producto de panadería de alta frescura y caducidad inmediata.',
        activa: true,
        estado: 'APROBADA'
      })
    );
  }

  // Repository implementations
  get categoryRepository() {
    return {
      findAll: async () => [...this.categories],
      findById: async (id) => this.categories.find(c => c.id === id) || null,
      save: async (catData) => {
        const cat = new Category({ id: randomUUID(), ...catData });
        this.categories.push(cat);
        return cat;
      }
    };
  }

  get productRepository() {
    return {
      findAll: async () => [...this.products],
      findById: async (id) => this.products.find(p => p.id === id || p.aliasId === id) || null,
      findByBarcode: async (bc) => this.products.find(p => p.codigoBarras === bc) || null,
      save: async (prodData) => {
        const prod = new Product({ id: randomUUID(), ...prodData });
        this.products.push(prod);
        return prod;
      }
    };
  }

  get lotRepository() {
    return {
      findAllActive: async () => this.lots.filter(
        l => l.estado === 'ACTIVO' && l.calcularDiasParaVencer() > 0
      ),
      findById: async (id) => this.lots.find(l => l.id === id) || null,
      findActiveByProductIdOrderedByExpiration: async (prodId) => {
        return this.lots
          .filter(l =>
            (l.productoId === prodId || l.productoAliasId === prodId) &&
            l.estado === 'ACTIVO' &&
            l.calcularDiasParaVencer() > 0 &&
            l.cantidadDisponible > 0
          )
          .sort((a, b) => new Date(a.fechaCaducidad) - new Date(b.fechaCaducidad));
      },
      findForExpiryAlerts: async () => this.lots.filter(
        l => l.estado === 'ACTIVO' || l.estado === 'VENCIDO'
      ),
      markExpiredLots: async () => {
        let countExpired = 0;
        for (const lot of this.lots) {
          if (lot.estado === 'ACTIVO' && lot.calcularDiasParaVencer() <= 0) {
            lot.estado = 'VENCIDO';
            lot.updated_at = new Date();
            this.movements.push(this._newMovement({
              loteId: lot.id, tipo: 'VENCIMIENTO', cantidad: 0,
              disponibleAntes: lot.cantidadDisponible, disponibleDespues: lot.cantidadDisponible,
              reservadaAntes: lot.cantidadReservada, reservadaDespues: lot.cantidadReservada,
              ubicacionOrigen: lot.ubicacion, ubicacionDestino: lot.ubicacion,
              motivo: 'Cambio automático de estado por fecha de caducidad'
            }));
            countExpired++;
          }
        }
        return { countExpired };
      },
      save: async (lotInstance, actorId) => {
        if (!lotInstance.id) lotInstance.id = randomUUID();
        this.lots.push(lotInstance);
        this.movements.push(this._newMovement({
          loteId: lotInstance.id, tipo: 'INGRESO', cantidad: lotInstance.cantidadIngresada,
          disponibleAntes: 0, disponibleDespues: lotInstance.cantidadDisponible,
          reservadaAntes: 0, reservadaDespues: lotInstance.cantidadReservada,
          ubicacionDestino: lotInstance.ubicacion, motivo: 'Ingreso inicial de lote', actorId
        }));
        return lotInstance;
      },
      update: async (lotInstance) => {
        const idx = this.lots.findIndex(l => l.id === lotInstance.id);
        if (idx !== -1) this.lots[idx] = lotInstance;
        return lotInstance;
      },
      changeLocationWithAudit: async (lotId, location, actorId) => {
        const lot = this.lots.find(l => l.id === lotId);
        if (!lot) throw new NotFoundException(`El lote con ID '${lotId}' no existe.`);
        const previous = lot.ubicacion;
        lot.cambiarUbicacion(location);
        if (previous === lot.ubicacion) throw new ValidationException(`El lote ya se encuentra en ${lot.ubicacion}.`);
        lot.updated_at = new Date();
        this.movements.push(this._newMovement({
          loteId: lotId, tipo: 'TRASLADO', cantidad: 0,
          disponibleAntes: lot.cantidadDisponible, disponibleDespues: lot.cantidadDisponible,
          reservadaAntes: lot.cantidadReservada, reservadaDespues: lot.cantidadReservada,
          ubicacionOrigen: previous, ubicacionDestino: lot.ubicacion,
          motivo: 'Traslado autorizado de inventario', actorId
        }));
        return lot;
      },
      registerWasteWithAudit: async (lotId, cantidad, razon, actorId) => {
        const lot = this.lots.find(l => l.id === lotId);
        if (!lot) throw new NotFoundException(`El lote con ID '${lotId}' no existe.`);
        const before = lot.cantidadDisponible;
        lot.registrarMerma(cantidad, razon);
        lot.updated_at = new Date();
        const movement = this._newMovement({
          loteId: lotId, tipo: 'MERMA', cantidad: Number(cantidad),
          disponibleAntes: before, disponibleDespues: lot.cantidadDisponible,
          reservadaAntes: lot.cantidadReservada, reservadaDespues: lot.cantidadReservada,
          ubicacionOrigen: lot.ubicacion, ubicacionDestino: lot.ubicacion,
          motivo: razon.trim(), actorId
        });
        const waste = {
          id: randomUUID(), loteId: lotId, movimientoId: movement.id, cantidad: Number(cantidad),
          razon: razon.trim(), costoUnitario: lot.costoUnitario,
          costoTotal: lot.costoUnitario === null ? null : Math.round(lot.costoUnitario * Number(cantidad) * 10000) / 10000,
          registradaPor: actorId, created_at: new Date()
        };
        this.movements.push(movement);
        this.wastes.push(waste);
        return { lote: lot, merma: waste, movimiento: movement };
      },
      findMovements: async ({ loteId, tipo, limit } = {}) => this.movements
        .filter(m => (!loteId || m.loteId === loteId) && (!tipo || m.tipo === String(tipo).toUpperCase()))
        .slice(-(Math.min(Number(limit) || 100, 500))).reverse(),
      findWastes: async ({ loteId, limit } = {}) => this.wastes
        .filter(w => !loteId || w.loteId === loteId)
        .slice(-(Math.min(Number(limit) || 100, 500))).reverse()
    };
  }

  _newMovement(data) {
    return { id: randomUUID(), ...data, reservaId: data.reservaId || null, metadata: data.metadata || {}, created_at: new Date() };
  }

  get reservationRepository() {
    return {
      findByCode: async (code) => this.reservations.find(r => r.codigoRetiro === code) || null,
      findById: async (id) => this.reservations.find(r => r.id === id) || null,
      findByUserId: async (userId, { limit = 50, offset = 0 } = {}) => this.reservations
        .filter(r => r.usuarioId === userId)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(offset, offset + limit),
      findExpiredPending: async () => {
        const now = new Date();
        return this.reservations.filter(r => r.estado === 'PENDIENTE' && new Date(r.fechaExpiracion) < now);
      },
      createWithLockedStock: async (reservationInstance, items) => {
        const allocationPlan = [];
        for (const item of items) {
          const product = this.products.find(p => p.id === item.productoId || p.aliasId === item.productoId);
          if (!product) {
            throw new NotFoundException(`El producto con ID '${item.productoId}' no existe.`);
          }
          const lots = this.lots
            .filter(l =>
              (l.productoId === product.id || l.productoAliasId === item.productoId) &&
              l.estado === 'ACTIVO' &&
              l.calcularDiasParaVencer() > 0 &&
              l.cantidadDisponible > 0
            )
            .sort((a, b) => new Date(a.fechaCaducidad) - new Date(b.fechaCaducidad));
          const available = lots.reduce((sum, lot) => sum + lot.cantidadDisponible, 0);
          if (available < item.cantidad) {
            throw new OverbookingException(
              `Stock insuficiente para '${product.nombre}'. Solicitado: ${item.cantidad}, Disponible en tienda: ${available}`
            );
          }

          let remaining = item.cantidad;
          for (const lot of lots) {
            if (remaining === 0) break;
            const quantity = Math.min(lot.cantidadDisponible, remaining);
            allocationPlan.push({ lot, quantity, price: product.precioVenta });
            remaining -= quantity;
          }
        }

        reservationInstance.id = reservationInstance.id || randomUUID();
        reservationInstance.detalles = allocationPlan.map(allocation => {
          const disponibleAntes = allocation.lot.cantidadDisponible;
          const reservadaAntes = allocation.lot.cantidadReservada;
          allocation.lot.reservar(allocation.quantity);
          this.movements.push(this._newMovement({
            loteId: allocation.lot.id, tipo: 'RESERVA', cantidad: allocation.quantity,
            disponibleAntes, disponibleDespues: allocation.lot.cantidadDisponible,
            reservadaAntes, reservadaDespues: allocation.lot.cantidadReservada,
            ubicacionOrigen: allocation.lot.ubicacion, ubicacionDestino: allocation.lot.ubicacion,
            motivo: 'Stock asignado a reserva', actorId: reservationInstance.usuarioId,
            reservaId: reservationInstance.id
          }));
          return {
            id: randomUUID(),
            reservaId: reservationInstance.id,
            loteId: allocation.lot.id,
            cantidad: allocation.quantity,
            precioUnitario: allocation.price
          };
        });
        this.reservations.push(reservationInstance);
        return reservationInstance;
      },
      confirmWithLockedStock: async (reservationId, actor) => {
        const reservation = this.reservations.find(r => r.id === reservationId);
        if (!reservation) throw new NotFoundException(`Reserva con ID '${reservationId}' no encontrada.`);
        if (reservation.estado !== 'PENDIENTE') {
          throw new ValidationException(`No se puede confirmar una reserva en estado ${reservation.estado}.`);
        }
        if (reservation.estaExpirada()) {
          this._releaseInMemoryReservation(reservation, {
            actorId: actor?.id, motivo: 'Liberación por reserva expirada al intentar confirmarla'
          });
          reservation.marcarExpirada();
          throw new ValidationException('La reserva expiró y su stock fue liberado.');
        }
        for (const detail of reservation.detalles) {
          const lot = this.lots.find(l => l.id === detail.loteId);
          if (!lot || lot.cantidadReservada < detail.cantidad) {
            throw new ValidationException(`Stock reservado inconsistente para el lote '${detail.loteId}'.`);
          }
        }
        for (const detail of reservation.detalles) {
          const lot = this.lots.find(l => l.id === detail.loteId);
          const reservadaAntes = lot.cantidadReservada;
          lot.confirmarVentaReservada(detail.cantidad);
          this.movements.push(this._newMovement({
            loteId: lot.id, tipo: 'VENTA', cantidad: detail.cantidad,
            disponibleAntes: lot.cantidadDisponible, disponibleDespues: lot.cantidadDisponible,
            reservadaAntes, reservadaDespues: lot.cantidadReservada,
            motivo: 'Venta confirmada desde reserva', actorId: actor?.id,
            reservaId: reservation.id
          }));
        }
        reservation.confirmar();
        return reservation;
      },
      cancelWithLockedStock: async (reservationId, actor) => {
        const reservation = this.reservations.find(r => r.id === reservationId);
        if (!reservation) throw new NotFoundException(`Reserva con ID '${reservationId}' no encontrada.`);
        if (actor.rol !== 'ADMIN' && reservation.usuarioId !== actor.id) {
          throw new ForbiddenException('Solo el propietario o un administrador puede cancelar la reserva.');
        }
        if (reservation.estado !== 'PENDIENTE') {
          throw new ValidationException(`No se puede cancelar una reserva en estado ${reservation.estado}.`);
        }
        this._releaseInMemoryReservation(reservation, {
          actorId: actor.id, motivo: 'Liberación por cancelación'
        });
        if (reservation.estaExpirada()) {
          reservation.marcarExpirada();
          throw new ValidationException('La reserva ya había expirado; su stock fue liberado.');
        }
        reservation.cancelar();
        return reservation;
      },
      expirePendingWithLockedStock: async () => {
        const expired = this.reservations.filter(r => r.estaExpirada());
        for (const reservation of expired) {
          this._releaseInMemoryReservation(reservation, { motivo: 'Liberación automática por expiración' });
          reservation.marcarExpirada();
        }
        return { countLiberadas: expired.length };
      },
      saveWithDetails: async (reservationInstance, modifiedLots) => {
        if (!reservationInstance.id) reservationInstance.id = randomUUID();
        this.reservations.push(reservationInstance);

        for (const ml of modifiedLots) {
          const idx = this.lots.findIndex(l => l.id === ml.id);
          if (idx !== -1) this.lots[idx] = ml;
        }
        return reservationInstance;
      },
      update: async (reservationInstance) => {
        const idx = this.reservations.findIndex(r => r.id === reservationInstance.id);
        if (idx !== -1) this.reservations[idx] = reservationInstance;
        return reservationInstance;
      }
    };
  }

  _releaseInMemoryReservation(reservation, context = {}) {
    for (const detail of reservation.detalles) {
      const lot = this.lots.find(l => l.id === detail.loteId);
      if (!lot || lot.cantidadReservada < detail.cantidad) {
        throw new ValidationException(`Stock reservado inconsistente para el lote '${detail.loteId}'.`);
      }
    }
    for (const detail of reservation.detalles) {
      const lot = this.lots.find(l => l.id === detail.loteId);
      const disponibleAntes = lot.cantidadDisponible;
      const reservadaAntes = lot.cantidadReservada;
      lot.liberar(detail.cantidad);
      this.movements.push(this._newMovement({
        loteId: lot.id, tipo: 'LIBERACION', cantidad: detail.cantidad,
        disponibleAntes, disponibleDespues: lot.cantidadDisponible,
        reservadaAntes, reservadaDespues: lot.cantidadReservada,
        motivo: context.motivo || 'Liberación de stock reservado',
        actorId: context.actorId || null, reservaId: reservation.id
      }));
    }
  }

  get userRepository() {
    return {
      findByEmail: async (email) => this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null,
      save: async (userData) => {
        const user = new User({ ...userData, id: userData.id || randomUUID() });
        this.users.push(user);
        return user;
      }
    };
  }

  get alertRepository() {
    return {
      save: async (alertData) => {
        const alert = new Alert({ ...alertData, id: alertData.id || randomUUID() });
        this.alerts.push(alert);
        return alert;
      }
    };
  }

  get promotionRepository() {
    const isPubliclyValid = (promotion) => {
      if (promotion.estado !== 'APROBADA' || !promotion.activa) return false;
      const lot = this.lots.find(item => item.id === promotion.loteId);
      if (!lot) return false;
      try {
        assertPromotableLot(lot);
        return true;
      } catch {
        return false;
      }
    };

    return {
      findAllApproved: async () => this.promotions.filter(isPubliclyValid),
      findAllActive: async () => this.promotions.filter(isPubliclyValid),
      findAllPending: async () => this.promotions.filter(p => p.estado === 'PENDIENTE_APROBACION'),
      findById: async (id) => this.promotions.find(p => p.id === id) || null,
      savePending: async ({
        loteId, descuentoPorcentaje, frasePromocional, razonIa,
        modeloIa, promptVersion, cacheKey, cacheHit
      }) => {
        const existing = this.promotions.find(
          p => p.loteId === loteId && p.cacheKey === cacheKey && p.estado === 'PENDIENTE_APROBACION'
        );
        if (existing) {
          const duplicate = new Promotion({ ...existing, cacheHit: true });
          duplicate._isDuplicate = true;
          return duplicate;
        }
        const promo = new Promotion({
          id: randomUUID(),
          loteId,
          descuentoPorcentaje,
          frasePromocional,
          razonIa,
          activa: false,
          estado: 'PENDIENTE_APROBACION',
          modeloIa,
          promptVersion,
          cacheKey,
          cacheHit: Boolean(cacheHit),
        });
        this.promotions.push(promo);
        return promo;
      },
      approve: async (promotionId, adminUserId) => {
        const promo = this.promotions.find(p => p.id === promotionId);
        if (!promo || promo.estado !== 'PENDIENTE_APROBACION') {
          throw new ValidationException('No se puede aprobar: la promoción no existe o no está en PENDIENTE_APROBACION.');
        }
        const lot = this.lots.find(item => item.id === promo.loteId);
        assertPromotableLot(lot);
        const product = this.products.find(item => item.id === lot.productoId);
        if (!product) {
          throw new ValidationException('El producto asociado a la promoción ya no existe.');
        }
        const currentCacheKey = buildPromotionCacheKey({
          loteId: lot.id,
          fechaCaducidad: lot.fechaCaducidad,
          cantidadDisponible: lot.cantidadDisponible,
          precioVenta: product.precioVenta,
          promptVersion: promo.promptVersion,
          modelName: promo.modeloIa
        });
        if (currentCacheKey !== promo.cacheKey) {
          throw new ValidationException(
            'El inventario o precio cambió desde la generación. Genere un nuevo borrador antes de aprobar.'
          );
        }
        for (const previous of this.promotions) {
          if (previous.loteId === promo.loteId && previous.estado === 'APROBADA' && previous.activa) {
            previous.activa = false;
          }
        }
        promo.estado = 'APROBADA';
        promo.activa = true;
        promo.aprobadaPor = adminUserId;
        promo.aprobadaAt = new Date();
        return promo;
      },
      reject: async (promotionId, adminUserId, motivoRechazo) => {
        const promo = this.promotions.find(p => p.id === promotionId);
        if (!promo || promo.estado !== 'PENDIENTE_APROBACION') {
          throw new ValidationException('No se puede rechazar: la promoción no existe o no está en PENDIENTE_APROBACION.');
        }
        promo.estado = 'RECHAZADA';
        promo.activa = false;
        promo.rechazadaPor = adminUserId;
        promo.rechazadaAt = new Date();
        promo.motivoRechazo = motivoRechazo;
        return promo;
      },
      save: async (promoData) => {
        const promo = new Promotion({ ...promoData, id: promoData.id || randomUUID() });
        this.promotions.push(promo);
        return promo;
      }
    };
  }
}

module.exports = InMemoryRepositories;
