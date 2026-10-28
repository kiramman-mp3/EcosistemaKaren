/** Anchos de miniatura que el backend acepta en `?w=`; con cualquier otro devuelve la foto de 1024 px. */
export type ThumbnailWidth = 160 | 320 | 640;

const MEDIA_PATH = '/api/v1/media/';

/** URL de la miniatura de una foto del backend. Otras imágenes (https externo, archivos locales) no cambian. */
export function thumbUrl(url: string | null, width: ThumbnailWidth): string | null {
  if (!url || !url.includes(MEDIA_PATH)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
}
