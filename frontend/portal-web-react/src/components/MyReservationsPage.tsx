import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Clock, QrCode, RefreshCw, ShoppingBag } from 'lucide-react';
import type { BackendReservation } from '../api/client';

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

const statusLabel: Record<BackendReservation['estado'], string> = {
  PENDIENTE: 'Pendiente de retiro',
  CONFIRMADA: 'Completada',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
};

const statusClass: Record<BackendReservation['estado'], string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  CONFIRMADA: 'bg-emerald-100 text-emerald-700',
  EXPIRADA: 'bg-slate-100 text-slate-600',
  CANCELADA: 'bg-red-50 text-red-700',
};

export const MyReservationsPage: React.FC<Props> = ({
  authenticated, reservations, syncing, onRefresh, onCancel, onOpenPass, onLogin, onExplore,
}) => {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReservationFilter>('TODAS');

  const normalizedReservations = useMemo(() => reservations.map(reservation => {
    const isExpiredPending = reservation.estado === 'PENDIENTE'
      && new Date(reservation.fechaExpiracion).getTime() <= Date.now();
    return { reservation, effectiveStatus: isExpiredPending ? 'EXPIRADA' as const : reservation.estado };
  }), [reservations]);

  const filteredReservations = useMemo(() => normalizedReservations.filter(({ effectiveStatus }) => {
    if (filter === 'TODAS') return true;
    if (filter === 'PENDIENTES') return effectiveStatus === 'PENDIENTE';
    if (filter === 'COMPLETADAS') return effectiveStatus === 'CONFIRMADA';
    return effectiveStatus === 'CANCELADA' || effectiveStatus === 'EXPIRADA';
  }), [filter, normalizedReservations]);

  const cancel = async (id: string) => {
    if (!window.confirm('¿Cancelar esta reserva y liberar inmediatamente el stock?')) return;
    setCancelling(id);
    setError(null);
    try {
      await onCancel(id);
    } catch (cause: any) {
      setError(cause?.message || 'No se pudo cancelar la reserva.');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <section className="min-h-[65vh] bg-slate-50 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-7">
          <div>
            <span className="text-xs font-black tracking-widest uppercase text-karenRed">Historial personal</span>
            <h1 className="mt-1 text-3xl sm:text-4xl font-display font-black text-navy">Mis reservas</h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500">Consulta tus pases y estados sincronizados con caja e inventario.</p>
          </div>
          {authenticated && (
            <button
              onClick={() => void onRefresh()}
              disabled={syncing}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-navy shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Actualizando…' : 'Actualizar estados'}
            </button>
          )}
        </div>

        {!authenticated ? (
          <div className="max-w-xl mx-auto mt-12 p-8 sm:p-10 rounded-3xl bg-white border border-slate-200 text-center shadow-soft">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
            <h2 className="mt-4 text-xl font-black text-navy">Inicia sesión para ver tus reservas</h2>
            <p className="mt-2 text-sm text-slate-500">Tu historial está asociado a tu cuenta para proteger los pases de retiro.</p>
            <button onClick={onLogin} className="mt-6 w-full sm:w-auto px-6 py-3 rounded-xl bg-navy text-white text-sm font-bold">Iniciar sesión</button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-5 p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 mb-5" aria-label="Filtrar reservas">
              {(['TODAS', 'PENDIENTES', 'COMPLETADAS', 'CANCELADAS'] as ReservationFilter[]).map(option => (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-colors ${filter === option ? 'bg-navy text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  {option.charAt(0) + option.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {!syncing && reservations.length === 0 ? (
              <div className="p-10 text-center bg-white border border-slate-200 rounded-3xl">
                <CalendarClock className="w-12 h-12 mx-auto text-slate-300" />
                <h2 className="mt-4 text-xl font-black text-navy">Todavía no tienes reservas</h2>
                <button onClick={onExplore} className="mt-5 px-6 py-3 rounded-xl bg-karenRed text-white text-sm font-bold">Explorar productos</button>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">No hay reservas en este estado.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredReservations.map(({ reservation, effectiveStatus }) => {
                  const pending = effectiveStatus === 'PENDIENTE';
                  const total = reservation.detalles.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario), 0);
                  return (
                    <article key={reservation.id} className="flex flex-col bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="font-mono text-lg font-black text-navy break-all">{reservation.codigoRetiro}</div>
                          <div className="mt-1 text-xs text-slate-500 flex items-start gap-1.5">
                            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{new Date(reservation.fechaExpiracion).toLocaleString()}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${statusClass[effectiveStatus]}`}>{statusLabel[effectiveStatus]}</span>
                      </div>
                      <div className="mt-4 text-sm text-slate-600">
                        {reservation.detalles.length} lote(s) · Total reservado: <strong className="text-navy">${total.toFixed(2)}</strong>
                      </div>
                      {pending && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto pt-4">
                          <button onClick={() => onOpenPass(reservation)} className="min-h-11 rounded-xl bg-navy text-white text-sm font-bold flex items-center justify-center gap-2">
                            <QrCode className="w-4 h-4" />Ver pase QR
                          </button>
                          <button onClick={() => void cancel(reservation.id)} disabled={cancelling === reservation.id} className="min-h-11 rounded-xl border border-red-300 text-red-700 text-sm font-bold disabled:opacity-60">
                            {cancelling === reservation.id ? 'Cancelando…' : 'Cancelar reserva'}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
