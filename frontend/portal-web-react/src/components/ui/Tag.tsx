import React, { useState } from 'react';
import { formatDate } from '../../utils/dates';

const SIZES = {
  sm: { whole: 'text-2xl', cents: 'text-xs', sign: 'text-sm' },
  md: { whole: 'text-4xl', cents: 'text-base', sign: 'text-lg' },
  lg: { whole: 'text-7xl', cents: 'text-2xl', sign: 'text-3xl' },
} as const;

interface PriceProps {
  value: number;
  size?: keyof typeof SIZES;
  tone?: 'ink' | 'karen' | 'white';
  className?: string;
}

/** Precio de fleje: entero grande en tipografía angosta y centavos volados. */
export const Price: React.FC<PriceProps> = ({ value, size = 'md', tone = 'ink', className = '' }) => {
  const [whole, cents] = value.toFixed(2).split('.');
  const s = SIZES[size];
  const color = tone === 'karen' ? 'text-karen' : tone === 'white' ? 'text-white' : 'text-ink';
  return (
    <span
      className={`inline-flex items-start font-tag font-bold leading-none tabular ${color} ${className}`}
      aria-label={`$${value.toFixed(2)}`}
      role="text"
    >
      <span aria-hidden="true" className={`${s.sign} mt-[0.12em] mr-[0.04em]`}>$</span>
      <span aria-hidden="true" className={`${s.whole} tracking-tight`}>{whole}</span>
      <span aria-hidden="true" className={`${s.cents} mt-[0.12em] ml-[0.06em] underline decoration-2 underline-offset-2`}>{cents}</span>
    </span>
  );
};

/** Precio anterior tachado, discreto. */
export const OldPrice: React.FC<{ value: number }> = ({ value }) => (
  <span className="text-sm text-ink-muted line-through tabular" aria-label={`Antes $${value.toFixed(2)}`}>
    ${value.toFixed(2)}
  </span>
);

/** Fecha de vencimiento al estilo del código de fecha impreso en el empaque. */
export const ExpiryStamp: React.FC<{ date?: string; label?: string; className?: string }> = ({
  date, label = 'Vence', className = '',
}) => {
  if (!date) return null;
  return (
    <span className={`inline-flex items-baseline gap-1.5 text-ink-soft ${className}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="font-stamp font-black text-sm tracking-wide text-ink">{formatDate(date)}</span>
    </span>
  );
};

/** Foto de producto sobre fondo blanco, sin recortar el empaque. */
export const ProductImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative bg-white flex items-center justify-center overflow-hidden ${className}`}>
      {failed ? (
        <span className="font-tag font-bold text-ink-faint text-sm px-4 text-center">{alt}</span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain mix-blend-multiply"
        />
      )}
    </div>
  );
};
