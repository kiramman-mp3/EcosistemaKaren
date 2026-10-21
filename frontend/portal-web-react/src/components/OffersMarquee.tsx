import React from 'react';
import { Flame } from 'lucide-react';
import { FlashOffer } from '../types';

interface OffersMarqueeProps {
  offers: FlashOffer[];
  onSelect: () => void;
}

/** Cinta con las ofertas reales que se acaban; se pausa al pasar el cursor o al enfocarla. */
export const OffersMarquee: React.FC<OffersMarqueeProps> = ({ offers, onSelect }) => {
  if (offers.length === 0) return null;
  const items = offers.slice(0, 10);

  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={hidden || undefined}>
      {items.map(offer => (
        <li key={`${hidden ? 'b' : 'a'}-${offer.id}`} className="flex items-center gap-3 whitespace-nowrap">
          <Flame className="w-4 h-4 text-limon" aria-hidden="true" />
          <span className="font-display text-lg font-extrabold">{offer.productName || offer.title}</span>
          <span className="rounded-full bg-karen px-2.5 py-0.5 font-display text-sm font-extrabold text-white">{offer.discountBadge}</span>
          <span className="font-stamp text-sm font-black text-limon tabular">${offer.price.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="marquee bg-mora text-white border-b-2 border-mora overflow-hidden" role="region" aria-label="Ofertas que se acaban hoy">
      <button onClick={onSelect} className="block w-full py-3 text-left" aria-label="Ver todas las ofertas por vencer">
        <div className="marquee-track">
          {row(false)}
          {row(true)}
        </div>
      </button>
    </div>
  );
};
