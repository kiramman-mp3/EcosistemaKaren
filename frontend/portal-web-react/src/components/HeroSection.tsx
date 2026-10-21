import React from 'react';
import { ShoppingBasket, Ticket } from 'lucide-react';
import { FlashOffer, NavTab } from '../types';
import { ExpiryStamp, OldPrice, Price, ProductImage } from './ui/Tag';

interface HeroSectionProps {
  onNavigate: (tab: NavTab) => void;
  featuredOffer?: FlashOffer;
  onReserveOffer?: (offer: FlashOffer) => void;
  activePassCode?: string;
  onOpenPass: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate, featuredOffer, onReserveOffer, activePassCode, onOpenPass,
}) => (
  <section className="bg-white dark:bg-[#0F172A] border-b border-aisle-rule dark:border-slate-800 transition-colors">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
      <div>
        {activePassCode && (
          <button
            onClick={onOpenPass}
            className="mb-6 inline-flex items-center gap-3 rounded-tag bg-ink dark:bg-slate-800 text-white pl-3 pr-4 py-2 text-sm hover:bg-ink-soft dark:hover:bg-slate-700 transition-colors"
          >
            <Ticket className="w-4 h-4 text-sticker" />
            <span>Tienes una reserva activa</span>
            <span className="font-tag font-bold tracking-wide text-sticker">{activePassCode}</span>
          </button>
        )}
        <h1 className="font-tag font-bold text-ink dark:text-white leading-[0.95] tracking-tight text-5xl sm:text-6xl lg:text-7xl max-w-[12ch]">
          Reserva en línea y retira en caja sin hacer fila
        </h1>
        <p className="mt-6 text-lg text-ink-soft dark:text-slate-300 max-w-[46ch] leading-relaxed">
          Elige tus productos, te los apartamos 10 minutos y pagas al retirarlos en la Sucursal Matriz.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('productos')}
            className="h-12 px-6 rounded-tag bg-karen text-white font-semibold flex items-center gap-2 hover:bg-karen-deep"
          >
            <ShoppingBasket className="w-5 h-5" />
            Ver productos
          </button>
          <button
            onClick={() => onNavigate('ofertas')}
            className="h-12 px-6 rounded-tag border-2 border-ink dark:border-slate-500 text-ink dark:text-white font-semibold hover:bg-aisle dark:hover:bg-slate-800 transition-colors"
          >
            Ofertas por vencer
          </button>
        </div>
      </div>

      {featuredOffer ? (
        <FeaturedOfferTag offer={featuredOffer} onReserve={onReserveOffer} />
      ) : (
        <div className="hidden lg:block" aria-hidden="true" />
      )}
    </div>
  </section>
);

const FeaturedOfferTag: React.FC<{ offer: FlashOffer; onReserve?: (offer: FlashOffer) => void }> = ({ offer, onReserve }) => (
  <figure className="relative mx-auto w-full max-w-md pt-6">
    {/* Cordel del que cuelga la etiqueta */}
    <span className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-7 bg-ink-faint" aria-hidden="true" />
    <div className="origin-top animate-tag-swing">
      <div className="relative rounded-tag bg-sticker shadow-lift overflow-hidden">
        <span className="absolute left-1/2 top-2.5 -translate-x-1/2 w-3 h-3 rounded-full bg-white border border-sticker-deep" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pt-7">
          <span className="font-tag font-bold text-ink text-lg">Oferta de hoy</span>
          <span className="font-tag font-bold text-white bg-karen rounded-tag px-2.5 py-1 text-xl leading-none">
            {offer.discountBadge}
          </span>
        </div>
        <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr] gap-4 p-5 items-center">
          <ProductImage src={offer.image} alt={offer.productName || offer.title} className="aspect-square rounded-tag" />
          <div className="min-w-0">
            <figcaption className="font-semibold text-ink leading-snug line-clamp-3">
              {offer.productName || offer.title}
            </figcaption>
            <div className="mt-3 flex items-end gap-3 flex-wrap">
              <Price value={offer.price} size="lg" tone="karen" />
              <span className="pb-2"><OldPrice value={offer.originalPrice} /></span>
            </div>
          </div>
        </div>
        <div className="bg-white/70 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <ExpiryStamp date={offer.expiresOn} />
          <span className="text-sm text-ink-soft tabular">Quedan {offer.stockAvailable}</span>
        </div>
      </div>
      {onReserve && (
        <button
          onClick={() => onReserve(offer)}
          className="mt-4 w-full h-12 rounded-tag bg-ink text-white font-semibold hover:bg-ink-soft"
        >
          Agregar oferta a mi lista
        </button>
      )}
    </div>
  </figure>
);
