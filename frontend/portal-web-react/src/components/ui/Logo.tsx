import React from 'react';

interface LogoProps {
  alt: string;
  className?: string;
}

/** Logo transparente. El de modo oscuro lleva el texto en crema y un rojo más claro; el CSS elige cuál mostrar. */
export const Logo: React.FC<LogoProps> = ({ alt, className = '' }) => (
  <>
    <img src="/supermercado_karen.png" alt={alt} className={`block h-auto dark:hidden ${className}`} />
    <img src="/supermercado_karen_dark.png" alt="" aria-hidden="true" className={`hidden h-auto dark:block ${className}`} />
  </>
);
