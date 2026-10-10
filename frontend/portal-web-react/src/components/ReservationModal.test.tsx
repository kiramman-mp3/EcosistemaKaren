import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReservationModal } from './ReservationModal';

describe('ReservationModal', () => {
  it('renderiza un QR SVG estándar con el PIN visible', () => {
    const { container } = render(<ReservationModal
      isOpen
      onClose={() => {}}
      pass={{
        code: 'KR-QR1234', status: 'ACTIVA', initialSeconds: 600, remainingSeconds: 600,
        customerName: 'Ana', storeLocation: 'Matriz', items: [], total: 0,
      }}
    />);
    expect(screen.getByText('KR-QR1234')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
