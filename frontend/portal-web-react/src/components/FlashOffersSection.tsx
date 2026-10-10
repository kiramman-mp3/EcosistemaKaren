import React, { useState } from 'react';
import { Sparkles, Flame, ShieldAlert, Check, Clock, RefreshCw, AlertCircle, Bot } from 'lucide-react';
import { DataLoadState, FlashOffer } from '../types';

interface FlashOffersSectionProps {
  onReserveOffer: (offer: FlashOffer) => void;
  offers: FlashOffer[];
  state: DataLoadState;
  errorMessage?: string | null;
  onRefresh?: () => void;
  onGenerateGeminiPromo?: () => void;
  isGenerating?: boolean;
}

export const FlashOffersSection: React.FC<FlashOffersSectionProps> = ({
  onReserveOffer,
  offers,
  state,
  errorMessage,
  onRefresh,
  onGenerateGeminiPromo,
  isGenerating = false,
}) => {
  const [reservedOfferId, setReservedOfferId] = useState<string | null>(null);

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
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white">
                <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
                <span>Liquidación Inteligente FEFO</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight leading-tight">
                Precios que vuelan 🔥
              </h2>
              <p className="text-white/90 text-sm sm:text-base font-normal">
                Nuestra Inteligencia Artificial Gemini analiza fechas de vencimiento próximas y lotes en percha 
                para generar descuentos dinámicos y evitar el desperdicio de alimentos.
              </p>

              {onGenerateGeminiPromo && (
                <div className="pt-2">
                  <button
                    onClick={onGenerateGeminiPromo}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy font-bold text-xs rounded-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-navy" />
                        <span>Consultando Gemini IA en Backend...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 text-karenRed" />
                        <span>Generar Oferta Dinámica con IA</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Widget Contador: PRÓXIMA RENOVACIÓN */}
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 text-center flex-shrink-0 min-w-[200px] shadow-lg">
              <span className="text-[11px] font-black uppercase tracking-widest text-red-200 block mb-1">
                ESTADO DEL CATÁLOGO
              </span>
              <div className="text-lg font-black text-white tracking-wide">
                DATOS EN TIEMPO REAL
              </div>
              <span className="text-[10px] text-white/70 block mt-1">
                Ofertas dinámicas por lote
              </span>
            </div>

          </div>
        </div>

        {(state === 'offline' || state === 'error') && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h3 className="font-bold text-amber-900">Ofertas no disponibles</h3>
            <p className="mt-1 text-sm text-amber-700">{errorMessage || 'No fue posible consultar el servidor.'}</p>
            {onRefresh && <button onClick={onRefresh} className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white">Reintentar</button>}
          </div>
        )}
        {state === 'empty' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <h3 className="font-bold text-navy">No hay ofertas activas</h3>
            <p className="mt-1 text-sm text-slate-500">El servidor respondió correctamente, pero no existen promociones aprobadas y vigentes.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {state === 'ready' && offers.map((offer) => {
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
                      {/* Discount Tag */}
                      <span className="bg-karenRed text-white px-3 py-1 rounded-xl text-xs font-black shadow-glow-red tracking-wider">
                        {offer.discountBadge}
                      </span>

                      {/* IA Tag */}
                      {offer.aiBadge && (
                        <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-2.5 py-1 rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>Gemini IA</span>
                        </span>
                      )}
                    </div>

                    {/* Urgency Badge */}
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
                  </div>

                  {/* Barra de Progreso de Stock Disponible */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Stock en percha:</span>
                      <span className="font-mono text-navy font-bold">
                        {offer.stockAvailable} de {offer.stockTotal} un.
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-karenRed h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(stockPercent, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Tag Caducidad Próxima */}
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-karenRed" />
                    <span>{offer.expiryText}</span>
                  </div>
                </div>

                {/* Botón CTA 'Reservar Ahora' */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleReserve(offer)}
                    className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-98 shadow-sm ${
                      isJustReserved
                        ? 'bg-emerald-600 text-white shadow-soft'
                        : 'bg-karenRed hover:bg-karenRed-hover text-white shadow-glow-red'
                    }`}
                  >
                    {isJustReserved ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>¡Pase PIN Generado!</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" />
                        <span>Reservar Oferta Flash (10 min)</span>
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
