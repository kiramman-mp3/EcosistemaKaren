import type { FlashOffer, Product } from '../types';

// Filtros y orden del catálogo, con las mismas reglas que el portal web.
export type QuickFilter = 'todos' | 'mas-vendidos' | 'nuevos' | 'ofertas';
export type SortKey = 'nombre' | 'precio-asc' | 'precio-desc' | 'mas-vendidos' | 'nuevos';

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const createdTime = (product: Product) => (product.createdAt ? new Date(product.createdAt).getTime() : 0);

/** Si un producto tiene varias ofertas, cuenta la más barata. */
export function offersByProduct(offers: FlashOffer[]): Map<string, FlashOffer> {
  const result = new Map<string, FlashOffer>();
  for (const offer of offers) {
    if (!offer.productId) continue;
    const current = result.get(offer.productId);
    if (!current || offer.price < current.price) result.set(offer.productId, offer);
  }
  return result;
}

/** "Más vendidos" y "Nuevos" también ordenan: al elegirlos, el orden pasa a ser el suyo. */
export function sortForQuickFilter(filter: QuickFilter, current: SortKey): SortKey {
  if (filter === 'mas-vendidos' || filter === 'nuevos') return filter;
  return current === 'mas-vendidos' || current === 'nuevos' ? 'nombre' : current;
}

interface ViewOptions {
  products: Product[];
  offers: FlashOffer[];
  selectedCategory: string;
  onlyInStock: boolean;
  quickFilter: QuickFilter;
  sort: SortKey;
  query: string;
}

export function visibleProducts({ products, offers, selectedCategory, onlyInStock, quickFilter, sort, query }: ViewOptions): Product[] {
  const q = fold(query.trim());
  const onOffer = offersByProduct(offers);
  const priceOf = (product: Product) => onOffer.get(product.id)?.price ?? product.price;
  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'es');

  return products
    .filter(product => (selectedCategory === 'Todos' || product.category === selectedCategory)
      && (!onlyInStock || product.stock > 0)
      && (quickFilter !== 'mas-vendidos' || Boolean(product.isBestSeller))
      && (quickFilter !== 'nuevos' || Boolean(product.isNew))
      && (quickFilter !== 'ofertas' || onOffer.has(product.id))
      && (!q || fold(product.name).includes(q) || fold(product.category).includes(q) || (product.barcode || '').includes(q)))
    .sort((a, b) => {
      if (sort === 'mas-vendidos') return (b.soldLast30d ?? 0) - (a.soldLast30d ?? 0) || byName(a, b);
      if (sort === 'nuevos') return createdTime(b) - createdTime(a) || byName(a, b);
      if (sort === 'precio-asc') return priceOf(a) - priceOf(b) || byName(a, b);
      if (sort === 'precio-desc') return priceOf(b) - priceOf(a) || byName(a, b);
      return byName(a, b);
    });
}
