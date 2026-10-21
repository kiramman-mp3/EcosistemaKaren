import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../hooks/useReducedMotion';

/** Cifra en dólares que cuenta hasta su nuevo valor en lugar de saltar. */
export const CountUp: React.FC<{ value: number; className?: string; durationMs?: number }> = ({ value, className = '', durationMs = 550 }) => {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value || prefersReducedMotion()) {
      fromRef.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      fromRef.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className={`tabular ${className}`}>${shown.toFixed(2)}</span>;
};
