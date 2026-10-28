// Anchos de miniatura que el backend acepta en `?w=` (ThumbnailService). Cualquier otro ancho se
// ignora allí y devuelve la foto original de 1024 px.
export const THUMBNAIL_WIDTHS = [160, 320, 640] as const;
export type ThumbnailWidth = (typeof THUMBNAIL_WIDTHS)[number];

const MEDIA_PREFIX = '/api/v1/media/';

/** Solo las fotos que sirve el backend tienen miniaturas; el resto (data:, https externo, assets) no. */
export const isMediaUrl = (url: string): boolean => url.startsWith(MEDIA_PREFIX);

/** URL de la miniatura de `width` px, o la misma URL si la imagen no viene del backend. */
export function thumbUrl(url: string, width: ThumbnailWidth): string {
  if (!isMediaUrl(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
}

/** Valor de `srcset` con todas las miniaturas, o undefined si la imagen no tiene variantes. */
export function thumbSrcSet(url: string): string | undefined {
  if (!isMediaUrl(url)) return undefined;
  return THUMBNAIL_WIDTHS.map(width => `${thumbUrl(url, width)} ${width}w`).join(', ');
}
