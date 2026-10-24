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
  it('muestra una reserva que la tienda aún está confirmando, sin código, y permite cancelarla', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onCancel = vi.fn().mockResolvedValue(undefined);
    const syncing = {
      id: 'res-sync', usuarioId: 'user-1', codigoRetiro: null, estado: 'PENDIENTE_SYNC' as const,
      fechaExpiracion: new Date(Date.now() + 300000).toISOString(), detalles: [],
    };
    render(<MyReservationsPage {...baseProps} reservations={[syncing]} onCancel={onCancel} />);
    expect(screen.getByText('Confirmando…')).toBeInTheDocument();
    expect(screen.getByText('Confirmando')).toBeInTheDocument();
    expect(screen.getByText(/confirmando tu reserva con la tienda/i)).toBeInTheDocument();
    expect(screen.queryByText('Ver pase QR')).not.toBeInTheDocument();
    expect(screen.queryByText(/Total reservado/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancelar reserva'));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith('res-sync'));
  });

  it('muestra el motivo cuando la tienda rechazó la reserva y la agrupa con las canceladas', () => {
    const rejected = {
      id: 'res-rej', usuarioId: 'user-1', codigoRetiro: null, estado: 'RECHAZADA' as const,
      fechaExpiracion: new Date(Date.now() + 300000).toISOString(), detalles: [],
      mensajeRechazo: "Stock insuficiente para 'Leche 1L'.",
    };
    render(<MyReservationsPage {...baseProps} reservations={[rejected]} />);
    expect(screen.getByText("Stock insuficiente para 'Leche 1L'.")).toBeInTheDocument();
    expect(screen.getByText('No disponible')).toBeInTheDocument();
    expect(screen.queryByText('Cancelar reserva')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Por retirar' }));
    expect(screen.queryByText('No disponible')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Canceladas o vencidas' }));
    expect(screen.getByText('No disponible')).toBeInTheDocument();
  });

  it('una reserva pendiente de la tienda cuyo plazo ya venció se muestra como vencida', () => {
    const stale = {
      id: 'res-old', usuarioId: 'user-1', codigoRetiro: null, estado: 'PENDIENTE_SYNC' as const,
      fechaExpiracion: new Date(Date.now() - 1000).toISOString(), detalles: [],
    };
    render(<MyReservationsPage {...baseProps} reservations={[stale]} />);
    expect(screen.getByText('Venció')).toBeInTheDocument();
    expect(screen.queryByText('Cancelar reserva')).not.toBeInTheDocument();
  });
});
