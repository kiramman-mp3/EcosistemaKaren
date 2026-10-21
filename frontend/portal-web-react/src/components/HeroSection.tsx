import React from 'react';
import { ShoppingBasket, Ticket } from 'lucide-react';
import { FlashOffer, NavTab } from '../types';
import { ExpiryStamp, OldPrice, Price, ProductImage } from './ui/Tag';
import { Button } from './ui/Button';
import { Sticker } from './ui/Sticker';
import { categoryTone } from '../lib/categoryTone';

interface HeroSectionProps {
  onNavigate: (tab: NavTab) => void;
  /** Las ofertas que vencen primero: las tres primeras se pegan como pegatinas. */
  offers?: FlashOffer[];
  /** Reserva el espacio de las pegatinas mientras llegan las ofertas. */
  loadingOffers?: boolean;
  userName?: string;
  onReserveOffer?: (offer: FlashOffer) => void;
  activePassCode?: string;
  onOpenPass: () => void;
}

/** Saludo según la hora en Guayaquil, que es la que importa para quien compra. */
export function greetingFor(date: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('es-EC', { hour: 'numeric', hour12: false, timeZone: 'America/Guayaquil' }).format(date)) % 24;
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Inclinaciones y tiempos fijos: se ven pegadas a mano, pero iguales en cada carga.
const STICKER_STYLE = [
  { tilt: -3, delay: 250, span: 'sm:col-span-2' },
  { tilt: 2.5, delay: 420, span: '' },
  { tilt: -1.5, delay: 590, span: '' },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate, offers = [], loadingOffers = false, userName, onReserveOffer, activePassCode, onOpenPass,
}) => {
  const stickers = offers.slice(0, 3);
  const greeting = userName ? `${greetingFor()}, ${userName}.` : `${greetingFor()}.`;

  return (
    <section className="bg-limon text-mora border-b-2 border-mora overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
        <div>
          {activePassCode && (
            <button
              onClick={onOpenPass}
              className="press mb-6 inline-flex items-center gap-3 rounded-full border-2 border-mora bg-mora pl-3.5 pr-4 py-2 text-sm text-white"
            >
              <Ticket className="w-4 h-4 text-limon" />
              <span>Tienes un pedido apartado</span>
              <span className="font-stamp font-black tracking-wide text-limon">{activePassCode}</span>
            </button>
          )}
          <p className="font-display text-2xl sm:text-3xl font-extrabold">{greeting}</p>
          <h1 className="mt-2 font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] max-w-[13ch]">
            Apártalo desde tu casa. Lo pagas cuando llegues.
          </h1>
          <p className="mt-6 text-lg leading-relaxed max-w-[44ch] font-semibold text-mora/90">
            Armas tu lista, te guardamos todo 10 minutos y pagas en caja al retirar. Sin fila.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={() => onNavigate('productos')} size="lg">
              <ShoppingBasket className="w-5 h-5" />
              Armar mi lista
            </Button>
            <Button onClick={() => onNavigate('ofertas')} size="lg" variant="surface">
              Ofertas por vencer
            </Button>
          </div>
        </div>

        {stickers.length > 0 ? (
          <div className="relative">
            <span className="hidden sm:block absolute -top-9 left-2 font-hand text-4xl -rotate-6 text-mora" aria-hidden="true">
              ¡se va hoy!
            </span>
            <ul className="grid sm:grid-cols-2 gap-5 pt-2" aria-label="Ofertas que vencen primero">
              {stickers.map((offer, index) => {
                const style = STICKER_STYLE[index];
                return (
                  <li key={offer.id} className={style.span}>
                    <Sticker
                      slap
                      tilt={style.tilt}
                      delay={style.delay}
                      className="relative bg-surface text-ink p-3 h-full flex gap-3 items-center"
                    >
                      <ProductImage
                        src={offer.image}
                        alt={offer.productName || offer.title}
                        tone={categoryTone(offer.category)}
                        className="w-24 sm:w-28 aspect-square rounded-photo shrink-0 p-2"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="absolute -top-3 -right-2 rotate-3 rounded-tag border-2 border-mora bg-karen px-2 py-0.5 font-display text-base font-extrabold text-white shadow-pop-sm">
                          {offer.discountBadge}
                          </span>
                          <span className="block font-display font-extrabold leading-snug line-clamp-2 text-sm sm:text-base">
                          {offer.productName || offer.title}
                          </span>
                        <div className="mt-1 flex items-end gap-2 flex-wrap">
                          <Price value={offer.price} tone="karen" size="md" />
                          <span className="pb-1"><OldPrice value={offer.originalPrice} /></span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                          <ExpiryStamp date={offer.expiresOn} />
                          {onReserveOffer && (
                            <button
                              onClick={() => onReserveOffer(offer)}
                              aria-label={`Agregar ${offer.productName || offer.title}`}
                              className="rounded-full bg-mora px-3 py-1 text-xs font-extrabold text-white hover:bg-karen transition-colors"
                            >
                              Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </Sticker>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : loadingOffers ? (
          <ul className="grid sm:grid-cols-2 gap-5 pt-2" aria-hidden="true">
            {STICKER_STYLE.map((style, index) => (
              <li key={index} className={style.span}>
                <div className="skeleton h-32 rounded-tag border-2 border-mora/30" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="hidden lg:block" aria-hidden="true" />
        )}
      </div>
    </section>
  );
};
