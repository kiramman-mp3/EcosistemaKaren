import React from 'react';
import { ShieldCheck, Lock, KeyRound, Sparkles } from 'lucide-react';

export const AntiOverbookingBanner: React.FC = () => {
  return (
    <section className="py-16 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Deep Navy Curved Card Banner (#1D3557 to #1E3A8A) */}
        <div className="relative rounded-3xl bg-gradient-to-br from-navy via-[#1B3252] to-navy-dark text-white p-8 sm:p-12 lg:p-16 shadow-2xl overflow-hidden border border-white/10">
          
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-karenRed/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Copy & 3 Mini-Features */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Badge: 'Sistema patentado' */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-blue-200 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Sistema patentado</span>
              </div>

              {/* Title & Copy */}
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-white leading-tight">
                  Reservas <span className="text-red-400">anti-overbooking</span> garantizadas
                </h2>
                <p className="text-slate-300 text-base sm:text-lg max-w-xl font-normal leading-relaxed">
                  Al confirmar tu pedido, nuestro motor bloquea inmediatamente las unidades físicas en el inventario de la tienda. Nadie más en el pasillo podrá tomar tu mercadería mientras tu PIN esté vigente.
                </p>
              </div>

              {/* 3 Mini-Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                
                {/* Feature 1: Stock bloqueado */}
                <div className="flex sm:flex-col items-start gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Stock bloqueado</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Descuenta unidades de inmediato en caja y percha.
                    </p>
                  </div>
                </div>

                {/* Feature 2: PIN por tiempo limitado */}
                <div className="flex sm:flex-col items-start gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">PIN por tiempo limitado</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Pase intransferible con cuenta regresiva de 10 min.
                    </p>
                  </div>
                </div>

                {/* Feature 3: Retiro garantizado */}
                <div className="flex sm:flex-col items-start gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Retiro garantizado</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Pago directo en caja SIACI sin colas ni faltantes.
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: explicación sin simular una reserva activa */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 text-slate-900 shadow-2xl border-4 border-white/20 transform hover:scale-102 transition-transform duration-300">
                
                {/* Header of Pass */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-navy flex items-center justify-center text-white text-xs font-bold">
                      SK
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Pase de Retiro
                      </span>
                      <span className="text-xs font-extrabold text-navy">
                        Supermercado Karen
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    AL RESERVAR
                  </div>
                </div>

                <div className="my-5 text-center bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    CÓDIGO PIN CAJA SIACI
                  </span>
                  <span className="font-mono text-2xl sm:text-3xl font-black text-navy tracking-widest selection:bg-karenRed/20">
                    SE GENERA AL RESERVAR
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center my-4 bg-slate-900 rounded-2xl p-4 shadow-inner">
                  <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-20 h-20 text-navy" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-2 tracking-wider">
                    PASE VINCULADO A TU RESERVA
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200/80 rounded-xl py-2.5 px-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-karenRed opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-karenRed"></span>
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Vigencia del pase:
                    </span>
                    <span className="font-mono font-black text-sm sm:text-base text-karenRed tracking-wider">
                      10 minutos
                    </span>
                  </div>

                  <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
                    Presenta este código en percha o caja SIACI para pagar y retirar.
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
