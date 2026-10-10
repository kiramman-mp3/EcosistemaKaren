import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, AlertTriangle } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onConfirmReservation: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onConfirmReservation,
  isSubmitting = false,
  error = null,
}) => {
  if (!isOpen) return null;

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-navy" />
            <h3 className="font-display font-bold text-lg text-navy">
              Mi Lista de Compra
            </h3>
            <span className="text-xs bg-navy text-white px-2 py-0.5 rounded-full font-bold font-mono">
              {items.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            aria-label="Cerrar lista"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-navy">Tu lista está vacía</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Explora el catálogo o las ofertas del día y agrega productos para bloquear su stock.
              </p>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-navy truncate">
                    {product.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    ${product.price.toFixed(2)} c/u
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                      <button
                        onClick={() => onUpdateQuantity(product.id, -1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded-l-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold font-mono">
                        {quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(product.id, 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded-r-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveItem(product.id)}
                      className="p-1 text-slate-400 hover:text-karenRed transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display font-black text-sm text-navy">
                    ${(product.price * quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-white space-y-4">
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold text-slate-600">Total a pagar en caja:</span>
              <span className="font-display font-black text-2xl text-navy">
                ${total.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Garantía anti-overbooking: el stock se aparta vía FEFO por 10 min.</span>
            </div>

            <button
              onClick={onConfirmReservation}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-karenRed hover:bg-karenRed-hover active:scale-98 transition-all shadow-glow-red flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Bloqueando stock en tienda...</span>
                </>
              ) : (
                <>
                  <span>Confirmar Reserva y Obtener PIN</span>
                  <span className="text-xs font-mono">→</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
