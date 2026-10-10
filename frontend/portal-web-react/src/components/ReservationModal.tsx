import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, MapPin, Copy, Check } from 'lucide-react';
import { ReservationPass } from '../types';
import { QRCodeSVG } from 'qrcode.react';

interface ReservationModalProps {
  pass: ReservationPass;
  isOpen: boolean;
  onClose: () => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  pass,
  isOpen,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(pass.remainingSeconds || 585);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(pass.remainingSeconds || 0);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, pass.code, pass.remainingSeconds]);

  if (!isOpen) return null;

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}m:${secs}s`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pass.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            Reserva Confirmada
          </span>
          <h3 className="text-2xl font-display font-black text-navy">
            Pase de Retiro Digital
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            El stock ha sido bloqueado en caja física SIACI. Presenta este PIN antes de que expire.
          </p>
        </div>

        {/* PIN Container with Copy */}
        <div className="mt-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
            CÓDIGO PIN EXCLUSIVO
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl font-black text-navy tracking-widest">
              {pass.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-navy hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              title="Copiar código PIN"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* QR estándar: contiene únicamente el PIN de retiro */}
        <div className="my-5 flex flex-col items-center justify-center bg-slate-900 rounded-2xl p-4 shadow-inner">
          <div className="p-3 bg-white rounded-xl"><QRCodeSVG value={pass.code} size={144} level="M" /></div>
          <span className="text-[10px] text-slate-400 font-mono mt-2 tracking-widest">
            ESCANEAR EN CAJA O PERCHA
          </span>
        </div>

        {/* Pulsating Countdown */}
        <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200/80 rounded-xl py-2.5 px-4 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-karenRed opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-karenRed"></span>
          </span>
          <span className="text-xs font-bold text-slate-700">Tiempo restante:</span>
          <span className="font-mono font-black text-base text-karenRed">
            {formatCountdown(secondsLeft)}
          </span>
        </div>

        {/* Store Location Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl mb-5">
          <MapPin className="w-4 h-4 text-navy flex-shrink-0" />
          <span className="truncate">{pass.storeLocation}</span>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-navy hover:bg-navy-dark active:scale-98 transition-all shadow-soft"
        >
          Entendido, ir a pagar en tienda
        </button>

      </div>
    </div>
  );
};
