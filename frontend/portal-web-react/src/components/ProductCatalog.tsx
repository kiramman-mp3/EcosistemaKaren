import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DataLoadState, FlashOffer, Product, ProductCategory } from '../types';
import { ProductTag } from './ProductTag';
import { Button } from './ui/Button';
import { Illustration } from './ui/Illustration';

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
          <p className="font-display font-extrabold text-lg text-ink mb-2">Pasillos</p>
          <ul className="space-y-0.5">
            {aisles.map(name => {
              const active = selectedCategory === name;
              return (
                <li key={name}>
                  <button
                    onClick={() => onSelectCategory(name)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full flex items-baseline justify-between gap-2 rounded-full border-2 px-4 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-limon text-mora border-mora font-extrabold shadow-pop-sm'
                        : 'border-transparent text-ink-soft font-semibold hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <span>{name}</span>
                    <span className={`text-xs tabular ${active ? 'text-mora' : 'text-ink-muted'}`}>
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
              className={`shrink-0 h-10 px-4 rounded-full border-2 text-sm font-bold transition-colors ${
                selectedCategory === name
                  ? 'bg-limon text-mora border-mora shadow-pop-sm'
                  : 'bg-surface text-ink-soft border-aisle-rule'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl sm:text-5xl text-ink leading-tight">{title}</h2>
            <p className="mt-1 text-sm text-ink-muted tabular">
              {state === 'ready' || state === 'empty' ? `${visible.length} productos` : ' '}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 w-full min-h-11 sm:w-auto text-sm text-ink-soft cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={event => setOnlyInStock(event.target.checked)}
                className="w-5 h-5 sm:w-4 sm:h-4 accent-[var(--c-karen)]"
              />
              Solo con stock
            </label>
            <label className="sr-only" htmlFor="orden">Ordenar productos</label>
            <select
              id="orden"
              value={sort}
              onChange={event => setSort(event.target.value as SortKey)}
              className="h-11 min-w-0 flex-1 sm:flex-none rounded-full border-2 border-mora bg-surface px-4 text-base sm:text-sm font-semibold text-ink"
            >
              <option value="nombre">Nombre (A–Z)</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
            </select>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="press h-11 w-11 rounded-full border-2 border-mora bg-surface text-ink flex items-center justify-center"
                aria-label="Actualizar existencias"
                title="Actualizar existencias"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {state === 'offline' || state === 'error' ? (
          <div className="rounded-block bg-surface border-2 border-mora shadow-pop p-10 text-center flex flex-col items-center">
            <Illustration name="offline" />
            <h3 className="mt-3 text-2xl text-ink">No pudimos cargar los productos</h3>
            <p className="mt-1 text-ink-soft max-w-md">
              {errorMessage || 'La tienda no respondió.'} Revisa tu conexión e inténtalo de nuevo.
            </p>
            {onRefresh && <Button onClick={onRefresh} className="mt-5">Intentar de nuevo</Button>}
          </div>
        ) : loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="aspect-[3/4] rounded-block skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-block bg-surface border-2 border-mora shadow-pop p-10 text-center flex flex-col items-center">
            <Illustration name="search" />
            <h3 className="mt-3 text-2xl text-ink">
              {products.length === 0 ? 'Aún no hay productos publicados' : 'No encontramos ese producto'}
            </h3>
            <p className="mt-1 text-ink-soft max-w-md">
              {products.length === 0
                ? 'Vuelve en unos minutos: la tienda está cargando su catálogo.'
                : 'Prueba con otra palabra o date una vuelta por todos los pasillos.'}
            </p>
            {products.length > 0 && (
              <Button
                onClick={() => { onSearch?.(''); setOnlyInStock(false); onSelectCategory('Todos'); }}
                variant="surface"
                className="mt-5"
              >
                Ver todos los productos
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
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
              <nav aria-label="Paginación de catálogo" className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-aisle-rule pt-4 text-sm">
                <p className="text-ink-soft">
                  Página <span className="font-semibold text-ink">{(currentPage || 0) + 1}</span> de{' '}
                  <span className="font-semibold text-ink">{Math.ceil(totalProducts / (pageSize || 24))}</span>{' '}
                  <span className="text-ink-muted">({totalProducts} productos en total)</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange((currentPage || 0) - 1)}
                    disabled={(currentPage || 0) <= 0 || loading}
                    className="press h-10 px-5 rounded-full border-2 border-mora bg-surface font-bold text-ink disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => onPageChange((currentPage || 0) + 1)}
                    disabled={(currentPage || 0) >= Math.ceil(totalProducts / (pageSize || 24)) - 1 || loading}
                    className="press h-10 px-5 rounded-full border-2 border-mora bg-surface font-bold text-ink disabled:opacity-40"
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
