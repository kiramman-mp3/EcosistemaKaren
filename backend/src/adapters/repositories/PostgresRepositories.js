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
             l.fecha_elaboracion as "fechaElaboracion", l.fecha_caducidad as "fechaCaducidad",
             l.costo_unitario as "costoUnitario", l.cantidad_ingresada as "cantidadIngresada",
             l.cantidad_disponible as "cantidadDisponible", l.cantidad_reservada as "cantidadReservada",
             l.ubicacion, l.estado, l.created_at, l.updated_at,
             p.nombre as "productoNombre", p.codigo_barras as "codigoBarras"
      FROM lotes l
      JOIN productos p ON p.id = l.producto_id
      WHERE l.estado = 'ACTIVO' AND l.fecha_caducidad > CURRENT_DATE
      ORDER BY l.fecha_caducidad ASC
    `);
    return res.rows.map(r => new Lot(r));
  }

  async findById(id) {
    const res = await this.pool.query(`
      SELECT l.id, l.producto_id as "productoId", l.numero_lote as "numeroLote",
             l.fecha_elaboracion as "fechaElaboracion", l.fecha_caducidad as "fechaCaducidad",
             l.costo_unitario as "costoUnitario", l.cantidad_ingresada as "cantidadIngresada",
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
             l.fecha_elaboracion as "fechaElaboracion", l.fecha_caducidad as "fechaCaducidad",
             l.costo_unitario as "costoUnitario", l.cantidad_ingresada as "cantidadIngresada",
             l.cantidad_disponible as "cantidadDisponible", l.cantidad_reservada as "cantidadReservada",
             l.ubicacion, l.estado, l.created_at, l.updated_at,
             p.nombre as "productoNombre", p.codigo_barras as "codigoBarras"
      FROM lotes l
      JOIN productos p ON p.id = l.producto_id
      WHERE l.producto_id = $1
        AND l.estado = 'ACTIVO'
        AND l.fecha_caducidad > CURRENT_DATE
        AND l.cantidad_disponible > 0
      ORDER BY l.fecha_caducidad ASC
    `, [productId]);
    return res.rows.map(r => new Lot(r));
  }

  async findForExpiryAlerts() {
    const res = await this.pool.query(`
      SELECT l.id, l.producto_id as "productoId", l.numero_lote as "numeroLote",
             l.fecha_elaboracion as "fechaElaboracion", l.fecha_caducidad as "fechaCaducidad",
             l.costo_unitario as "costoUnitario", l.cantidad_ingresada as "cantidadIngresada",
             l.cantidad_disponible as "cantidadDisponible", l.cantidad_reservada as "cantidadReservada",
             l.ubicacion, l.estado, l.created_at, l.updated_at,
             p.nombre as "productoNombre", p.codigo_barras as "codigoBarras"
      FROM lotes l
      JOIN productos p ON p.id = l.producto_id
      WHERE l.estado IN ('ACTIVO', 'VENCIDO')
      ORDER BY l.fecha_caducidad ASC, l.id ASC
    `);
    return res.rows.map(row => new Lot(row));
  }

  async markExpiredLots() {
    const res = await this.pool.query(`
      WITH expired AS (
        UPDATE lotes
        SET estado = 'VENCIDO', updated_at = CURRENT_TIMESTAMP
        WHERE estado = 'ACTIVO' AND fecha_caducidad <= CURRENT_DATE
        RETURNING id, cantidad_disponible, cantidad_reservada, ubicacion
      ), recorded AS (
        INSERT INTO inventario_movimientos
          (lote_id, tipo, cantidad, disponible_antes, disponible_despues,
           reservada_antes, reservada_despues, ubicacion_origen, ubicacion_destino, motivo)
        SELECT id, 'VENCIMIENTO', 0, cantidad_disponible, cantidad_disponible,
          cantidad_reservada, cantidad_reservada, ubicacion, ubicacion,
          'Cambio automático de estado por fecha de caducidad'
        FROM expired
        RETURNING id
      )
      SELECT count(*)::int as count FROM expired
    `);
    return { countExpired: Number(res.rows[0].count) };
  }

  async save(lot, actorId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO lotes
          (producto_id, numero_lote, fecha_elaboracion, fecha_caducidad, costo_unitario,
           cantidad_ingresada, cantidad_disponible, cantidad_reservada, ubicacion, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, producto_id as "productoId", numero_lote as "numeroLote",
                   fecha_elaboracion as "fechaElaboracion", fecha_caducidad as "fechaCaducidad",
                   costo_unitario as "costoUnitario", cantidad_ingresada as "cantidadIngresada",
                   cantidad_disponible as "cantidadDisponible", cantidad_reservada as "cantidadReservada",
                   ubicacion, estado, created_at, updated_at`,
        [lot.productoId, lot.numeroLote, lot.fechaElaboracion, lot.fechaCaducidad, lot.costoUnitario,
          lot.cantidadIngresada, lot.cantidadDisponible, lot.cantidadReservada, lot.ubicacion, lot.estado]
      );
      const row = res.rows[0];
      await this._insertMovement(client, {
        loteId: row.id, tipo: 'INGRESO', cantidad: Number(row.cantidadIngresada),
        disponibleAntes: 0, disponibleDespues: Number(row.cantidadDisponible),
        reservadaAntes: 0, reservadaDespues: Number(row.cantidadReservada),
        ubicacionDestino: row.ubicacion, motivo: 'Ingreso inicial de lote', actorId
      });
      await client.query('COMMIT');
      const saved = new Lot(row);
      saved.productoNombre = lot.productoNombre;
      saved.codigoBarras = lot.codigoBarras;
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async update(lot) {
    const res = await this.pool.query(
      `UPDATE lotes
       SET cantidad_disponible = $1, cantidad_reservada = $2, ubicacion = $3, estado = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, producto_id as "productoId", numero_lote as "numeroLote",
                 fecha_elaboracion as "fechaElaboracion", fecha_caducidad as "fechaCaducidad",
                 costo_unitario as "costoUnitario", cantidad_ingresada as "cantidadIngresada",
                 cantidad_disponible as "cantidadDisponible", cantidad_reservada as "cantidadReservada",
                 ubicacion, estado, created_at, updated_at`,
      [lot.cantidadDisponible, lot.cantidadReservada, lot.ubicacion, lot.estado, lot.id]
    );
    const updated = new Lot(res.rows[0]);
    updated.productoNombre = lot.productoNombre;
    updated.codigoBarras = lot.codigoBarras;
    return updated;
  }

  async changeLocationWithAudit(lotId, nuevaUbicacion, actorId) {
    const location = String(nuevaUbicacion || '').toUpperCase();
    if (!['BODEGA', 'PERCHA'].includes(location)) {
      throw new ValidationException('La ubicación debe ser BODEGA o PERCHA.');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await this._lockLot(client, lotId);
      if (!current) throw new NotFoundException(`El lote con ID '${lotId}' no existe.`);
      if (current.ubicacion === location) {
        throw new ValidationException(`El lote ya se encuentra en ${location}.`);
      }
      const result = await client.query(`
        UPDATE lotes SET ubicacion = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
        RETURNING id, producto_id as "productoId", numero_lote as "numeroLote",
          fecha_elaboracion as "fechaElaboracion", fecha_caducidad as "fechaCaducidad",
          costo_unitario as "costoUnitario", cantidad_ingresada as "cantidadIngresada",
          cantidad_disponible as "cantidadDisponible", cantidad_reservada as "cantidadReservada",
          ubicacion, estado, created_at, updated_at
      `, [location, lotId]);
      await this._insertMovement(client, {
        loteId: lotId, tipo: 'TRASLADO', cantidad: 0,
        disponibleAntes: Number(current.cantidadDisponible), disponibleDespues: Number(current.cantidadDisponible),
        reservadaAntes: Number(current.cantidadReservada), reservadaDespues: Number(current.cantidadReservada),
        ubicacionOrigen: current.ubicacion, ubicacionDestino: location,
        motivo: 'Traslado autorizado de inventario', actorId
      });
      await client.query('COMMIT');
      return new Lot(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async registerWasteWithAudit(lotId, cantidad, razon, actorId) {
    const qty = Number(cantidad);
    const reason = typeof razon === 'string' ? razon.trim() : '';
    if (!Number.isInteger(qty) || qty <= 0) throw new ValidationException('La cantidad de merma debe ser un entero mayor a cero.');
    if (reason.length < 3 || reason.length > 500) throw new ValidationException('La razón de la merma debe tener entre 3 y 500 caracteres.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await this._lockLot(client, lotId);
      if (!current) throw new NotFoundException(`El lote con ID '${lotId}' no existe.`);
      if (Number(current.cantidadDisponible) < qty) {
        throw new ValidationException(`No se puede dar de baja ${qty} unidades. Disponible libre: ${current.cantidadDisponible}`);
      }
      const result = await client.query(`
        UPDATE lotes
        SET cantidad_disponible = cantidad_disponible - $1,
            estado = CASE WHEN cantidad_disponible - $1 = 0 AND cantidad_reservada = 0
              THEN 'MERMA'::estado_lote ELSE estado END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, producto_id as "productoId", numero_lote as "numeroLote",
          fecha_elaboracion as "fechaElaboracion", fecha_caducidad as "fechaCaducidad",
          costo_unitario as "costoUnitario", cantidad_ingresada as "cantidadIngresada",
          cantidad_disponible as "cantidadDisponible", cantidad_reservada as "cantidadReservada",
          ubicacion, estado, created_at, updated_at
      `, [qty, lotId]);
      const movement = await this._insertMovement(client, {
        loteId: lotId, tipo: 'MERMA', cantidad: qty,
        disponibleAntes: Number(current.cantidadDisponible), disponibleDespues: Number(current.cantidadDisponible) - qty,
        reservadaAntes: Number(current.cantidadReservada), reservadaDespues: Number(current.cantidadReservada),
        ubicacionOrigen: current.ubicacion, ubicacionDestino: current.ubicacion,
        motivo: reason, actorId
      });
      const cost = current.costoUnitario === null ? null : Number(current.costoUnitario);
      const wasteResult = await client.query(`
        INSERT INTO mermas
          (lote_id, movimiento_id, cantidad, razon, costo_unitario, costo_total, registrada_por)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, lote_id as "loteId", movimiento_id as "movimientoId", cantidad,
          razon, costo_unitario as "costoUnitario", costo_total as "costoTotal",
          registrada_por as "registradaPor", created_at
      `, [lotId, movement.id, qty, reason, cost, cost === null ? null : cost * qty, actorId]);
      await client.query('COMMIT');
      return { lote: new Lot(result.rows[0]), merma: wasteResult.rows[0], movimiento: movement };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async findMovements({ loteId, tipo, limit } = {}) {
    const max = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 500);
    const result = await this.pool.query(`
      SELECT m.id, m.lote_id as "loteId", l.numero_lote as "numeroLote", m.tipo, m.cantidad,
        m.disponible_antes as "disponibleAntes", m.disponible_despues as "disponibleDespues",
        m.reservada_antes as "reservadaAntes", m.reservada_despues as "reservadaDespues",
        m.ubicacion_origen as "ubicacionOrigen", m.ubicacion_destino as "ubicacionDestino",
        m.motivo, m.actor_id as "actorId", u.nombre as "actorNombre",
        m.reserva_id as "reservaId", m.metadata, m.created_at
      FROM inventario_movimientos m
      JOIN lotes l ON l.id = m.lote_id
      LEFT JOIN usuarios u ON u.id = m.actor_id
      WHERE ($1::uuid IS NULL OR m.lote_id = $1) AND ($2::varchar IS NULL OR m.tipo = $2)
      ORDER BY m.created_at DESC, m.id DESC LIMIT $3
    `, [loteId || null, tipo ? String(tipo).toUpperCase() : null, max]);
    return result.rows;
  }

  async findWastes({ loteId, limit } = {}) {
    const max = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 500);
    const result = await this.pool.query(`
      SELECT w.id, w.lote_id as "loteId", l.numero_lote as "numeroLote", p.nombre as "productoNombre",
        w.movimiento_id as "movimientoId", w.cantidad, w.razon,
        w.costo_unitario as "costoUnitario", w.costo_total as "costoTotal",
        w.registrada_por as "registradaPor", u.nombre as "registradaPorNombre", w.created_at
      FROM mermas w JOIN lotes l ON l.id = w.lote_id JOIN productos p ON p.id = l.producto_id
      JOIN usuarios u ON u.id = w.registrada_por
      WHERE ($1::uuid IS NULL OR w.lote_id = $1)
      ORDER BY w.created_at DESC, w.id DESC LIMIT $2
    `, [loteId || null, max]);
    return result.rows;
  }

  async _lockLot(client, lotId) {
    const result = await client.query(`
      SELECT id, producto_id as "productoId", numero_lote as "numeroLote", fecha_elaboracion as "fechaElaboracion",
        fecha_caducidad as "fechaCaducidad", costo_unitario as "costoUnitario",
        cantidad_ingresada as "cantidadIngresada", cantidad_disponible as "cantidadDisponible",
        cantidad_reservada as "cantidadReservada", ubicacion, estado, created_at, updated_at
      FROM lotes WHERE id = $1 FOR UPDATE
    `, [lotId]);
    return result.rows[0] || null;
  }

  async _insertMovement(client, data) {
    const result = await client.query(`
      INSERT INTO inventario_movimientos
        (lote_id, tipo, cantidad, disponible_antes, disponible_despues,
         reservada_antes, reservada_despues, ubicacion_origen, ubicacion_destino,
         motivo, actor_id, reserva_id, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
      RETURNING id, lote_id as "loteId", tipo, cantidad,
        disponible_antes as "disponibleAntes", disponible_despues as "disponibleDespues",
        reservada_antes as "reservadaAntes", reservada_despues as "reservadaDespues",
        ubicacion_origen as "ubicacionOrigen", ubicacion_destino as "ubicacionDestino",
        motivo, actor_id as "actorId", reserva_id as "reservaId", metadata, created_at
    `, [data.loteId, data.tipo, data.cantidad, data.disponibleAntes, data.disponibleDespues,
      data.reservadaAntes, data.reservadaDespues, data.ubicacionOrigen || null,
      data.ubicacionDestino || null, data.motivo || null, data.actorId || null,
      data.reservaId || null, JSON.stringify(data.metadata || {})]);
    return result.rows[0];
  }
}

class PostgresReservationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createWithLockedStock(reservation, items) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const details = [];

      // Los casos de uso entregan items ordenados por producto para que todas las
      // transacciones adquieran los bloqueos en el mismo orden y eviten deadlocks.
      for (const item of items) {
        const productResult = await client.query(`
          SELECT id, nombre, precio_venta as "precioVenta"
          FROM productos
          WHERE id = $1
        `, [item.productoId]);

        if (!productResult.rows.length) {
          throw new NotFoundException(`El producto con ID '${item.productoId}' no existe.`);
        }

        const product = productResult.rows[0];
        const lotsResult = await client.query(`
          SELECT id, cantidad_disponible as "cantidadDisponible",
                 cantidad_reservada as "cantidadReservada", ubicacion
          FROM lotes
          WHERE producto_id = $1
            AND estado = 'ACTIVO'
            AND fecha_caducidad > CURRENT_DATE
            AND cantidad_disponible > 0
          ORDER BY fecha_caducidad ASC, id ASC
          FOR UPDATE
        `, [item.productoId]);

        const totalAvailable = lotsResult.rows.reduce(
          (sum, lot) => sum + Number(lot.cantidadDisponible),
          0
        );
        if (totalAvailable < item.cantidad) {
          throw new OverbookingException(
            `Stock insuficiente para '${product.nombre}'. Solicitado: ${item.cantidad}, Disponible en tienda: ${totalAvailable}`
          );
        }

        let remaining = item.cantidad;
        for (const lot of lotsResult.rows) {
          if (remaining === 0) break;
          const quantity = Math.min(Number(lot.cantidadDisponible), remaining);
          const updateResult = await client.query(`
            UPDATE lotes
            SET cantidad_disponible = cantidad_disponible - $1,
                cantidad_reservada = cantidad_reservada + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND cantidad_disponible >= $1
          `, [quantity, lot.id]);

          if (updateResult.rowCount !== 1) {
            throw new OverbookingException('El stock cambió durante la reserva. Intente nuevamente.');
          }

          details.push({
            loteId: lot.id,
            cantidad: quantity,
            precioUnitario: Number(product.precioVenta),
            disponibleAntes: Number(lot.cantidadDisponible),
            reservadaAntes: Number(lot.cantidadReservada),
            ubicacion: lot.ubicacion
          });
          remaining -= quantity;
        }
      }

      const reservationResult = await client.query(`
        INSERT INTO reservas (usuario_id, codigo_retiro, estado, fecha_expiracion)
        VALUES ($1, $2, 'PENDIENTE', $3)
        RETURNING id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
                  estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
      `, [reservation.usuarioId, reservation.codigoRetiro, reservation.fechaExpiracion]);

      const savedDetails = [];
      for (const detail of details) {
        const detailResult = await client.query(`
          INSERT INTO reserva_detalles (reserva_id, lote_id, cantidad, precio_unitario)
          VALUES ($1, $2, $3, $4)
          RETURNING id, reserva_id as "reservaId", lote_id as "loteId",
                    cantidad, precio_unitario as "precioUnitario"
        `, [reservationResult.rows[0].id, detail.loteId, detail.cantidad, detail.precioUnitario]);
        savedDetails.push(detailResult.rows[0]);
        await this._insertMovement(client, {
          loteId: detail.loteId, tipo: 'RESERVA', cantidad: detail.cantidad,
          disponibleAntes: detail.disponibleAntes,
          disponibleDespues: detail.disponibleAntes - detail.cantidad,
          reservadaAntes: detail.reservadaAntes,
          reservadaDespues: detail.reservadaAntes + detail.cantidad,
          ubicacionOrigen: detail.ubicacion, ubicacionDestino: detail.ubicacion,
          motivo: 'Stock asignado a reserva', actorId: reservation.usuarioId,
          reservaId: reservationResult.rows[0].id
        });
      }

      await client.query('COMMIT');
      const saved = new Reservation(reservationResult.rows[0]);
      saved.detalles = savedDetails;
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmWithLockedStock(reservationId, actor) {
    const client = await this.pool.connect();
    let expired = false;
    try {
      await client.query('BEGIN');
      const reservationRow = await this._findByIdForUpdate(client, reservationId);
      if (!reservationRow) {
        throw new NotFoundException(`Reserva con ID '${reservationId}' no encontrada.`);
      }
      if (reservationRow.estado !== 'PENDIENTE') {
        throw new ValidationException(`No se puede confirmar una reserva en estado ${reservationRow.estado}.`);
      }

      const details = await this._findDetails(client, reservationId);
      if (new Date(reservationRow.fechaExpiracion) <= new Date()) {
        await this._releaseLockedDetails(client, details, {
          tipo: 'LIBERACION', actorId: actor.id, reservaId: reservationId,
          motivo: 'Liberación por reserva expirada al intentar confirmarla'
        });
        await client.query(`
          UPDATE reservas SET estado = 'EXPIRADA', updated_at = CURRENT_TIMESTAMP WHERE id = $1
        `, [reservationId]);
        expired = true;
        await client.query('COMMIT');
      } else {
        const grouped = this._groupDetailsByLot(details);
        const lots = await this._lockLots(client, [...grouped.keys()]);
        this._assertReservedQuantities(lots, grouped);

        for (const lot of lots) {
          const quantity = grouped.get(lot.id);
          await client.query(`
            UPDATE lotes
            SET cantidad_reservada = cantidad_reservada - $1,
                estado = CASE
                  WHEN cantidad_disponible = 0 AND cantidad_reservada - $1 = 0 THEN 'AGOTADO'::estado_lote
                  ELSE estado
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [quantity, lot.id]);
          await this._insertMovement(client, {
            loteId: lot.id, tipo: 'VENTA', cantidad: quantity,
            disponibleAntes: Number(lot.cantidadDisponible), disponibleDespues: Number(lot.cantidadDisponible),
            reservadaAntes: Number(lot.cantidadReservada), reservadaDespues: Number(lot.cantidadReservada) - quantity,
            motivo: 'Venta confirmada desde reserva', actorId: actor.id, reservaId: reservationId
          });
        }

        const updatedResult = await client.query(`
          UPDATE reservas
          SET estado = 'CONFIRMADA', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
                    estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
        `, [reservationId]);
        await client.query('COMMIT');
        const updated = new Reservation(updatedResult.rows[0]);
        updated.detalles = details;
        return updated;
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (expired) {
      throw new ValidationException('La reserva expiró y su stock fue liberado.');
    }
  }

  async cancelWithLockedStock(reservationId, actor) {
    const client = await this.pool.connect();
    let expired = false;
    try {
      await client.query('BEGIN');
      const reservationRow = await this._findByIdForUpdate(client, reservationId);
      if (!reservationRow) {
        throw new NotFoundException(`Reserva con ID '${reservationId}' no encontrada.`);
      }
      if (actor.rol !== 'ADMIN' && reservationRow.usuarioId !== actor.id) {
        throw new ForbiddenException('Solo el propietario o un administrador puede cancelar la reserva.');
      }
      if (reservationRow.estado !== 'PENDIENTE') {
        throw new ValidationException(`No se puede cancelar una reserva en estado ${reservationRow.estado}.`);
      }

      const details = await this._findDetails(client, reservationId);
        await this._releaseLockedDetails(client, details, {
          tipo: 'LIBERACION', actorId: actor.id, reservaId,
          motivo: 'Liberación por cancelación o expiración durante cancelación'
        });
      expired = new Date(reservationRow.fechaExpiracion) <= new Date();
      const nextState = expired ? 'EXPIRADA' : 'CANCELADA';
      const updatedResult = await client.query(`
        UPDATE reservas
        SET estado = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
                  estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
      `, [nextState, reservationId]);

      await client.query('COMMIT');
      if (!expired) {
        const updated = new Reservation(updatedResult.rows[0]);
        updated.detalles = details;
        return updated;
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    throw new ValidationException('La reserva ya había expirado; su stock fue liberado.');
  }

  async expirePendingWithLockedStock(limit = 100) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const reservationsResult = await client.query(`
        SELECT id
        FROM reservas
        WHERE estado = 'PENDIENTE' AND fecha_expiracion <= CURRENT_TIMESTAMP
        ORDER BY fecha_expiracion ASC, id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      `, [limit]);
      const reservationIds = reservationsResult.rows.map(row => row.id);

      if (reservationIds.length === 0) {
        await client.query('COMMIT');
        return { countLiberadas: 0 };
      }

      const detailsResult = await client.query(`
        SELECT lote_id as "loteId", SUM(cantidad)::int as cantidad
        FROM reserva_detalles
        WHERE reserva_id = ANY($1::uuid[])
        GROUP BY lote_id
        ORDER BY lote_id ASC
      `, [reservationIds]);
      const grouped = new Map(detailsResult.rows.map(row => [row.loteId, Number(row.cantidad)]));
      const lots = await this._lockLots(client, [...grouped.keys()]);
      this._assertReservedQuantities(lots, grouped);

      for (const lot of lots) {
        const quantity = grouped.get(lot.id);
        await client.query(`
          UPDATE lotes
          SET cantidad_disponible = cantidad_disponible + $1,
              cantidad_reservada = cantidad_reservada - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [quantity, lot.id]);
        await this._insertMovement(client, {
          loteId: lot.id, tipo: 'LIBERACION', cantidad: quantity,
          disponibleAntes: Number(lot.cantidadDisponible), disponibleDespues: Number(lot.cantidadDisponible) + quantity,
          reservadaAntes: Number(lot.cantidadReservada), reservadaDespues: Number(lot.cantidadReservada) - quantity,
          motivo: 'Liberación automática por expiración', metadata: { reservationIds }
        });
      }

      await client.query(`
        UPDATE reservas
        SET estado = 'EXPIRADA', updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::uuid[])
      `, [reservationIds]);
      await client.query('COMMIT');
      return { countLiberadas: reservationIds.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async _findByIdForUpdate(client, reservationId) {
    const result = await client.query(`
      SELECT id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
             estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
      FROM reservas
      WHERE id = $1
      FOR UPDATE
    `, [reservationId]);
    return result.rows[0] || null;
  }

  async _findDetails(client, reservationId) {
    const result = await client.query(`
      SELECT id, reserva_id as "reservaId", lote_id as "loteId",
             cantidad, precio_unitario as "precioUnitario"
      FROM reserva_detalles
      WHERE reserva_id = $1
      ORDER BY lote_id ASC, id ASC
    `, [reservationId]);
    return result.rows;
  }

  _groupDetailsByLot(details) {
    const grouped = new Map();
    for (const detail of details) {
      grouped.set(detail.loteId, (grouped.get(detail.loteId) || 0) + Number(detail.cantidad));
    }
    return grouped;
  }

  async _lockLots(client, lotIds) {
    if (lotIds.length === 0) return [];
    const result = await client.query(`
      SELECT id, cantidad_disponible as "cantidadDisponible",
             cantidad_reservada as "cantidadReservada", estado
      FROM lotes
      WHERE id = ANY($1::uuid[])
      ORDER BY id ASC
      FOR UPDATE
    `, [lotIds]);
    if (result.rows.length !== lotIds.length) {
      throw new ValidationException('Uno o más lotes asociados a la reserva ya no existen.');
    }
    return result.rows;
  }

  _assertReservedQuantities(lots, grouped) {
    for (const lot of lots) {
      if (Number(lot.cantidadReservada) < grouped.get(lot.id)) {
        throw new ValidationException(`Stock reservado inconsistente para el lote '${lot.id}'.`);
      }
    }
  }

  async _releaseLockedDetails(client, details, movementContext = {}) {
    const grouped = this._groupDetailsByLot(details);
    const lots = await this._lockLots(client, [...grouped.keys()]);
    this._assertReservedQuantities(lots, grouped);
    for (const lot of lots) {
      const quantity = grouped.get(lot.id);
      await client.query(`
        UPDATE lotes
        SET cantidad_disponible = cantidad_disponible + $1,
            cantidad_reservada = cantidad_reservada - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [quantity, lot.id]);
      await this._insertMovement(client, {
        loteId: lot.id, tipo: movementContext.tipo || 'LIBERACION', cantidad: quantity,
        disponibleAntes: Number(lot.cantidadDisponible), disponibleDespues: Number(lot.cantidadDisponible) + quantity,
        reservadaAntes: Number(lot.cantidadReservada), reservadaDespues: Number(lot.cantidadReservada) - quantity,
        motivo: movementContext.motivo || 'Liberación de stock reservado',
        actorId: movementContext.actorId || null, reservaId: movementContext.reservaId || null
      });
    }
  }

  async _insertMovement(client, data) {
    await client.query(`
      INSERT INTO inventario_movimientos
        (lote_id, tipo, cantidad, disponible_antes, disponible_despues,
         reservada_antes, reservada_despues, ubicacion_origen, ubicacion_destino,
         motivo, actor_id, reserva_id, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
    `, [data.loteId, data.tipo, data.cantidad, data.disponibleAntes, data.disponibleDespues,
      data.reservadaAntes, data.reservadaDespues, data.ubicacionOrigen || null,
      data.ubicacionDestino || null, data.motivo || null, data.actorId || null,
      data.reservaId || null, JSON.stringify(data.metadata || {})]);
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

  async findByUserId(userId, { limit = 50, offset = 0 } = {}) {
    const resHead = await this.pool.query(`
      SELECT id, usuario_id as "usuarioId", codigo_retiro as "codigoRetiro",
             estado, fecha_expiracion as "fechaExpiracion", created_at, updated_at
      FROM reservas
      WHERE usuario_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

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

  async findAllApproved() {
    const res = await this.pool.query(`
      SELECT pi.id, pi.lote_id as "loteId",
             pi.descuento_porcentaje as "descuentoPorcentaje",
             pi.frase_promocional as "frasePromocional", pi.razon_ia as "razonIa",
             pi.activa, pi.estado, pi.modelo_ia as "modeloIa",
             pi.prompt_version as "promptVersion", pi.cache_key as "cacheKey",
             pi.cache_hit as "cacheHit", pi.aprobada_por as "aprobadaPor",
             pi.aprobada_at as "aprobadaAt", pi.created_at
      FROM promociones_ia pi
      JOIN lotes l ON l.id = pi.lote_id
      WHERE pi.estado = 'APROBADA'
        AND pi.activa = TRUE
        AND l.estado = 'ACTIVO'
        AND l.fecha_caducidad > CURRENT_DATE
        AND l.cantidad_disponible > 0
      ORDER BY pi.created_at DESC
    `);
    return res.rows.map(r => new Promotion(r));
  }

  async findAllActive() { return this.findAllApproved(); }

  async findAllPending() {
    const res = await this.pool.query(`
      SELECT id, lote_id as "loteId", descuento_porcentaje as "descuentoPorcentaje",
             frase_promocional as "frasePromocional", razon_ia as "razonIa",
             activa, estado, modelo_ia as "modeloIa", prompt_version as "promptVersion",
             cache_key as "cacheKey", cache_hit as "cacheHit", created_at
      FROM promociones_ia WHERE estado = 'PENDIENTE_APROBACION' ORDER BY created_at ASC
    `);
    return res.rows.map(r => new Promotion(r));
  }

  async findById(id) {
    const res = await this.pool.query(`
      SELECT id, lote_id as "loteId", descuento_porcentaje as "descuentoPorcentaje",
             frase_promocional as "frasePromocional", razon_ia as "razonIa",
             activa, estado, modelo_ia as "modeloIa", prompt_version as "promptVersion",
             cache_key as "cacheKey", cache_hit as "cacheHit",
             aprobada_por as "aprobadaPor", aprobada_at as "aprobadaAt",
             rechazada_por as "rechazadaPor", rechazada_at as "rechazadaAt",
             motivo_rechazo as "motivoRechazo", created_at
      FROM promociones_ia WHERE id = $1
    `, [id]);
    return res.rows.length ? new Promotion(res.rows[0]) : null;
  }

  async savePending({ loteId, descuentoPorcentaje, frasePromocional, razonIa,
                      modeloIa, promptVersion, cacheKey, cacheHit }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const lockId = this._pgAdvisoryLockId(loteId + cacheKey);
      await client.query('SELECT pg_advisory_xact_lock($1)', [lockId]);
      const existing = await client.query(`
        SELECT id, lote_id as "loteId", descuento_porcentaje as "descuentoPorcentaje",
               frase_promocional as "frasePromocional", razon_ia as "razonIa",
               activa, estado, modelo_ia as "modeloIa", prompt_version as "promptVersion",
               cache_key as "cacheKey", cache_hit as "cacheHit", created_at
        FROM promociones_ia
        WHERE lote_id = $1 AND cache_key = $2 AND estado = 'PENDIENTE_APROBACION' LIMIT 1
      `, [loteId, cacheKey]);
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        const p = new Promotion({ ...existing.rows[0], cacheHit: true });
        p._isDuplicate = true;
        return p;
      }
      const res = await client.query(`
        INSERT INTO promociones_ia
          (lote_id, descuento_porcentaje, frase_promocional, razon_ia, activa,
           estado, modelo_ia, prompt_version, cache_key, cache_hit)
        VALUES ($1, $2, $3, $4, FALSE, 'PENDIENTE_APROBACION', $5, $6, $7, $8)
        ON CONFLICT (lote_id, cache_key) WHERE estado = 'PENDIENTE_APROBACION'
        DO UPDATE SET cache_hit = TRUE
        RETURNING id, lote_id as "loteId", descuento_porcentaje as "descuentoPorcentaje",
                  frase_promocional as "frasePromocional", razon_ia as "razonIa",
                  activa, estado, modelo_ia as "modeloIa", prompt_version as "promptVersion",
                  cache_key as "cacheKey", cache_hit as "cacheHit", created_at
      `, [loteId, descuentoPorcentaje, frasePromocional, razonIa,
          modeloIa, promptVersion, cacheKey, Boolean(cacheHit)]);
      await client.query('COMMIT');
      return new Promotion(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async approve(promotionId, adminUserId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query(`
        SELECT pi.id, pi.lote_id as "loteId", pi.estado,
               pi.cache_key as "cacheKey", pi.prompt_version as "promptVersion",
               pi.modelo_ia as "modeloIa",
               l.numero_lote as "numeroLote", l.fecha_caducidad as "fechaCaducidad",
               l.cantidad_disponible as "cantidadDisponible", l.estado as "lotEstado",
               pr.precio_venta as "precioVenta"
        FROM promociones_ia pi
        JOIN lotes l ON l.id = pi.lote_id
        JOIN productos pr ON pr.id = l.producto_id
        WHERE pi.id = $1
        FOR UPDATE OF pi, l, pr
      `, [promotionId]);
      if (locked.rowCount === 0 || locked.rows[0].estado !== 'PENDIENTE_APROBACION') {
        throw new ValidationException('No se puede aprobar: no existe o no está en PENDIENTE_APROBACION.');
      }

      const current = locked.rows[0];
      assertPromotableLot({
        id: current.loteId,
        numeroLote: current.numeroLote,
        fechaCaducidad: current.fechaCaducidad,
        cantidadDisponible: Number(current.cantidadDisponible),
        estado: current.lotEstado
      });
      const currentCacheKey = buildPromotionCacheKey({
        loteId: current.loteId,
        fechaCaducidad: current.fechaCaducidad,
        cantidadDisponible: Number(current.cantidadDisponible),
        precioVenta: Number(current.precioVenta),
        promptVersion: current.promptVersion,
        modelName: current.modeloIa
      });
      if (currentCacheKey !== current.cacheKey) {
        throw new ValidationException(
          'El inventario o precio cambió desde la generación. Genere un nuevo borrador antes de aprobar.'
        );
      }

      await client.query(`
        UPDATE promociones_ia
        SET activa = FALSE
        WHERE lote_id = $1 AND estado = 'APROBADA' AND activa = TRUE
      `, [current.loteId]);

      const res = await client.query(`
        UPDATE promociones_ia
        SET estado = 'APROBADA', activa = TRUE,
            aprobada_por = $2, aprobada_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND estado = 'PENDIENTE_APROBACION'
        RETURNING id, lote_id as "loteId", descuento_porcentaje as "descuentoPorcentaje",
                  frase_promocional as "frasePromocional", razon_ia as "razonIa",
                  activa, estado, aprobada_por as "aprobadaPor", aprobada_at as "aprobadaAt",
                  modelo_ia as "modeloIa", prompt_version as "promptVersion",
                  cache_key as "cacheKey", cache_hit as "cacheHit", created_at
      `, [promotionId, adminUserId]);
      if (res.rowCount === 0) {
        throw new ValidationException('No se puede aprobar: la promoción cambió concurrentemente.');
      }
      await client.query('COMMIT');
      return new Promotion(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async reject(promotionId, adminUserId, motivoRechazo) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE promociones_ia
        SET estado = 'RECHAZADA', activa = FALSE,
            rechazada_por = $2, rechazada_at = CURRENT_TIMESTAMP, motivo_rechazo = $3
        WHERE id = $1 AND estado = 'PENDIENTE_APROBACION'
        RETURNING id, lote_id as "loteId", descuento_porcentaje as "descuentoPorcentaje",
                  frase_promocional as "frasePromocional", razon_ia as "razonIa",
                  activa, estado, rechazada_por as "rechazadaPor", rechazada_at as "rechazadaAt",
                  motivo_rechazo as "motivoRechazo", modelo_ia as "modeloIa", created_at
      `, [promotionId, adminUserId, motivoRechazo]);
      if (res.rowCount === 0) {
        throw new ValidationException('No se puede rechazar: no existe o no está en PENDIENTE_APROBACION.');
      }
      await client.query('COMMIT');
      return new Promotion(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  _pgAdvisoryLockId(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async save(promotion) {
    return this.savePending({
      loteId: promotion.loteId,
      descuentoPorcentaje: promotion.descuentoPorcentaje,
      frasePromocional: promotion.frasePromocional,
      razonIa: promotion.razonIa,
      modeloIa: null, promptVersion: null,
      cacheKey: `legacy-${promotion.loteId}-${Date.now()}`,
      cacheHit: false,
    });
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
