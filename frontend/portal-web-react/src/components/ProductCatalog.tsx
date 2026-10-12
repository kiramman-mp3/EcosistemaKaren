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
}

type SortKey = 'nombre' | 'precio-asc' | 'precio-desc';

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products, categories, selectedCategory, onSelectCategory, onAddToCart, loading = false, state,
  errorMessage, onRefresh, offers = [], onReserveOffer, searchQuery = '', onSearch,
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
          <p className="font-tag font-bold text-lg text-ink mb-2">Pasillos</p>
          <ul className="space-y-0.5">
            {aisles.map(name => {
              const active = selectedCategory === name;
              return (
                <li key={name}>
                  <button
                    onClick={() => onSelectCategory(name)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full flex items-baseline justify-between gap-2 rounded-tag px-3 py-2 text-left text-sm ${
                      active ? 'bg-ink text-white font-semibold' : 'text-ink-soft hover:bg-white hover:text-ink'
                    }`}
                  >
                    <span>{name}</span>
                    <span className={`text-xs tabular ${active ? 'text-white/70' : 'text-ink-faint'}`}>
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
                selectedCategory === name ? 'bg-ink text-white' : 'bg-white text-ink-soft border border-aisle-rule'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-tag font-bold text-3xl sm:text-4xl text-ink leading-tight">{title}</h2>
            <p className="mt-1 text-sm text-ink-muted tabular">
              {state === 'ready' || state === 'empty' ? `${visible.length} productos` : ' '}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={event => setOnlyInStock(event.target.checked)}
                className="w-4 h-4 accent-[#13284B]"
              />
              Solo con stock
            </label>
            <label className="sr-only" htmlFor="orden">Ordenar productos</label>
            <select
              id="orden"
              value={sort}
              onChange={event => setSort(event.target.value as SortKey)}
              className="h-10 rounded-tag border border-aisle-rule bg-white px-3 text-sm text-ink"
            >
              <option value="nombre">Nombre (A–Z)</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
            </select>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="h-10 w-10 rounded-tag border border-aisle-rule bg-white text-ink-muted hover:text-ink flex items-center justify-center"
                aria-label="Actualizar existencias"
                title="Actualizar existencias"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {state === 'offline' || state === 'error' ? (
          <div className="rounded-tag bg-white border border-aisle-rule p-10 text-center">
            <WifiOff className="w-10 h-10 mx-auto text-karen" />
            <h3 className="mt-3 font-tag font-bold text-2xl text-ink">No pudimos cargar los productos</h3>
            <p className="mt-1 text-ink-soft max-w-md mx-auto">
              {errorMessage || 'La tienda no respondió.'} Revisa tu conexión e inténtalo de nuevo.
            </p>
            {onRefresh && (
              <button onClick={onRefresh} className="mt-5 h-11 px-5 rounded-tag bg-ink text-white font-semibold">
                Intentar de nuevo
              </button>
            )}
          </div>
        ) : loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="aspect-[3/4] rounded-tag bg-white border border-aisle-rule animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-tag bg-white border border-aisle-rule p-10 text-center">
            <SearchX className="w-10 h-10 mx-auto text-ink-faint" />
            <h3 className="mt-3 font-tag font-bold text-2xl text-ink">
              {products.length === 0 ? 'Aún no hay productos publicados' : 'No encontramos ese producto'}
            </h3>
            <p className="mt-1 text-ink-soft">
              {products.length === 0
                ? 'Vuelve en unos minutos: la tienda está cargando su catálogo.'
                : 'Prueba con otra palabra o revisa todos los pasillos.'}
            </p>
            {products.length > 0 && (
              <button
                onClick={() => { onSearch?.(''); setOnlyInStock(false); onSelectCategory('Todos'); }}
                className="mt-5 h-11 px-5 rounded-tag border-2 border-ink text-ink font-semibold"
              >
                Ver todos los productos
              </button>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </section>
  );
};
