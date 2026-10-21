import { prefersReducedMotion } from '../hooks/useReducedMotion';

const CART_SELECTOR = '[data-cart-target]';

/** La canasta rebota al recibir un producto. */
export function bumpCart(): void {
  const target = document.querySelector<HTMLElement>(CART_SELECTOR);
  if (!target || typeof target.animate !== 'function' || prefersReducedMotion()) return;
  target.animate(
    [
      { transform: 'scale(1) rotate(0)' },
      { transform: 'scale(1.18) rotate(-6deg)', offset: 0.35 },
      { transform: 'scale(.96) rotate(3deg)', offset: 0.7 },
      { transform: 'scale(1) rotate(0)' },
    ],
    { duration: 480, easing: 'ease-out' },
  );
}

/** Un círculo con la foto del producto vuela hasta la canasta del encabezado. */
export function flyToCart(source: HTMLElement | null): void {
  const target = document.querySelector<HTMLElement>(CART_SELECTOR);
  if (!source || !target || typeof source.animate !== 'function' || prefersReducedMotion()) {
    bumpCart();
    return;
  }
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) {
    bumpCart();
    return;
  }

  const size = 56;
  const ghost = document.createElement('div');
  const image = source instanceof HTMLImageElement ? source : source.querySelector('img');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '999px',
    background: image?.currentSrc ? `#fff url("${image.currentSrc}") center / contain no-repeat` : 'var(--c-limon)',
    border: '3px solid var(--c-mora)',
    boxShadow: '3px 3px 0 var(--c-shadow)',
    zIndex: '90',
    pointerEvents: 'none',
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const flight = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(.8)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.25)`, opacity: 0.9 },
    ],
    { duration: 640, easing: 'cubic-bezier(.4,.1,.3,1)' },
  );
  flight.onfinish = () => {
    ghost.remove();
    bumpCart();
  };
  flight.oncancel = () => ghost.remove();
}
