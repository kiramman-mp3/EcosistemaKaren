import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Calendar, Tag, ShieldCheck, Flame } from 'lucide-react';
import { FlashOffer } from '../types';
import { Button } from './ui/Button';
import { Sticker } from './ui/Sticker';
import { TONE_SOLID, Tone } from '../lib/categoryTone';

export interface SpecialEventOffer {
  id: string;
  eventName: string;
  tagline: string;
  badge: string;
  dateRange: string;
  description: string;
  discountHighlight: string;
  themeColor: 'karen' | 'amber' | 'emerald' | 'indigo' | 'purple';
  imageUrl: string;
  category: string;
  featuredProducts: string[];
}

export const SPECIAL_DATE_OFFERS: SpecialEventOffer[] = [
  {
    id: 'evento-finde-familiar',
    eventName: 'Gran Fin de Semana Familiar',
    tagline: 'Ahorro garantizado para llenar la despensa del hogar',
    badge: 'Hasta 40% OFF',
    dateRange: 'Viernes a Domingo',
    description: 'Precios especiales en cortes de carne seleccionados, embutidos premium y lácteos de alta rotación.',
    discountHighlight: '40% DTO',
    themeColor: 'karen',
    imageUrl: '/api/v1/media/productos/7861000100014.jpg',
    category: 'Lácteos y Derivados',
    featuredProducts: ['Leche Entera Vita 1L', 'Queso Mozzarella', 'Yogurt Griego Natural'],
  },
  {
    id: 'evento-martes-frescura',
    eventName: 'Martes y Jueves de Frescura',
    tagline: 'Cero merma: productos frescos de cosecha nacional con FEFO',
    badge: '30% en Frutas y Granos',
    dateRange: 'Martes y Jueves de cada semana',
    description: 'Descuentos automáticos en avenas andinas, frutos secos, arándanos y frutas de temporada.',
    discountHighlight: '30% DTO',
    themeColor: 'emerald',
    imageUrl: '/api/v1/media/productos/7861007250491.jpg',
    category: 'Cereales, Avenas y Granolas',
    featuredProducts: ['Avena Orgánica Schullo', 'Almendras Peladas', 'Mix Frutos Secos'],
  },
  {
    id: 'evento-temporada-lonchera',
    eventName: 'Especial Temporada Escolar & Snacks',
    tagline: 'Nutrición práctica para los más pequeños a precio de bodega',
    badge: 'Combos 3x2 y 25% OFF',
    dateRange: 'Válido durante todo el mes',
    description: 'Galletas seleccionadas, néctares naturales y cereales en formatos de ahorro familiar.',
    discountHighlight: '25% DTO',
    themeColor: 'amber',
    imageUrl: '/api/v1/media/productos/7702103019165.jpg',
    category: 'Galletas y Snacks',
    featuredProducts: ['All-Bran Kellogg\'s', 'Galletas Avena & Miel', 'Bebidas de Avena Gustalac'],
  },
  {
    id: 'evento-despensa-atun',
    eventName: 'Festival del Atún y Conservas',
    tagline: 'Lomitos ecuatorianos en agua y aceite de oliva sin IVA (0%)',
    badge: 'Precio Mayorista',
    dateRange: 'Oferta de Temporada',
    description: 'Lomitos Real y Van Camp\'s con tarifa especial anti-inflación para canasta básica.',
    discountHighlight: 'Tarifa 0% IVA',
    themeColor: 'indigo',
    imageUrl: '/api/v1/media/productos/7862100604648.jpg',
    category: 'Enlatados y Conservas',
    featuredProducts: ['Atún Real Lomitos en Aceite', 'Van Camp\'s Girasol', 'Arvejitas Facundo'],
  },
];

const SLIDE_TONE: Record<SpecialEventOffer['themeColor'], Tone> = {
  karen: 'karen',
  emerald: 'aguacate',
  amber: 'naranja',
  indigo: 'guayaba',
  purple: 'limon',
};

interface SpecialOffersSliderProps {
  realOffers: FlashOffer[];
  onReserveFlashOffer?: (offer: FlashOffer) => void;
  onExploreProducts: () => void;
  onExploreOffers: () => void;
}

/**
 * Campañas de temporada. Avanza solo con las flechas o los puntos: en la portada ya hay
 * una secuencia animada y la cinta de ofertas, y una tercera cosa en movimiento compite.
 */
export const SpecialOffersSlider: React.FC<SpecialOffersSliderProps> = ({
  realOffers,
  onReserveFlashOffer,
  onExploreProducts,
  onExploreOffers,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = SPECIAL_DATE_OFFERS;
  const totalSlides = slides.length;

  const handleNext = useCallback(() => setCurrentIndex(prev => (prev + 1) % totalSlides), [totalSlides]);
  const handlePrev = useCallback(() => setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides), [totalSlides]);

  const currentSlide = slides[currentIndex];
  const tone = SLIDE_TONE[currentSlide.themeColor];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-14" aria-label="Carrusel de ofertas especiales de temporada">
      <div className="rounded-block border-2 border-mora overflow-hidden bg-surface shadow-pop">
        <div className="px-5 sm:px-6 py-3 border-b-2 border-mora flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="w-4 h-4 text-karen-text" />
            <span className="font-display font-extrabold">Temporada de ahorro</span>
            <span className="hidden sm:inline text-ink-muted">Ofertas programadas por fecha</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-muted font-semibold tabular">{currentIndex + 1} de {totalSlides}</span>
            <button
              onClick={handlePrev}
              aria-label="Oferta anterior"
              className="w-9 h-9 rounded-full border-2 border-mora bg-surface text-ink flex items-center justify-center hover:bg-limon hover:text-mora transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Siguiente oferta"
              className="w-9 h-9 rounded-full border-2 border-mora bg-surface text-ink flex items-center justify-center hover:bg-limon hover:text-mora transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div key={currentSlide.id} className={`p-6 sm:p-10 animate-fade ${TONE_SOLID[tone]}`}>
          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-extrabold bg-mora text-white">
                  <Flame className="w-3.5 h-3.5" />
                  {currentSlide.badge}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-white/85 text-mora">
                  <Calendar className="w-3.5 h-3.5" />
                  {currentSlide.dateRange}
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-[1.02]">{currentSlide.eventName}</h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed max-w-[55ch] font-semibold">
                {currentSlide.tagline}. {currentSlide.description}
              </p>

              <div className="mt-6">
                <span className="block text-sm font-extrabold mb-2">Destacados en esta fecha</span>
                <div className="flex flex-wrap gap-2">
                  {currentSlide.featuredProducts.map(prod => (
                    <span key={prod} className="inline-flex items-center gap-1.5 bg-white/85 text-mora px-3 py-1.5 rounded-full text-sm font-bold">
                      <Tag className="w-3 h-3" />
                      {prod}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button onClick={onExploreOffers} variant="surface" size="lg">Ver ofertas disponibles</Button>
                <Button onClick={onExploreProducts} variant="ghost" size="lg" className="!text-current underline underline-offset-4">
                  Explorar el catálogo
                </Button>
              </div>
            </div>

            <Sticker tilt={-1.5} className="relative bg-surface text-ink p-6">
              <p className="absolute -top-4 right-4 rotate-3 rounded-tag border-2 border-mora bg-limon px-3 py-1 font-display text-sm font-extrabold text-mora shadow-pop-sm">
                Lotes con fecha real
              </p>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-photo bg-white flex items-center justify-center p-2 shrink-0 border-2 border-aisle-rule">
                  <img
                    src={currentSlide.imageUrl}
                    alt={currentSlide.eventName}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-ink-muted">{currentSlide.category}</span>
                  <h3 className="font-display text-base font-extrabold leading-snug">Aparta y retira en caja</h3>
                  <span className="text-xs text-ink-soft">10 minutos de stock guardado</span>
                </div>
              </div>

              <div className="space-y-2 border-t-2 border-aisle-rule pt-4 text-sm text-ink-soft">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-fresh shrink-0" />
                  <span>Lotes auditados con fecha de vencimiento real</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-karen-text shrink-0" />
                  <span>Descuentos aprobados por gerencia</span>
                </div>
              </div>

              {realOffers.length > 0 && (
                <div className="mt-4 pt-3 border-t-2 border-aisle-rule flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">{realOffers.length} ofertas vivas hoy</span>
                  <button
                    onClick={() => {
                      if (onReserveFlashOffer && realOffers[0]) onReserveFlashOffer(realOffers[0]);
                      else onExploreOffers();
                    }}
                    className="text-sm font-extrabold text-karen-text hover:underline flex items-center gap-1"
                  >
                    Aprovechar
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </Sticker>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-3 border-t-2 border-mora flex items-center gap-2">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ir a la diapositiva ${idx + 1}`}
              aria-current={idx === currentIndex}
              className="group flex h-6 min-w-6 items-center justify-center"
            >
              <span
                className={`block h-3 rounded-full border-2 border-mora transition-all duration-300 ${idx === currentIndex ? 'w-10 bg-karen' : 'w-3 bg-surface group-hover:bg-limon'}`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
