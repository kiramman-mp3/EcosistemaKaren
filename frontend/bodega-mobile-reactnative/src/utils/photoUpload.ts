import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { resizeTarget, UPLOAD_QUALITY } from './photo';

/**
 * Reduce y recomprime una foto de la cámara o la galería (JPEG, lado largo máx. 1280 px) y devuelve el
 * archivo temporal listo para subir. También convierte HEIC/PNG a JPEG, que es lo que espera el servidor.
 */
export async function compressPhoto(uri: string, width: number, height: number): Promise<{ uri: string }> {
  const context = ImageManipulator.manipulate(uri);
  const target = resizeTarget(width, height);
  if (target) context.resize(target);
  const rendered = await context.renderAsync();
  return rendered.saveAsync({ format: SaveFormat.JPEG, compress: UPLOAD_QUALITY });
}
