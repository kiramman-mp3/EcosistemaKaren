const crypto = require('node:crypto');
const { ValidationException } = require('../../domain/exceptions/DomainExceptions');
const { MAX_MEDIA_BYTES, isMediaPath, contentTypeFor } = require('../../infrastructure/media/mediaPaths');

// Firmas de cada formato: el portal sirve estos bytes con el tipo de contenido de la extensión, así
// que un archivo que no sea de verdad una imagen del tipo declarado se rechaza.
const SIGNATURES = {
  'image/jpeg': buffer => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': buffer => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': buffer => buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
};

// portal-api: la tienda informa qué fotos usa (ruta y hash) y recibe cuáles debe subir. Las que el
// portal tiene y la tienda ya no usa se eliminan.
class ReconcileMediaManifest {
  constructor(mediaMirrorRepository) {
    this.mediaMirrorRepository = mediaMirrorRepository;
  }

  async execute({ files, prune = true }) {
    return this.mediaMirrorRepository.reconcile(files, { prune });
  }
}

// portal-api: guarda una foto subida por la tienda tras comprobar ruta, tamaño, firma y hash.
class StoreMediaFile {
  constructor(mediaMirrorRepository) {
    this.mediaMirrorRepository = mediaMirrorRepository;
  }

  async execute({ ruta, sha256, data }) {
    if (!isMediaPath(ruta)) throw new ValidationException('La ruta de la foto no es válida.');
    if (!Buffer.isBuffer(data) || data.length === 0) throw new ValidationException('La foto llegó vacía.');
    if (data.length > MAX_MEDIA_BYTES) throw new ValidationException(`La foto supera ${MAX_MEDIA_BYTES / 1048576} MB.`);

    const tipoContenido = contentTypeFor(ruta);
    if (!SIGNATURES[tipoContenido](data)) throw new ValidationException('El archivo no es una imagen del tipo que indica su extensión.');

    const actual = crypto.createHash('sha256').update(data).digest('hex');
    if (typeof sha256 !== 'string' || sha256.toLowerCase() !== actual) {
      throw new ValidationException('El hash de la foto no coincide con su contenido.');
    }

    await this.mediaMirrorRepository.save({ ruta, sha256: actual, tipoContenido, data });
    return { ruta, sha256: actual, size: data.length };
  }
}

// portal-api: la foto que se sirve a los clientes, o null si no existe.
class GetMediaFile {
  constructor(mediaMirrorRepository) {
    this.mediaMirrorRepository = mediaMirrorRepository;
  }

  async execute(ruta) {
    if (!isMediaPath(ruta)) return null;
    return this.mediaMirrorRepository.find(ruta);
  }
}

module.exports = { ReconcileMediaManifest, StoreMediaFile, GetMediaFile };
