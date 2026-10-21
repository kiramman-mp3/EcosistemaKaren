import React, { useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { FlashOffer, Product } from '../types';
import { ExpiryStamp, OldPrice, Price, ProductImage } from './ui/Tag';
import { Button } from './ui/Button';
import { categoryTone } from '../lib/categoryTone';
import { flyToCart } from '../lib/flyToCart';

const LOW_STOCK = 5;

function StockNote({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="text-sm font-bold text-karen-text">Agotado</span>;
  if (stock <= LOW_STOCK) return <span className="text-sm font-bold text-karen-text tabular">Quedan {stock}</span>;
  return <span className="text-sm font-semibold text-fresh tabular">{stock} disponibles</span>;
}

interface ProductTagProps {
  product: Product;
  offer?: FlashOffer;
  showCategory?: boolean;
  onAdd: (product: Product) => void;
  onReserveOffer?: (offer: FlashOffer) => void | Promise<void>;
}

/** Producto en percha: foto sobre el color de su pasillo y el precio en una etiqueta. */
export const ProductTag: React.FC<ProductTagProps> = ({ product, offer, showCategory = false, onAdd, onReserveOffer }) => {
  const [added, setAdded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const soldOut = product.stock <= 0;

  const add = () => {
    flyToCart(imageRef.current);
    if (offer && onReserveOffer) void onReserveOffer(offer);
    else onAdd(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className="group flex flex-col rounded-block bg-surface p-3 shadow-pop border-2 border-mora/90 transition-transform hover:-translate-y-0.5">
      <div className="relative">
        <ProductImage
          ref={imageRef}
          src={product.image}
          alt={product.name}
          tone={categoryTone(product.category)}
          className={`aspect-square rounded-photo p-4 ${soldOut ? 'opacity-40' : ''}`}
        />
        {offer && (
          <span
            className="absolute -left-1 top-3 -rotate-3 rounded-tag border-2 border-mora bg-karen px-2.5 py-1 font-display text-lg font-extrabold leading-none text-white shadow-pop-sm animate-pop"
          >
            {offer.discountBadge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1.5 pt-3 pb-1">
        {showCategory && <p className="text-xs font-semibold text-ink-muted mb-1">{product.category}</p>}
        <h3 className="font-display text-base font-extrabold leading-snug text-ink line-clamp-2 min-h-[2.6em]">{product.name}</h3>
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
        <Button
          onClick={add}
          disabled={soldOut}
          variant={added ? 'limon' : offer ? 'primary' : 'surface'}
          aria-label={`Agregar ${product.name} a mi lista`}
          className="mt-3.5 w-full"
        >
          {added ? <Check className="w-4 h-4 animate-pop" /> : <Plus className="w-4 h-4" />}
          {soldOut ? 'Agotado' : added ? 'En tu lista' : 'Agregar'}
        </Button>
      </div>
    </article>
  );
};

interface OfferTagProps {
  offer: FlashOffer;
  onReserve: (offer: FlashOffer) => void | Promise<void>;
}

/** Oferta por vencer: pegatina limón con el precio rebajado y la nota de la tienda a mano. */
export const OfferTag: React.FC<OfferTagProps> = ({ offer, onReserve }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const sold = Math.max(0, offer.stockTotal - offer.stockAvailable);
  const soldPercent = offer.stockTotal > 0 ? Math.round((sold / offer.stockTotal) * 100) : 0;
  return (
    <article className="flex flex-col rounded-block border-2 border-mora bg-limon p-3 shadow-pop text-mora">
      <div className="relative">
        <ProductImage
          ref={imageRef}
          src={offer.image}
          alt={offer.productName || offer.title}
          tone={categoryTone(offer.category)}
          className="aspect-[4/3] rounded-photo p-4"
        />
        <span className="absolute -left-1 top-3 -rotate-3 rounded-tag border-2 border-mora bg-karen px-3 py-1 font-display text-xl font-extrabold leading-none text-white shadow-pop-sm animate-pop">
          {offer.discountBadge}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-1.5 pt-3.5 pb-1">
        <h3 className="font-display text-lg font-extrabold leading-snug line-clamp-2">{offer.productName || offer.title}</h3>
        <p className="mt-1 font-hand text-xl leading-tight -rotate-1 line-clamp-2">{offer.title}</p>
        <div className="mt-3 flex items-end gap-3">
          <Price value={offer.price} tone="mora" />
          <span className="pb-1 text-sm line-through tabular opacity-75" aria-label={`Antes $${offer.originalPrice.toFixed(2)}`}>
            ${offer.originalPrice.toFixed(2)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <ExpiryStamp date={offer.expiresOn} onColor />
          <span className="text-sm font-bold tabular">Quedan {offer.stockAvailable}</span>
        </div>
        <div
          className="mt-2 h-2 rounded-full bg-mora/15 overflow-hidden"
          role="meter"
          aria-label="Unidades vendidas del lote en oferta"
          aria-valuenow={soldPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-karen transition-[width] duration-700" style={{ width: `${soldPercent}%` }} />
        </div>
        <Button
          onClick={() => {
            flyToCart(imageRef.current);
            void onReserve(offer);
          }}
          aria-label={`Agregar ${offer.productName || offer.title} a mi lista`}
          variant="primary"
          className="mt-4 w-full"
        >
          <Plus className="w-4 h-4" />
          Agregar por ${offer.price.toFixed(2)}
        </Button>
      </div>
    </article>
  );
};

