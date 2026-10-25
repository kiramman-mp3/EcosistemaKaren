import type { BackendReservation } from '../api/client';
import { isAwaitingStore, waitForStoreResolution } from './awaitStore';

const reservation = (estado: BackendReservation['estado'], extra: Partial<BackendReservation> = {}): BackendReservation => ({
  id: 'res-1', usuarioId: 'u1', codigoRetiro: estado === 'PENDIENTE' ? 'KR-ABC123' : null,
  estado, fechaExpiracion: new Date(Date.now() + 600000).toISOString(), detalles: [], ...extra,
});

describe('waitForStoreResolution', () => {
  it('reconoce las reservas que esperan a la tienda', () => {
    expect(isAwaitingStore(reservation('PENDIENTE_SYNC'))).toBe(true);
    expect(isAwaitingStore(reservation('PENDIENTE'))).toBe(false);
    expect(isAwaitingStore(reservation('RECHAZADA'))).toBe(false);
  });

  it('devuelve la reserva en cuanto la tienda la acepta', async () => {
    const fetchReservations = jest.fn()
      .mockResolvedValueOnce([reservation('PENDIENTE_SYNC')])
      .mockResolvedValueOnce([reservation('PENDIENTE_SYNC')])
      .mockResolvedValueOnce([reservation('PENDIENTE')]);
    const sleep = jest.fn().mockResolvedValue(undefined);
    const result = await waitForStoreResolution('res-1', fetchReservations, { sleep, intervalMs: 10 });
    expect(result?.estado).toBe('PENDIENTE');
    expect(result?.codigoRetiro).toBe('KR-ABC123');
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('devuelve el rechazo con su mensaje', async () => {
    const rejected = reservation('RECHAZADA', { mensajeRechazo: 'Stock insuficiente', motivoRechazo: 'OVERBOOKING' });
    const result = await waitForStoreResolution('res-1', async () => [rejected], { sleep: async () => {} });
    expect(result?.estado).toBe('RECHAZADA');
    expect(result?.mensajeRechazo).toBe('Stock insuficiente');
  });

  it('al agotar el tiempo devuelve la reserva todavía pendiente de la tienda', async () => {
    let now = 0;
    const result = await waitForStoreResolution('res-1', async () => [reservation('PENDIENTE_SYNC')], {
      timeoutMs: 10000, intervalMs: 2000, now: () => now, sleep: async ms => { now += ms; },
    });
    expect(result?.estado).toBe('PENDIENTE_SYNC');
    expect(now).toBe(10000);
  });

  it('tolera fallos de red mientras consulta', async () => {
    const fetchReservations = jest.fn()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce([reservation('PENDIENTE')]);
    const result = await waitForStoreResolution('res-1', fetchReservations, { sleep: async () => {} });
    expect(result?.estado).toBe('PENDIENTE');
  });

  it('devuelve null si la reserva nunca aparece', async () => {
    let now = 0;
    const result = await waitForStoreResolution('otra', async () => [reservation('PENDIENTE_SYNC')], {
      timeoutMs: 4000, intervalMs: 2000, now: () => now, sleep: async ms => { now += ms; },
    });
    expect(result).toBeNull();
  });
});
