import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { ReservationPass } from '../types';

interface ReservationModalProps {
  pass: ReservationPass;
  isOpen: boolean;
  onClose: () => void;
}

const formatCountdown = (totalSec: number) => {
  const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const secs = (totalSec % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export const ReservationModal: React.FC<ReservationModalProps> = ({ pass, isOpen, onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState(pass.remainingSeconds || 0);
  const [copied, setCopied] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [saveError, setSaveError] = useState('');
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(pass.remainingSeconds || 0);
    const interval = setInterval(() => setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [isOpen, pass.code, pass.remainingSeconds]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const expired = secondsLeft <= 0;
  const urgent = !expired && secondsLeft <= 120;

  const handleCopyCode = () => {
    void navigator.clipboard?.writeText(pass.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveImage = async () => {
    if (!ticketRef.current || savingImage) return;
    setSavingImage(true);
    setSaveError('');
    try {
      const dataUrl = await toPng(ticketRef.current, {
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
      });
      const link = document.createElement('a');
      link.download = `pase-retiro-${pass.code.replace(/[^a-zA-Z0-9-]/g, '')}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setSaveError('No se pudo guardar la imagen. Inténtalo de nuevo o toma una captura de pantalla.');
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/70 p-3 sm:p-6 flex items-start sm:items-center justify-center">
      <div role="dialog" aria-modal="true" aria-labelledby="pase-titulo" className="relative w-full max-w-sm animate-slide-up">
        <button
          onClick={onClose}
          className="absolute -top-1 right-0 sm:-right-12 sm:top-0 z-10 w-10 h-10 rounded-full bg-white text-ink flex items-center justify-center"
          aria-label="Cerrar pase"
        >
          <X className="w-5 h-5" />
        </button>

        <div ref={ticketRef} className="bg-white text-ink">
          <div className="ticket-edge bg-transparent" aria-hidden="true" />
          <div className="px-6 pt-4 pb-6">
            <div className="text-center">
              <p className="font-tag font-bold text-2xl leading-none">Supermercado Karen</p>
              <p className="mt-1 text-xs text-ink-muted">{pass.storeLocation}</p>
            </div>

            <div className="rule-dashed my-4" aria-hidden="true" />

            <h2 id="pase-titulo" className="text-center text-sm text-ink-soft">Pase de retiro de</h2>
            <p className="text-center font-semibold">{pass.customerName}</p>

            <div className="mt-4 flex flex-col items-center">
              <div className="p-2 border border-aisle-rule rounded-tag">
                <QRCodeSVG value={pass.code} size={148} level="M" fgColor="#13284B" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-tag font-bold text-4xl tracking-wider tabular">{pass.code}</span>
                <button
                  onClick={handleCopyCode}
                  data-export-ignore="true"
                  className="p-2 rounded-tag text-ink-muted hover:text-ink hover:bg-aisle"
                  aria-label="Copiar código"
                >
                  {copied ? <Check className="w-4 h-4 text-fresh" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div
              className={`mt-4 rounded-tag px-4 py-3 text-center ${expired ? 'bg-aisle' : urgent ? 'bg-karen text-white' : 'bg-sticker'}`}
              role="timer"
              aria-live="off"
            >
              {expired ? (
                <p className="font-semibold">Este código venció. Las unidades volvieron a la percha.</p>
              ) : (
                <>
                  <p className="font-tag font-bold text-5xl leading-none tabular">{formatCountdown(secondsLeft)}</p>
                  <p className={`mt-1 text-sm ${urgent ? 'text-white' : 'text-ink-soft'}`}>para retirar y pagar en caja</p>
                </>
              )}
            </div>

            {pass.items.length > 0 && (
              <>
                <div className="rule-dashed my-4" aria-hidden="true" />
                <ul className="space-y-2 text-sm">
                  {pass.items.map((item, index) => (
                    <li key={`${item.productName}-${index}`} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        <span className="tabular">{item.quantity} × </span>{item.productName}
                      </span>
                      <span className="shrink-0 tabular">${(item.quantity * item.price).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="rule-dashed my-3" aria-hidden="true" />
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <span className="font-tag font-bold text-2xl tabular">${pass.total.toFixed(2)}</span>
                </div>
              </>
            )}

            <p className="mt-4 text-xs text-ink-muted text-center leading-relaxed">
              Muestra este código en caja. Pagas ahí mismo.
            </p>
          </div>
          <div className="ticket-edge-bottom" aria-hidden="true" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => void handleSaveImage()}
            disabled={savingImage}
            aria-label="Guardar comprobante como imagen"
            className="h-12 rounded-tag bg-white text-ink font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {savingImage ? 'Guardando…' : 'Guardar imagen'}
          </button>
          <button onClick={onClose} className="h-12 rounded-tag bg-sticker text-ink font-semibold">
            Listo
          </button>
        </div>
        {saveError && <p role="alert" className="mt-2 text-center text-sm text-white">{saveError}</p>}
      </div>
    </div>
  );
};
