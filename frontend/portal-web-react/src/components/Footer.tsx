import React from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, ShieldCheck, FileText, ExternalLink } from 'lucide-react';
import { NavTab } from '../types';
import { Logo } from './ui/Logo';

interface FooterProps {
  onNavigate: (tab: NavTab) => void;
  onOpenTerms: () => void;
  onOpenChat: () => void;
}

const WHATSAPP_PATH = 'M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z';
const FACEBOOK_PATH = 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z';

const channel = 'group flex items-center gap-3 rounded-full bg-page hover:bg-limon hover:text-mora pl-2 pr-4 py-2 transition-colors';

export const Footer: React.FC<FooterProps> = ({ onNavigate: _onNavigate, onOpenTerms, onOpenChat }) => {
  return (
    <footer className="relative mt-20 bg-surface text-ink border-t-2 border-mora">
      {/* Banda de colores de pasillo */}
      <div className="flex h-2" aria-hidden="true">
        <span className="flex-1 bg-karen" />
        <span className="flex-1 bg-limon" />
        <span className="flex-1 bg-naranja" />
        <span className="flex-1 bg-aguacate-bright" />
        <span className="flex-1 bg-guayaba" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="shrink-0 w-40">
                <Logo alt="Supermercado Karen Logo" className="w-full" />
              </div>
              <div className="min-w-0">
                <span className="block font-display font-extrabold text-xl leading-tight">Supermercado Karen</span>
                <span className="text-sm text-ink-muted">Apártalo hoy, retíralo en caja</span>
              </div>
            </div>
            <p className="text-sm text-ink-soft leading-relaxed max-w-[34ch]">
              Aparta tus productos desde casa y retíralos en caja en 30 minutos, sin hacer fila.
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-aguacate-bright px-3 py-1.5 text-xs font-extrabold text-mora">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Te guardamos tu pedido 30 minutos
            </span>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg font-extrabold text-karen-text">Escríbenos</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-karen-text shrink-0" />
                <a href="tel:+59342987654" className="hover:text-karen-text transition-colors">(04) 2-987654 / 2-987655</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-karen-text shrink-0" />
                <a href="mailto:atencion@karen.com.ec" className="hover:text-karen-text transition-colors">atencion@karen.com.ec</a>
              </li>
            </ul>
            <button onClick={onOpenChat} className="inline-flex items-center gap-2 text-sm font-bold text-aguacate hover:text-karen-text transition-colors">
              <MessageSquare className="w-4 h-4" />
              <span>Asistente en línea KarenBot</span>
            </button>
            <div className="flex flex-col gap-2 pt-1">
              <a
                href="https://wa.me/593983553724?text=Hola%20Supermercado%20Karen,%20necesito%20ayuda%20con%20una%20reserva"
                target="_blank"
                rel="noopener noreferrer"
                className={channel}
              >
                <span className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d={WHATSAPP_PATH} /></svg>
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-sm font-extrabold leading-none">WhatsApp Oficial</span>
                  <span className="text-xs leading-none mt-1 tabular">+593 98 355 3724</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60 group-hover:opacity-100" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100063795716014"
                target="_blank"
                rel="noopener noreferrer"
                className={channel}
              >
                <span className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d={FACEBOOK_PATH} /></svg>
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-sm font-extrabold leading-none">Facebook</span>
                  <span className="text-xs leading-none mt-1">Síguenos en Facebook</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60 group-hover:opacity-100" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg font-extrabold text-karen-text">Visítanos</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-karen-text shrink-0 mt-0.5" />
                <span>Av. Principal 1024 y Calle 4ta, Guayaquil</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-karen-text shrink-0 mt-0.5" />
                <span>Lunes a Sábado: 07:00 – 21:00 · Domingos: 08:00 – 19:00</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={onOpenTerms}
              className="group inline-flex items-center gap-3 font-display text-lg font-extrabold text-left"
              aria-label="Términos y Condiciones"
            >
              <span className="w-10 h-10 rounded-full bg-limon text-mora flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                <FileText className="w-5 h-5" />
              </span>
              <span className="underline decoration-limon decoration-2 underline-offset-4">Términos y Condiciones</span>
            </button>
            <p className="text-sm text-ink-soft leading-relaxed max-w-[36ch]">
              Cómo funciona tu reserva, cuánto tiempo la guardamos y cómo cuidamos tus datos personales.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-aisle-rule pt-4 pb-16 sm:pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-muted">
          <p>© {new Date().getFullYear()} Supermercado Karen S.A. · RUC 0992345678001</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={onOpenTerms} className="hover:text-karen-text transition-colors underline underline-offset-2">
              Política de Reserva (30 min TTL)
            </button>
            <button onClick={onOpenTerms} className="hover:text-karen-text transition-colors underline underline-offset-2">
              Protección de Datos LOPDP
            </button>
            <span>Ecuador</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
