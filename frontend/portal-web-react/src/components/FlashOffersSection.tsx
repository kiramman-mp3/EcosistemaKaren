import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { DataLoadState, FlashOffer } from '../types';
import { OfferTag } from './ProductTag';
import { daysUntil } from '../utils/dates';
import { SPECIAL_DATE_OFFERS } from './SpecialOffersSlider';
import { Button } from './ui/Button';
import { Illustration } from './ui/Illustration';
import { TONE_SOLID, Tone } from '../lib/categoryTone';
import { PromotionGraphicBackground } from './ui/PromotionGraphicBackground';

interface FlashOffersSectionProps {
  offers: FlashOffer[];
  state: DataLoadState;
  errorMessage?: string | null;
  onRefresh: () => void;
  onReserveOffer: (offer: FlashOffer) => void | Promise<void>;
}

const CAMPAIGN_TONES: Tone[] = ['karen', 'aguacate', 'naranja', 'guayaba'];

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
          <h1 className="text-4xl sm:text-6xl text-ink leading-none">Ofertas por vencer</h1>
          <p className="mt-4 text-ink-soft leading-relaxed text-lg max-w-[52ch]">
            Productos en buen estado que vencen pronto. Mientras más cerca la fecha, más grande el descuento,
            y el precio rebajado se respeta al apartar.
          </p>
        </div>
        <Button onClick={onRefresh} variant="surface">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {state === 'loading' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-96 rounded-block skeleton" />
          ))}
        </div>
      ) : state === 'offline' || state === 'error' ? (
        <div className="rounded-block bg-surface border-2 border-mora shadow-pop p-10 text-center flex flex-col items-center">
          <Illustration name="offline" />
          <h2 className="mt-3 text-2xl text-ink">No pudimos cargar las ofertas</h2>
          <p className="mt-1 text-ink-soft max-w-[40ch]">{errorMessage || 'La tienda no respondió. Actualiza en un momento.'}</p>
          <Button onClick={onRefresh} className="mt-5">Actualizar</Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-block bg-surface border-2 border-mora shadow-pop p-10 text-center flex flex-col items-center">
          <Illustration name="search" />
          <h2 className="mt-3 text-2xl text-ink">Hoy no hay ofertas por vencer</h2>
          <p className="mt-1 text-ink-soft max-w-[40ch]">Cuando un lote se acerque a su fecha, aparece aquí con descuento.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map(offer => <OfferTag key={offer.id} offer={offer} onReserve={onReserveOffer} />)}
        </div>
      )}

      <div className="mt-16 pt-12 border-t-2 border-aisle-rule">
        <div className="mb-7">
          <h2 className="text-3xl sm:text-4xl text-ink">Ofertas en fechas especiales y feriados</h2>
          <p className="mt-2 text-ink-soft max-w-[56ch]">
            Promociones programadas para temporadas festivas, fines de semana y días de cosecha nacional.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SPECIAL_DATE_OFFERS.map((event, index) => (
            <div
              key={event.id}
              className={`relative overflow-hidden rounded-block border-2 border-mora p-5 flex flex-col justify-between ${TONE_SOLID[CAMPAIGN_TONES[index % CAMPAIGN_TONES.length]]}`}
            >
              <PromotionGraphicBackground type={event.graphicTheme} opacity={0.16} />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-extrabold bg-mora text-white px-2.5 py-1 rounded-full">
                    {event.badge}
                  </span>
                  <span className="text-xs font-semibold opacity-90">{event.dateRange}</span>
                </div>
                <h3 className="font-display text-xl font-extrabold leading-snug">{event.eventName}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-95">{event.description}</p>
              </div>

              <p className="relative z-10 mt-4 pt-3 border-t-2 border-current/30 text-sm">
                <span className="font-semibold">Categoría destacada: </span>
                <span className="font-extrabold">{event.category}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
