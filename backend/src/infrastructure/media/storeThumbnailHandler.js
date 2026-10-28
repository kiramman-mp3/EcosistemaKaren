const fs = require('node:fs/promises');
const { MEDIA_URL_PREFIX, isMediaPath, localFileFor } = require('./mediaPaths');
const { parseThumbnailWidth } = require('./ThumbnailService');

const THUMBNAIL_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Tienda y monolito: responde `GET /api/v1/media/productos/<foto>?w=<ancho>` con una miniatura de la
 * foto del disco. Sin `w` válido, o si la foto no existe o no se puede leer, pasa al manejador
 * estático, que sirve el original o responde 404.
 */
function createStoreThumbnailHandler({ mediaDir, service }) {
  return async (req, res, next) => {
    try {
      const width = parseThumbnailWidth(req.query.w);
      if (!width || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
      const ruta = `${MEDIA_URL_PREFIX}${req.path.replace(/^\/+/, '')}`;
      if (!isMediaPath(ruta)) return next();

      const file = localFileFor(mediaDir, ruta);
      const stat = await fs.stat(file).catch(() => null);
      if (!stat || !stat.isFile()) return next();

      const etag = `"${stat.size}-${Math.trunc(stat.mtimeMs)}-w${width}"`;
      res.set({ 'Cache-Control': `public, max-age=${THUMBNAIL_MAX_AGE_SECONDS}`, ETag: etag });
      if (req.get('if-none-match') === etag) return res.status(304).end();

      const data = await service.render(ruta, etag, width, () => fs.readFile(file));
      if (!data) return next();
      res.set('Content-Type', 'image/jpeg');
      return res.send(data);
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = createStoreThumbnailHandler;
