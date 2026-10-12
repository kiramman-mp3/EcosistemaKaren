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

    fireEvent.click(screen.getByRole('button', { name: 'Añadir oferta al carrito' }));
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
});
