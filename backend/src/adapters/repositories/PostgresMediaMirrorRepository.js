// Copia de las fotos de productos en la base de portal-api. La tienda manda la lista de fotos que usa
// (`reconcile`) y sube solo las que faltan o cambiaron (`save`); `find` las entrega a los clientes.
class PostgresMediaMirrorRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Compara el manifiesto de la tienda con lo guardado: devuelve las rutas que hay que subir
   * (nuevas o con otro hash) y, salvo `prune: false`, elimina las que la tienda ya no usa.
   * @param {{ruta: string, sha256: string}[]} files
   */
  async reconcile(files, { prune = true } = {}) {
    const stored = await this.pool.query('SELECT ruta, sha256 FROM media_archivos');
    const known = new Map(stored.rows.map(row => [row.ruta, row.sha256.trim().toLowerCase()]));
    const wanted = new Set(files.map(file => file.ruta));

    const missing = files
      .filter(file => known.get(file.ruta) !== file.sha256.toLowerCase())
      .map(file => file.ruta);
    const stale = prune ? [...known.keys()].filter(ruta => !wanted.has(ruta)) : [];
    if (stale.length > 0) {
      await this.pool.query('DELETE FROM media_archivos WHERE ruta = ANY($1::text[])', [stale]);
    }
    return { missing, removed: stale.length };
  }

  async save({ ruta, sha256, tipoContenido, data }) {
    await this.pool.query(
      `INSERT INTO media_archivos (ruta, tipo_contenido, tamano_bytes, sha256, datos)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ruta) DO UPDATE SET
         tipo_contenido = EXCLUDED.tipo_contenido, tamano_bytes = EXCLUDED.tamano_bytes,
         sha256 = EXCLUDED.sha256, datos = EXCLUDED.datos, updated_at = CURRENT_TIMESTAMP`,
      [ruta, tipoContenido, data.length, sha256, data]
    );
  }

  async find(ruta) {
    const result = await this.pool.query(
      'SELECT tipo_contenido AS "contentType", sha256, datos AS data, updated_at AS "updatedAt" FROM media_archivos WHERE ruta = $1',
      [ruta]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { contentType: row.contentType, sha256: row.sha256.trim().toLowerCase(), data: row.data, updatedAt: row.updatedAt };
  }
}

module.exports = PostgresMediaMirrorRepository;
