import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MyReservationsPage } from './MyReservationsPage';

const pending = {
  id: 'res-1', usuarioId: 'user-1', codigoRetiro: 'KR-LIVE01', estado: 'PENDIENTE' as const,
  fechaExpiracion: new Date(Date.now() + 300000).toISOString(),
  detalles: [{ loteId: 'lot-1', cantidad: 2, precioUnitario: 1.25 }],
};

const baseProps = {
  authenticated: true,
  reservations: [pending],
  syncing: false,
  onRefresh: async () => {},
  onCancel: async () => {},
  onOpenPass: () => {},
  onLogin: () => {},
  onExplore: () => {},
};

describe('MyReservationsPage', () => {
  it('muestra historial y permite abrir el pase vigente', () => {
    const onOpenPass = vi.fn();
    render(<MyReservationsPage {...baseProps} onOpenPass={onOpenPass} />);
    expect(screen.getByText('KR-LIVE01')).toBeInTheDocument();
    expect(screen.getByText(/Total reservado/)).toHaveTextContent('$2.50');
    fireEvent.click(screen.getByText('Ver pase QR'));
    expect(onOpenPass).toHaveBeenCalledWith(pending);
  });

  it('confirma y ejecuta la cancelación', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onCancel = vi.fn().mockResolvedValue(undefined);
    render(<MyReservationsPage {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancelar reserva'));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith('res-1'));
  });
});
