import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByText('$1.25')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();

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

    expect(screen.getByRole('heading', { name: 'Yogurt' })).toBeInTheDocument();
    expect(screen.getAllByText('Lácteos')).toHaveLength(1); // solo permanece el filtro
  });
});
