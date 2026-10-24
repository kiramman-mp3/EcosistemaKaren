import type { BackendReservation } from '../api/client';

/** Con portal y tienda separados, una reserva puede quedar un rato esperando la respuesta de la tienda. */
export function isAwaitingStore(reservation: Pick<BackendReservation, 'estado'>): boolean {
  return reservation.estado === 'PENDIENTE_SYNC';
}

interface WaitOptions {
  intervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * Consulta las reservas del cliente hasta que la tienda resuelva la indicada (deja de estar en
 * PENDIENTE_SYNC) o se agote el tiempo. Devuelve su último estado conocido, o null si no aparece.
 * Un fallo de red al consultar no corta la espera: se vuelve a intentar en el siguiente ciclo.
 */
export async function waitForStoreResolution(
  reservationId: string,
  fetchReservations: () => Promise<BackendReservation[]>,
  { intervalMs = 2000, timeoutMs = 45000, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now }: WaitOptions = {}
): Promise<BackendReservation | null> {
  const deadline = now() + timeoutMs;
  let latest: BackendReservation | null = null;
  for (;;) {
    try {
      const list = await fetchReservations();
      latest = list.find(reservation => reservation.id === reservationId) || latest;
      if (latest && !isAwaitingStore(latest)) return latest;
    } catch {
      // Se conserva el último estado y se reintenta.
    }
    if (now() >= deadline) return latest;
    await sleep(intervalMs);
  }
}
