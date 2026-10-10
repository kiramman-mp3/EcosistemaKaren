import React, { useState } from 'react';
import { AlertTriangle, Clock, QrCode, RefreshCw, X } from 'lucide-react';
import type { BackendReservation } from '../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  authenticated: boolean;
  reservations: BackendReservation[];
  syncing: boolean;
  onRefresh: () => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onOpenPass: (reservation: BackendReservation) => void;
}

const statusLabel: Record<BackendReservation['estado'], string> = {
  PENDIENTE: 'Pendiente de retiro', CONFIRMADA: 'Completada',
  EXPIRADA: 'Expirada', CANCELADA: 'Cancelada',
};

export const MyReservationsModal: React.FC<Props> = ({
  isOpen, onClose, authenticated, reservations, syncing, onRefresh, onCancel, onOpenPass,
}) => {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;

  const cancel = async (id: string) => {
    if (!window.confirm('¿Cancelar esta reserva y liberar inmediatamente el stock?')) return;
    setCancelling(id);
    setError(null);
    try { await onCancel(id); } catch (cause: any) {
      setError(cause?.message || 'No se pudo cancelar la reserva.');
    } finally { setCancelling(null); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/75 backdrop-blur-sm">
    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 shadow-2xl">
      <button onClick={onClose} aria-label="Cerrar Mis reservas" className="absolute right-4 top-4 p-2 text-slate-400"><X /></button>
      <div className="flex items-center justify-between pr-10 mb-5">
        <div><h2 className="text-2xl font-black text-navy">Mis reservas</h2><p className="text-xs text-slate-500">Estados sincronizados con caja e inventario</p></div>
        {authenticated && <button onClick={() => void onRefresh()} disabled={syncing} className="p-2 rounded-xl bg-slate-100" aria-label="Actualizar reservas"><RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /></button>}
      </div>
      {!authenticated ? <div className="p-5 bg-amber-50 text-amber-800 rounded-2xl text-sm">Inicia sesión para consultar tus reservas.</div>
        : error ? <div className="p-3 mb-3 bg-red-50 text-red-700 rounded-xl flex gap-2"><AlertTriangle className="w-4 h-4" />{error}</div> : null}
      {authenticated && !syncing && reservations.length === 0 && <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl">Todavía no tienes reservas.</div>}
      <div className="space-y-3">
        {reservations.map(reservation => {
          const pending = reservation.estado === 'PENDIENTE' && new Date(reservation.fechaExpiracion).getTime() > Date.now();
          const total = reservation.detalles.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario), 0);
          return <article key={reservation.id} className="border border-slate-200 rounded-2xl p-4">
            <div className="flex justify-between gap-3"><div><div className="font-mono font-black text-navy">{reservation.codigoRetiro}</div><div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(reservation.fechaExpiracion).toLocaleString()}</div></div><span className={`h-fit px-2 py-1 rounded-lg text-[11px] font-bold ${pending ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{reservation.estado === 'PENDIENTE' && !pending ? 'Expirada' : statusLabel[reservation.estado]}</span></div>
            <div className="mt-3 text-xs text-slate-600">{reservation.detalles.length} lote(s) · Total reservado: <strong>${total.toFixed(2)}</strong></div>
            {pending && <div className="flex gap-2 mt-3"><button onClick={() => onOpenPass(reservation)} className="flex-1 py-2 rounded-xl bg-navy text-white text-xs font-bold flex items-center justify-center gap-1"><QrCode className="w-4 h-4" />Ver pase QR</button><button onClick={() => void cancel(reservation.id)} disabled={cancelling === reservation.id} className="flex-1 py-2 rounded-xl border border-red-300 text-red-700 text-xs font-bold">{cancelling === reservation.id ? 'Cancelando…' : 'Cancelar reserva'}</button></div>}
          </article>;
        })}
      </div>
    </div>
  </div>;
};
