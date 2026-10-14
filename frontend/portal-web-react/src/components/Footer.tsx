import React from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, ShieldCheck, FileText, ExternalLink } from 'lucide-react';
import { NavTab } from '../types';

interface FooterProps {
  onNavigate: (tab: NavTab) => void;
  onOpenTerms: () => void;
  onOpenChat: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenTerms, onOpenChat }) => {
  return (
    <footer className="relative mt-20 bg-[#0F172A] text-slate-300 border-t border-slate-800 shadow-2xl">
      {/* Barra superior de acento con colores del ecosistema Karen */}
      <div className="h-1 w-full bg-gradient-to-r from-karen via-sticker to-fresh" />

      {/* Contenido principal compacto y estilizado */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Columna 1: Marca & Garantía */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-tag bg-karen text-white font-tag font-bold text-2xl leading-none flex items-center justify-center shadow-md">
                K
              </span>
              <div>
                <span className="block font-tag font-bold text-lg text-white tracking-wide">Supermercado Karen</span>
                <span className="text-xs text-slate-400">Retiro Express & Control FEFO</span>
              </div>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                Garantía Frescura 10 min TTL
              </span>
            </div>
          </div>

          {/* Columna 2: Contacto Rápido */}
          <div className="space-y-2.5">
            <h3 className="font-tag font-bold text-xs uppercase tracking-wider text-slate-400">
              Atención Directa
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sticker shrink-0" />
                <a href="tel:+59342987654" className="hover:text-white transition-colors">
                  (04) 2-987654 / 2-987655
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a
                  href="https://wa.me/593998765432?text=Hola%20Supermercado%20Karen,%20necesito%20ayuda%20con%20una%20reserva"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 font-semibold hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  WhatsApp: +593 99 876 5432
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-sticker shrink-0" />
                <a href="mailto:atencion@karen.com.ec" className="hover:text-white transition-colors">
                  atencion@karen.com.ec
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 3: Sucursal & Horario */}
          <div className="space-y-2.5">
            <h3 className="font-tag font-bold text-xs uppercase tracking-wider text-slate-400">
              Sucursal & Cajas SIACI
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-karen shrink-0 mt-0.5" />
                <span>Av. Principal 1024 y Calle 4ta, Guayaquil</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-sticker shrink-0 mt-0.5" />
                <span>Lunes a Sábado: 07:00 – 21:00 · Domingos: 08:00 – 19:00</span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Accesos Rápidos */}
          <div className="space-y-2.5">
            <h3 className="font-tag font-bold text-xs uppercase tracking-wider text-slate-400">
              Enlaces
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <button
                onClick={() => onNavigate('productos')}
                className="hover:text-sticker transition-colors"
              >
                Catálogo
              </button>
              <button
                onClick={() => onNavigate('ofertas')}
                className="hover:text-sticker transition-colors"
              >
                Ofertas Flash
              </button>
              <button
                onClick={() => onNavigate('reservas')}
                className="hover:text-sticker transition-colors"
              >
                Mis Reservas
              </button>
              <button
                onClick={onOpenTerms}
                className="inline-flex items-center gap-1 hover:text-sticker transition-colors"
              >
                <FileText className="w-3 h-3 text-sticker" />
                <span>Términos y Condiciones</span>
              </button>
              <button
                onClick={onOpenChat}
                className="text-emerald-400 font-semibold hover:text-emerald-300"
              >
                Chat KarenBot
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Franja de créditos sobria y moderna */}
      <div className="bg-[#0A0F1D] border-t border-slate-800/80 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Supermercado Karen S.A. · RUC 0992345678001</p>
          <div className="flex items-center gap-3">
            <button onClick={onOpenTerms} className="hover:text-slate-200 transition-colors underline">
              Política de Reserva (10 min TTL)
            </button>
            <span>·</span>
            <span>Ecuador</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
