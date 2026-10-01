const Category = require('../../domain/entities/Category');
const Product = require('../../domain/entities/Product');
const Lot = require('../../domain/entities/Lot');
const User = require('../../domain/entities/User');
const Reservation = require('../../domain/entities/Reservation');
const Alert = require('../../domain/entities/Alert');
const Promotion = require('../../domain/entities/Promotion');

class PostgresCategoryRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAll() {
    const res = await this.pool.query('SELECT id, nombre, descripcion, created_at FROM categorias ORDER BY nombre ASC');
    return res.rows.map(r => new Category(r));
  }

  async findById(id) {
    const res = await this.pool.query('SELECT id, nombre, descripcion, created_at FROM categorias WHERE id = $1', [id]);
    return res.rows.length ? new Category(res.rows[0]) : null;
  }

  async save(category) {
    const res = await this.pool.query(
      `INSERT INTO categorias (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING id, nombre, descripcion, created_at`,
      [category.nombre, category.descripcion]
    );
    return new Category(res.rows[0]);
  }
}

class PostgresProductRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAll() {
    const res = await this.pool.query(`
      SELECT p.id, p.categoria_id as "categoriaId", p.codigo_barras as "codigoBarras",
             p.nombre, p.descripcion, p.precio_venta as "precioVenta",
             p.min_stock_alerta as "minStockAlerta", p.created_at, p.updated_at
      FROM productos p
      ORDER BY p.nombre ASC
    `);
    return res.rows.map(r => new Product(r));
  }

  async findById(id) {
    const res = await this.pool.query(`
      SELECT p.id, p.categoria_id as "categoriaId", p.codigo_barras as "codigoBarras",
             p.nombre, p.descripcion, p.precio_venta as "precioVenta",
             p.min_stock_alerta as "minStockAlerta", p.created_at, p.updated_at
      FROM productos p
      WHERE p.id = $1
    `, [id]);
    return res.rows.length ? new Product(res.rows[0]) : null;
  }

  async findByBarcode(barcode) {
    const res = await this.pool.query(`
      SELECT p.id, p.categoria_id as "categoriaId", p.codigo_barras as "codigoBarras",
             p.nombre, p.descripcion, p.precio_venta as "precioVenta",
             p.min_stock_alerta as "minStockAlerta", p.created_at, p.updated_at
      FROM productos p
      WHERE p.codigo_barras = $1
    `, [barcode]);
    return res.rows.length ? new Product(res.rows[0]) : null;
  }

  async save(product) {
    const res = await this.pool.query(
      `INSERT INTO productos (categoria_id, codigo_barras, nombre, descripcion, precio_venta, min_stock_alerta)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, categoria_id as "categoriaId", codigo_barras as "codigoBarras",
                 nombre, descripcion, precio_venta as "precioVenta",
                 min_stock_alerta as "minStockAlerta", created_at, updated_at`,
      [product.categoriaId, product.codigoBarras, product.nombre, product.descripcion, product.precioVenta, product.minStockAlerta]
    );
    return new Product(res.rows[0]);
  }
}

class PostgresLotRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAllActive() {
    const res = await this.pool.query(`
      SELECT l.id, l.producto_id as "productoId", l.numero_lote as "numeroLote",
             l.fecha_caducidad as "fechaCaducidad", l.cantidad_ingresada as "cantidadIngresada",
             l.cantidad_disponible as "cantidadDisponible", l.cantidad_reservada as "cantidadReservada",
             l.ubicacion, l.estado, l.created_at, l.updated_at,
             p.nombre as "productoNombre", p.codigo_barras as "codigoBarras"
      FROM lotes l
      JOIN productos p ON p.id = l.producto_id
      WHERE l.estado = 'ACTIVO'
      ORDER BY l.fecha_caducidad ASC
    `);
    return res.rows.map(r => new Lot(r));
  }

  async findById(id) {
    const res = await this.pool.query(`
      SELECT l.id, l.producto_id as "productoId", l.numero_lote as "numeroLote",
             l.fecha_caducidad as "fechaCaducidad", l.cantidad_ingresada as "cantidadIngresada",
             l.cantidad_disponible as "cantidadDisponible", l.cantidad_reservada as "cantidadReservada",
             l.ubicacion, l.estado, l.created_at, l.updated_at,
             p.nombre as "productoNombre", p.codigo_barras as "codigoBarras"
      FROM lotes l
      JOIN productos p ON p.id = l.producto_id
      WHERE l.id = $1
    `, [id]);
    return res.rows.length ? new Lot(res.rows[0]) : null;
  }

  async findActiveByProductIdOrderedByExpiration(productId) {
    const res = await this.pool.query(`
      SELECT l.id, l.producto_id as "productoId", l.numero_lote as "numeroLote",
             l.fecha_caducidad as "fechaCaducidad", l.cantidad_ingresada as "cantidadIngresada",
             l.cantidad_disponible as "cantidadDisponible", l.cantidad_reservada as "cantidadReservada",
             l.ubicacion, l.estado, l.created_at, l.updated_at,
             p.nombre as "productoNombre", p.codigo_barras as "codigoBarras"
      FROM lotes l
      JOIN productos p ON p.id = l.producto_id
      WHERE l.producto_id = $1 AND l.estado = 'ACTIVO' AND l.cantidad_disponible > 0
      ORDER BY l.fecha_caducidad ASC
    `, [productId]);
    return res.rows.map(r => new Lot(r));
  }

  async save(lot) {
    const res = await this.pool.query(
      `INSERT INTO lotes (producto_id, numero_lote, fecha_caducidad, cantidad_ingresada, cantidad_disponible, cantidad_reservada, ubicacion, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, producto_id as "productoId", numero_lote as "numeroLote",
                 fecha_caducidad as "fechaCaducidad", cantidad_ingresada as "cantidadIngresada",
                 cantidad_disponible as "cantidadDisponible", cantidad_reservada as "cantidadReservada",
                 ubicacion, estado, created_at, updated_at`,
      [lot.productoId, lot.numeroLote, lot.fechaCaducidad, lot.cantidadIngresada, lot.cantidadDisponible, lot.cantidadReservada, lot.ubicacion, lot.estado]
    );
    const saved = new Lot(res.rows[0]);
    saved.productoNombre = lot.productoNombre;
    saved.codigoBarras = lot.codigoBarras;
    return saved;
  }

  async update(lot) {
    const res = await this.pool.query(
      `UPDATE lotes
       SET cantidad_disponible = $1, cantidad_reservada = $2, ubicacion = $3, estado = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, producto_id as "productoId", numero_lote as "numeroLote",
                 fecha_caducidad as "fechaCaducidad", cantidad_ingresada as "cantidadIngresada",
                 cantidad_disponible as "cantidadDisponible", cantidad_reservada as "cantidadReservada",
                 ubicacion, estado, created_at, updated_at`,
      [lot.cantidadDisponible, lot.cantidadReservada, lot.ubicacion, lot.estado, lot.id]
    );
    const updated = new Lot(res.rows[0]);
    updated.productoNombre = lot.productoNombre;
    updated.codigoBarras = lot.codigoBarras;
    return updated;
  }
}

class PostgresReservationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByCode(code) {
    const resHead = await this.pool.query(`
      SELECT id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
             estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
      FROM reservas
      WHERE codigo_retiro = $1
    `, [code]);

    if (!resHead.rows.length) return null;

    const resDetails = await this.pool.query(`
      SELECT id, reserva_id as "reservaId", lote_id as "loteId",
             cantidad, precio_unitario as "precioUnitario"
      FROM reserva_detalles
      WHERE reserva_id = $1
    `, [resHead.rows[0].id]);

    const reservation = new Reservation(resHead.rows[0]);
    reservation.detalles = resDetails.rows;
    return reservation;
  }

  async findById(id) {
    const resHead = await this.pool.query(`
      SELECT id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
             estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
      FROM reservas
      WHERE id = $1
    `, [id]);

    if (!resHead.rows.length) return null;

    const resDetails = await this.pool.query(`
      SELECT id, reserva_id as "reservaId", lote_id as "loteId",
             cantidad, precio_unitario as "precioUnitario"
      FROM reserva_detalles
      WHERE reserva_id = $1
    `, [id]);

    const reservation = new Reservation(resHead.rows[0]);
    reservation.detalles = resDetails.rows;
    return reservation;
  }

  async findByUserId(userId) {
    const resHead = await this.pool.query(`
      SELECT id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
             estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
      FROM reservas
      WHERE usuario_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    const list = [];
    for (const row of resHead.rows) {
      const resDetails = await this.pool.query(`
        SELECT id, reserva_id as "reservaId", lote_id as "loteId",
               cantidad, precio_unitario as "precioUnitario"
        FROM reserva_detalles
        WHERE reserva_id = $1
      `, [row.id]);
      const r = new Reservation(row);
      r.detalles = resDetails.rows;
      list.push(r);
    }
    return list;
  }

  async findExpiredPending() {
    const resHead = await this.pool.query(`
      SELECT id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
             estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
      FROM reservas
      WHERE estado = 'PENDIENTE' AND fecha_expiracion < CURRENT_TIMESTAMP
    `);

    const list = [];
    for (const row of resHead.rows) {
      const resDetails = await this.pool.query(`
        SELECT id, reserva_id as "reservaId", lote_id as "loteId",
               cantidad, precio_unitario as "precioUnitario"
        FROM reserva_detalles
        WHERE reserva_id = $1
      `, [row.id]);
      const r = new Reservation(row);
      r.detalles = resDetails.rows;
      list.push(r);
    }

    return list;
  }

  async saveWithDetails(reservation, modifiedLots) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const resHead = await client.query(
        `INSERT INTO reservas (usuario_id, codigo_retiro, estado, fecha_expiracion)
         VALUES ($1, $2, $3, $4)
         RETURNING id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
                   estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at`,
        [reservation.usuarioId, reservation.codigoRetiro, reservation.estado, reservation.fechaExpiracion]
      );

      const savedReservationId = resHead.rows[0].id;
      const savedDetails = [];

      for (const d of reservation.detalles) {
        const resDet = await client.query(
          `INSERT INTO reserva_detalles (reserva_id, lote_id, cantidad, precio_unitario)
           VALUES ($1, $2, $3, $4)
           RETURNING id, reserva_id as "reservaId", lote_id as "loteId", cantidad, precio_unitario as "precioUnitario"`,
          [savedReservationId, d.loteId, d.cantidad, d.precioUnitario]
        );
        savedDetails.push(resDet.rows[0]);
      }

      for (const lot of modifiedLots) {
        await client.query(
          `UPDATE lotes
           SET cantidad_disponible = $1, cantidad_reservada = $2, estado = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [lot.cantidadDisponible, lot.cantidadReservada, lot.estado, lot.id]
        );
      }

      await client.query('COMMIT');

      const result = new Reservation(resHead.rows[0]);
      result.detalles = savedDetails;
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async update(reservation) {
    const res = await this.pool.query(
      `UPDATE reservas
       SET estado = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
                 estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at`,
      [reservation.estado, reservation.id]
    );
    const updated = new Reservation(res.rows[0]);
    updated.detalles = reservation.detalles;
    return updated;
  }
}

class PostgresUserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByEmail(email) {
    const res = await this.pool.query(`
      SELECT id, nombre, email, rol, password_hash as "passwordHash", created_at
      FROM usuarios
      WHERE email = $1
    `, [email]);
    return res.rows.length ? new User(res.rows[0]) : null;
  }

  async save(user) {
    const res = await this.pool.query(
      `INSERT INTO usuarios (nombre, email, rol, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, password_hash as "passwordHash", created_at`,
      [user.nombre, user.email, user.rol, user.passwordHash]
    );
    return new User(res.rows[0]);
  }
}

class PostgresAlertRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async save(alert) {
    const res = await this.pool.query(
      `INSERT INTO alertas_caducidad (lote_id, dias_para_vencer, nivel, atendida)
       VALUES ($1, $2, $3, $4)
       RETURNING id, lote_id as "loteId", dias_para_vencer as "diasParaVencer", nivel, atendida, created_at`,
      [alert.loteId, alert.diasParaVencer, alert.nivel, alert.atendida]
    );
    return new Alert(res.rows[0]);
  }
}

class PostgresPromotionRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAllActive() {
    const res = await this.pool.query(`
      SELECT p.id, p.lote_id as "loteId", p.descuento_porcentaje as "descuentoPorcentaje",
             p.frase_promocional as "frasePromocional", p.razon_ia as "razonIa",
             p.activa, p.created_at
      FROM promociones_ia p
      WHERE p.activa = true
      ORDER BY p.created_at DESC
    `);
    return res.rows.map(r => new Promotion(r));
  }

  async save(promotion) {
    const res = await this.pool.query(
      `INSERT INTO promociones_ia (lote_id, descuento_porcentaje, frase_promocional, razon_ia, activa)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, lote_id as "loteId", descuento_porcentaje as "descuentoPorcentaje",
                 frase_promocional as "frasePromocional", razon_ia as "razonIa", activa, created_at`,
      [promotion.loteId, promotion.descuentoPorcentaje, promotion.frasePromocional, promotion.razonIa, promotion.activa]
    );
    return new Promotion(res.rows[0]);
  }
}

module.exports = {
  PostgresCategoryRepository,
  PostgresProductRepository,
  PostgresLotRepository,
  PostgresReservationRepository,
  PostgresUserRepository,
  PostgresAlertRepository,
  PostgresPromotionRepository
};
