// Preparación de las fotos de producto antes de subirlas (la lógica pura; la parte nativa está en photoUpload.ts).
// El servidor vuelve a comprimir y normalizar todo (máx. 1024 px, JPEG), así que aquí solo se busca no enviar
// los 8-15 MB que entrega la cámara por el wifi de la tienda.

/** Lado largo máximo de lo que se envía: algo más que lo que guarda el servidor, para que éste pueda afinar. */
export const UPLOAD_MAX_SIDE = 1280;
/** Calidad JPEG (0-1) de la copia que se envía. */
export const UPLOAD_QUALITY = 0.75;

/**
 * Cómo reducir una foto para que su lado largo no pase de `maxSide`. Devuelve el ancho o el alto de destino
 * (el otro se calcula manteniendo la proporción) o `null` si ya cabe o no se conocen sus medidas: nunca se agranda.
 */
export function resizeTarget(width: number, height: number, maxSide: number = UPLOAD_MAX_SIDE): { width: number } | { height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (Math.max(width, height) <= maxSide) return null;
  return width >= height ? { width: maxSide } : { height: maxSide };
}

/** "10,4 MB", "152 KB", "800 B". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
