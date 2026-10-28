const { MEDIA_URL_PREFIX, IMMUTABLE_CACHE_CONTROL, isContentHashed } = require('../../infrastructure/media/mediaPaths');
const { ThumbnailService, parseThumbnailWidth } = require('../../infrastructure/media/ThumbnailService');

// portal-api: recibe las fotos de la tienda por el canal interno y las sirve a los clientes.
class MediaSyncController {
  constructor({ reconcileUC, storeFileUC, getFileUC, thumbnails = new ThumbnailService() }) {
    this.reconcileUC = reconcileUC;
    this.storeFileUC = storeFileUC;
    this.getFileUC = getFileUC;
    this.thumbnails = thumbnails;
  }

  async manifest(req, res, next) {
    try {
      const result = await this.reconcileUC.execute(req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async upload(req, res, next) {
    try {
      const result = await this.storeFileUC.execute({
        ruta: req.query.ruta,
        sha256: req.get('x-content-sha256'),
        data: req.body
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/media/productos/<nombre>: si no hay foto, pasa al siguiente manejador (404).
  async serve(req, res, next) {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const file = await this.getFileUC.execute(`${MEDIA_URL_PREFIX}${req.path.replace(/^\/+/, '')}`);
      if (!file) return next();

      // El hash identifica el contenido: si el cliente ya lo tiene, no se vuelve a enviar.
      // Con `?w=` el ETag incluye el ancho, que cambia los bytes aunque el hash sea el mismo.
      const width = parseThumbnailWidth(req.query.w);
      const etag = width ? `"${file.sha256}-w${width}"` : `"${file.sha256}"`;
      res.set({
        'Cache-Control': isContentHashed(req.path) ? IMMUTABLE_CACHE_CONTROL : 'public, max-age=86400',
        ETag: etag,
        'Last-Modified': new Date(file.updatedAt).toUTCString()
      });
      if (req.get('if-none-match') === etag) return res.status(304).end();

      const thumbnail = width ? await this.thumbnails.render(req.path, file.sha256, width, () => file.data) : null;
      res.set('Content-Type', thumbnail ? 'image/jpeg' : file.contentType);
      return res.send(thumbnail || file.data);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = MediaSyncController;
