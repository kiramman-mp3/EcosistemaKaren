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
    <footer className="bg-white border-t border-aisle-rule mt-16 text-ink-soft">
      {/* Sección principal de contactos y enlaces */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Columna 1: Identidad y Misión */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-tag bg-karen text-white font-tag font-bold text-2xl leading-none flex items-center justify-center shadow-soft">
                K
              </span>
              <div>
                <span className="block font-tag font-bold text-lg text-ink">Supermercado Karen</span>
                <span className="text-xs text-ink-muted">Omnicanalidad & Control FEFO</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">
              Pioneros en reducción de desperdicio de alimentos y compras digitales con retiro express en caja física sin filas.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-4 h-4" />
                Garantía de Frescura FEFO
              </span>
            </div>
          </div>

          {/* Columna 2: Canales de Atención Directa */}
          <div className="space-y-3">
            <h3 className="font-tag font-bold text-sm text-ink uppercase tracking-wider">
              Canales de Contacto
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-karen shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-ink">PBX Tienda Matriz:</span>
                  <a href="tel:+59342987654" className="hover:text-karen transition-colors">
                    (04) 2-987654 / (04) 2-987655
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-ink">WhatsApp Atención al Cliente:</span>
                  <a
                    href="https://wa.me/593998765432?text=Hola%20Supermercado%20Karen,%20necesito%20ayuda%20con%20una%20reserva"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    +593 99 876 5432
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-karen shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-ink">Correo Electrónico:</span>
                  <a href="mailto:atencion@karen.com.ec" className="hover:text-karen transition-colors">
                    atencion@karen.com.ec
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Columna 3: Ubicación y Horarios de Retiro */}
          <div className="space-y-3">
            <h3 className="font-tag font-bold text-sm text-ink uppercase tracking-wider">
              Ubicación y Horarios
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-karen shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-ink">Sucursal Matriz:</span>
                  <span>Av. Principal 1024 y Calle 4ta</span>
                  <span className="block text-xs text-ink-muted">Guayaquil, Ecuador</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-karen shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-ink">Horario de Cajas SIACI:</span>
                  <span>Lunes a Sábado: 07:00 – 21:00</span>
                  <span className="block">Domingos y Feriados: 08:00 – 19:00</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Columna 4: Navegación y Soporte */}
          <div className="space-y-3">
            <h3 className="font-tag font-bold text-sm text-ink uppercase tracking-wider">
              Enlaces y Asistencia
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('productos')}
                  className="hover:text-karen transition-colors"
                >
                  Catálogo de Productos
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('ofertas')}
                  className="hover:text-karen transition-colors"
                >
                  Ofertas Flash por Vencer
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('reservas')}
                  className="hover:text-karen transition-colors"
                >
                  Mis Reservas y Pases
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenTerms}
                  className="inline-flex items-center gap-1.5 text-ink font-semibold hover:text-karen transition-colors"
                >
                  <FileText className="w-4 h-4 text-karen" />
                  <span>Términos y Condiciones</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenChat}
                  className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:underline"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Mesa de Ayuda Virtual</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sub-pie de página con derechos y aviso legal */}
      <div className="border-t border-aisle-rule bg-aisle py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
          <p>© {new Date().getFullYear()} Supermercado Karen S.A. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <button onClick={onOpenTerms} className="hover:text-ink transition-colors underline">
              Política de Reserva (10 min TTL)
            </button>
            <span>·</span>
            <span>RUC: 0992345678001</span>
            <span>·</span>
            <span>Guayaquil, Ecuador</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
