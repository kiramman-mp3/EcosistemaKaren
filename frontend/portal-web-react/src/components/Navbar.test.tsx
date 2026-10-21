import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';
import { ThemeProvider } from '../context/ThemeContext';

function renderNavbar(props: Partial<React.ComponentProps<typeof Navbar>> = {}) {
  const onTabChange = vi.fn();
  render(
    <Navbar
      activeTab="inicio"
      onTabChange={onTabChange}
      cartCount={0}
      cartTotal={0}
      onOpenCart={vi.fn()}
      onOpenLogin={vi.fn()}
      offersCount={0}
      searchQuery=""
      onSearch={vi.fn()}
      {...props}
    />,
    { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> }
  );
  return { onTabChange };
}

// Hay dos barras "Secciones": la de arriba (desde sm) y la inferior del móvil. El CSS decide cuál se ve.
const bottomBar = () => screen.getAllByRole('navigation', { name: 'Secciones' }).find(nav => nav.className.includes('fixed'))!;

describe('Navbar: barra inferior móvil', () => {
  it('ofrece las cuatro secciones y navega al tocarlas', () => {
    const { onTabChange } = renderNavbar();
    const bar = within(bottomBar());
    for (const name of ['Inicio', 'Productos', 'Por vencer', 'Mis reservas']) {
      expect(bar.getByRole('button', { name })).toBeInTheDocument();
    }
    fireEvent.click(bar.getByRole('button', { name: 'Mis reservas' }));
    expect(onTabChange).toHaveBeenCalledWith('reservas');
  });

  it('marca la sección activa', () => {
    renderNavbar({ activeTab: 'productos' });
    const bar = within(bottomBar());
    expect(bar.getByRole('button', { name: 'Productos' })).toHaveAttribute('aria-current', 'page');
    expect(bar.getByRole('button', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
  });

  it('muestra el número de ofertas y avisa de una reserva vigente', () => {
    renderNavbar({ offersCount: 7, hasActivePass: true });
    const bar = within(bottomBar());
    expect(bar.getByRole('button', { name: /Por vencer/ })).toHaveTextContent('7');
    expect(bar.getByRole('button', { name: /Mis reservas/ })).toHaveTextContent('1');
  });

  it('sin ofertas ni reserva no muestra insignias', () => {
    renderNavbar();
    const bar = within(bottomBar());
    expect(bar.getByRole('button', { name: 'Por vencer' })).not.toHaveTextContent(/\d/);
    expect(bar.getByRole('button', { name: 'Mis reservas' })).not.toHaveTextContent(/\d/);
  });
});

describe('Navbar: indicador de sesión en móvil', () => {
  const user = { id: 'u1', nombre: 'Ana María López', email: 'ana@example.com', rol: 'CLIENTE' };

  it('con sesión muestra el nombre y abre "Tu cuenta"', () => {
    const onOpenAccount = vi.fn();
    renderNavbar({ user, onOpenAccount });
    const chip = screen.getByRole('button', { name: 'Tu cuenta, Ana María López' });
    expect(chip).toHaveTextContent('Ana');
    expect(chip).not.toHaveTextContent('López');
    fireEvent.click(chip);
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });

  it('sin sesión ofrece Ingresar y no muestra el chip', () => {
    renderNavbar();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tu cuenta/ })).toBeNull();
  });
});
