const { MEDIA_URL_PREFIX } = require('../../infrastructure/media/mediaPaths');

// portal-api: recibe las fotos de la tienda por el canal interno y las sirve a los clientes.
class MediaSyncController {
  constructor({ reconcileUC, storeFileUC, getFileUC }) {
    this.reconcileUC = reconcileUC;
    this.storeFileUC = storeFileUC;
    this.getFileUC = getFileUC;
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
      const etag = `"${file.sha256}"`;
      res.set({
        'Content-Type': file.contentType,
        'Cache-Control': 'public, max-age=86400',
        ETag: etag,
        'Last-Modified': new Date(file.updatedAt).toUTCString()
      });
      if (req.get('if-none-match') === etag) return res.status(304).end();
      return res.send(file.data);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = MediaSyncController;
