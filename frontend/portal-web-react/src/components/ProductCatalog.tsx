import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart, Check, Plus, AlertCircle, RefreshCw, Flame, Clock } from 'lucide-react';
import { DataLoadState, FlashOffer, Product, ProductCategory } from '../types';

interface ProductCatalogProps {
  products: Product[];
  categories: ProductCategory[];
  selectedCategory: ProductCategory;
  onSelectCategory: (cat: ProductCategory) => void;
  onAddToCart: (prod: Product) => void;
  onOpenCart: () => void;
  cartCount: number;
  loading?: boolean;
  state: DataLoadState;
  errorMessage?: string | null;
  onRefresh?: () => void;
  offers?: FlashOffer[];
  onReserveOffer?: (offer: FlashOffer) => void | Promise<void>;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  onAddToCart,
  onOpenCart,
  cartCount,
  loading = false,
  state,
  errorMessage,
  onRefresh,
  offers = [],
  onReserveOffer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const catalogItems = products;
  const categoryPills = categories.length > 0 ? categories : ['Todos'];
  const offersByProduct = useMemo(() => {
    const result = new Map<string, FlashOffer>();
    for (const offer of offers) {
      if (!offer.productId) continue;
      const current = result.get(offer.productId);
      const discount = Number.parseFloat(offer.discountBadge.replace(/[^0-9.]/g, '')) || 0;
      const currentDiscount = current
        ? Number.parseFloat(current.discountBadge.replace(/[^0-9.]/g, '')) || 0
        : -1;
      if (!current || discount > currentDiscount) result.set(offer.productId, offer);
    }
    return result;
  }, [offers]);

  const filteredProducts = useMemo(() => {
    return catalogItems.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Todos' || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalogItems, selectedCategory, searchQuery]);

  const handleAddClick = (product: Product) => {
    onAddToCart(product);
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  return (
    <section id="catalogo-section" className="py-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header: 'Catálogo de Productos' + Search bar + Cart button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
          
          {/* Title & Count Badge */}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-navy tracking-tight">
                Catálogo de Productos
              </h2>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-navy/10 text-navy font-mono">
                {filteredProducts.length} disp.
              </span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 transition-colors"
                  title="Actualizar catálogo desde el servidor"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Inventario en tiempo real sincronizado con el servidor de tienda física
            </p>
          </div>

          {/* Search Input + Blue Cart Button */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Input de búsqueda con icono */}
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por producto o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Botón Carrito Azul */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-4 py-2.5 bg-navy hover:bg-navy-dark text-white rounded-xl text-sm font-bold shadow-soft active:scale-95 transition-all flex-shrink-0"
              aria-label="Ver carrito de compras"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Lista</span>
              {cartCount > 0 && (
                <span className="inline-flex items-center justify-center bg-karenRed text-white text-xs font-black rounded-full h-5 w-5 ml-1">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Filtros Tipo Píldora */}
        <div className="py-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categoryPills.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shadow-sm ${
                  isActive
                    ? 'bg-navy text-white shadow-soft scale-102'
                    : 'bg-white text-slate-600 hover:text-navy hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
                <div className="bg-slate-200 rounded-xl aspect-[4/3] w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-10 bg-slate-200 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        )}

        {state === 'offline' || state === 'error' ? (
          <div className="py-16 text-center bg-amber-50 rounded-3xl border border-amber-200 p-8 shadow-sm">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-amber-900">Catálogo no disponible</h3>
            <p className="text-sm text-amber-700 mt-1 max-w-md mx-auto">
              {errorMessage || 'No fue posible comunicarse con el servidor.'}
            </p>
            {onRefresh && <button onClick={onRefresh} className="mt-4 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl">Reintentar</button>}
          </div>
        ) : !loading && filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-navy">{products.length === 0 ? 'Catálogo sin productos' : 'No se encontraron productos'}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {products.length === 0 ? 'El servidor respondió correctamente, pero todavía no hay productos disponibles.' : 'Intenta con otro término de búsqueda o selecciona otra categoría.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                onSelectCategory('Todos');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 text-navy text-xs font-bold rounded-xl hover:bg-slate-200"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const isAdded = addedItemIds[product.id];
                const activeOffer = offersByProduct.get(product.id);
                return (
                  <div
                    key={product.id}
                    className={`group rounded-2xl p-5 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${
                      activeOffer
                        ? 'bg-gradient-to-b from-red-50 via-white to-white border-2 border-karenRed/60 shadow-glow-red'
                        : 'bg-white border border-slate-100'
                    }`}
                  >
                    <div>
                      {/* Foto del Producto con ratio elegante */}
                      <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-[4/3] mb-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {/* En "Todos" la categoría aporta contexto; dentro de una categoría sería redundante. */}
                        {selectedCategory === 'Todos' && (
                          <div className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                            {product.badge || product.category}
                          </div>
                        )}
                        {activeOffer && (
                          <div className="absolute top-3 right-3">
                            <span className="bg-karenRed text-white px-3 py-1 rounded-xl text-xs font-black shadow-glow-red">
                              {activeOffer.discountBadge}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Título de Producto */}
                      <h3 className="text-base font-bold text-slate-900 line-clamp-2 min-h-[48px] group-hover:text-navy transition-colors">
                        {product.name}
                      </h3>

                      {/* Precio en Azul Bold ($X.XX) & Stock con Punto Verde */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-xl font-display font-black ${activeOffer ? 'text-karenRed' : 'text-navy'}`}>
                            ${(activeOffer?.price ?? product.price).toFixed(2)}
                          </span>
                          {activeOffer ? (
                            <span className="text-xs text-slate-400 line-through font-medium">
                              ${activeOffer.originalPrice.toFixed(2)}
                            </span>
                          ) : product.originalPrice ? (
                            <span className="text-xs text-slate-400 line-through font-medium">
                              ${product.originalPrice.toFixed(2)}
                            </span>
                          ) : null}
                          {product.unit && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              / {product.unit}
                            </span>
                          )}
                        </div>

                        {/* Stock Disponible (Punto Verde) */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{product.stock} un.</span>
                        </div>
                      </div>
                      {activeOffer && (
                        <div className="mt-3 rounded-xl border border-red-100 bg-red-50/80 px-3 py-2">
                          <p className="text-xs font-bold text-red-700 line-clamp-2">{activeOffer.title}</p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{activeOffer.expiryText}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botón CTA full-width '+ Añadir a lista' */}
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => activeOffer && onReserveOffer
                          ? void onReserveOffer(activeOffer)
                          : handleAddClick(product)}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-98 ${
                          activeOffer
                            ? 'bg-karenRed hover:bg-karenRed-hover text-white shadow-glow-red'
                            : isAdded
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-navy/5 hover:bg-navy hover:text-white text-navy'
                        }`}
                      >
                        {activeOffer ? (
                          <>
                            <Flame className="w-4 h-4" />
                            <span>Añadir oferta al carrito</span>
                          </>
                        ) : isAdded ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>¡Añadido!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Añadir a lista</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )
        )}

      </div>
    </section>
  );
};
