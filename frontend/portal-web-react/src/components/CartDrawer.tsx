import React, { useEffect } from 'react';
import { AlertTriangle, Minus, Plus, Trash2, X } from 'lucide-react';
import { CartItem } from '../types';
import { Price, ProductImage } from './ui/Tag';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onConfirmReservation: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  isLoggedIn?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onConfirmReservation,
  isSubmitting = false, error = null, isLoggedIn = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-ink/50" onClick={onClose} aria-label="Cerrar mi lista" tabIndex={-1} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mi-lista"
        className="relative w-full max-w-md h-full bg-aisle flex flex-col animate-drawer-in"
      >
        <header className="flex items-center justify-between gap-3 bg-white px-5 h-16 border-b border-aisle-rule">
          <h2 id="mi-lista" className="font-tag font-bold text-2xl text-ink">
            Mi lista <span className="text-ink-muted text-lg tabular">({units})</span>
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-ink-muted hover:text-ink" aria-label="Cerrar lista">
            <X className="w-5 h-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <p className="font-tag font-bold text-2xl text-ink">Tu lista está vacía</p>
            <p className="mt-2 text-ink-soft">Agrega productos desde los pasillos y reserva todo de una vez.</p>
            <button onClick={onClose} className="mt-6 h-11 px-5 rounded-tag bg-ink text-white font-semibold">
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 pt-4">
            <ul className="bg-white rounded-tag border border-aisle-rule divide-y divide-aisle-rule">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-3 p-3">
                  <ProductImage src={product.image} alt="" className="w-16 h-16 shrink-0 rounded-tag border border-aisle-rule" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">{product.name}</p>
                    {product.isOffer && <p className="text-xs font-semibold text-karen">Precio de oferta</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-tag border border-aisle-strong">
                        <button
                          onClick={() => onUpdateQuantity(product.id, -1)}
                          className="w-9 h-9 flex items-center justify-center text-ink"
                          aria-label={`Quitar una unidad de ${product.name}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular" aria-live="polite">{quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(product.id, 1)}
                          disabled={quantity >= product.stock}
                          className="w-9 h-9 flex items-center justify-center text-ink disabled:text-ink-faint"
                          aria-label={`Agregar una unidad de ${product.name}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-semibold text-ink tabular">${(product.price * quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveItem(product.id)}
                    className="self-start p-1.5 text-ink-faint hover:text-karen"
                    aria-label={`Eliminar ${product.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            </div>

            <footer className="bg-white border-t border-aisle-rule p-5 mt-4 space-y-4">
              <div className="flex items-end justify-between">
                <span className="text-ink-soft">Total a pagar en caja</span>
                <Price value={total} size="md" />
              </div>
              <p className="text-sm text-ink-muted leading-relaxed">
                Al reservar te apartamos estas unidades por 10 minutos. Pagas al retirar en la Sucursal Matriz.
              </p>
              {error && (
                <p role="alert" className="flex gap-2 rounded-tag bg-karen-tint text-karen-deep text-sm p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </p>
              )}
              <button
                onClick={onConfirmReservation}
                disabled={isSubmitting}
                className="w-full h-12 rounded-tag bg-karen text-white font-semibold hover:bg-karen-deep disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isSubmitting ? 'Reservando…' : isLoggedIn ? 'Reservar y obtener código' : 'Ingresa para reservar'}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
