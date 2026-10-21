import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { ReservationPass } from '../types';
import { Button } from './ui/Button';
import { Illustration } from './ui/Illustration';

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
  const initial = pass.initialSeconds || 600;
  const remainingPercent = Math.max(0, Math.min(100, (secondsLeft / initial) * 100));

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-mora/75 p-3 sm:p-6 flex items-start justify-center">
      {/* my-auto centra cuando cabe y deja hacer scroll cuando no; items-center recortaba el ticket por arriba. */}
      <div role="dialog" aria-modal="true" aria-labelledby="pase-titulo" className="relative my-auto w-full max-w-sm animate-slide-up">
        <button
          onClick={onClose}
          className="absolute -top-1 right-0 sm:-right-12 sm:top-0 z-10 w-10 h-10 rounded-full bg-limon text-mora border-2 border-mora flex items-center justify-center"
          aria-label="Cerrar pase"
        >
          <X className="w-5 h-5" />
        </button>

        {/* El papel del ticket es siempre blanco con tinta mora: se imprime y se escanea igual en modo oscuro. */}
        <div ref={ticketRef} className="paper-light bg-white text-mora animate-print-down">
          <div className="ticket-edge bg-transparent" aria-hidden="true" />
          <div className="relative px-6 pt-4 pb-6">
            {/* En el flujo y no flotando: pegado a la esquina se montaba sobre el nombre de la tienda. */}
            {!expired && (
              <div className="mb-3 flex justify-center" data-export-ignore="true">
                <span className="rounded-tag border-[3px] border-aguacate-solid px-2.5 py-1 font-display text-lg font-extrabold uppercase leading-none text-aguacate-solid animate-stamp">
                  ¡Apartado!
                </span>
              </div>
            )}
            <div className="text-center">
              <p className="font-display font-extrabold text-2xl leading-none">Supermercado Karen</p>
              <p className="mt-1 text-xs text-mora/70">{pass.storeLocation}</p>
            </div>

            <div className="rule-dashed my-4" aria-hidden="true" />

            <h2 id="pase-titulo" className="text-center text-sm text-mora/80 font-semibold">Pase de retiro de</h2>
            <p className="text-center font-display font-extrabold text-lg">{pass.customerName}</p>

            <div className="mt-4 flex flex-col items-center">
              <div className="p-2 border-2 border-mora rounded-tag">
                <QRCodeSVG value={pass.code} size={148} level="M" fgColor="#2A1D14" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-stamp font-black text-4xl tracking-wider tabular">{pass.code}</span>
                <button
                  onClick={handleCopyCode}
                  data-export-ignore="true"
                  className="p-2 rounded-full text-mora/70 hover:text-mora hover:bg-limon"
                  aria-label="Copiar código"
                >
                  {copied ? <Check className="w-4 h-4 text-aguacate-solid" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div
              className={`mt-4 rounded-tag border-2 border-mora px-4 py-3 text-center ${expired ? 'bg-[#EFEAF5]' : urgent ? 'bg-naranja' : 'bg-limon'}`}
              role="timer"
              aria-live="off"
            >
              {expired ? (
                <div className="flex flex-col items-center">
                  <Illustration name="expired" className="w-20 h-20" />
                  <p className="font-display font-extrabold">Este código venció.</p>
                  <p className="text-sm">Liberamos tus productos; puedes volver a apartarlos.</p>
                </div>
              ) : (
                <>
                  <p className={`font-display font-extrabold text-5xl leading-none tabular ${urgent ? 'animate-tick-pulse' : ''}`}>
                    {formatCountdown(secondsLeft)}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {urgent ? 'Se acaba el tiempo: pasa a caja ya' : 'para retirar y pagar en caja'}
                  </p>
                  <div className="mt-2 h-2.5 rounded-full bg-mora/20 overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full bg-mora transition-[width] duration-1000 ease-linear" style={{ width: `${remainingPercent}%` }} />
                  </div>
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
                        <span className="tabular font-bold">{item.quantity} × </span>{item.productName}
                      </span>
                      <span className="shrink-0 tabular">${(item.quantity * item.price).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="rule-dashed my-3" aria-hidden="true" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">Total</span>
                  <span className="font-display font-extrabold text-3xl tabular">${pass.total.toFixed(2)}</span>
                </div>
              </>
            )}

            <p className="mt-4 text-xs text-mora/70 text-center leading-relaxed">
              Muestra este código en caja. Pagas ahí mismo.
            </p>
          </div>
          <div className="ticket-edge-bottom" aria-hidden="true" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            onClick={() => void handleSaveImage()}
            disabled={savingImage}
            aria-label="Guardar comprobante como imagen"
            variant="surface"
            size="lg"
          >
            <Download className="w-4 h-4" />
            {savingImage ? 'Guardando…' : 'Guardar imagen'}
          </Button>
          <Button onClick={onClose} variant="limon" size="lg">Listo</Button>
        </div>
        {saveError && <p role="alert" className="mt-2 text-center text-sm font-semibold text-white">{saveError}</p>}
      </div>
    </div>
  );
};
