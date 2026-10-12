import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { FlashOffer, Product } from '../types';
import { ExpiryStamp, OldPrice, Price, ProductImage } from './ui/Tag';

const LOW_STOCK = 5;

function StockNote({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="text-sm font-semibold text-karen">Agotado</span>;
  if (stock <= LOW_STOCK) return <span className="text-sm font-semibold text-karen tabular">Quedan {stock}</span>;
  return <span className="text-sm text-fresh tabular">{stock} disponibles</span>;
}

interface ProductTagProps {
  product: Product;
  offer?: FlashOffer;
  showCategory?: boolean;
  onAdd: (product: Product) => void;
  onReserveOffer?: (offer: FlashOffer) => void | Promise<void>;
}

/** Producto en percha: foto arriba y la etiqueta de precio (fleje) en el borde. */
export const ProductTag: React.FC<ProductTagProps> = ({ product, offer, showCategory = false, onAdd, onReserveOffer }) => {
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  const add = () => {
    if (offer && onReserveOffer) {
      void onReserveOffer(offer);
      return;
    }
    onAdd(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <article className={`flex flex-col rounded-tag bg-white border ${offer ? 'border-sticker-deep' : 'border-aisle-rule'} overflow-hidden`}>
      <div className="relative">
        <ProductImage src={product.image} alt={product.name} className={`aspect-square p-4 ${soldOut ? 'opacity-40' : ''}`} />
        {offer && (
          <span className="absolute left-0 top-3 bg-karen text-white font-tag font-bold text-lg leading-none px-2.5 py-1.5 rounded-r-tag">
            {offer.discountBadge}
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col border-t-4 ${offer ? 'border-sticker bg-sticker-tint' : 'border-ink'} px-3.5 pt-3 pb-3.5`}>
        {showCategory && <p className="text-xs text-ink-muted mb-1">{product.category}</p>}
        <h3 className="font-semibold text-ink leading-snug line-clamp-2 min-h-[2.75em]">{product.name}</h3>
        {product.description && (
          <p className="mt-0.5 text-xs text-ink-muted truncate">{product.description}</p>
        )}

        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <Price value={offer?.price ?? product.price} tone={offer ? 'karen' : 'ink'} />
            {offer && <OldPrice value={offer.originalPrice} />}
          </div>
          <StockNote stock={offer ? offer.stockAvailable : product.stock} />
        </div>

        {offer && <ExpiryStamp date={offer.expiresOn} className="mt-2" />}

        <div className="mt-auto" />
        <button
          onClick={add}
          disabled={soldOut}
          aria-label={offer ? 'Añadir oferta al carrito' : `Agregar ${product.name} a mi lista`}
          className={`mt-3.5 h-11 rounded-tag text-sm font-semibold flex items-center justify-center gap-2 disabled:bg-aisle disabled:text-ink-faint ${
            added
              ? 'bg-fresh text-white'
              : offer
                ? 'bg-karen text-white hover:bg-karen-deep'
                : 'bg-ink text-white hover:bg-ink-soft'
          }`}
        >
          {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {soldOut ? 'Agotado' : added ? 'En tu lista' : offer ? 'Agregar oferta' : 'Agregar'}
        </button>
      </div>
    </article>
  );
};

interface OfferTagProps {
  offer: FlashOffer;
  onReserve: (offer: FlashOffer) => void | Promise<void>;
}

/** Oferta por vencer: etiqueta amarilla con el precio rebajado y la fecha impresa. */
export const OfferTag: React.FC<OfferTagProps> = ({ offer, onReserve }) => {
  const sold = Math.max(0, offer.stockTotal - offer.stockAvailable);
  const soldPercent = offer.stockTotal > 0 ? Math.round((sold / offer.stockTotal) * 100) : 0;
  return (
    <article className="flex flex-col rounded-tag bg-white border border-sticker-deep overflow-hidden">
      <div className="relative">
        <ProductImage src={offer.image} alt={offer.productName || offer.title} className="aspect-[4/3] p-4" />
        <span className="absolute left-0 top-3 bg-karen text-white font-tag font-bold text-xl leading-none px-3 py-1.5 rounded-r-tag">
          {offer.discountBadge}
        </span>
      </div>
      <div className="flex flex-1 flex-col bg-sticker px-4 pt-3.5 pb-4">
        <h3 className="font-semibold text-ink leading-snug line-clamp-2">{offer.productName || offer.title}</h3>
        <p className="mt-1 text-sm text-ink-soft line-clamp-2">{offer.title}</p>
        <div className="mt-3 flex items-end gap-3">
          <Price value={offer.price} tone="karen" />
          <span className="pb-1"><OldPrice value={offer.originalPrice} /></span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <ExpiryStamp date={offer.expiresOn} />
          <span className="text-sm text-ink tabular">Quedan {offer.stockAvailable}</span>
        </div>
        <div
          className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden"
          role="meter"
          aria-label="Unidades vendidas del lote en oferta"
          aria-valuenow={soldPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-karen" style={{ width: `${soldPercent}%` }} />
        </div>
        <button
          onClick={() => void onReserve(offer)}
          aria-label="Añadir oferta al carrito"
          className="mt-4 h-11 rounded-tag bg-ink text-white text-sm font-semibold hover:bg-ink-soft flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar oferta
        </button>
      </div>
    </article>
  );
};
