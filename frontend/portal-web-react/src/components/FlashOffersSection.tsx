import React, { useMemo } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { DataLoadState, FlashOffer } from '../types';
import { OfferTag } from './ProductTag';
import { daysUntil } from '../utils/dates';

interface FlashOffersSectionProps {
  offers: FlashOffer[];
  state: DataLoadState;
  errorMessage?: string | null;
  onRefresh: () => void;
  onReserveOffer: (offer: FlashOffer) => void | Promise<void>;
}

export const FlashOffersSection: React.FC<FlashOffersSectionProps> = ({
  offers, state, errorMessage, onRefresh, onReserveOffer,
}) => {
  // Primero lo que vence antes: es lo que la tienda más necesita vender.
  const sorted = useMemo(() => [...offers].sort((a, b) =>
    (daysUntil(a.expiresOn) || 0) - (daysUntil(b.expiresOn) || 0)), [offers]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="font-tag font-bold text-4xl sm:text-5xl text-ink leading-none">Ofertas por vencer</h1>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Productos en buen estado que vencen pronto. Mientras más cerca está la fecha, mayor es el descuento.
            El precio rebajado se respeta al reservar.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="h-10 px-4 rounded-tag border border-aisle-rule bg-white text-sm font-semibold text-ink flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {state === 'loading' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-96 rounded-tag bg-white border border-aisle-rule animate-pulse" />
          ))}
        </div>
      ) : state === 'offline' || state === 'error' ? (
        <div className="rounded-tag bg-white border border-aisle-rule p-10 text-center">
          <WifiOff className="w-10 h-10 mx-auto text-karen" />
          <h2 className="mt-3 font-tag font-bold text-2xl text-ink">No pudimos cargar las ofertas</h2>
          <p className="mt-1 text-ink-soft">{errorMessage || 'La tienda no respondió.'}</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-tag bg-white border border-aisle-rule p-10 text-center">
          <h2 className="font-tag font-bold text-2xl text-ink">Hoy no hay ofertas por vencer</h2>
          <p className="mt-1 text-ink-soft">Cuando un lote se acerque a su fecha, aparecerá aquí con descuento.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map(offer => <OfferTag key={offer.id} offer={offer} onReserve={onReserveOffer} />)}
        </div>
      )}
    </section>
  );
};
