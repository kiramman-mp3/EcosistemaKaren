const { SECTIONS } = require('./catalogSections');

// Qué filas de la tienda se publican en cada sección. Solo lo que un cliente puede ver:
// lotes vigentes con existencias y promociones aprobadas sobre esos lotes.
const SOURCES = {
  categorias: { from: 'categorias c', alias: 'c', where: 'TRUE', order: 'c.id' },
  productos: { from: 'productos p', alias: 'p', where: 'TRUE', order: 'p.id' },
  lotes: {
    from: 'lotes l',
    alias: 'l',
    where: "l.estado = 'ACTIVO' AND l.fecha_caducidad > CURRENT_DATE AND l.cantidad_disponible > 0",
    order: 'l.id'
  },
  promociones: {
    from: 'promociones_ia pi JOIN lotes l ON l.id = pi.lote_id',
    alias: 'pi',
    where: `pi.estado = 'APROBADA' AND pi.activa = TRUE
            AND l.estado = 'ACTIVO' AND l.fecha_caducidad > CURRENT_DATE AND l.cantidad_disponible > 0`,
    order: 'pi.id'
  }
};

// Lee de la base de la tienda el snapshot de cada sección, con el formato del contrato
// (`catalogSections`): los NUMERIC salen como número y las marcas de tiempo como ISO 8601.
class PostgresCatalogSnapshotReader {
  constructor(pool) {
    this.pool = pool;
  }

  _query(section) {
    const spec = SECTIONS[section];
    const source = SOURCES[section];
    if (!spec || !source) throw new Error(`Sección de catálogo desconocida: ${section}.`);
    const select = spec.fields.map(({ column, key, sql }) =>
      `${source.alias}.${column}${sql === 'numeric' ? '::float8' : ''} AS "${key}"`).join(', ');
    return `SELECT ${select} FROM ${source.from} WHERE ${source.where} ORDER BY ${source.order}`;
  }

  async read(section) {
    const spec = SECTIONS[section];
    const res = await this.pool.query(this._query(section));
    const timestamps = spec.fields.filter(f => f.sql === 'timestamptz').map(f => f.key);
    return res.rows.map(row => {
      for (const key of timestamps) row[key] = new Date(row[key]).toISOString();
      return row;
    });
  }
}

module.exports = PostgresCatalogSnapshotReader;
