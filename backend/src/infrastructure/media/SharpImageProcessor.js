const sharp = require('sharp');
const { ValidationException } = require('../../domain/exceptions/DomainExceptions');
const { MAX_MEDIA_BYTES } = require('./mediaPaths');

// Formatos de entrada aceptados. Las fotos de cámara suelen ser JPEG; HEIC solo si esta compilación de
// libvips lo decodifica (si no, la app lo convierte a JPEG antes de subir).
const INPUT_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif']);
// Protección contra imágenes "bomba" (pocos bytes, miles de millones de píxeles). Una cámara de 50 MP cabe de sobra.
const MAX_INPUT_PIXELS = 120 * 1000 * 1000;
const QUALITIES = [80, 70, 60, 50, 40];

/**
 * Normaliza la foto de un producto: la endereza según su orientación EXIF, la reduce a un máximo de
 * `maxSide` px por lado (nunca la agranda), la convierte a JPEG progresivo y le quita los metadatos
 * (ubicación GPS, modelo de cámara...). Una foto de 12 MP de cámara (5-10 MB) queda en ~100-250 KB.
 */
class SharpImageProcessor {
  constructor({ maxSide = 1024, maxOutputBytes = MAX_MEDIA_BYTES } = {}) {
    this.maxSide = maxSide;
    this.maxOutputBytes = maxOutputBytes;
  }

  async process(input) {
    let metadata;
    try {
      metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch (error) {
      throw new ValidationException(this._explain(error));
    }
    if (!INPUT_FORMATS.has(metadata.format)) {
      throw new ValidationException('El archivo debe ser una imagen JPEG, PNG o WebP.');
    }

    let output;
    for (const quality of QUALITIES) {
      try {
        output = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
          .rotate()
          .resize({ width: this.maxSide, height: this.maxSide, fit: 'inside', withoutEnlargement: true })
          // PNG/WebP con transparencia: el catálogo usa fondo claro, no negro.
          .flatten({ background: '#ffffff' })
          .jpeg({ quality, mozjpeg: true, progressive: true })
          .toBuffer({ resolveWithObject: true });
      } catch (error) {
        throw new ValidationException(this._explain(error));
      }
      if (output.data.length <= this.maxOutputBytes) break;
    }
    if (output.data.length > this.maxOutputBytes) {
      throw new ValidationException('No se pudo reducir la foto a un tamaño aceptable.');
    }
    return { data: output.data, width: output.info.width, height: output.info.height, format: 'jpeg' };
  }

  _explain(error) {
    if (/pixel limit|exceeds/i.test(error.message)) return 'La imagen tiene demasiados píxeles.';
    return 'No se pudo leer la imagen: el archivo está dañado o no es una imagen compatible.';
  }
}

module.exports = SharpImageProcessor;
