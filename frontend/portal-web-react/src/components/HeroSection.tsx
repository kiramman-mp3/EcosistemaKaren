import React from 'react';
import { ArrowRight, CheckCircle2, ShoppingBag, ShieldCheck, Clock } from 'lucide-react';
import { NavTab } from '../types';

interface HeroSectionProps {
  onNavigate: (tab: NavTab) => void;
  onOpenPassPreview: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onOpenPassPreview }) => {
  return (
    <section className="relative pt-6 pb-16 md:pt-12 md:pb-24 overflow-hidden bg-gradient-to-b from-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Tag Pill: ✨ Nuevo sistema de reservas */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-100 text-karenRed text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="text-sm">✨</span>
              <span>Nuevo sistema de reservas</span>
            </div>

            {/* Bicolor Big Title: "El placer de" (Azul) "comprar local" (Rojo) */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight leading-[1.1]">
              <span className="text-navy">El placer de </span>
              <br className="hidden sm:inline" />
              <span className="text-karenRed drop-shadow-sm">comprar local</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 max-w-xl font-normal leading-relaxed">
              Reserva tus productos frescos favoritos en línea con garantía anti-overbooking. 
              Bloqueamos tu stock en tiempo real en la tienda física para que retires en caja 
              en menos de 15 minutos, sin filas ni sobreventas.
            </p>

            {/* CTAs: [Explorar tienda] & [Ver ofertas →] */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onNavigate('productos')}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-base font-bold text-white bg-karenRed hover:bg-karenRed-hover active:scale-98 shadow-glow-red transition-all"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Explorar tienda</span>
              </button>

              <button
                onClick={() => onNavigate('ofertas')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold text-navy hover:text-karenRed bg-white hover:bg-slate-50 border border-slate-200 active:scale-98 transition-all shadow-sm"
              >
                <span>Ver ofertas</span>
                <ArrowRight className="w-4 h-4 text-karenRed" />
              </button>
            </div>

            {/* Numerical KPIs: 4,200+ Productos | 98% Sin overbooking | 15 min Retiro express */}
            <div className="pt-8 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-lg">
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-display font-black text-navy">
                  4,200+
                </div>
                <div className="text-xs sm:text-sm text-slate-500 font-medium">
                  Productos
                </div>
              </div>

              <div className="space-y-1 border-l border-slate-200 pl-4">
                <div className="text-2xl sm:text-3xl font-display font-black text-navy flex items-center gap-1">
                  <span>98%</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 hidden sm:inline" />
                </div>
                <div className="text-xs sm:text-sm text-slate-500 font-medium">
                  Sin overbooking
                </div>
              </div>

              <div className="space-y-1 border-l border-slate-200 pl-4">
                <div className="text-2xl sm:text-3xl font-display font-black text-navy flex items-center gap-1">
                  <span>15 min</span>
                  <Clock className="w-4 h-4 text-karenRed hidden sm:inline" />
                </div>
                <div className="text-xs sm:text-sm text-slate-500 font-medium">
                  Retiro express
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual (Estante de vegetales + Badges Flotantes) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Main Image Card */}
              <div className="relative rounded-3xl overflow-hidden shadow-card border-4 border-white bg-slate-100 aspect-[4/3] sm:aspect-[1/1] object-cover group">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80"
                  alt="Estante de vegetales frescos y frutas en Supermercado Karen"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                
                {/* Subtle dark gradient overlay at top/bottom for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>

                {/* Badge superpuesto: '-40% Oferta hoy' */}
                <div className="absolute top-4 left-4 bg-karenRed text-white px-3.5 py-1.5 rounded-xl font-display font-extrabold text-sm shadow-glow-red flex items-center gap-1.5">
                  <span>-40%</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">Oferta hoy</span>
                </div>
              </div>

              {/* Floating Card with Checkmark: 'Stock confirmado - Reserva #KR-X7Y9Z2' */}
              <div 
                onClick={onOpenPassPreview}
                className="absolute -bottom-6 sm:-bottom-8 left-2 sm:-left-6 right-2 sm:right-auto bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-card border border-slate-100 flex items-center gap-3.5 hover:scale-102 transition-transform cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Tiempo Real
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  </div>
                  <h4 className="text-sm font-bold text-navy">
                    Stock confirmado
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Reserva <span className="font-bold text-karenRed">#KR-X7Y9Z2</span>
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
