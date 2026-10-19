import React from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  ShieldCheck,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { NavTab } from '../types';

interface FooterProps {
  onNavigate: (tab: NavTab) => void;
  onOpenTerms: () => void;
  onOpenChat: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate: _onNavigate, onOpenTerms, onOpenChat }) => {
  return (
    <footer className="relative mt-20 bg-[#0F172A] text-slate-300 border-t border-slate-800 shadow-2xl">
      {/* Barra superior de acento con colores del ecosistema Karen */}
      <div className="h-1 w-full bg-gradient-to-r from-karen via-sticker to-fresh" />

      {/* Contenido principal compacto y estilizado */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Columna 1: Marca, Garantía & Redes Sociales */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-1.5 shadow-md shrink-0 border border-slate-700">
                <img
                  src="/supermercado_karen.jpeg"
                  alt="Supermercado Karen Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div>
                <span className="block font-tag font-bold text-lg text-white tracking-wide">Supermercado Karen</span>
                <span className="text-xs text-slate-400">Retiro Express & Control FEFO</span>
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                Garantía Frescura 10 min TTL
              </span>
            </div>

            {/* Redes Sociales con Iconos Visuales Oficiales */}
            <div className="pt-2">
              <h4 className="font-tag font-bold text-xs uppercase tracking-wider text-slate-400 mb-2.5">
                Redes Sociales & Contacto
              </h4>
              <div className="flex flex-col gap-2">
                {/* Facebook Oficial */}
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook oficial Supermercado Karen"
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-[#1877F2] border border-slate-700/80 hover:border-[#1877F2] text-slate-200 hover:text-white transition-all duration-200 shadow-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1877F2] group-hover:bg-white text-white group-hover:text-[#1877F2] flex items-center justify-center shrink-0 transition-colors shadow-xs">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold leading-none">Facebook</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-white/80 leading-none mt-1">@SupermercadoKaren</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>

                {/* WhatsApp Oficial */}
                <a
                  href="https://wa.me/593998765432?text=Hola%20Supermercado%20Karen,%20necesito%20ayuda%20con%20una%20reserva"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp oficial Supermercado Karen"
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-[#25D366] border border-slate-700/80 hover:border-[#25D366] text-slate-200 hover:text-white transition-all duration-200 shadow-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-[#25D366] group-hover:bg-white text-white group-hover:text-[#25D366] flex items-center justify-center shrink-0 transition-colors shadow-xs">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold leading-none">WhatsApp</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-white/80 leading-none mt-1">Canal de Chat Oficial</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
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
            <div className="pt-2">
              <button
                onClick={onOpenChat}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Asistente en línea KarenBot</span>
              </button>
            </div>
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

          {/* Columna 4: Términos y Condiciones */}
          <div className="space-y-3">
            <button
              onClick={onOpenTerms}
              className="group inline-flex items-center gap-2.5 font-tag font-bold text-base uppercase tracking-wider text-slate-300 hover:text-white transition-colors text-left"
              aria-label="Términos y Condiciones"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-sticker group-hover:bg-sticker group-hover:text-ink flex items-center justify-center transition-colors border border-slate-700 shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span className="hover:underline underline-offset-4">Términos y Condiciones</span>
            </button>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consulta nuestras políticas oficiales del servicio, protección de datos personales LOPDP, sistema FEFO y tiempo de tolerancia TTL (10 min).
            </p>
          </div>
        </div>
      </div>

      {/* Franja de créditos sobria y moderna */}
      <div className="bg-[#0A0F1D] border-t border-slate-800/80 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Supermercado Karen S.A. · RUC 0992345678001</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={onOpenTerms} className="hover:text-slate-200 transition-colors underline">
              Política de Reserva (10 min TTL)
            </button>
            <span>·</span>
            <button onClick={onOpenTerms} className="hover:text-slate-200 transition-colors underline">
              Protección de Datos LOPDP
            </button>
            <span>·</span>
            <span>Ecuador</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

