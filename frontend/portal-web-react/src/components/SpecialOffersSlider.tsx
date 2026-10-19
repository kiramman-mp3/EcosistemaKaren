import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Calendar, Tag, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { FlashOffer } from '../types';

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

interface SpecialOffersSliderProps {
  realOffers: FlashOffer[];
  onReserveFlashOffer?: (offer: FlashOffer) => void;
  onExploreProducts: () => void;
  onExploreOffers: () => void;
}

export const SpecialOffersSlider: React.FC<SpecialOffersSliderProps> = ({
  realOffers,
  onReserveFlashOffer,
  onExploreProducts,
  onExploreOffers,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Combinamos las ofertas de fechas especiales con las ofertas reales más destacadas
  const slides = SPECIAL_DATE_OFFERS;
  const totalSlides = slides.length;

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(handleNext, 6000);
    return () => clearInterval(interval);
  }, [isPaused, handleNext]);

  const currentSlide = slides[currentIndex];

  const getThemeClasses = (color: SpecialEventOffer['themeColor']) => {
    switch (color) {
      case 'karen':
        return {
          badgeBg: 'bg-karen text-white',
          borderAccent: 'border-karen/20 dark:border-red-900/40',
          gradientBg: 'from-karen-tint/40 via-white to-sticker/30 dark:from-red-950/30 dark:via-slate-900 dark:to-slate-900',
          buttonBg: 'bg-karen hover:bg-karen-deep text-white',
        };
      case 'emerald':
        return {
          badgeBg: 'bg-emerald-600 text-white',
          borderAccent: 'border-emerald-200 dark:border-emerald-900/40',
          gradientBg: 'from-emerald-50 via-white to-emerald-100/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900',
          buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      case 'amber':
        return {
          badgeBg: 'bg-amber-500 text-ink dark:text-slate-950 font-bold',
          borderAccent: 'border-amber-200 dark:border-amber-900/40',
          gradientBg: 'from-amber-50 via-white to-amber-100/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'indigo':
        return {
          badgeBg: 'bg-indigo-600 text-white',
          borderAccent: 'border-indigo-200 dark:border-indigo-900/40',
          gradientBg: 'from-indigo-50 via-white to-indigo-100/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900',
          buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        };
      default:
        return {
          badgeBg: 'bg-ink text-white',
          borderAccent: 'border-aisle-rule dark:border-slate-800',
          gradientBg: 'from-aisle via-white to-aisle dark:from-slate-900 dark:via-slate-900 dark:to-slate-800',
          buttonBg: 'bg-ink hover:bg-ink-soft text-white',
        };
    }
  };

  const currentStyles = getThemeClasses(currentSlide.themeColor);

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4"
      aria-label="Carrusel de ofertas especiales de temporada"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative rounded-2xl border border-aisle-rule dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft overflow-hidden">
        {/* Encabezado superior del slider */}
        <div className="bg-aisle dark:bg-slate-800/80 px-6 py-2.5 border-b border-aisle-rule dark:border-slate-700 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-ink-soft dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-karen" />
            <span className="font-semibold text-ink dark:text-white uppercase tracking-wider">Temporada de Ahorro Supermercados Karen</span>
            <span className="hidden sm:inline text-ink-muted dark:text-slate-400">·</span>
            <span className="hidden sm:inline text-ink-muted dark:text-slate-400">Ofertas programadas y por caducidad controlada</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-muted dark:text-slate-400 font-tag font-bold">
              0{currentIndex + 1} / 0{totalSlides}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                aria-label="Oferta anterior"
                className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 border border-aisle-rule dark:border-slate-600 flex items-center justify-center text-ink dark:text-white hover:bg-ink hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Siguiente oferta"
                className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 border border-aisle-rule dark:border-slate-600 flex items-center justify-center text-ink dark:text-white hover:bg-ink hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido de la diapositiva */}
        <div className={`p-6 sm:p-10 bg-gradient-to-br ${currentStyles.gradientBg} transition-all duration-500`}>
          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-tag font-bold uppercase tracking-wider ${currentStyles.badgeBg}`}>
                  <Flame className="w-3.5 h-3.5" />
                  {currentSlide.badge}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/90 dark:bg-slate-800/90 text-ink-soft dark:text-slate-200 border border-aisle-rule dark:border-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-karen" />
                  {currentSlide.dateRange}
                </span>
              </div>

              <h2 className="font-tag font-bold text-ink dark:text-white text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight">
                {currentSlide.eventName}
              </h2>
              <p className="mt-3 text-base sm:text-lg text-ink-soft dark:text-slate-200 leading-relaxed max-w-[55ch]">
                {currentSlide.tagline}. {currentSlide.description}
              </p>

              {/* Lista de productos destacados del evento */}
              <div className="mt-6">
                <span className="block text-xs font-tag font-bold text-ink dark:text-slate-200 uppercase tracking-wider mb-2">
                  Destacados en esta fecha:
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentSlide.featuredProducts.map((prod, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm border border-aisle-rule dark:border-slate-700 px-3 py-1.5 rounded-tag text-xs font-semibold text-ink dark:text-white"
                    >
                      <Tag className="w-3 h-3 text-karen" />
                      {prod}
                    </span>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={onExploreOffers}
                  className={`h-11 px-6 rounded-tag font-semibold flex items-center gap-2 shadow-soft transition-colors ${currentStyles.buttonBg}`}
                >
                  <span>Ver ofertas disponibles</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onExploreProducts}
                  className="h-11 px-5 rounded-tag border border-ink/20 dark:border-slate-600 bg-white/80 dark:bg-slate-800 text-ink dark:text-white font-semibold hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  Explorar catálogo completo
                </button>
              </div>
            </div>

            {/* Columna derecha: Tarjeta visual de producto / Garantía FEFO */}
            <div className="relative">
              <div className="bg-white dark:bg-slate-800/95 rounded-xl p-6 border border-aisle-rule dark:border-slate-700 shadow-lift relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-karen bg-karen-tint dark:bg-red-950/60 dark:text-red-300 px-2.5 py-0.5 rounded-full">
                    Garantía FEFO
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-aisle dark:bg-slate-700 flex items-center justify-center p-2 border border-aisle-rule dark:border-slate-600 shrink-0">
                    <img
                      src={currentSlide.imageUrl}
                      alt={currentSlide.eventName}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23F4F5F7"/><text x="50" y="55" font-family="Arial" font-size="12" fill="%238C96A8" text-anchor="middle">Karen</text></svg>';
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-ink-muted dark:text-slate-400">{currentSlide.category}</span>
                    <h3 className="font-tag font-bold text-ink dark:text-white text-base leading-snug">
                      Reserva web y retira en caja
                    </h3>
                    <span className="text-xs text-ink-soft dark:text-slate-300">10 minutos de stock reservado</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-aisle-rule dark:border-slate-700 pt-4 text-xs text-ink-soft dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Lotes auditados con fecha de vencimiento real</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Descuentos con aprobación gerencial directa</span>
                  </div>
                </div>

                {realOffers.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-aisle-rule dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink dark:text-white">
                      ⚡ {realOffers.length} ofertas flash vivas hoy
                    </span>
                    <button
                      onClick={() => {
                        if (onReserveFlashOffer && realOffers[0]) {
                          onReserveFlashOffer(realOffers[0]);
                        } else {
                          onExploreOffers();
                        }
                      }}
                      className="text-xs font-tag font-bold text-karen hover:underline flex items-center gap-1"
                    >
                      Aprovechar
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores inferiores (Dots) */}
        <div className="bg-white dark:bg-slate-900 px-6 py-3 border-t border-aisle-rule dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Ir a la diapositiva ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-8 bg-karen' : 'w-2 bg-ink-faint hover:bg-ink-muted'
                }`}
              />
            ))}
          </div>

          <span className="text-xs text-ink-muted dark:text-slate-400 hidden sm:inline">
            Avanza automáticamente cada 6 segundos · Pausa al pasar el cursor
          </span>
        </div>
      </div>
    </section>
  );
};
