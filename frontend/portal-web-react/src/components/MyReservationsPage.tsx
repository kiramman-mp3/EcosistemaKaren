import React, { useMemo, useState } from 'react';
import { AlertTriangle, QrCode, RefreshCw } from 'lucide-react';
import type { BackendReservation } from '../api/client';
import { formatDateTime } from '../utils/dates';

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
  PENDIENTE: 'Por retirar',
  CONFIRMADA: 'Retirada',
  EXPIRADA: 'Venció',
  CANCELADA: 'Cancelada',
};

const statusClass: Record<BackendReservation['estado'], string> = {
  PENDIENTE: 'bg-sticker text-ink',
  CONFIRMADA: 'bg-fresh-tint text-fresh',
  EXPIRADA: 'bg-aisle text-ink-muted',
  CANCELADA: 'bg-aisle text-ink-muted',
};

export const MyReservationsPage: React.FC<Props> = ({
  authenticated, reservations, syncing, onRefresh, onCancel, onOpenPass, onLogin, onExplore,
}) => {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReservationFilter>('TODAS');

  const normalized = useMemo(() => reservations.map(reservation => {
    const isExpiredPending = reservation.estado === 'PENDIENTE'
      && new Date(reservation.fechaExpiracion).getTime() <= Date.now();
    return { reservation, effectiveStatus: isExpiredPending ? 'EXPIRADA' as const : reservation.estado };
  }), [reservations]);

  const filtered = useMemo(() => normalized.filter(({ effectiveStatus }) => {
    if (filter === 'TODAS') return true;
    if (filter === 'PENDIENTES') return effectiveStatus === 'PENDIENTE';
    if (filter === 'COMPLETADAS') return effectiveStatus === 'CONFIRMADA';
    return effectiveStatus === 'CANCELADA' || effectiveStatus === 'EXPIRADA';
  }), [filter, normalized]);

  const cancel = async (id: string) => {
    if (!window.confirm('¿Cancelar esta reserva? Las unidades vuelven a la percha de inmediato.')) return;
    setCancelling(id);
    setError(null);
    try {
      await onCancel(id);
    } catch (cause: any) {
      setError(cause?.message || 'No se pudo cancelar la reserva. Inténtalo de nuevo.');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 min-h-[60vh]">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-tag font-bold text-4xl sm:text-5xl text-ink leading-none">Mis reservas</h1>
          <p className="mt-2 text-ink-soft">Tus códigos de retiro y lo que ya pasó por caja.</p>
        </div>
        {authenticated && (
          <button
            onClick={() => void onRefresh()}
            disabled={syncing}
            className="h-10 px-4 rounded-tag border border-aisle-rule bg-white text-sm font-semibold text-ink flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Actualizando…' : 'Actualizar'}
          </button>
        )}
      </div>

      {!authenticated ? (
        <div className="max-w-lg rounded-tag bg-white border border-aisle-rule p-8">
          <h2 className="font-tag font-bold text-2xl text-ink">Ingresa para ver tus reservas</h2>
          <p className="mt-2 text-ink-soft">Tus códigos de retiro están protegidos por tu cuenta.</p>
          <button onClick={onLogin} className="mt-5 h-11 px-5 rounded-tag bg-ink text-white font-semibold">Ingresar</button>
        </div>
      ) : (
        <>
          {error && (
            <p role="alert" className="mb-5 flex gap-2 rounded-tag bg-karen-tint text-karen-deep text-sm p-3">
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
                className={`shrink-0 h-9 px-3.5 rounded-tag text-sm font-semibold ${
                  filter === option.id ? 'bg-ink text-white' : 'bg-white text-ink-soft border border-aisle-rule'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {!syncing && reservations.length === 0 ? (
            <div className="max-w-lg rounded-tag bg-white border border-aisle-rule p-8">
              <h2 className="font-tag font-bold text-2xl text-ink">Todavía no tienes reservas</h2>
              <p className="mt-2 text-ink-soft">Agrega productos a tu lista y reserva para recibir tu código de retiro.</p>
              <button onClick={onExplore} className="mt-5 h-11 px-5 rounded-tag bg-karen text-white font-semibold">Ver productos</button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-ink-muted">No tienes reservas en este grupo.</p>
          ) : (
            <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(({ reservation, effectiveStatus }) => {
                const pending = effectiveStatus === 'PENDIENTE';
                const total = reservation.detalles.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario), 0);
                const names = reservation.detalles.map(detail => detail.productoNombre).filter(Boolean) as string[];
                return (
                  <li key={reservation.id} className={`flex flex-col rounded-tag bg-white border ${pending ? 'border-ink' : 'border-aisle-rule'}`}>
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-tag font-bold text-2xl text-ink tracking-wide leading-none">{reservation.codigoRetiro}</p>
                        <p className="mt-1.5 text-xs text-ink-muted">
                          {pending
                            ? `Retira antes de ${formatDateTime(reservation.fechaExpiracion)}`
                            : `Reservada el ${formatDateTime(reservation.created_at || reservation.fechaExpiracion)}`}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-tag px-2 py-1 text-xs font-semibold ${statusClass[effectiveStatus]}`}>
                        {statusLabel[effectiveStatus]}
                      </span>
                    </div>
                    <div className="rule-dashed mx-4" aria-hidden="true" />
                    <div className="p-4 flex-1">
                      {names.length > 0 && (
                        <p className="text-sm text-ink-soft line-clamp-2">{names.join(', ')}</p>
                      )}
                      <p className="mt-2 text-sm text-ink-soft">
                        Total reservado: <strong className="text-ink tabular">${total.toFixed(2)}</strong>
                      </p>
                    </div>
                    {pending && (
                      <div className="grid grid-cols-2 gap-2 p-4 pt-0">
                        <button onClick={() => onOpenPass(reservation)} className="h-11 rounded-tag bg-ink text-white text-sm font-semibold flex items-center justify-center gap-2">
                          <QrCode className="w-4 h-4" />Ver pase QR
                        </button>
                        <button
                          onClick={() => void cancel(reservation.id)}
                          disabled={cancelling === reservation.id}
                          className="h-11 rounded-tag border border-aisle-strong text-karen-deep text-sm font-semibold disabled:opacity-60"
                        >
                          {cancelling === reservation.id ? 'Cancelando…' : 'Cancelar reserva'}
                        </button>
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
