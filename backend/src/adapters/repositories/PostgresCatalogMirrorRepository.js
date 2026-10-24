const { SECTIONS } = require('../../infrastructure/sync/catalogSections');
const { ValidationException } = require('../../domain/exceptions/DomainExceptions');

// Copia de lectura del catálogo en la base de portal-api. Reemplaza cada sección con el
// snapshot que publica la tienda. Los nombres de tabla y columna salen del contrato
// estático de `catalogSections`, nunca de la solicitud.
class PostgresCatalogMirrorRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _spec(section) {
    const spec = SECTIONS[section];
    if (!spec) throw new ValidationException(`Sección de catálogo desconocida: ${section}.`);
    return spec;
  }

  _toRows(spec, items) {
    return items.map(item => Object.fromEntries(
      spec.fields.map(({ key, column, nullable }) => [column, item[key] ?? (nullable ? null : undefined)])
    ));
  }

  _upsertSql(spec) {
    const columns = spec.fields.map(f => f.column);
    const fixed = spec.fixed || [];
    const recordDef = spec.fields.map(f => `${f.column} ${f.sql}`).join(', ');
    const updates = [
      ...columns.filter(column => column !== 'id').map(column => `${column} = EXCLUDED.${column}`),
      ...fixed.map(([column]) => `${column} = EXCLUDED.${column}`),
      ...(spec.touchUpdatedAt ? ['updated_at = CURRENT_TIMESTAMP'] : [])
    ];
    return `
      INSERT INTO ${spec.table} (${[...columns, ...fixed.map(([column]) => column)].join(', ')})
      SELECT ${[...columns, ...fixed.map(([column, value]) => `${value} AS ${column}`)].join(', ')}
      FROM jsonb_to_recordset($1::jsonb) AS x(${recordDef})
      ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`;
  }

  /**
   * Aplica el snapshot de una sección. Devuelve `{ applied: false }` si ya se aplicó una
   * versión igual o más nueva (reintentos o llegadas desordenadas).
   */
  async applySnapshot(section, version, items) {
    const spec = this._spec(section);
    const rows = JSON.stringify(this._toRows(spec, items));
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serializa snapshots concurrentes de la misma sección hasta el final de la transacción.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`catalog_sync:${section}`]);
      const current = await client.query('SELECT version FROM sync_estado WHERE seccion = $1', [section]);
      if (current.rows.length > 0 && Number(current.rows[0].version) >= version) {
        await client.query('ROLLBACK');
        return { applied: false, count: items.length };
      }

      if (items.length > 0) await client.query(this._upsertSql(spec), [rows]);
      await client.query(
        `DELETE FROM ${spec.table} WHERE id NOT IN (SELECT id FROM jsonb_to_recordset($1::jsonb) AS x(id uuid))`,
        [rows]
      );
      await client.query(
        `INSERT INTO sync_estado (seccion, version, elementos, sincronizado_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (seccion) DO UPDATE
         SET version = EXCLUDED.version, elementos = EXCLUDED.elementos, sincronizado_at = EXCLUDED.sincronizado_at`,
        [section, version, items.length]
      );
      await client.query('COMMIT');
      return { applied: true, count: items.length };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async getSyncStatus() {
    const res = await this.pool.query(
      'SELECT seccion, version, elementos, sincronizado_at AS "sincronizadoAt" FROM sync_estado ORDER BY seccion'
    );
    return res.rows.map(row => ({
      seccion: row.seccion,
      version: Number(row.version),
      elementos: row.elementos,
      sincronizadoAt: new Date(row.sincronizadoAt).toISOString()
    }));
  }
}

module.exports = PostgresCatalogMirrorRepository;
