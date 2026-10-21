import React from 'react';

interface StickerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inclinación fija en grados: parece pegada a mano, pero no cambia entre cargas. */
  tilt?: number;
  /** Retraso de la caída en ms; la secuencia de portada las escalona. */
  delay?: number;
  /** Si es true la pegatina se pega con rebote al montarse. */
  slap?: boolean;
}

export const Sticker: React.FC<StickerProps> = ({ tilt = 0, delay = 0, slap = false, className = '', style, ...rest }) => (
  <div
    className={`rounded-tag border-2 border-mora shadow-pop ${slap ? 'animate-sticker-slap' : ''} ${className}`}
    style={{ ['--tilt' as string]: `${tilt}deg`, transform: `rotate(${tilt}deg)`, animationDelay: `${delay}ms`, ...style }}
    {...rest}
  />
);
