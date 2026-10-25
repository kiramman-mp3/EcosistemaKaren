// Forma mínima de los errores que interesan: los de axios (con la respuesta del backend) y los Error comunes.
interface HttpErrorLike {
  message?: unknown;
  response?: { status?: unknown; data?: { message?: unknown; error?: unknown } };
}

const asHttpError = (error: unknown): HttpErrorLike | undefined =>
  typeof error === 'object' && error !== null ? (error as HttpErrorLike) : undefined;

const nonEmpty = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

/** Mensaje que el backend envió en la respuesta de error, si lo hay (no el texto técnico de red). */
export function getServerMessage(error: unknown): string | undefined {
  return nonEmpty(asHttpError(error)?.response?.data?.message);
}

/** Mensaje para mostrar al usuario: el que envió el backend, el del error, o `fallback`. */
export function getErrorMessage(error: unknown, fallback: string): string {
  return getServerMessage(error) ?? nonEmpty(asHttpError(error)?.message) ?? fallback;
}

/** Código HTTP de la respuesta del backend, si el error viene de una solicitud. */
export function getErrorStatus(error: unknown): number | undefined {
  const status = asHttpError(error)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}

/** Tipo de error que informa el backend (campo `error` de la respuesta, p. ej. "GeminiNotConfigured"). */
export function getErrorCode(error: unknown): string | undefined {
  return nonEmpty(asHttpError(error)?.response?.data?.error);
}
