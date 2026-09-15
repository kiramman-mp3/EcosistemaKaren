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
    const catLacteos = new Category({ id: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nombre: 'Lácteos y Derivados', descripcion: 'Productos lácteos frescos' });
    const catEmbutidos = new Category({ id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', nombre: 'Embutidos y Carnes', descripcion: 'Carnes frías' });
    this.categories.push(catLacteos, catEmbutidos);

    const prodLeche = new Product({
      id: 'c8a4d2e1-1111-2222-3333-444455556666',
      categoriaId: catLacteos.id,
      codigoBarras: '7861000100011',
      nombre: 'Leche Entera Vita 1 Litro',
      descripcion: 'Leche pasteurizada UHT',
      precioVenta: 0.95,
      minStockAlerta: 20
    });

    const prodYogurt = new Product({
      id: 'c8a4d2e1-1111-2222-3333-444455556667',
      categoriaId: catLacteos.id,
      codigoBarras: '786999900011',
      nombre: 'Yogurt Griego Toni 500g',
      descripcion: 'Yogurt natural',
      precioVenta: 2.50,
      minStockAlerta: 15
    });

    this.products.push(prodLeche, prodYogurt);

    const now = new Date();
    const lotYogurt = new Lot({
      id: 'l9k8j7h6-1111-2222-3333-444455556666',
      productoId: prodYogurt.id,
      numeroLote: 'LOT-YG-2026-01',
      fechaCaducidad: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 días (ROJO)
      cantidadIngresada: 50,
      cantidadDisponible: 45,
      cantidadReservada: 0,
      ubicacion: 'PERCHA',
      estado: 'ACTIVO',
      productoNombre: prodYogurt.nombre,
      codigoBarras: prodYogurt.codigoBarras
    });

    const lotLeche = new Lot({
      id: 'l9k8j7h6-1111-2222-3333-444455556667',
      productoId: prodLeche.id,
      numeroLote: 'LOT-VT-2026-02',
      fechaCaducidad: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 días (AMARILLO)
      cantidadIngresada: 100,
      cantidadDisponible: 90,
      cantidadReservada: 0,
      ubicacion: 'BODEGA',
      estado: 'ACTIVO',
      productoNombre: prodLeche.nombre,
      codigoBarras: prodLeche.codigoBarras
    });

    this.lots.push(lotYogurt, lotLeche);

    this.users.push(new User({
      id: 'u8a7b6c5-1111-2222-3333-444455556666',
      nombre: 'Cliente Demo',
      email: 'cliente@karen.com',
      rol: 'CLIENTE',
      passwordHash: '$2a$10$demo'
    }));
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
      findById: async (id) => this.products.find(p => p.id === id) || null,
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
          .filter(l => l.productoId === prodId && l.estado === 'ACTIVO' && l.cantidadDisponible > 0)
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
        const user = new User({ id: uuidv4(), ...userData });
        this.users.push(user);
        return user;
      }
    };
  }

  get alertRepository() {
    return {
      save: async (alertData) => {
        const alert = new Alert({ id: uuidv4(), ...alertData });
        this.alerts.push(alert);
        return alert;
      }
    };
  }

  get promotionRepository() {
    return {
      findAllActive: async () => this.promotions.filter(p => p.activa),
      save: async (promoData) => {
        const promo = new Promotion({ id: uuidv4(), ...promoData });
        this.promotions.push(promo);
        return promo;
      }
    };
  }
}

module.exports = InMemoryRepositories;
