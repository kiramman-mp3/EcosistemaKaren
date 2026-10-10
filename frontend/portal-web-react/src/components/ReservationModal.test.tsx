import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReservationModal } from './ReservationModal';

const toPng = vi.fn().mockResolvedValue('data:image/png;base64,demo');
vi.mock('html-to-image', () => ({ toPng: (...args: unknown[]) => toPng(...args) }));

describe('ReservationModal', () => {
  it('permite descargar el comprobante como PNG', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ReservationModal isOpen onClose={() => {}} pass={{
      code: 'KR-TEST01', status: 'ACTIVA', initialSeconds: 600, remainingSeconds: 590,
      customerName: 'Cliente', storeLocation: 'Sucursal Matriz', items: [], total: 0,
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar comprobante como imagen' }));
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
