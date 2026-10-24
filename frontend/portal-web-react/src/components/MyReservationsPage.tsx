import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Clock, Copy, QrCode, RefreshCw, Search } from 'lucide-react';
import { api, BackendReservation } from '../api/client';
import { formatDateTime } from '../utils/dates';
import { Button } from './ui/Button';
import { Illustration } from './ui/Illustration';

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

const statusLabel: Record<string, string> = {
  PENDIENTE: 'Por retirar',
  CONFIRMADA: 'Retirada',
  EXPIRADA: 'Venció',
  CANCELADA: 'Cancelada',
};

const statusClass: Record<string, string> = {
  PENDIENTE: 'bg-limon text-mora border-2 border-mora',
  CONFIRMADA: 'bg-fresh-tint text-fresh border-2 border-transparent',
  EXPIRADA: 'bg-aisle text-ink-muted border-2 border-transparent',
  CANCELADA: 'bg-aisle text-ink-muted border-2 border-transparent',
};

export const MyReservationsPage: React.FC<Props> = ({
  authenticated, reservations, syncing, onRefresh, onCancel, onOpenPass, onLogin, onExplore,
}) => {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReservationFilter>('TODAS');

  // Consulta pública por código
  const [searchCode, setSearchCode] = useState('');
  const [consulting, setConsulting] = useState(false);
  const [consultResult, setConsultResult] = useState<any | null>(null);
  const [consultError, setConsultError] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [extendMessage, setExtendMessage] = useState<string | null>(null);

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

  const handleConsult = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    setConsulting(true);
    setConsultError(null);
    setConsultResult(null);
    setExtendMessage(null);
    try {
      const data = await api.consultReservationByCode(code);
      setConsultResult(data);
    } catch (err: any) {
      setConsultError(err.message || 'No se encontró ninguna reserva activa con ese código.');
    } finally {
      setConsulting(false);
    }
  };

  const handleExtend = async (id: string) => {
    setExtendingId(id);
    setError(null);
    setExtendMessage(null);
    try {
      const updated = await api.extendReservation(id, 30);
      setExtendMessage('¡Tiempo extendido con éxito! Se añadieron +30 minutos a la reserva.');
      if (consultResult && consultResult.id === id) {
        setConsultResult((prev: any) => ({
          ...prev,
          fechaExpiracion: updated.fechaExpiracion,
          estado: updated.estado,
        }));
      }
      if (authenticated) {
        await onRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo extender el tiempo de la reserva.');
    } finally {
      setExtendingId(null);
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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

      {/* Caja de consulta de reserva por código */}
      <div className="mb-8 p-5 sm:p-6 rounded-block bg-surface border-2 border-mora shadow-pop">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-ink flex items-center gap-2">
            <Search className="w-5 h-5 text-mora" /> Consultar reserva por código
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Ingresa tu código de retiro (ej. KR-A1B2C3) para ver el estado, los productos apartados o extender el tiempo.
          </p>
          <form onSubmit={handleConsult} className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={searchCode}
              onChange={e => setSearchCode(e.target.value.toUpperCase())}
              placeholder="Ej: KR-123456"
              className="flex-1 px-4 py-2.5 rounded-full border-2 border-mora font-mono uppercase text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-limon bg-page"
            />
            <Button type="submit" disabled={consulting || !searchCode.trim()} className="shrink-0">
              {consulting ? 'Buscando…' : 'Consultar código'}
            </Button>
          </form>

          {consultError && (
            <p role="alert" className="mt-3 flex gap-2 rounded-tag bg-karen-tint text-karen-deep text-xs font-semibold p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {consultError}
            </p>
          )}

          {extendMessage && (
            <p role="status" className="mt-3 flex gap-2 rounded-tag bg-aguacate-tint text-fresh text-xs font-bold p-3">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              {extendMessage}
            </p>
          )}

          {consultResult && (
            <div className="mt-4 p-4 rounded-tag border-2 border-mora bg-page">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-stamp text-2xl font-black text-ink">{consultResult.codigoRetiro}</span>
                  <button
                    onClick={() => copyCode(consultResult.codigoRetiro)}
                    className="p-1 rounded-full text-ink-soft hover:text-mora hover:bg-limon"
                    title="Copiar código"
                  >
                    {copiedCode === consultResult.codigoRetiro ? <Check className="w-4 h-4 text-fresh" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusClass[consultResult.estado] || statusClass.PENDIENTE}`}>
                  {statusLabel[consultResult.estado] || consultResult.estado}
                </span>
              </div>
              <div className="mt-2 text-xs text-ink-soft space-y-1">
                <p><strong>Vence:</strong> {formatDateTime(consultResult.fechaExpiracion)}</p>
                <p><strong>Total:</strong> ${Number(consultResult.total || 0).toFixed(2)}</p>
                {consultResult.items && consultResult.items.length > 0 && (
                  <p><strong>Productos:</strong> {consultResult.items.map((it: any) => `${it.cantidad}x ${it.productoNombre || it.nombre}`).join(', ')}</p>
                )}
              </div>
              {consultResult.estado === 'PENDIENTE' && (
                <div className="mt-3 pt-3 border-t border-aisle-rule flex flex-wrap gap-2">
                  <Button
                    onClick={() => void handleExtend(consultResult.id)}
                    disabled={extendingId === consultResult.id}
                    size="sm"
                    variant="surface"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {extendingId === consultResult.id ? 'Extendiendo…' : 'Extender tiempo (+30 min)'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
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
                const total = reservation.detalles.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario), 0);
                const names = reservation.detalles.map(detail => detail.productoNombre).filter(Boolean) as string[];
                return (
                  <li key={reservation.id} className={`flex flex-col rounded-block bg-surface border-2 ${pending ? 'border-mora shadow-pop' : 'border-aisle-rule'}`}>
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-stamp font-black text-3xl text-ink tracking-wide leading-none">{reservation.codigoRetiro}</p>
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
                      {names.length > 0 && (
                        <p className="text-sm text-ink-soft line-clamp-2">{names.join(', ')}</p>
                      )}
                      <p className="mt-2 text-sm text-ink-soft">
                        Total reservado: <strong className="text-ink tabular">${total.toFixed(2)}</strong>
                      </p>
                    </div>
                    {pending && (
                      <div className="flex flex-col gap-2 p-4 pt-0">
                        <div className="grid grid-cols-2 gap-2">
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
                        <Button
                          onClick={() => void handleExtend(reservation.id)}
                          disabled={extendingId === reservation.id}
                          variant="surface"
                          className="w-full text-xs font-bold py-1.5 border-dashed border-mora/40 hover:bg-limon"
                        >
                          <Clock className={`w-3.5 h-3.5 ${extendingId === reservation.id ? 'animate-spin' : ''}`} />
                          {extendingId === reservation.id ? 'Extendiendo…' : 'Añadir más tiempo (+30 min)'}
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
