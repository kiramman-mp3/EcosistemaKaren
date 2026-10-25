// Contrato de las fotos de productos que la tienda sincroniza al portal (ADR-003).
// Una foto es un archivo local que el backend sirve en `/api/v1/media/productos/<nombre>`; los
// productos la referencian en `imagenUrl`. Cualquier otra URL (p. ej. https externa) no se sincroniza.
//
// Las rutas se validan en ambos extremos: la tienda no lee fuera de su carpeta de medios y el
// portal no acepta nombres que puedan escapar de ella ni tipos de archivo que no sean imágenes.
const path = require('node:path');

const MEDIA_URL_PREFIX = '/api/v1/media/';
const MAX_MEDIA_BYTES = 2 * 1024 * 1024;

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

// productos/<nombre>.<ext>, con un nombre de archivo simple: sin barras, sin puntos iniciales ni `..`.
const MEDIA_PATH_PATTERN = /^\/api\/v1\/media\/productos\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.(jpg|jpeg|png|webp)$/i;

function isMediaPath(value) {
  return typeof value === 'string' && MEDIA_PATH_PATTERN.test(value) && !value.includes('..');
}

function contentTypeFor(mediaPath) {
  return CONTENT_TYPES[path.extname(mediaPath).toLowerCase()] || null;
}

/** Ruta dentro de la carpeta de medios (`/api/v1/media/productos/x.jpg` -> `<dir>/productos/x.jpg`). */
function localFileFor(mediaDir, mediaPath) {
  return path.join(mediaDir, mediaPath.slice(MEDIA_URL_PREFIX.length));
}

module.exports = { MEDIA_URL_PREFIX, MAX_MEDIA_BYTES, MEDIA_PATH_PATTERN, isMediaPath, contentTypeFor, localFileFor };
