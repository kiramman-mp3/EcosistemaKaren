const { v4: uuidv4 } = require('uuid');
const Category = require('../../domain/entities/Category');
const Product = require('../../domain/entities/Product');
const Lot = require('../../domain/entities/Lot');
const User = require('../../domain/entities/User');
const Reservation = require('../../domain/entities/Reservation');
const Alert = require('../../domain/entities/Alert');
const Promotion = require('../../domain/entities/Promotion');

class InMemoryRepositories {
  constructor() {
    this.categories = [];
    this.products = [];
    this.lots = [];
    this.users = [];
    this.reservations = [];
    this.alerts = [];
    this.promotions = [];

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
      { id: 'l9k8j7h6-1111-2222-3333-444455556666', productoId: prods[1].id, productoAliasId: 'prod-02', numeroLote: 'LOT-YG-2026-01', days: 4, qty: 50, disp: 45, ubi: 'PERCHA', prod: prods[1] },
      { id: 'l9k8j7h6-1111-2222-3333-444455556667', productoId: prods[0].id, productoAliasId: 'prod-01', numeroLote: 'LOT-VT-2026-02', days: 12, qty: 100, disp: 90, ubi: 'BODEGA', prod: prods[0] },
      { id: 'l9k8j7h6-1111-2222-3333-444455556668', productoId: prods[2].id, productoAliasId: 'prod-03', numeroLote: 'LOT-CR-2026-03', days: 6, qty: 25, disp: 18, ubi: 'PERCHA', prod: prods[2] },
      { id: 'l9k8j7h6-1111-2222-3333-444455556669', productoId: prods[3].id, productoAliasId: 'prod-04', numeroLote: 'LOT-PL-2026-04', days: 5, qty: 40, disp: 32, ubi: 'PERCHA', prod: prods[3] },
      { id: 'l9k8j7h6-1111-2222-3333-444455556670', productoId: prods[4].id, productoAliasId: 'prod-05', numeroLote: 'LOT-PN-2026-05', days: 2, qty: 30, disp: 24, ubi: 'PERCHA', prod: prods[4] },
      { id: 'l9k8j7h6-1111-2222-3333-444455556671', productoId: prods[5].id, productoAliasId: 'prod-06', numeroLote: 'LOT-BR-2026-06', days: 7, qty: 50, disp: 40, ubi: 'PERCHA', prod: prods[5] },
      { id: 'l9k8j7h6-1111-2222-3333-444455556672', productoId: prods[6].id, productoAliasId: 'prod-07', numeroLote: 'LOT-TM-2026-07', days: 5, qty: 80, disp: 65, ubi: 'PERCHA', prod: prods[6] },
      { id: 'l9k8j7h6-1111-2222-3333-444455556673', productoId: prods[7].id, productoAliasId: 'prod-08', numeroLote: 'LOT-MN-2026-08', days: 15, qty: 60, disp: 50, ubi: 'BODEGA', prod: prods[7] },
      { id: 'l9k8j7h6-1111-2222-3333-444455556674', productoId: prods[8].id, productoAliasId: 'prod-09', numeroLote: 'LOT-AT-2026-09', days: 90, qty: 100, disp: 85, ubi: 'BODEGA', prod: prods[8] }
    ];

    for (const ld of lotsData) {
      const lot = new Lot({
        id: ld.id,
        productoId: ld.productoId,
        numeroLote: ld.numeroLote,
        fechaCaducidad: new Date(now.getTime() + ld.days * 24 * 60 * 60 * 1000),
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

    this.users.push(new User({
      id: 'u8a7b6c5-1111-2222-3333-444455556666',
      nombre: 'Cliente Demo',
      email: 'cliente@karen.com',
      rol: 'CLIENTE',
      passwordHash: '$2a$10$demo'
    }));

    // Promociones IA iniciales activas
    this.promotions.push(
      new Promotion({
        id: 'promo-ia-01',
        loteId: lotsData[0].id,
        descuentoPorcentaje: 40,
        frasePromocional: '¡Oferta Flash IA! 40% OFF en Yogurt Griego Toni 500g antes de su fecha FEFO.',
        razonIa: 'Lote crítico con 4 días restantes en percha y alta rotación sugerida.',
        activa: true
      }),
      new Promotion({
        id: 'promo-ia-02',
        loteId: lotsData[4].id,
        descuentoPorcentaje: 35,
        frasePromocional: '¡Horneado del día! 35% de descuento en Pan Artesanal de Masa Madre.',
        razonIa: 'Producto de panadería de alta frescura y caducidad inmediata.',
        activa: true
      })
    );
  }

  // Repository implementations
  get categoryRepository() {
    return {
      findAll: async () => [...this.categories],
      findById: async (id) => this.categories.find(c => c.id === id) || null,
      save: async (catData) => {
        const cat = new Category({ id: uuidv4(), ...catData });
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
        const prod = new Product({ id: uuidv4(), ...prodData });
        this.products.push(prod);
        return prod;
      }
    };
  }

  get lotRepository() {
    return {
      findAllActive: async () => this.lots.filter(l => l.estado === 'ACTIVO'),
      findById: async (id) => this.lots.find(l => l.id === id) || null,
      findActiveByProductIdOrderedByExpiration: async (prodId) => {
        return this.lots
          .filter(l => (l.productoId === prodId || l.productoAliasId === prodId) && l.estado === 'ACTIVO' && l.cantidadDisponible > 0)
          .sort((a, b) => new Date(a.fechaCaducidad) - new Date(b.fechaCaducidad));
      },
      save: async (lotInstance) => {
        if (!lotInstance.id) lotInstance.id = uuidv4();
        this.lots.push(lotInstance);
        return lotInstance;
      },
      update: async (lotInstance) => {
        const idx = this.lots.findIndex(l => l.id === lotInstance.id);
        if (idx !== -1) this.lots[idx] = lotInstance;
        return lotInstance;
      }
    };
  }

  get reservationRepository() {
    return {
      findByCode: async (code) => this.reservations.find(r => r.codigoRetiro === code) || null,
      findById: async (id) => this.reservations.find(r => r.id === id) || null,
      findExpiredPending: async () => {
        const now = new Date();
        return this.reservations.filter(r => r.estado === 'PENDIENTE' && new Date(r.fechaExpiracion) < now);
      },
      saveWithDetails: async (reservationInstance, modifiedLots) => {
        if (!reservationInstance.id) reservationInstance.id = uuidv4();
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

  get userRepository() {
    return {
      findByEmail: async (email) => this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null,
      save: async (userData) => {
        const user = new User({ ...userData, id: userData.id || uuidv4() });
        this.users.push(user);
        return user;
      }
    };
  }

  get alertRepository() {
    return {
      save: async (alertData) => {
        const alert = new Alert({ ...alertData, id: alertData.id || uuidv4() });
        this.alerts.push(alert);
        return alert;
      }
    };
  }

  get promotionRepository() {
    return {
      findAllActive: async () => this.promotions.filter(p => p.activa),
      save: async (promoData) => {
        const promo = new Promotion({ ...promoData, id: promoData.id || uuidv4() });
        this.promotions.push(promo);
        return promo;
      }
    };
  }
}

module.exports = InMemoryRepositories;
