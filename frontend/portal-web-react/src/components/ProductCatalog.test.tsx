import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductCatalog } from './ProductCatalog';

describe('ProductCatalog', () => {
  it('destaca una promoción IA aprobada y usa su flujo de reserva', () => {
    const reserveOffer = vi.fn();
    const offer = {
      id: 'promo-1',
      title: 'Oferta especial de yogurt',
      category: 'Liquidación FEFO',
      discountBadge: '-50%',
      aiBadge: true,
      urgencyBadge: '¡44 disponibles!',
      price: 1.25,
      originalPrice: 2.5,
      stockTotal: 50,
      stockAvailable: 44,
      expiryText: 'Caduca: 14/10/2026',
      image: '/yogurt.jpg',
      loteId: 'lot-1',
      productId: 'product-1',
    };

    render(<ProductCatalog
      products={[{
        id: 'product-1', name: 'Yogurt', category: 'Lácteos', price: 2.5,
        stock: 44, image: '/yogurt.jpg', unit: 'Unidad',
      }]}
      categories={['Todos', 'Lácteos']}
      selectedCategory="Todos"
      onSelectCategory={() => {}}
      onAddToCart={() => {}}
      onOpenCart={() => {}}
      cartCount={0}
      state="ready"
      offers={[offer]}
      onReserveOffer={reserveOffer}
    />);

    expect(screen.getByText('-50%')).toBeInTheDocument();
    expect(screen.queryByText('Gemini IA')).not.toBeInTheDocument();
    expect(screen.getByLabelText('$1.25')).toBeInTheDocument();
    expect(screen.getByLabelText('Antes $2.50')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar Yogurt a mi lista' }));
    expect(reserveOffer).toHaveBeenCalledWith(offer);
  });

  it('oculta la etiqueta de categoría al entrar en un filtro específico', () => {
    render(<ProductCatalog
      products={[{
        id: 'product-1', name: 'Yogurt', category: 'Lácteos', price: 2.5,
        stock: 44, image: '/yogurt.jpg', unit: 'Unidad', badge: 'Lácteos',
      }]}
      categories={['Todos', 'Lácteos']}
      selectedCategory="Lácteos"
      onSelectCategory={() => {}}
      onAddToCart={() => {}}
      onOpenCart={() => {}}
      cartCount={0}
      state="ready"
    />);

    const card = screen.getByRole('heading', { name: 'Yogurt' }).closest('article')!;
    expect(within(card).queryByText('Lácteos')).not.toBeInTheDocument();
  });
});

describe('ProductCatalog sin stock', () => {
  it('no permite agregar un producto agotado', () => {
    const onAdd = vi.fn();
    render(<ProductCatalog
      products={[{ id: 'p-0', name: 'Atún agotado', category: 'Enlatados', price: 1.5, stock: 0, image: '/a.jpg' }]}
      categories={['Todos', 'Enlatados']}
      selectedCategory="Todos"
      onSelectCategory={() => {}}
      onAddToCart={onAdd}
      onOpenCart={() => {}}
      cartCount={0}
      state="ready"
    />);
    const button = screen.getByRole('button', { name: 'Agregar Atún agotado a mi lista' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('busca sin distinguir tildes', () => {
    render(<ProductCatalog
      products={[
        { id: 'p-1', name: 'Café Minerva', category: 'Café', price: 5.9, stock: 3, image: '/c.jpg' },
        { id: 'p-2', name: 'Leche Vita', category: 'Lácteos', price: 0.95, stock: 9, image: '/l.jpg' },
      ]}
      categories={['Todos']}
      selectedCategory="Todos"
      onSelectCategory={() => {}}
      onAddToCart={() => {}}
      onOpenCart={() => {}}
      cartCount={0}
      state="ready"
      searchQuery="cafe"
    />);
    expect(screen.getByRole('heading', { name: 'Café Minerva' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Leche Vita' })).not.toBeInTheDocument();
  });

  it('pagina el catálogo completo y cuenta todos los productos', () => {
    const onPageChange = vi.fn();
    const products = Array.from({ length: 50 }, (_, i) => ({
      id: `p-${i}`, name: `Producto ${String(i).padStart(2, '0')}`, category: i < 30 ? 'Granos' : 'Lácteos',
      price: 1.2, stock: 10, image: '/a.jpg',
    }));
    render(<ProductCatalog
      products={products}
      categories={['Todos', 'Granos', 'Lácteos']}
      selectedCategory="Todos"
      onSelectCategory={() => {}}
      onAddToCart={() => {}}
      onOpenCart={() => {}}
      cartCount={0}
      state="ready"
      currentPage={0}
      pageSize={24}
      onPageChange={onPageChange}
    />);

    expect(screen.getByText('50 productos')).toBeInTheDocument();
    expect(screen.getByText('(50 productos en total)')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(24);
    const aisles = screen.getByRole('navigation', { name: 'Pasillos' });
    expect(within(aisles).getByRole('button', { name: /Lácteos\s*20/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('filtra en oferta sobre todo el catálogo, no solo la página visible', () => {
    const products = Array.from({ length: 30 }, (_, i) => ({
      id: `p-${i}`, name: `Producto ${String(i).padStart(2, '0')}`, category: 'Granos', price: 2, stock: 5, image: '/a.jpg',
    }));
    const offer = {
      id: 'promo-29', title: 'Oferta', category: 'Granos', discountBadge: '-20%', aiBadge: true, urgencyBadge: '',
      price: 1.6, originalPrice: 2, stockTotal: 5, stockAvailable: 5, expiryText: '', image: '/a.jpg',
      loteId: 'lot-29', productId: 'p-29',
    };
    render(<ProductCatalog
      products={products}
      categories={['Todos', 'Granos']}
      selectedCategory="Todos"
      onSelectCategory={() => {}}
      onAddToCart={() => {}}
      onOpenCart={() => {}}
      cartCount={0}
      state="ready"
      offers={[offer]}
      currentPage={0}
      pageSize={24}
      onPageChange={() => {}}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'En oferta' }));
    expect(screen.getByText('1 producto')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Producto 29' })).toBeInTheDocument();
  });

  it('filtra y ordena por más vendidos y nuevos, con insignia solo para quien tiene datos', () => {
    const base = { category: 'Granos', price: 1, stock: 5, image: '/a.jpg' };
    const products = [
      { ...base, id: 'top', name: 'Arroz top', soldLast30d: 90, isBestSeller: true },
      { ...base, id: 'nuevo', name: 'Avena nueva', createdAt: '2026-10-24T10:00:00Z', isNew: true },
      { ...base, id: 'normal', name: 'Azúcar normal', soldLast30d: 3, createdAt: '2025-01-01T00:00:00Z' },
    ];
    render(<ProductCatalog
      products={products}
      categories={['Todos', 'Granos']}
      selectedCategory="Todos"
      onSelectCategory={() => {}}
      onAddToCart={() => {}}
      onOpenCart={() => {}}
      cartCount={0}
      state="ready"
      onPageChange={() => {}}
    />);

    expect(screen.getAllByText('Más vendido')).toHaveLength(1);
    expect(screen.getAllByText('Nuevo')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Más vendidos' }));
    expect(screen.getAllByRole('article').map(card => within(card).getByRole('heading').textContent)).toEqual(['Arroz top']);

    fireEvent.click(screen.getByRole('button', { name: 'Nuevos' }));
    expect(screen.getAllByRole('article').map(card => within(card).getByRole('heading').textContent)).toEqual(['Avena nueva']);

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    fireEvent.change(screen.getByLabelText('Ordenar productos'), { target: { value: 'mas-vendidos' } });
    expect(screen.getAllByRole('article').map(card => within(card).getByRole('heading').textContent))
      .toEqual(['Arroz top', 'Azúcar normal', 'Avena nueva']);
    fireEvent.change(screen.getByLabelText('Ordenar productos'), { target: { value: 'nuevos' } });
    expect(screen.getAllByRole('article').map(card => within(card).getByRole('heading').textContent))
      .toEqual(['Avena nueva', 'Azúcar normal', 'Arroz top']);
  });
});
