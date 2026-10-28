// Contrato de las fotos de productos que la tienda sincroniza al portal (ADR-003).
// Una foto es un archivo local que el backend sirve en `/api/v1/media/productos/<nombre>`; los
// productos la referencian en `imagenUrl`. Cualquier otra URL (p. ej. https externa) no se sincroniza.
//
// Las rutas se validan en ambos extremos: la tienda no lee fuera de su carpeta de medios y el
// portal no acepta nombres que puedan escapar de ella ni tipos de archivo que no sean imágenes.
const path = require('node:path');

const MEDIA_URL_PREFIX = '/api/v1/media/';
// Tamaño máximo de una foto ya procesada (la que se guarda, se sincroniza y se sirve).
const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
// Tamaño máximo de la foto original que se sube: una foto de cámara de 12-50 MP pesa entre 3 y 15 MB.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
// Tipos con los que se sube una foto de producto (la app puede enviar la original de la cámara).
const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

// productos/<nombre>.<ext>, con un nombre de archivo simple: sin barras, sin puntos iniciales ni `..`.
const MEDIA_PATH_PATTERN = /^\/api\/v1\/media\/productos\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.(jpg|jpeg|png|webp)$/i;

// Las fotos que sube la app se guardan como `<código>-<hash de contenido>.jpg` (ProductUseCases): si la foto
// cambia, cambia el nombre. Esas URLs nunca cambian de contenido y pueden cachearse un año sin revalidar.
const CONTENT_HASHED_PATTERN = /-[0-9a-f]{10}\.(jpg|jpeg|png|webp)$/i;
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function isContentHashed(value) {
  return typeof value === 'string' && CONTENT_HASHED_PATTERN.test(value);
}

/** `setHeaders` de express.static: caché inmutable para fotos con hash; el resto conserva su `maxAge`. */
function setMediaCacheHeaders(res, file) {
  if (isContentHashed(file)) res.setHeader('Cache-Control', IMMUTABLE_CACHE_CONTROL);
}

function isMediaPath(value) {
  return typeof value === 'string' && MEDIA_PATH_PATTERN.test(value) && !value.includes('..');
}

function contentTypeFor(mediaPath) {
  return CONTENT_TYPES[path.extname(mediaPath).toLowerCase()] || null;
}

/** Carpeta de medios: la configurada (MEDIA_DIR) o backend/public/media. */
function resolveMediaDir(configured) {
  return configured ? path.resolve(configured) : path.resolve(__dirname, '../../../public/media');
}

/** Ruta dentro de la carpeta de medios (`/api/v1/media/productos/x.jpg` -> `<dir>/productos/x.jpg`). */
function localFileFor(mediaDir, mediaPath) {
  return path.join(mediaDir, mediaPath.slice(MEDIA_URL_PREFIX.length));
}

module.exports = {
  MEDIA_URL_PREFIX, MAX_MEDIA_BYTES, MAX_UPLOAD_BYTES, UPLOAD_CONTENT_TYPES, MEDIA_PATH_PATTERN,
  IMMUTABLE_CACHE_CONTROL, isMediaPath, isContentHashed, setMediaCacheHeaders, contentTypeFor, localFileFor, resolveMediaDir
};
