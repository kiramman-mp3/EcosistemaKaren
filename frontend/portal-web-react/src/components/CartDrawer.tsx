import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Minus, Plus, Trash2, X } from 'lucide-react';
import { CartItem } from '../types';
import { Price, ProductImage } from './ui/Tag';
import { Button } from './ui/Button';
import { CountUp } from './ui/CountUp';
import { Illustration } from './ui/Illustration';
import { categoryTone } from '../lib/categoryTone';
import { STORE_INFO } from '../config/storeInfo';
import { DEFAULT_RESERVATION_MINUTES, RESERVATION_DURATION_OPTIONS, RESERVATION_EXTENSION_MINUTES, RESERVATION_MAX_TOTAL_MINUTES, formatMinutes } from '../config/reservationRules';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onConfirmReservation: (ttlMinutos?: number) => void;
  isSubmitting?: boolean;
  error?: string | null;
  isLoggedIn?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onConfirmReservation,
  isSubmitting = false, error = null, isLoggedIn = true,
}) => {
  const [selectedTtl, setSelectedTtl] = useState<number>(DEFAULT_RESERVATION_MINUTES);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const savings = items.reduce((sum, item) => {
    const original = item.product.originalPrice;
    return original && original > item.product.price ? sum + (original - item.product.price) * item.quantity : sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-mora/60" onClick={onClose} aria-label="Cerrar mi lista" tabIndex={-1} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mi-lista"
        className="relative w-full max-w-md h-full bg-page flex flex-col animate-drawer-in border-l-2 border-mora"
      >
        <header className="flex items-center justify-between gap-3 bg-limon text-mora px-5 h-20 border-b-2 border-mora">
          <h2 id="mi-lista" className="text-3xl">
            Mi lista <span className="text-xl tabular">({units})</span>
          </h2>
          <button onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-mora/10" aria-label="Cerrar lista">
            <X className="w-5 h-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <Illustration name="basket" className="w-40 h-40" />
            <p className="mt-4 font-display font-extrabold text-2xl text-ink">Tu lista está vacía</p>
            <p className="mt-2 text-ink-soft max-w-[30ch]">Mira qué se va hoy y agrega lo que necesites.</p>
            <Button onClick={onClose} className="mt-6">Seguir comprando</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 pt-4">
              <ul className="space-y-3">
                {items.map(({ product, quantity }) => {
                  const isAtLimit = quantity >= product.stock;

                  return (
                    <li key={product.id} className="flex gap-3 p-3 rounded-block bg-surface border-2 border-aisle-rule animate-fly-in">
                      <ProductImage
                        src={product.image}
                        alt=""
                        tone={categoryTone(product.category)}
                        className="w-16 h-16 shrink-0 rounded-photo"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold font-display text-ink leading-snug line-clamp-2">{product.name}</p>
                        {product.isOffer && <p className="text-xs font-bold text-karen-text">Precio de oferta</p>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center rounded-full border-2 border-mora">
                            <button
                              onClick={() => onUpdateQuantity(product.id, -1)}
                              className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center text-ink rounded-full hover:bg-limon hover:text-mora"
                              aria-label={`Quitar una unidad de ${product.name}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-extrabold tabular" aria-live="polite">{quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(product.id, 1)}
                              disabled={isAtLimit}
                              className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center text-ink rounded-full hover:bg-limon hover:text-mora disabled:text-ink-faint disabled:hover:bg-transparent"
                              aria-label={`Agregar una unidad de ${product.name}`}
                              title={isAtLimit ? 'Sin más stock' : undefined}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="font-display font-extrabold text-ink tabular">${(product.price * quantity).toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveItem(product.id)}
                        className="self-start p-1.5 text-ink-faint hover:text-karen-text"
                        aria-label={`Eliminar ${product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <footer className="bg-surface border-t-2 border-mora p-5 mt-4 space-y-4">
              {savings > 0 && (
                <p className="flex items-center justify-between rounded-tag bg-aguacate-tint px-4 py-2.5 text-fresh font-extrabold">
                  <span>Con las ofertas ahorras</span>
                  <CountUp value={savings} className="font-display text-xl" />
                </p>
              )}
              <div className="flex items-end justify-between">
                <span className="text-ink-soft font-semibold">Total a pagar en caja</span>
                <Price value={total} size="md" />
              </div>

              {/* Selector de tiempo de reserva */}
              <div className="space-y-1.5 pt-2 border-t border-aisle-rule">
                <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-mora" /> Tiempo para retirar
                  </span>
                  <span className="text-mora font-black">{formatMinutes(selectedTtl)}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {RESERVATION_DURATION_OPTIONS.map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSelectedTtl(mins)}
                      className={`py-1.5 text-xs font-extrabold rounded-btn border-2 transition-all ${
                        selectedTtl === mins
                          ? 'bg-limon border-mora text-mora shadow-pop-sm'
                          : 'bg-page border-aisle-rule text-ink hover:border-mora/40'
                      }`}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-ink-muted">
                  Guardamos tus productos {formatMinutes(selectedTtl)} en {STORE_INFO.tradeName}. Si te hace falta, desde Mis reservas sumas {RESERVATION_EXTENSION_MINUTES} minutos más, hasta {formatMinutes(RESERVATION_MAX_TOTAL_MINUTES)} en total.
                </p>
              </div>

              {error && (
                <p role="alert" className="flex gap-2 rounded-tag bg-karen-tint text-karen-deep text-sm font-semibold p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </p>
              )}
              <Button onClick={() => onConfirmReservation(selectedTtl)} disabled={isSubmitting} size="lg" className="w-full">
                {isSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isSubmitting ? 'Apartando…' : isLoggedIn ? 'Apartar y obtener mi código' : 'Ingresa para apartar'}
              </Button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
