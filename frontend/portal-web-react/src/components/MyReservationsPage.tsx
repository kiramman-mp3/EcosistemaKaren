import React, { useMemo, useState } from 'react';
import { AlertTriangle, QrCode, RefreshCw } from 'lucide-react';
import type { BackendReservation } from '../api/client';
import { formatDateTime } from '../utils/dates';
import { Button } from './ui/Button';
import { Illustration } from './ui/Illustration';
import { getErrorMessage } from '../utils/errors';

interface Props {
  authenticated: boolean;
  reservations: BackendReservation[];
  syncing: boolean;
  onRefresh: () => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onOpenPass: (reservation: BackendReservation) => void;
  onLogin: () => void;
  onExplore: () => void;
}

type ReservationFilter = 'TODAS' | 'PENDIENTES' | 'COMPLETADAS' | 'CANCELADAS';

const FILTERS: { id: ReservationFilter; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'PENDIENTES', label: 'Por retirar' },
  { id: 'COMPLETADAS', label: 'Retiradas' },
  { id: 'CANCELADAS', label: 'Canceladas o vencidas' },
];

const statusLabel: Record<BackendReservation['estado'], string> = {
  PENDIENTE_SYNC: 'Confirmando',
  PENDIENTE: 'Por retirar',
  CONFIRMADA: 'Retirada',
  EXPIRADA: 'Venció',
  CANCELADA: 'Cancelada',
  RECHAZADA: 'No disponible',
};

const statusClass: Record<BackendReservation['estado'], string> = {
  PENDIENTE_SYNC: 'bg-aisle text-ink border-2 border-mora',
  PENDIENTE: 'bg-limon text-mora border-2 border-mora',
  CONFIRMADA: 'bg-fresh-tint text-fresh border-2 border-transparent',
  EXPIRADA: 'bg-aisle text-ink-muted border-2 border-transparent',
  CANCELADA: 'bg-aisle text-ink-muted border-2 border-transparent',
  RECHAZADA: 'bg-karen-tint text-karen-deep border-2 border-transparent',
};

export const MyReservationsPage: React.FC<Props> = ({
  authenticated, reservations, syncing, onRefresh, onCancel, onOpenPass, onLogin, onExplore,
}) => {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReservationFilter>('TODAS');

  const normalized = useMemo(() => reservations.map(reservation => {
    const isExpiredPending = (reservation.estado === 'PENDIENTE' || reservation.estado === 'PENDIENTE_SYNC')
      && new Date(reservation.fechaExpiracion).getTime() <= Date.now();
    return { reservation, effectiveStatus: isExpiredPending ? 'EXPIRADA' as const : reservation.estado };
  }), [reservations]);

  const filtered = useMemo(() => normalized.filter(({ effectiveStatus }) => {
    if (filter === 'TODAS') return true;
    if (filter === 'PENDIENTES') return effectiveStatus === 'PENDIENTE' || effectiveStatus === 'PENDIENTE_SYNC';
    if (filter === 'COMPLETADAS') return effectiveStatus === 'CONFIRMADA';
    return effectiveStatus === 'CANCELADA' || effectiveStatus === 'EXPIRADA' || effectiveStatus === 'RECHAZADA';
  }), [filter, normalized]);

  const cancel = async (id: string) => {
    if (!window.confirm('¿Cancelar esta reserva? Las unidades vuelven a la percha de inmediato.')) return;
    setCancelling(id);
    setError(null);
    try {
      await onCancel(id);
    } catch (cause: unknown) {
      setError(getErrorMessage(cause, 'No se pudo cancelar la reserva. Inténtalo de nuevo.'));
    } finally {
      setCancelling(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 min-h-[60vh]">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl sm:text-6xl text-ink leading-none">Mis reservas</h1>
          <p className="mt-3 text-lg text-ink-soft">Tus códigos de retiro y lo que ya pasó por caja.</p>
        </div>
        {authenticated && (
          <Button onClick={() => void onRefresh()} disabled={syncing} variant="surface">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Actualizando…' : 'Actualizar'}
          </Button>
        )}
      </div>

      {!authenticated ? (
        <div className="max-w-lg rounded-block bg-surface border-2 border-mora shadow-pop p-8 flex flex-col items-start">
          <Illustration name="ticket" className="w-28 h-28" />
          <h2 className="mt-2 text-2xl text-ink">Ingresa para ver tus reservas</h2>
          <p className="mt-2 text-ink-soft">Tus códigos de retiro están protegidos por tu cuenta.</p>
          <Button onClick={onLogin} className="mt-5">Ingresar</Button>
        </div>
      ) : (
        <>
          {error && (
            <p role="alert" className="mb-5 flex gap-2 rounded-tag bg-karen-tint text-karen-deep text-sm font-semibold p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </p>
          )}

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6" role="tablist" aria-label="Filtrar reservas">
            {FILTERS.map(option => (
              <button
                key={option.id}
                role="tab"
                aria-selected={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={`shrink-0 h-10 px-4 rounded-full border-2 text-sm font-bold transition-colors ${
                  filter === option.id
                    ? 'bg-limon text-mora border-mora shadow-pop-sm'
                    : 'bg-surface text-ink-soft border-aisle-rule'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {!syncing && reservations.length === 0 ? (
            <div className="max-w-lg rounded-block bg-surface border-2 border-mora shadow-pop p-8 flex flex-col items-start">
              <Illustration name="ticket" className="w-28 h-28" />
              <h2 className="mt-2 text-2xl text-ink">Todavía no tienes reservas</h2>
              <p className="mt-2 text-ink-soft">Arma tu lista y apártala: aquí aparece tu código de retiro.</p>
              <Button onClick={onExplore} className="mt-5">Ver productos</Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-ink-muted">No tienes reservas en este grupo.</p>
          ) : (
            <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(({ reservation, effectiveStatus }) => {
                const pending = effectiveStatus === 'PENDIENTE';
                const awaitingStore = effectiveStatus === 'PENDIENTE_SYNC';
                const rejected = effectiveStatus === 'RECHAZADA';
                const total = reservation.detalles.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario), 0);
                const names = reservation.detalles.map(detail => detail.productoNombre).filter(Boolean) as string[];
                return (
                  <li key={reservation.id} className={`flex flex-col rounded-block bg-surface border-2 ${pending || awaitingStore ? 'border-mora shadow-pop' : 'border-aisle-rule'}`}>
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-stamp font-black text-3xl text-ink tracking-wide leading-none">
                          {reservation.codigoRetiro || (rejected ? 'Sin código' : 'Confirmando…')}
                        </p>
                        <p className="mt-1.5 text-xs text-ink-muted">
                          {pending
                            ? `Retira antes de ${formatDateTime(reservation.fechaExpiracion)}`
                            : `Apartada el ${formatDateTime(reservation.created_at || reservation.fechaExpiracion)}`}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${statusClass[effectiveStatus]}`}>
                        {statusLabel[effectiveStatus]}
                      </span>
                    </div>
                    <div className="rule-dashed mx-4" aria-hidden="true" />
                    <div className="p-4 flex-1">
                      {awaitingStore && (
                        <p className="text-sm text-ink-soft">Estamos confirmando tu reserva con la tienda. Se actualiza sola.</p>
                      )}
                      {rejected && (
                        <p role="status" className="text-sm font-semibold text-karen-deep">
                          {reservation.mensajeRechazo || 'La tienda no pudo apartar estos productos.'}
                        </p>
                      )}
                      {names.length > 0 && (
                        <p className="text-sm text-ink-soft line-clamp-2">{names.join(', ')}</p>
                      )}
                      {reservation.detalles.length > 0 && (
                        <p className="mt-2 text-sm text-ink-soft">
                          Total reservado: <strong className="text-ink tabular">${total.toFixed(2)}</strong>
                        </p>
                      )}
                    </div>
                    {awaitingStore && (
                      <div className="p-4 pt-0">
                        <Button
                          onClick={() => void cancel(reservation.id)}
                          disabled={cancelling === reservation.id}
                          variant="surface"
                        >
                          {cancelling === reservation.id ? 'Cancelando…' : 'Cancelar reserva'}
                        </Button>
                      </div>
                    )}
                    {pending && (
                      <div className="grid grid-cols-2 gap-2 p-4 pt-0">
                        <Button onClick={() => onOpenPass(reservation)}>
                          <QrCode className="w-4 h-4" />Ver pase QR
                        </Button>
                        <Button
                          onClick={() => void cancel(reservation.id)}
                          disabled={cancelling === reservation.id}
                          variant="surface"
                        >
                          {cancelling === reservation.id ? 'Cancelando…' : 'Cancelar reserva'}
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
