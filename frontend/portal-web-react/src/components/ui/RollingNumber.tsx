import React from 'react';

/** Número entero que gira como odómetro: cada dígito es una columna que se desplaza. */
export const RollingNumber: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => {
  const digits = String(Math.max(0, Math.floor(value))).split('');
  return (
    <span className={`inline-flex tabular ${className}`} aria-hidden="true">
      {digits.map((digit, index) => (
        <span key={digits.length - index} className="relative inline-block h-[1em] w-[0.62em] overflow-hidden leading-none">
          <span
            className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-500 ease-[cubic-bezier(.3,1.3,.5,1)]"
            style={{ transform: `translateY(-${Number(digit)}em)` }}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n} className="block h-[1em] text-center leading-none">{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
};
