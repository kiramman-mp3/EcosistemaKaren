import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Clock, Car, Check, Copy } from 'lucide-react';
import { Button } from './Button';

interface StoreMapProps {
  className?: string;
  showTitle?: boolean;
}

const STORE_COORDS = { lat: -2.1894, lng: -79.8891 };
const STORE_ADDRESS = 'Av. Principal 1024 y Calle 4ta, Guayaquil, Ecuador';

export const StoreMap: React.FC<StoreMapProps> = ({ className = '', showTitle = true }) => {
  const [copied, setCopied] = useState(false);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${STORE_COORDS.lat},${STORE_COORDS.lng}+(Supermercado+Karen)`;
  const wazeUrl = `https://waze.com/ul?ll=${STORE_COORDS.lat},${STORE_COORDS.lng}&navigate=yes`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=-79.897,-2.195,-79.881,-2.183&layer=mapnik&marker=${STORE_COORDS.lat},${STORE_COORDS.lng}`;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(STORE_ADDRESS);
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
              <span className="text-xs font-semibold text-mora/80">Sucursal Matriz Guayaquil</span>
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
          title="Mapa de ubicación Supermercado Karen"
          src={osmEmbedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          tabIndex={0}
        />
        {/* Marcador destacado flotante */}
        <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-sm border-2 border-mora rounded-lg px-3 py-1.5 shadow-pop-sm flex items-center gap-2 pointer-events-none">
          <span className="w-3 h-3 rounded-full bg-karen animate-ping shrink-0" />
          <span className="font-display font-extrabold text-xs text-mora">Supermercado Karen</span>
        </div>
      </div>

      {/* Información detallada y botones de cómo llegar */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3 text-sm text-ink">
          <MapPin className="w-5 h-5 text-karen-text shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{STORE_ADDRESS}</p>
            <p className="text-xs text-ink-muted mt-0.5">Junto a la estación central · Zona comercial</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-soft pt-1 border-t border-aisle-rule">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-aguacate shrink-0" />
            <span>Lun a Sáb: 07:00 – 21:00 · Dom: 08:00 – 19:00</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-naranja shrink-0" />
            <span>Parqueadero vigilado gratuito (45 puestos)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-aisle-rule">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[140px]"
          >
            <Button variant="primary" size="sm" className="w-full justify-center">
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
            <Button variant="surface" size="sm" className="w-full justify-center">
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
