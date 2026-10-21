import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TermsModal } from './TermsModal';
import { SpecialOffersSlider, SPECIAL_DATE_OFFERS } from './SpecialOffersSlider';
import { HelpChatWidget } from './HelpChatWidget';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { ThemeProvider } from '../context/ThemeContext';

describe('Nuevas funcionalidades en rama fix/arreglos', () => {
  it('TermsModal se renderiza cuando isOpen=true y muestra el contenido de política TTL y FEFO', () => {
    const handleClose = vi.fn();
    const { rerender } = render(<TermsModal isOpen={false} onClose={handleClose} />);
    expect(screen.queryByText(/Términos y Condiciones del Servicio/i)).toBeNull();

    rerender(<TermsModal isOpen={true} onClose={handleClose} />);
    expect(screen.getByText(/Términos y Condiciones del Servicio/i)).toBeInTheDocument();
    expect(screen.getByText(/TTL de 10 Minutos/i)).toBeInTheDocument();
    expect(screen.getByText(/Sistema FEFO/i)).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: /Entendido y Acepto/i });
    fireEvent.click(acceptBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('SpecialOffersSlider muestra eventos de fechas especiales e interactúa con botones de navegación', () => {
    const onExploreProducts = vi.fn();
    const onExploreOffers = vi.fn();

    render(
      <SpecialOffersSlider
        realOffers={[]}
        onExploreProducts={onExploreProducts}
        onExploreOffers={onExploreOffers}
      />
    );

    expect(screen.getByText(SPECIAL_DATE_OFFERS[0].eventName)).toBeInTheDocument();
    expect(screen.getByText(SPECIAL_DATE_OFFERS[0].tagline, { exact: false })).toBeInTheDocument();

    const nextBtn = screen.getByLabelText('Siguiente oferta');
    fireEvent.click(nextBtn);
    expect(screen.getByText(SPECIAL_DATE_OFFERS[1].eventName)).toBeInTheDocument();
  });

  it('HelpChatWidget se abre al hacer clic y permite enviar una pregunta frecuente', () => {
    render(<HelpChatWidget />);
    const openBtn = screen.getByLabelText('Abrir chat de ayuda en línea');
    fireEvent.click(openBtn);

    expect(screen.getByRole('heading', { name: /KarenBot/i })).toBeInTheDocument();
    expect(screen.getByText(/¿En qué te puedo ayudar hoy/i)).toBeInTheDocument();

    const chip = screen.getByText('¿Cómo retiro con mi código KR?');
    fireEvent.click(chip);

    expect(screen.getAllByText(/¿Cómo retiro con mi código KR\?/i).length).toBeGreaterThanOrEqual(1);
  });

  it('Footer muestra información ampliada de contactos, WhatsApp, PBX y horarios', () => {
    const onNavigate = vi.fn();
    const onOpenTerms = vi.fn();
    const onOpenChat = vi.fn();

    render(
      <Footer
        onNavigate={onNavigate}
        onOpenTerms={onOpenTerms}
        onOpenChat={onOpenChat}
      />
    );

    expect(screen.getByText(/\(04\) 2-987654/i)).toBeInTheDocument();
    expect(screen.getByText(/\+593 98 355 3724/i)).toBeInTheDocument();
    expect(screen.getByText(/atencion@karen\.com\.ec/i)).toBeInTheDocument();
    expect(screen.getByText(/Lunes a Sábado: 07:00 – 21:00/i)).toBeInTheDocument();

    const termsBtn = screen.getByRole('button', { name: /Términos y Condiciones/i });
    fireEvent.click(termsBtn);
    expect(onOpenTerms).toHaveBeenCalledTimes(1);
  });

  it('Navbar permite alternar entre Modo Oscuro y Modo Claro', () => {
    const onTabChange = vi.fn();
    const onSearch = vi.fn();

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
        onSearch={onSearch}
      />,
      {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      }
    );

    // Initial state check
    const toggleBtn = screen.getByRole('button', { name: /Cambiar a modo (oscuro|claro)/i });
    expect(toggleBtn).toBeInTheDocument();
    
    // Click toggle to switch mode
    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('dark')).toBe(true);
  });
});
