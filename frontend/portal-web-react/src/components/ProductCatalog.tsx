import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart, Check, Plus, AlertCircle } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { PRODUCTS_CATALOG } from '../data/mockData';

interface ProductCatalogProps {
  selectedCategory: ProductCategory;
  onSelectCategory: (cat: ProductCategory) => void;
  onAddToCart: (prod: Product) => void;
  onOpenCart: () => void;
  cartCount: number;
}

const CATEGORY_PILLS: ProductCategory[] = [
  'Todos',
  'Carnes',
  'Lácteos',
  'Frutas',
  'Panadería',
  'Verduras',
  'Conservas'
];

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  selectedCategory,
  onSelectCategory,
  onAddToCart,
  onOpenCart,
  cartCount
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const filteredProducts = useMemo(() => {
    return PRODUCTS_CATALOG.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

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
        
        {/* Header: 'Catálogo de Productos' (9 disp.) + Search bar + Cart button */}
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
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Inventario sincronizado con percha física en tiempo real
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

        {/* Filtros Tipo Píldora: [Todos, Carnes, Lácteos, Frutas, Panadería, Verduras, Conservas] */}
        <div className="py-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {CATEGORY_PILLS.map((cat) => {
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

        {/* Grid 3x3 de Productos (o estado vacío) */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-navy">No se encontraron productos</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Intenta con otro término de búsqueda o selecciona otra categoría.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const isAdded = addedItemIds[product.id];
              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
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
                      {/* Categoría: Badge Gris */}
                      <div className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                        {product.badge || product.category}
                      </div>
                    </div>

                    {/* Título de Producto */}
                    <h3 className="text-base font-bold text-slate-900 line-clamp-2 min-h-[48px] group-hover:text-navy transition-colors">
                      {product.name}
                    </h3>

                    {/* Precio en Azul Bold ($X.XX) & Stock con Punto Verde */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-display font-black text-navy">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.originalPrice && (
                          <span className="text-xs text-slate-400 line-through font-medium">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
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
                  </div>

                  {/* Botón CTA full-width '+ Añadir a lista' */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleAddClick(product)}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-98 ${
                        isAdded
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-navy/5 hover:bg-navy hover:text-white text-navy'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>¡Añadido!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>+ Añadir a lista</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
