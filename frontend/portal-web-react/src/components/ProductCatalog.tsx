import React, { useMemo, useState } from 'react';
import { RefreshCw, SearchX, WifiOff } from 'lucide-react';
import { DataLoadState, FlashOffer, Product, ProductCategory } from '../types';
import { ProductTag } from './ProductTag';

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
  searchQuery?: string;
  onSearch?: (query: string) => void;
  currentPage?: number;
  totalProducts?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

type SortKey = 'nombre' | 'precio-asc' | 'precio-desc';

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products, categories, selectedCategory, onSelectCategory, onAddToCart, loading = false, state,
  errorMessage, onRefresh, offers = [], onReserveOffer, searchQuery = '', onSearch,
  currentPage = 0, totalProducts, pageSize = 24, onPageChange,
}) => {
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sort, setSort] = useState<SortKey>('nombre');

  // Si un producto tiene varias promociones aprobadas se muestra la de mayor descuento.
  const offersByProduct = useMemo(() => {
    const result = new Map<string, FlashOffer>();
    for (const offer of offers) {
      if (!offer.productId) continue;
      const current = result.get(offer.productId);
      if (!current || offer.price < current.price) result.set(offer.productId, offer);
    }
    return result;
  }, [offers]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) map.set(product.category, (map.get(product.category) || 0) + 1);
    return map;
  }, [products]);

  const aisles = (categories.length ? categories : ['Todos']).filter(name => name === 'Todos' || counts.has(name));

  const visible = useMemo(() => {
    const query = fold(searchQuery.trim());
    const list = products.filter(product =>
      (selectedCategory === 'Todos' || product.category === selectedCategory)
      && (!onlyInStock || product.stock > 0)
      && (!query || fold(product.name).includes(query) || fold(product.category).includes(query)
        || (product.barcode || '').includes(query)));
    const priceOf = (product: Product) => offersByProduct.get(product.id)?.price ?? product.price;
    return list.sort((a, b) => {
      if (sort === 'precio-asc') return priceOf(a) - priceOf(b);
      if (sort === 'precio-desc') return priceOf(b) - priceOf(a);
      return a.name.localeCompare(b.name, 'es');
    });
  }, [products, selectedCategory, onlyInStock, searchQuery, sort, offersByProduct]);

  const title = searchQuery.trim()
    ? `Resultados para “${searchQuery.trim()}”`
    : selectedCategory === 'Todos' ? 'Todos los productos' : selectedCategory;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
      <nav aria-label="Pasillos" className="hidden lg:block">
        <div className="sticky top-32">
          <p className="font-tag font-bold text-lg text-ink dark:text-white mb-2">Pasillos</p>
          <ul className="space-y-0.5">
            {aisles.map(name => {
              const active = selectedCategory === name;
              return (
                <li key={name}>
                  <button
                    onClick={() => onSelectCategory(name)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full flex items-baseline justify-between gap-2 rounded-tag px-3 py-2 text-left text-sm ${
                      active
                        ? 'bg-ink dark:bg-slate-800 text-white font-semibold'
                        : 'text-ink-soft dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/80 hover:text-ink dark:hover:text-white'
                    }`}
                  >
                    <span>{name}</span>
                    <span className={`text-xs tabular ${active ? 'text-white/70' : 'text-ink-faint dark:text-slate-400'}`}>
                      {name === 'Todos' ? products.length : counts.get(name)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="min-w-0">
        <div className="lg:hidden -mx-4 px-4 mb-5 flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Pasillos">
          {aisles.map(name => (
            <button
              key={name}
              role="tab"
              aria-selected={selectedCategory === name}
              onClick={() => onSelectCategory(name)}
              className={`shrink-0 h-9 px-3.5 rounded-tag text-sm font-semibold ${
                selectedCategory === name
                  ? 'bg-ink dark:bg-slate-800 text-white'
                  : 'bg-white dark:bg-slate-800 text-ink-soft dark:text-slate-200 border border-aisle-rule dark:border-slate-700'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-tag font-bold text-3xl sm:text-4xl text-ink dark:text-white leading-tight">{title}</h2>
            <p className="mt-1 text-sm text-ink-muted dark:text-slate-400 tabular">
              {state === 'ready' || state === 'empty' ? `${visible.length} productos` : ' '}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-ink-soft dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={event => setOnlyInStock(event.target.checked)}
                className="w-4 h-4 accent-[#13284B] dark:accent-karen"
              />
              Solo con stock
            </label>
            <label className="sr-only" htmlFor="orden">Ordenar productos</label>
            <select
              id="orden"
              value={sort}
              onChange={event => setSort(event.target.value as SortKey)}
              className="h-10 rounded-tag border border-aisle-rule dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-ink dark:text-slate-100"
            >
              <option value="nombre">Nombre (A–Z)</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
            </select>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="h-10 w-10 rounded-tag border border-aisle-rule dark:border-slate-700 bg-white dark:bg-slate-800 text-ink-muted dark:text-slate-300 hover:text-ink dark:hover:text-white flex items-center justify-center transition-colors"
                aria-label="Actualizar existencias"
                title="Actualizar existencias"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {state === 'offline' || state === 'error' ? (
          <div className="rounded-tag bg-white dark:bg-slate-900 border border-aisle-rule dark:border-slate-800 p-10 text-center">
            <WifiOff className="w-10 h-10 mx-auto text-karen" />
            <h3 className="mt-3 font-tag font-bold text-2xl text-ink dark:text-white">No pudimos cargar los productos</h3>
            <p className="mt-1 text-ink-soft dark:text-slate-300 max-w-md mx-auto">
              {errorMessage || 'La tienda no respondió.'} Revisa tu conexión e inténtalo de nuevo.
            </p>
            {onRefresh && (
              <button onClick={onRefresh} className="mt-5 h-11 px-5 rounded-tag bg-ink dark:bg-slate-800 text-white font-semibold hover:bg-ink-soft">
                Intentar de nuevo
              </button>
            )}
          </div>
        ) : loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="aspect-[3/4] rounded-tag bg-white dark:bg-slate-800/80 border border-aisle-rule dark:border-slate-700 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-tag bg-white dark:bg-slate-900 border border-aisle-rule dark:border-slate-800 p-10 text-center">
            <SearchX className="w-10 h-10 mx-auto text-ink-faint dark:text-slate-500" />
            <h3 className="mt-3 font-tag font-bold text-2xl text-ink dark:text-white">
              {products.length === 0 ? 'Aún no hay productos publicados' : 'No encontramos ese producto'}
            </h3>
            <p className="mt-1 text-ink-soft dark:text-slate-300">
              {products.length === 0
                ? 'Vuelve en unos minutos: la tienda está cargando su catálogo.'
                : 'Prueba con otra palabra o revisa todos los pasillos.'}
            </p>
            {products.length > 0 && (
              <button
                onClick={() => { onSearch?.(''); setOnlyInStock(false); onSelectCategory('Todos'); }}
                className="mt-5 h-11 px-5 rounded-tag border-2 border-ink dark:border-slate-500 text-ink dark:text-white font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Ver todos los productos
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {visible.map(product => (
                <ProductTag
                  key={product.id}
                  product={product}
                  offer={offersByProduct.get(product.id)}
                  showCategory={selectedCategory === 'Todos'}
                  onAdd={onAddToCart}
                  onReserveOffer={onReserveOffer}
                />
              ))}
            </div>

            {totalProducts !== undefined && onPageChange && Math.ceil(totalProducts / (pageSize || 24)) > 1 && (
              <nav aria-label="Paginación de catálogo" className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-aisle-rule dark:border-slate-800 pt-4 text-sm">
                <p className="text-ink-soft dark:text-slate-300">
                  Página <span className="font-semibold text-ink dark:text-white">{(currentPage || 0) + 1}</span> de{' '}
                  <span className="font-semibold text-ink dark:text-white">{Math.ceil(totalProducts / (pageSize || 24))}</span>{' '}
                  <span className="text-ink-muted dark:text-slate-400">({totalProducts} productos en total)</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange((currentPage || 0) - 1)}
                    disabled={(currentPage || 0) <= 0 || loading}
                    className="h-9 px-4 rounded-tag border border-aisle-rule dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-ink dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => onPageChange((currentPage || 0) + 1)}
                    disabled={(currentPage || 0) >= Math.ceil(totalProducts / (pageSize || 24)) - 1 || loading}
                    className="h-9 px-4 rounded-tag border border-aisle-rule dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-ink dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
};
