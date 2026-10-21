import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountModal } from './AccountModal';

const user = { nombre: 'Ana María López', email: 'ana@example.com' };

describe('AccountModal', () => {
  it('no se muestra cerrado ni sin usuario', () => {
    const { rerender } = render(<AccountModal isOpen={false} onClose={vi.fn()} user={user} onLogout={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<AccountModal isOpen onClose={vi.fn()} user={null} onLogout={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('muestra quién tiene la sesión y permite cerrarla', () => {
    const onLogout = vi.fn();
    render(<AccountModal isOpen onClose={vi.fn()} user={user} onLogout={onLogout} />);
    expect(screen.getByRole('dialog', { name: 'Tu cuenta' })).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Hola, Ana María López.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('se cierra con Escape', () => {
    const onClose = vi.fn();
    render(<AccountModal isOpen onClose={onClose} user={user} onLogout={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
