import React from 'react';

export type IllustrationName = 'basket' | 'ticket' | 'offline' | 'search' | 'expired' | 'thanks';

// El trazo usa la tinta del tema (crema en oscuro) para no desaparecer sobre las superficies oscuras;
// lo dibujado encima de colores vivos conserva la mora fija.
const ON_COLOR = 'var(--c-mora)';
const STROKE = { stroke: 'var(--c-ink)', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Ilustraciones de trazo grueso con los colores de pasillo; se balancean una vez al aparecer. */
export const Illustration: React.FC<{ name: IllustrationName; className?: string }> = ({ name, className = 'w-32 h-32' }) => (
  <svg viewBox="0 0 120 120" className={`animate-wobble ${className}`} role="img" aria-hidden="true" fill="none">
    <ellipse cx="60" cy="108" rx="34" ry="5" fill="var(--c-ink)" opacity=".12" />
    {name === 'basket' && (
      <g {...STROKE}>
        <path d="M30 52 L40 22 M90 52 L80 22" />
        <path d="M18 52 H102 L94 100 H26 Z" fill="var(--c-limon)" />
        <path d="M40 66 V86 M60 66 V86 M80 66 V86" stroke={ON_COLOR} />
        <circle cx="86" cy="30" r="9" fill="var(--c-karen)" />
        <circle cx="38" cy="32" r="7" fill="var(--c-aguacate-bright)" />
      </g>
    )}
    {name === 'ticket' && (
      <g {...STROKE}>
        <path d="M24 28 H96 V58 a8 8 0 0 0 0 16 V98 H24 V74 a8 8 0 0 0 0 -16 Z" fill="var(--c-surface)" />
        <path d="M38 46 H82 M38 86 H70" />
        <rect x="38" y="58" width="22" height="16" rx="3" fill="var(--c-guayaba)" />
        <circle cx="84" cy="30" r="10" fill="var(--c-limon)" />
        <path d="M80 30 l3 3 l6 -7" stroke={ON_COLOR} />
      </g>
    )}
    {name === 'offline' && (
      <g {...STROKE}>
        <path d="M20 54 a56 56 0 0 1 80 0" />
        <path d="M32 68 a38 38 0 0 1 56 0" />
        <path d="M45 82 a20 20 0 0 1 30 0" />
        <circle cx="60" cy="94" r="5" fill="var(--c-naranja)" />
        <path d="M24 22 L96 100" stroke="var(--c-karen)" />
      </g>
    )}
    {name === 'search' && (
      <g {...STROKE}>
        <circle cx="52" cy="52" r="26" fill="var(--c-limon-tint)" />
        <path d="M71 71 L96 96" strokeWidth="7" />
        <path d="M42 46 q10 -10 20 0" />
        <circle cx="44" cy="58" r="2" fill="var(--c-ink)" />
        <circle cx="60" cy="58" r="2" fill="var(--c-ink)" />
      </g>
    )}
    {name === 'expired' && (
      <g {...STROKE}>
        <circle cx="60" cy="60" r="34" fill="var(--c-naranja-tint)" />
        <path d="M60 38 V62 L76 70" />
        <circle cx="94" cy="26" r="9" fill="var(--c-karen)" />
        <path d="M91 23 l6 6 M97 23 l-6 6" stroke="#fff" />
      </g>
    )}
    {name === 'thanks' && (
      <g {...STROKE}>
        <circle cx="60" cy="62" r="34" fill="var(--c-aguacate-bright)" />
        <path d="M44 62 l12 12 l22 -26" stroke="#fff" strokeWidth="6" />
        <path d="M20 28 l6 6 M100 24 l-7 7 M60 12 v8" stroke="var(--c-limon-deep)" />
      </g>
    )}
  </svg>
);
