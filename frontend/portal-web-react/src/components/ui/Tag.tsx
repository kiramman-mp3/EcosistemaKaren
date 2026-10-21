import React, { forwardRef, useState } from 'react';
import { formatDate } from '../../utils/dates';
import { Tone, TONE_BG } from '../../lib/categoryTone';

const SIZES = {
  sm: { whole: 'text-2xl', cents: 'text-xs', sign: 'text-sm' },
  md: { whole: 'text-4xl', cents: 'text-base', sign: 'text-lg' },
  lg: { whole: 'text-7xl', cents: 'text-2xl', sign: 'text-3xl' },
} as const;

interface PriceProps {
  value: number;
  size?: keyof typeof SIZES;
  tone?: 'ink' | 'karen' | 'white' | 'mora';
  className?: string;
}

const PRICE_TONES = {
  ink: 'text-ink',
  karen: 'text-karen-text',
  white: 'text-white',
  mora: 'text-mora',
} as const;

/** Precio de etiqueta: entero grande en el ancho condensado de Bricolage y centavos volados. */
export const Price: React.FC<PriceProps> = ({ value, size = 'md', tone = 'ink', className = '' }) => {
  const [whole, cents] = value.toFixed(2).split('.');
  const s = SIZES[size];
  return (
    <span
      className={`inline-flex items-start font-display font-extrabold leading-none tabular ${PRICE_TONES[tone]} ${className}`}
      style={{ fontStretch: '78%' }}
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
export const OldPrice: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <span className={`text-sm text-ink-muted line-through tabular ${className}`} aria-label={`Antes $${value.toFixed(2)}`}>
    ${value.toFixed(2)}
  </span>
);

/** Fecha de vencimiento al estilo del código de fecha impreso en el empaque. */
export const ExpiryStamp: React.FC<{ date?: string; label?: string; className?: string; onColor?: boolean }> = ({
  date, label = 'Vence', className = '', onColor = false,
}) => {
  if (!date) return null;
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${onColor ? 'text-mora' : 'text-ink-soft'} ${className}`}>
      <span className="text-xs font-semibold">{label}</span>
      <span className={`font-stamp font-black text-sm tracking-wide ${onColor ? 'text-mora' : 'text-ink'}`}>{formatDate(date)}</span>
    </span>
  );
};

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Color del pasillo sobre el que se apoya la foto. */
  tone?: Tone;
}

/**
 * Foto de producto sobre un bloque de color. Las fotos vienen con fondo blanco:
 * en modo claro se mezclan con `multiply` para que el blanco desaparezca y en
 * modo oscuro se apoyan sobre una placa clara para no apagar los colores.
 */
export const ProductImage = forwardRef<HTMLImageElement, ProductImageProps>(({ src, alt, className = '', tone }, ref) => {
  const [failed, setFailed] = useState(false);
  const bg = tone ? TONE_BG[tone] : 'bg-surface';
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${bg} dark:bg-white ${className}`}>
      {failed ? (
        <span className="font-display font-extrabold text-ink-faint dark:text-mora text-sm px-4 text-center">{alt}</span>
      ) : (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain mix-blend-multiply"
        />
      )}
    </div>
  );
});
ProductImage.displayName = 'ProductImage';
