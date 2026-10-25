import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Clock, Check, Copy } from 'lucide-react';
import { Button } from './Button';
import { STORE_FULL_ADDRESS, STORE_INFO } from '../../config/storeInfo';

interface StoreMapProps {
  className?: string;
  showTitle?: boolean;
}

const { lat, lng } = STORE_INFO.coords;
// Encuadre de unos 700 m alrededor de la tienda para el mapa embebido.
const BBOX = [lng - 0.004, lat - 0.003, lng + 0.004, lat + 0.003].map(n => n.toFixed(5)).join(',');

export const StoreMap: React.FC<StoreMapProps> = ({ className = '', showTitle = true }) => {
  const [copied, setCopied] = useState(false);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${BBOX}&layer=mapnik&marker=${lat},${lng}`;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(STORE_FULL_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className={`rounded-block border-2 border-mora bg-surface shadow-pop overflow-hidden ${className}`}>
      {showTitle && (
        <div className="bg-limon text-mora px-4 py-3 border-b-2 border-mora flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-mora text-white flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-limon" />
            </span>
            <div>
              <h3 className="font-display font-extrabold text-base leading-none text-mora">Nuestra Ubicación</h3>
              <span className="text-xs font-semibold text-mora/80">{STORE_INFO.city}</span>
            </div>
          </div>
          <button
            onClick={copyAddress}
            className="press inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-mora bg-surface text-xs font-extrabold text-mora hover:bg-mora hover:text-white transition-colors"
            title="Copiar dirección exacta"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-fresh" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiada' : 'Copiar'}</span>
          </button>
        </div>
      )}

      {/* Mapa interactivo OpenStreetMap */}
      <div className="relative w-full h-56 sm:h-64 bg-aisle border-b-2 border-aisle-rule overflow-hidden">
        <iframe
          title={`Mapa de ubicación ${STORE_INFO.tradeName}`}
          src={osmEmbedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          tabIndex={0}
        />
        {/* Marcador destacado flotante */}
        <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-sm border-2 border-mora rounded-lg px-3 py-1.5 shadow-pop-sm flex items-center gap-2 pointer-events-none">
          <span className="w-3 h-3 rounded-full bg-karen animate-ping shrink-0" />
          <span className="font-display font-extrabold text-xs text-mora">{STORE_INFO.tradeName}</span>
        </div>
      </div>

      {/* Información detallada y botones de cómo llegar */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3 text-sm text-ink">
          <MapPin className="w-5 h-5 text-karen-text shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{STORE_INFO.address}</p>
            <p className="text-xs text-ink-muted mt-0.5">{STORE_INFO.city}, Ecuador</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-soft pt-3 border-t border-aisle-rule">
          <Clock className="w-4 h-4 text-aguacate shrink-0" />
          <span>{STORE_INFO.hours.short}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-aisle-rule">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[140px]"
          >
            <Button variant="primary" className="w-full justify-center">
              <Navigation className="w-3.5 h-3.5" />
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
            </Button>
          </a>
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[140px]"
          >
            <Button variant="surface" className="w-full justify-center">
              <Navigation className="w-3.5 h-3.5 text-[#33CCFF]" />
              <span>Abrir en Waze</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};
