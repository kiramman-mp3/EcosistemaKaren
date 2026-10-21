import React from 'react';

type Variant = 'primary' | 'limon' | 'surface' | 'ghost';
type Size = 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-karen text-white border-2 border-mora press',
  limon: 'bg-limon text-mora border-2 border-mora press',
  surface: 'bg-surface text-ink border-2 border-mora press',
  ghost: 'bg-transparent text-ink border-2 border-transparent hover:bg-ink/10',
};

const SIZES: Record<Size, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/** Botón en píldora con sombra dura que se hunde al presionar. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-display font-extrabold tracking-tight disabled:opacity-50 disabled:bg-aisle-rule disabled:text-ink-muted disabled:border-aisle-strong ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';
