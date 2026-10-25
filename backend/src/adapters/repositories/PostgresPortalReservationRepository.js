const {
  NotFoundException,
  ValidationException,
  ForbiddenException,
  ConflictException
} = require('../../domain/exceptions/DomainExceptions');
const { RESERVATION_MAX_TOTAL_MINUTES } = require('../../domain/policies/BusinessRules');

const ACTIVE_STATES = ['PENDIENTE_SYNC', 'PENDIENTE'];

const RESERVATION_COLUMNS = `
  r.id, r.cliente_id AS "clienteId", r.estado, r.codigo_retiro AS "codigoRetiro",
  r.fecha_expiracion AS "fechaExpiracion", r.detalles, r.motivo_rechazo AS "motivoRechazo",
  r.mensaje_rechazo AS "mensajeRechazo", r.created_at, r.updated_at, u.nombre AS "clienteNombre"`;

// Reservas del portal y su cola de comandos hacia la tienda (ADR-003). La tienda es la única
// autoridad sobre el stock: aquí solo se guarda lo que el cliente pidió y lo que la tienda
// respondió. Los estados que informa la tienda mandan sobre los que infiere el portal.
class PostgresPortalReservationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _toView(row) {
    return {
      id: row.id,
      usuarioId: row.clienteId,
      codigoRetiro: row.codigoRetiro,
      estado: row.estado,
      fechaExpiracion: row.fechaExpiracion,
      created_at: row.created_at,
      updated_at: row.updated_at,
      clienteNombre: row.clienteNombre,
      detalles: row.detalles || [],
      // La tienda no ha informado el vencimiento de una reserva aceptada (p. ej. está sin conexión): el
      // estado guardado no cambia, pero el cliente ya sabe que el plazo pasó.
      ...(row.estado === 'PENDIENTE' && new Date(row.fechaExpiracion) < new Date() ? { vencidaSinConfirmar: true } : {}),
      ...(row.estado === 'RECHAZADA'
        ? { motivoRechazo: row.motivoRechazo, mensajeRechazo: row.mensajeRechazo }
        : {})
    };
  }

  async _find(where, params, { limit = null, offset = 0 } = {}) {
    const paging = limit === null ? '' : ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const res = await this.pool.query(`
      SELECT ${RESERVATION_COLUMNS}
      FROM reservas_portal r
      LEFT JOIN usuarios u ON u.id = r.cliente_id
      WHERE ${where}
      ORDER BY r.created_at DESC, r.id${paging}
    `, limit === null ? params : [...params, limit, offset]);
    return res.rows.map(row => this._toView(row));
  }

  async findById(id) {
    const [reservation] = await this._find('r.id = $1', [id]);
    return reservation || null;
  }

  async findByCode(code) {
    const [reservation] = await this._find('r.codigo_retiro = $1', [code]);
    return reservation || null;
  }

  async findByUserId(userId, { limit = 50, offset = 0 } = {}) {
    return this._find('r.cliente_id = $1', [userId], { limit, offset });
  }

  /** Guarda la reserva como PENDIENTE_SYNC y encola el comando para la tienda, en una transacción. */
  async createPending({ clienteId, fechaExpiracion, items }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const user = await client.query('SELECT nombre FROM usuarios WHERE id = $1', [clienteId]);
      if (!user.rows.length) throw new NotFoundException('El cliente de la reserva no existe.');

      const created = await client.query(`
        INSERT INTO reservas_portal (cliente_id, estado, fecha_expiracion, items)
        VALUES ($1, 'PENDIENTE_SYNC', $2, $3::jsonb)
        RETURNING id
      `, [clienteId, fechaExpiracion, JSON.stringify(items)]);
      const reservaId = created.rows[0].id;

      await client.query(`
        INSERT INTO comandos_tienda (tipo, reserva_id, payload)
        VALUES ('RESERVATION_CREATE', $1, $2::jsonb)
      `, [reservaId, JSON.stringify({
        clienteId,
        clienteNombre: user.rows[0].nombre,
        fechaExpiracion: new Date(fechaExpiracion).toISOString(),
        items
      })]);
      await client.query('COMMIT');
      return this.findById(reservaId);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancelación pedida por el cliente. Si la tienda aún no recibió el comando de creación, ambos
   * se anulan aquí y la tienda nunca se entera; si ya lo recibió, se encola un CANCEL que la
   * tienda aplica después de resolver el CREATE.
   */
  async cancelByClient(id, actor) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(
        'SELECT id, cliente_id AS "clienteId", estado FROM reservas_portal WHERE id = $1 FOR UPDATE', [id]
      );
      if (!found.rows.length) throw new NotFoundException(`Reserva con ID '${id}' no encontrada.`);
      const row = found.rows[0];
      if (actor.rol !== 'ADMIN' && row.clienteId !== actor.id) {
        throw new ForbiddenException('Solo el propietario o un administrador puede cancelar la reserva.');
      }
      if (!ACTIVE_STATES.includes(row.estado)) {
        throw new ValidationException(`No se puede cancelar una reserva en estado ${row.estado}.`);
      }

      const undelivered = await client.query(`
        UPDATE comandos_tienda SET estado = 'RESUELTO', resuelto_at = CURRENT_TIMESTAMP
        WHERE reserva_id = $1 AND tipo = 'RESERVATION_CREATE' AND estado = 'PENDIENTE'
      `, [id]);
      if (undelivered.rowCount === 0) {
        await client.query(`
          INSERT INTO comandos_tienda (tipo, reserva_id, payload)
          VALUES ('RESERVATION_CANCEL', $1, $2::jsonb)
        `, [id, JSON.stringify({ clienteId: row.clienteId })]);
      }
      await client.query(
        "UPDATE reservas_portal SET estado = 'CANCELADA', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]
      );
      await client.query('COMMIT');
      return this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Encola la extensión del plazo de una reserva aceptada. Valida lo que el portal ya sabe (dueño, estado,
   * vencimiento y tope de 4 h desde su creación); la tienda lo vuelve a validar con su propia copia. El comando
   * lleva el vencimiento de destino absoluto, no los minutos: si se reentrega, no extiende dos veces.
   * @returns {{commandId: string, until: Date}}
   */
  async requestExtension(id, actor, minutes, maxTotalMinutes = RESERVATION_MAX_TOTAL_MINUTES) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(
        `SELECT cliente_id AS "clienteId", estado, fecha_expiracion AS "fechaExpiracion", created_at
         FROM reservas_portal WHERE id = $1 FOR UPDATE`, [id]
      );
      if (!found.rows.length) throw new NotFoundException(`Reserva con ID '${id}' no encontrada.`);
      const row = found.rows[0];
      if (row.clienteId !== actor.id) {
        throw new ForbiddenException('Solo el propietario puede extender la reserva.');
      }
      if (row.estado === 'PENDIENTE_SYNC') {
        throw new ValidationException('La tienda aún está confirmando la reserva; inténtalo de nuevo en unos segundos.');
      }
      if (row.estado !== 'PENDIENTE') {
        throw new ValidationException(`No se puede extender una reserva en estado ${row.estado}.`);
      }
      const current = new Date(row.fechaExpiracion);
      if (current <= new Date()) {
        throw new ValidationException('La reserva ya ha expirado y no puede extenderse.');
      }
      const until = new Date(current.getTime() + minutes * 60000);
      if (until.getTime() > new Date(row.created_at).getTime() + maxTotalMinutes * 60000) {
        throw new ValidationException(`Una reserva puede durar como máximo ${maxTotalMinutes / 60} horas en total.`);
      }
      const inFlight = await client.query(
        "SELECT 1 FROM comandos_tienda WHERE reserva_id = $1 AND tipo = 'RESERVATION_EXTEND' AND estado <> 'RESUELTO'", [id]
      );
      if (inFlight.rows.length) throw new ConflictException('Ya hay una extensión de esta reserva en curso.');

      const command = await client.query(`
        INSERT INTO comandos_tienda (tipo, reserva_id, payload)
        VALUES ('RESERVATION_EXTEND', $1, $2::jsonb)
        RETURNING id
      `, [id, JSON.stringify({
        clienteId: row.clienteId, minutosAdicionales: minutes, hasta: until.toISOString(), maxTotalMinutos: maxTotalMinutes
      })]);
      await client.query('COMMIT');
      return { commandId: command.rows[0].id, until };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /** Estado de un comando y, si ya se resolvió, lo que respondió la tienda. */
  async getCommandOutcome(commandId) {
    const res = await this.pool.query('SELECT estado, resultado FROM comandos_tienda WHERE id = $1', [commandId]);
    return res.rows[0] || null;
  }

  /** Descarta un comando que la tienda aún no recibió. Devuelve false si ya se le entregó. */
  async abandonCommand(commandId) {
    const res = await this.pool.query(
      "UPDATE comandos_tienda SET estado = 'RESUELTO', resuelto_at = CURRENT_TIMESTAMP WHERE id = $1 AND estado = 'PENDIENTE'",
      [commandId]
    );
    return res.rowCount === 1;
  }

  /**
   * Marca como EXPIRADA toda reserva que la tienda nunca llegó a aceptar y cuyo plazo venció, y
   * descarta su comando de creación si todavía no se entregó. Las que la tienda sí aceptó las
   * expira la propia tienda y se lo informa al portal.
   */
  async expireUnacknowledged() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const expired = await client.query(`
        UPDATE reservas_portal SET estado = 'EXPIRADA', updated_at = CURRENT_TIMESTAMP
        WHERE estado = 'PENDIENTE_SYNC' AND fecha_expiracion <= CURRENT_TIMESTAMP
        RETURNING id
      `);
      const ids = expired.rows.map(row => row.id);
      if (ids.length > 0) {
        await client.query(`
          UPDATE comandos_tienda SET estado = 'RESUELTO', resuelto_at = CURRENT_TIMESTAMP
          WHERE reserva_id = ANY($1::uuid[]) AND tipo = 'RESERVATION_CREATE' AND estado = 'PENDIENTE'
        `, [ids]);
      }
      await client.query('COMMIT');
      return ids;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Entrega a la tienda hasta `limit` comandos. Un comando entregado y sin resultado vuelve a
   * ofrecerse pasado `visibilityMs`; tras `maxAttempts` entregas se da por fallido y la reserva
   * se rechaza. Nunca se entrega un comando si hay otro anterior sin resolver de la misma reserva.
   */
  async claimCommands({ limit = 20, visibilityMs = 60000, maxAttempts = 5 } = {}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const exhausted = await client.query(`
        UPDATE comandos_tienda SET estado = 'RESUELTO', resuelto_at = CURRENT_TIMESTAMP
        WHERE estado = 'ENTREGADO' AND intentos >= $1
          AND entregado_at <= CURRENT_TIMESTAMP - ($2::int * interval '1 millisecond')
        RETURNING reserva_id AS "reservaId", tipo
      `, [maxAttempts, visibilityMs]);
      const failedCreates = exhausted.rows.filter(row => row.tipo === 'RESERVATION_CREATE').map(row => row.reservaId);
      if (failedCreates.length > 0) {
        const rejected = await client.query(`
          UPDATE reservas_portal
          SET estado = 'RECHAZADA', motivo_rechazo = 'STORE_ERROR',
              mensaje_rechazo = 'La tienda no pudo procesar la reserva. Intente nuevamente.',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::uuid[]) AND estado = 'PENDIENTE_SYNC'
          RETURNING id, cliente_id AS "clienteId"
        `, [failedCreates]);
        // La tienda pudo haber reservado el stock sin que su resultado llegara jamás: se le pide
        // cancelar para que no lo retenga hasta que venza la reserva. Si no la conoce, lo ignora.
        for (const row of rejected.rows) {
          await client.query(`
            INSERT INTO comandos_tienda (tipo, reserva_id, payload)
            VALUES ('RESERVATION_CANCEL', $1, $2::jsonb)
          `, [row.id, JSON.stringify({ clienteId: row.clienteId })]);
        }
      }

      const claimed = await client.query(`
        WITH elegibles AS (
          SELECT c.seq FROM comandos_tienda c
          WHERE (c.estado = 'PENDIENTE'
                 OR (c.estado = 'ENTREGADO'
                     AND c.entregado_at <= CURRENT_TIMESTAMP - ($2::int * interval '1 millisecond')))
            AND NOT EXISTS (
              SELECT 1 FROM comandos_tienda previo
              WHERE previo.reserva_id = c.reserva_id AND previo.estado <> 'RESUELTO' AND previo.seq < c.seq
            )
          ORDER BY c.seq
          LIMIT $1
          FOR UPDATE OF c SKIP LOCKED
        )
        UPDATE comandos_tienda SET estado = 'ENTREGADO', entregado_at = CURRENT_TIMESTAMP, intentos = intentos + 1
        WHERE seq IN (SELECT seq FROM elegibles)
        RETURNING seq, id, tipo, reserva_id AS "reservaId", payload, intentos
      `, [limit, visibilityMs]);
      await client.query('COMMIT');
      return claimed.rows
        .sort((a, b) => Number(a.seq) - Number(b.seq))
        .map(row => ({ id: row.id, tipo: row.tipo, reservaId: row.reservaId, payload: row.payload, intentos: row.intentos }));
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /** Aplica el resultado que la tienda informa para un comando. Idempotente. */
  async resolveCommand(commandId, result) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(
        'SELECT id, tipo, reserva_id AS "reservaId", estado FROM comandos_tienda WHERE id = $1 FOR UPDATE', [commandId]
      );
      if (!found.rows.length) throw new NotFoundException(`Comando '${commandId}' no encontrado.`);
      const command = found.rows[0];
      if (command.estado === 'RESUELTO') {
        await client.query('ROLLBACK');
        return { applied: false };
      }

      if (command.tipo === 'RESERVATION_CREATE') {
        if (result.status === 'ACCEPTED') {
          await client.query(`
            UPDATE reservas_portal
            SET codigo_retiro = COALESCE(codigo_retiro, $2), detalles = $3::jsonb, fecha_expiracion = $4,
                estado = CASE WHEN estado = 'PENDIENTE_SYNC' THEN 'PENDIENTE' ELSE estado END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [command.reservaId, result.reservation.codigoRetiro, JSON.stringify(result.reservation.detalles),
            result.reservation.fechaExpiracion]);
        } else if (result.status === 'REJECTED') {
          await client.query(`
            UPDATE reservas_portal
            SET estado = CASE WHEN estado = 'PENDIENTE_SYNC' THEN 'RECHAZADA' ELSE estado END,
                motivo_rechazo = $2, mensaje_rechazo = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [command.reservaId, result.reason, result.message || null]);
        } else {
          throw new ValidationException('El resultado no corresponde a un comando de creación.');
        }
      } else if (command.tipo === 'RESERVATION_EXTEND') {
        if (result.status === 'EXTENDED') {
          // GREATEST: un resultado atrasado nunca acorta un plazo que ya se extendió más.
          await client.query(`
            UPDATE reservas_portal
            SET fecha_expiracion = GREATEST(fecha_expiracion, $2), updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND estado = 'PENDIENTE'
          `, [command.reservaId, result.fechaExpiracion]);
        } else if (result.status !== 'REJECTED') {
          throw new ValidationException('El resultado no corresponde a un comando de extensión.');
        }
      } else if (result.status === 'APPLIED' || result.status === 'IGNORED') {
        await this._applyStoreState(client, command.reservaId, result.estado);
      } else {
        throw new ValidationException('El resultado no corresponde a un comando de cancelación.');
      }

      await client.query(
        "UPDATE comandos_tienda SET estado = 'RESUELTO', resuelto_at = CURRENT_TIMESTAMP, resultado = $2::jsonb WHERE id = $1",
        [commandId, JSON.stringify(result)]
      );
      await client.query('COMMIT');
      return { applied: true };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cambios de estado que la tienda informa. La confirmación en caja es definitiva y prevalece
   * sobre lo que el portal haya inferido; vencer o cancelar solo aplica a reservas activas.
   */
  async applyStoreStates(events) {
    let applied = 0;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const event of events) {
        applied += await this._applyStoreState(client, event.reservaId, event.estado);
      }
      await client.query('COMMIT');
      return { applied, ignored: events.length - applied };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async _applyStoreState(client, reservaId, estado) {
    if (!['CONFIRMADA', 'EXPIRADA', 'CANCELADA'].includes(estado)) return 0;
    const result = await client.query(`
      UPDATE reservas_portal SET estado = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND (
        ($2 = 'CONFIRMADA' AND estado NOT IN ('CONFIRMADA', 'RECHAZADA'))
        OR ($2 IN ('EXPIRADA', 'CANCELADA') AND estado IN ('PENDIENTE_SYNC', 'PENDIENTE'))
      )
    `, [reservaId, estado]);
    return result.rowCount;
  }
}

module.exports = PostgresPortalReservationRepository;
