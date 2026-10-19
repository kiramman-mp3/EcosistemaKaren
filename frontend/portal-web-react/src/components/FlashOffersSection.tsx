import React, { useMemo } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { DataLoadState, FlashOffer } from '../types';
import { OfferTag } from './ProductTag';
import { daysUntil } from '../utils/dates';
import { SPECIAL_DATE_OFFERS } from './SpecialOffersSlider';

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
          <h1 className="font-tag font-bold text-4xl sm:text-5xl text-ink dark:text-white leading-none">
            Ofertas por vencer
          </h1>
          <p className="mt-3 text-ink-soft dark:text-slate-300 leading-relaxed">
            Productos en buen estado que vencen pronto. Mientras más cerca está la fecha, mayor es el descuento.
            El precio rebajado se respeta al reservar.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="h-10 px-4 rounded-tag border border-aisle-rule dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-ink dark:text-white hover:bg-aisle dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {state === 'loading' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-96 rounded-tag bg-white dark:bg-slate-800/80 border border-aisle-rule dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : state === 'offline' || state === 'error' ? (
        <div className="rounded-tag bg-white dark:bg-slate-800/90 border border-aisle-rule dark:border-slate-700 p-10 text-center">
          <WifiOff className="w-10 h-10 mx-auto text-karen" />
          <h2 className="mt-3 font-tag font-bold text-2xl text-ink dark:text-white">No pudimos cargar las ofertas</h2>
          <p className="mt-1 text-ink-soft dark:text-slate-300">{errorMessage || 'La tienda no respondió.'}</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-tag bg-white dark:bg-slate-800/90 border border-aisle-rule dark:border-slate-700 p-10 text-center">
          <h2 className="font-tag font-bold text-2xl text-ink dark:text-white">Hoy no hay ofertas por vencer</h2>
          <p className="mt-1 text-ink-soft dark:text-slate-300">Cuando un lote se acerque a su fecha, aparecerá aquí con descuento.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map(offer => <OfferTag key={offer.id} offer={offer} onReserve={onReserveOffer} />)}
        </div>
      )}

      {/* Ofertas en Fechas Especiales y Temporadas */}
      <div className="mt-16 pt-12 border-t border-aisle-rule dark:border-slate-800">
        <div className="mb-6">
          <span className="text-xs font-tag font-bold text-karen uppercase tracking-wider">
            Campañas Oficiales de Ahorro
          </span>
          <h2 className="font-tag font-bold text-3xl sm:text-4xl text-ink dark:text-white mt-1">
            Ofertas en Fechas Especiales y Feriados
          </h2>
          <p className="mt-2 text-ink-soft dark:text-slate-300 max-w-2xl">
            Promociones programadas para temporadas festivas, fines de semana y días de cosecha nacional.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SPECIAL_DATE_OFFERS.map(event => (
            <div
              key={event.id}
              className="rounded-xl border border-aisle-rule dark:border-slate-700/80 bg-white dark:bg-slate-800/90 p-5 shadow-soft flex flex-col justify-between hover:border-karen/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-tag font-bold uppercase tracking-wider text-karen bg-karen-tint dark:bg-red-950/60 dark:text-red-300 px-2.5 py-0.5 rounded-full">
                    {event.badge}
                  </span>
                  <span className="text-xs text-ink-muted dark:text-slate-400">{event.dateRange}</span>
                </div>
                <h3 className="font-tag font-bold text-lg text-ink dark:text-white leading-snug">
                  {event.eventName}
                </h3>
                <p className="mt-2 text-xs text-ink-soft dark:text-slate-300 leading-relaxed">
                  {event.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-aisle-rule dark:border-slate-700">
                <span className="block text-[11px] font-semibold text-ink-muted dark:text-slate-400 mb-1.5">
                  Categoría destacada:
                </span>
                <span className="inline-block text-xs font-semibold text-ink dark:text-slate-100 bg-aisle dark:bg-slate-700 px-2.5 py-1 rounded-tag">
                  {event.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
