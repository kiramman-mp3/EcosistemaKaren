import React, { useState } from 'react';
import { X, Search, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Copy, Check } from 'lucide-react';
import { api, BackendReservation } from '../api/client';

interface SearchReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchReservationModal: React.FC<SearchReservationModalProps> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<BackendReservation | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.getReservationByCode(code.trim().toUpperCase());
      setReservation(data);
    } catch (err: any) {
      setError(err.message || 'No se encontró ninguna reserva con este código.');
      setReservation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (reservation?.codigoRetiro) {
      navigator.clipboard.writeText(reservation.codigoRetiro);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            ACTIVA • PENDIENTE DE RETIRO EN CAJA
          </span>
        );
      case 'CONFIRMADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLETADA Y COBRADA EN CAJA
          </span>
        );
      case 'EXPIRADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            EXPIRADA (STOCK LIBERADO A TIENDA)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Cerrar consulta"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-navy/10 text-navy flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-display font-black text-navy">
            Consultar Pase de Retiro
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ingresa tu código PIN generado (ej: <span className="font-mono font-bold text-navy">KR-VZ9NHJ</span>) para verificar el estado de tu reserva en el sistema de tienda.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="KR-XXXXXX"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-mono font-bold uppercase tracking-wider text-navy focus:outline-none focus:ring-2 focus:ring-navy"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-navy hover:bg-navy-dark text-white font-bold text-sm transition-all shadow-soft flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Buscar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {reservation && (
          <div className="mt-6 space-y-4 pt-6 border-t border-slate-100">
            <div className="text-center space-y-2">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  CÓDIGO PIN CONSULTADO
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl font-black text-navy tracking-widest">
                    {reservation.codigoRetiro}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-navy hover:bg-slate-50 shadow-sm"
                    title="Copiar código PIN"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                {getStatusBadge(reservation.estado)}
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Expira en:</span>
                <span className="font-mono font-bold text-navy flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-karenRed" />
                  {new Date(reservation.fechaExpiracion).toLocaleTimeString()}
                </span>
              </div>

              <div className="border-t border-slate-200/60 pt-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Artículos Reservados ({reservation.detalles?.length || 0})
                </span>
                <div className="space-y-2">
                  {reservation.detalles?.map((det, idx) => (
                    <div
                      key={det.id || idx}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-100"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-navy block">
                          Lote: {det.loteId.substring(0, 15)}...
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {det.cantidad} unidad(es)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-navy text-sm">
                        ${(det.precioUnitario * det.cantidad).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700">Total Reservado:</span>
                <span className="font-display font-black text-navy text-base">
                  ${reservation.detalles?.reduce((s, d) => s + (d.precioUnitario * d.cantidad), 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Garantía Anti-Overbooking: Lotes apartados bajo regla FEFO en almacén físico.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
