import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, Flame, ShieldAlert, Check } from 'lucide-react';
import { FLASH_OFFERS_DATA } from '../data/mockData';
import { FlashOffer } from '../types';

interface FlashOffersSectionProps {
  onReserveOffer: (offer: FlashOffer) => void;
}

export const FlashOffersSection: React.FC<FlashOffersSectionProps> = ({ onReserveOffer }) => {
  // Live Countdown for 'PRÓXIMA RENOVACIÓN' (starting at 02h 34m 17s = 9257s)
  const [renewalSeconds, setRenewalSeconds] = useState(9257);
  const [reservedOfferId, setReservedOfferId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setRenewalSeconds((prev) => (prev > 0 ? prev - 1 : 9257));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const handleReserve = (offer: FlashOffer) => {
    setReservedOfferId(offer.id);
    onReserveOffer(offer);
    setTimeout(() => {
      setReservedOfferId(null);
    }, 1500);
  };

  return (
    <section id="ofertas-section" className="py-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Banner Rojo Superior: Precios que vuelan 🔥 + IA Subtitle + Countdown */}
        <div className="relative rounded-3xl bg-gradient-to-r from-karenRed via-[#E63946] to-[#B91C1C] text-white p-6 sm:p-10 shadow-glow-red overflow-hidden">
          
          {/* Subtle Flame decorative glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Title & IA Subtitle */}
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white">
                <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
                <span>Liquidación Inteligente FEFO</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight leading-tight">
                Precios que vuelan 🔥
              </h2>
              <p className="text-white/90 text-sm sm:text-base font-normal">
                Nuestra Inteligencia Artificial Gemini analiza fechas de vencimiento próximas y genera 
                descuentos masivos para evitar el desperdicio de alimentos. ¡Reserva antes de que se agoten!
              </p>
            </div>

            {/* Widget Contador: PRÓXIMA RENOVACIÓN (02:34:17) */}
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 text-center flex-shrink-0 min-w-[200px] shadow-lg">
              <span className="text-[11px] font-black uppercase tracking-widest text-red-200 block mb-1">
                PRÓXIMA RENOVACIÓN
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-black text-white tracking-widest text-shadow">
                {formatTimer(renewalSeconds)}
              </div>
              <span className="text-[10px] text-white/70 block mt-1">
                Ofertas dinámicas por lote
              </span>
            </div>

          </div>
        </div>

        {/* Grid 2 Columnas de Ofertas Relámpago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FLASH_OFFERS_DATA.map((offer) => {
            const stockPercent = Math.round(
              ((offer.stockTotal - offer.stockAvailable) / offer.stockTotal) * 100
            );
            const isJustReserved = reservedOfferId === offer.id;

            return (
              <div
                key={offer.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft hover:shadow-card transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Photo Container with Floating Badges: [-40%], [✨ IA], [¡Últimas X!] */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[16/9] mb-5">
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Floating Badges Overlay */}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                      {/* Discount Tag [-40%] */}
                      <span className="bg-karenRed text-white px-3 py-1 rounded-xl text-xs font-black shadow-glow-red tracking-wider">
                        {offer.discountBadge}
                      </span>

                      {/* IA Tag [✨ IA] */}
                      {offer.aiBadge && (
                        <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-2.5 py-1 rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>IA</span>
                        </span>
                      )}
                    </div>

                    {/* Urgency Badge [¡Últimas X!] */}
                    <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-amber-300 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border border-amber-300/30">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>{offer.urgencyBadge}</span>
                    </div>
                  </div>

                  {/* Título & Categoría */}
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    {offer.category}
                  </span>
                  <h3 className="text-lg font-bold text-navy leading-snug">
                    {offer.title}
                  </h3>

                  {/* Precio en Rojo Destacado + Tachado Gris */}
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="text-2xl sm:text-3xl font-display font-black text-karenRed">
                      ${offer.price.toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 line-through">
                      ${offer.originalPrice.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Ahorras ${(offer.originalPrice - offer.price).toFixed(2)}
                    </span>
                  </div>

                  {/* Barra de Progreso de Stock Disponible */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Stock reservado: {stockPercent}%</span>
                      <span className="text-karenRed font-bold">
                        ¡Solo {offer.stockAvailable} disponibles!
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-karenRed h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${stockPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Alerta de Caducidad con Reloj: ⏰ Caduca: Hoy, 20:00 */}
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>{offer.expiryText}</span>
                  </div>
                </div>

                {/* Botón Rojo: 'Reservar Stock Ahora' */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleReserve(offer)}
                    className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-karenRed hover:bg-karenRed-hover active:scale-98 transition-all flex items-center justify-center gap-2 shadow-glow-red"
                  >
                    {isJustReserved ? (
                      <>
                        <Check className="w-5 h-5 text-white" />
                        <span>¡Stock Bloqueado con Éxito!</span>
                      </>
                    ) : (
                      <>
                        <span>Reservar Stock Ahora</span>
                        <span className="text-xs opacity-90 font-mono">→</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
