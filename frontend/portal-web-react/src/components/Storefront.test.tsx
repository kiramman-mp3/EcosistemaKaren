import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HeroSection, greetingFor } from './HeroSection';
import { OffersMarquee } from './OffersMarquee';
import { RollingNumber } from './ui/RollingNumber';
import { FlashOffer } from '../types';

const offer = (id: string, name: string, discount: string): FlashOffer => ({
  id,
  title: `Nota de ${name}`,
  category: 'Lácteos y Derivados',
  discountBadge: discount,
  aiBadge: false,
  urgencyBadge: '',
  price: 1.25,
  originalPrice: 2.5,
  stockTotal: 10,
  stockAvailable: 4,
  expiryText: '',
  expiresOn: '2026-10-30',
  productName: name,
  image: '',
});

describe('greetingFor', () => {
  it('usa la hora de Guayaquil (UTC-5)', () => {
    expect(greetingFor(new Date('2026-10-20T14:00:00Z'))).toBe('Buenos días');
    expect(greetingFor(new Date('2026-10-20T20:00:00Z'))).toBe('Buenas tardes');
    expect(greetingFor(new Date('2026-10-21T03:00:00Z'))).toBe('Buenas noches');
  });
});

describe('HeroSection', () => {
  it('saluda por nombre y pega las tres ofertas que vencen primero', () => {
    const offers = [offer('1', 'Yogur', '-40%'), offer('2', 'Pan', '-25%'), offer('3', 'Leche', '-10%'), offer('4', 'Atún', '-5%')];
    const onReserve = vi.fn();
    render(<HeroSection onNavigate={vi.fn()} offers={offers} userName="Paola" onReserveOffer={onReserve} onOpenPass={vi.fn()} />);

    expect(screen.getByText(/Paola\./)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Ofertas que vencen primero' }).children).toHaveLength(3);
    expect(screen.queryByText('Atún')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar Yogur' }));
    expect(onReserve).toHaveBeenCalledWith(offers[0]);
  });

  it('no muestra pegatinas si no hay ofertas', () => {
    render(<HeroSection onNavigate={vi.fn()} offers={[]} onOpenPass={vi.fn()} />);
    expect(screen.queryByRole('list', { name: 'Ofertas que vencen primero' })).not.toBeInTheDocument();
  });
});

describe('OffersMarquee', () => {
  it('no se muestra sin ofertas', () => {
    const { container } = render(<OffersMarquee offers={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('repite la cinta una vez oculta para lectores de pantalla', () => {
    render(<OffersMarquee offers={[offer('1', 'Yogur', '-40%')]} onSelect={vi.fn()} />);
    expect(screen.getAllByText('Yogur')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Ver todas las ofertas por vencer/ })).toBeInTheDocument();
  });
});

describe('RollingNumber', () => {
  it('desplaza cada dígito a su posición', () => {
    const { container } = render(<RollingNumber value={42} />);
    const columns = container.querySelectorAll<HTMLElement>('span[style*="translateY"]');
    expect(columns).toHaveLength(2);
    expect(columns[0].style.transform).toBe('translateY(-4em)');
    expect(columns[1].style.transform).toBe('translateY(-2em)');
  });
});
