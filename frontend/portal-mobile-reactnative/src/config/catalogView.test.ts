import type { FlashOffer, Product } from '../types';
import { offersByProduct, sortForQuickFilter, visibleProducts } from './catalogView';

const product = (id: string, overrides: Partial<Product> = {}): Product => ({
  id, name: `Producto ${id}`, category: 'Lácteos', price: 2, stock: 5, image: null, ...overrides,
});
const offer = (productId: string, price: number): FlashOffer => ({
  id: `o-${productId}-${price}`, productId, price, originalPrice: price + 1, title: '', category: '', discountBadge: '',
  aiBadge: false, urgencyBadge: '', stockTotal: 1, stockAvailable: 1, expiryText: '', image: null,
});
const base = { offers: [] as FlashOffer[], selectedCategory: 'Todos', onlyInStock: false, quickFilter: 'todos' as const, sort: 'nombre' as const, query: '' };
const ids = (list: Product[]) => list.map(p => p.id);

describe('visibleProducts', () => {
  const products = [
    product('b', { name: 'Beta', price: 3 }),
    product('a', { name: 'Álamo', price: 5 }),
    product('c', { name: 'Cacao', price: 1, stock: 0 }),
  ];

  test('ordena por nombre (con tildes) y por precio', () => {
    expect(ids(visibleProducts({ ...base, products }))).toEqual(['a', 'b', 'c']);
    expect(ids(visibleProducts({ ...base, products, sort: 'precio-asc' }))).toEqual(['c', 'b', 'a']);
    expect(ids(visibleProducts({ ...base, products, sort: 'precio-desc' }))).toEqual(['a', 'b', 'c']);
  });

  test('el precio de una oferta cuenta para ordenar', () => {
    const offers = [offer('a', 0.5)];
    expect(ids(visibleProducts({ ...base, products, offers, sort: 'precio-asc' }))).toEqual(['a', 'c', 'b']);
  });

  test('"En oferta" deja solo los productos con oferta', () => {
    const offers = [offer('b', 2.5), offer('b', 2), offer('zzz', 1)];
    expect(ids(visibleProducts({ ...base, products, offers, quickFilter: 'ofertas' }))).toEqual(['b']);
    expect(offersByProduct(offers).get('b')?.price).toBe(2);
  });

  test('combina categoría, stock y búsqueda sin tildes', () => {
    expect(ids(visibleProducts({ ...base, products, onlyInStock: true }))).toEqual(['a', 'b']);
    expect(ids(visibleProducts({ ...base, products, query: 'alamo' }))).toEqual(['a']);
    expect(ids(visibleProducts({ ...base, products, selectedCategory: 'Otra' }))).toEqual([]);
  });

  test('"Más vendidos" y "Nuevos" filtran por insignia y ordenan por su criterio', () => {
    const list = [
      product('x', { isBestSeller: true, soldLast30d: 3, isNew: true, createdAt: '2026-10-01T00:00:00Z' }),
      product('y', { isBestSeller: true, soldLast30d: 9, isNew: true, createdAt: '2026-10-09T00:00:00Z' }),
      product('z'),
    ];
    expect(ids(visibleProducts({ ...base, products: list, quickFilter: 'mas-vendidos', sort: 'mas-vendidos' }))).toEqual(['y', 'x']);
    expect(ids(visibleProducts({ ...base, products: list, quickFilter: 'nuevos', sort: 'nuevos' }))).toEqual(['y', 'x']);
  });
});

describe('sortForQuickFilter', () => {
  test('"Más vendidos" y "Nuevos" fijan su orden; los demás filtros lo devuelven a nombre solo si venía de ellos', () => {
    expect(sortForQuickFilter('mas-vendidos', 'nombre')).toBe('mas-vendidos');
    expect(sortForQuickFilter('nuevos', 'precio-asc')).toBe('nuevos');
    expect(sortForQuickFilter('todos', 'nuevos')).toBe('nombre');
    expect(sortForQuickFilter('ofertas', 'precio-desc')).toBe('precio-desc');
  });
});
