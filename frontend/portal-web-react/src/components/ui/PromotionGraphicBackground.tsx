import React from 'react';

export type PromotionThemeGraphic = 'lacteos' | 'granos' | 'snacks' | 'conservas' | 'general';

interface Props {
  type: PromotionThemeGraphic;
  className?: string;
  opacity?: number;
}

/**
 * Gráfico representativo al fondo para las diferentes promociones.
 * Dibuja patrones SVG vectoriales temáticos (Lácteos, Cosecha/Granos, Snacks, Atún/Conservas)
 * para darle a cada promoción una identidad visual inmersiva.
 */
export const PromotionGraphicBackground: React.FC<Props> = ({
  type,
  className = 'absolute inset-0 pointer-events-none overflow-hidden select-none',
  opacity = 0.14,
}) => {
  return (
    <div className={className} aria-hidden="true" style={{ opacity }}>
      {type === 'lacteos' && (
        <svg
          viewBox="0 0 600 400"
          className="w-full h-full object-cover"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Botella de leche */}
          <g transform="translate(420, 40) scale(1.4)">
            <rect x="25" y="10" width="30" height="15" rx="3" fill="currentColor" fillOpacity="0.2" />
            <path d="M30 25 L20 60 L15 150 A10 10 0 0 0 25 160 H55 A10 10 0 0 0 65 150 L60 60 L50 25 Z" />
            <path d="M22 90 Q40 80 58 90" strokeDasharray="4 4" />
            <circle cx="40" cy="115" r="14" fill="currentColor" fillOpacity="0.25" />
            <path d="M36 115 L40 120 L46 110" />
          </g>
          {/* Cuña de queso con agujeros */}
          <g transform="translate(60, 180) scale(1.3)">
            <path d="M10 90 L120 40 L160 80 L30 130 Z" fill="currentColor" fillOpacity="0.2" />
            <path d="M30 130 L160 80 V120 L30 170 Z" />
            <path d="M10 90 V130 L30 170" />
            <circle cx="65" cy="85" r="9" fill="currentColor" fillOpacity="0.35" />
            <circle cx="105" cy="70" r="7" fill="currentColor" fillOpacity="0.35" />
            <circle cx="90" cy="115" r="11" fill="currentColor" fillOpacity="0.35" />
            <circle cx="130" cy="98" r="8" fill="currentColor" fillOpacity="0.35" />
          </g>
          {/* Gotas de leche y destellos */}
          <path d="M260 90 C260 70 275 50 275 50 C275 50 290 70 290 90 C290 102 282 110 275 110 C268 110 260 102 260 90 Z" fill="currentColor" fillOpacity="0.25" />
          <path d="M340 160 C340 148 350 135 350 135 C350 135 360 148 360 160 C360 168 355 174 350 174 C345 174 340 168 340 160 Z" fill="currentColor" fillOpacity="0.25" />
          {/* Pasto / Pradera ondulada */}
          <path d="M-20 360 Q150 320 300 350 T620 340 L620 420 L-20 420 Z" fill="currentColor" fillOpacity="0.15" />
        </svg>
      )}

      {type === 'granos' && (
        <svg
          viewBox="0 0 600 400"
          className="w-full h-full object-cover"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Espiga de trigo / Avena */}
          <g transform="translate(430, 30) scale(1.3) rotate(15)">
            <path d="M50 220 C50 120 40 40 40 10" />
            {/* Granos laterales */}
            <path d="M40 30 Q20 20 25 40 Q35 45 40 45" fill="currentColor" fillOpacity="0.2" />
            <path d="M40 30 Q60 20 55 40 Q45 45 40 45" fill="currentColor" fillOpacity="0.2" />
            <path d="M40 60 Q15 50 20 70 Q35 75 40 75" fill="currentColor" fillOpacity="0.2" />
            <path d="M40 60 Q65 50 60 70 Q45 75 40 75" fill="currentColor" fillOpacity="0.2" />
            <path d="M40 90 Q15 80 20 100 Q35 105 40 105" fill="currentColor" fillOpacity="0.2" />
            <path d="M40 90 Q65 80 60 100 Q45 105 40 105" fill="currentColor" fillOpacity="0.2" />
            <path d="M40 120 Q20 110 25 130 Q35 135 40 135" fill="currentColor" fillOpacity="0.2" />
            <path d="M40 120 Q60 110 55 130 Q45 135 40 135" fill="currentColor" fillOpacity="0.2" />
          </g>
          {/* Manzana / Fruta fresca con hoja */}
          <g transform="translate(60, 160) scale(1.2)">
            <path d="M70 40 C65 20 75 10 85 15 C95 20 90 35 75 40 Z" fill="currentColor" fillOpacity="0.3" />
            <path d="M70 40 Q70 25 72 15" strokeWidth="4" />
            <path d="M40 55 C15 55 10 95 30 130 C45 155 60 160 70 150 C80 160 95 155 110 130 C130 95 125 55 100 55 C85 55 75 68 70 68 C65 68 55 55 40 55 Z" fill="currentColor" fillOpacity="0.2" />
          </g>
          {/* Hojas flotantes */}
          <g transform="translate(260, 60) rotate(-20)">
            <path d="M20 50 C20 20 50 20 60 40 C70 60 40 70 20 50 Z" fill="currentColor" fillOpacity="0.25" />
            <path d="M20 50 L55 35" />
          </g>
          <g transform="translate(320, 220) rotate(35) scale(0.8)">
            <path d="M20 50 C20 20 50 20 60 40 C70 60 40 70 20 50 Z" fill="currentColor" fillOpacity="0.25" />
            <path d="M20 50 L55 35" />
          </g>
          {/* Sol de cosecha andina */}
          <circle cx="530" cy="70" r="38" fill="currentColor" fillOpacity="0.15" />
          <path d="M530 20 V10 M530 120 V130 M480 70 H470 M580 70 H590" strokeWidth="4" />
        </svg>
      )}

      {type === 'snacks' && (
        <svg
          viewBox="0 0 600 400"
          className="w-full h-full object-cover"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Galleta con chispas de chocolate */}
          <g transform="translate(420, 120) scale(1.3)">
            <circle cx="70" cy="70" r="56" fill="currentColor" fillOpacity="0.2" />
            <circle cx="50" cy="50" r="6" fill="currentColor" fillOpacity="0.5" />
            <circle cx="85" cy="45" r="7" fill="currentColor" fillOpacity="0.5" />
            <circle cx="70" cy="75" r="8" fill="currentColor" fillOpacity="0.5" />
            <circle cx="48" cy="88" r="6" fill="currentColor" fillOpacity="0.5" />
            <circle cx="92" cy="82" r="7" fill="currentColor" fillOpacity="0.5" />
            <path d="M30 65 Q25 72 32 80" strokeDasharray="3 3" />
          </g>
          {/* Pretzel / Bocadito */}
          <g transform="translate(70, 70) scale(1.1)">
            <path
              d="M70 40 C50 15 20 25 20 55 C20 85 55 105 70 120 C85 105 120 85 120 55 C120 25 90 15 70 40 Z"
              fill="currentColor"
              fillOpacity="0.15"
            />
            <circle cx="45" cy="55" r="14" fill="currentColor" fillOpacity="0.25" />
            <circle cx="95" cy="55" r="14" fill="currentColor" fillOpacity="0.25" />
          </g>
          {/* Jugo con sorbete para lonchera */}
          <g transform="translate(250, 180) scale(1.1)">
            <rect x="30" y="40" width="60" height="90" rx="8" fill="currentColor" fillOpacity="0.2" />
            <path d="M50 40 L65 10 L80 10" strokeWidth="5" />
            <path d="M40 75 Q60 65 80 75" />
            <circle cx="60" cy="95" r="12" fill="currentColor" fillOpacity="0.3" />
          </g>
          {/* Estrellas / Destellos de alegría infantil */}
          <g transform="translate(320, 50)">
            <path d="M20 0 L25 15 L40 20 L25 25 L20 40 L15 25 L0 20 L15 15 Z" fill="currentColor" fillOpacity="0.3" />
          </g>
          <g transform="translate(180, 280) scale(0.7)">
            <path d="M20 0 L25 15 L40 20 L25 25 L20 40 L15 25 L0 20 L15 15 Z" fill="currentColor" fillOpacity="0.3" />
          </g>
        </svg>
      )}

      {type === 'conservas' && (
        <svg
          viewBox="0 0 600 400"
          className="w-full h-full object-cover"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Lata de lomitos de atún */}
          <g transform="translate(420, 160) scale(1.3)">
            <ellipse cx="60" cy="30" rx="48" ry="18" fill="currentColor" fillOpacity="0.2" />
            <path d="M12 30 V75 C12 85 34 93 60 93 C86 93 108 85 108 75 V30" fill="currentColor" fillOpacity="0.18" />
            <ellipse cx="60" cy="75" rx="48" ry="18" />
            {/* Llave abrefácil */}
            <path d="M55 28 A8 8 0 1 1 65 28 A8 8 0 1 1 55 28" fill="currentColor" fillOpacity="0.4" />
            <path d="M60 22 L72 15" strokeWidth="4" />
          </g>
          {/* Pez atún estilizado del Pacífico */}
          <g transform="translate(60, 80) scale(1.3)">
            <path
              d="M30 65 Q90 20 160 55 Q135 60 120 75 Q150 95 180 85 L190 100 L165 95 Q100 115 30 65 Z"
              fill="currentColor"
              fillOpacity="0.2"
            />
            <path d="M165 95 L195 115 L180 85" fill="currentColor" fillOpacity="0.3" />
            <circle cx="55" cy="58" r="4" fill="currentColor" fillOpacity="0.6" />
            <path d="M75 58 Q90 65 105 58" />
            <path d="M100 50 L115 35 L120 52" fill="currentColor" fillOpacity="0.25" />
          </g>
          {/* Ondas marinas del mar ecuatoriano */}
          <path d="M-20 290 Q50 270 120 290 T260 290 T400 290 T540 290 T640 290" strokeWidth="3" opacity="0.6" />
          <path d="M-20 325 Q50 305 120 325 T260 325 T400 325 T540 325 T640 325" strokeWidth="3.5" opacity="0.7" />
          <path d="M-20 360 Q50 340 120 360 T260 360 T400 360 T540 360 T640 360" strokeWidth="4" opacity="0.8" />
        </svg>
      )}

      {type === 'general' && (
        <svg
          viewBox="0 0 600 400"
          className="w-full h-full object-cover"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Carrito de supermercado y etiqueta de descuento */}
          <g transform="translate(420, 100) scale(1.3)">
            <path d="M15 25 H30 L45 80 H95 L110 40 H35" fill="currentColor" fillOpacity="0.15" />
            <circle cx="50" cy="95" r="8" fill="currentColor" fillOpacity="0.35" />
            <circle cx="90" cy="95" r="8" fill="currentColor" fillOpacity="0.35" />
          </g>
          <g transform="translate(80, 110) scale(1.2)">
            <path d="M20 20 H60 L85 45 L45 85 L20 60 Z" fill="currentColor" fillOpacity="0.2" />
            <circle cx="35" cy="35" r="5" fill="currentColor" fillOpacity="0.5" />
          </g>
          <path d="M260 60 L270 90 L300 100 L270 110 L260 140 L250 110 L220 100 L250 90 Z" fill="currentColor" fillOpacity="0.25" />
        </svg>
      )}
    </div>
  );
};
