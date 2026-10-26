import React from 'react';
import { ListChecks, ShoppingBasket, Store } from 'lucide-react';
import { RESERVATION_RANGE_TEXT } from '../config/reservationRules';

const STEPS = [
  {
    icon: ListChecks,
    title: 'Elige en línea',
    text: 'Ves el stock real de la tienda. Si algo se agota, deja de aparecer.',
  },
  {
    icon: ShoppingBasket,
    title: 'Te lo apartamos el tiempo que elijas',
    text: `Eliges ${RESERVATION_RANGE_TEXT} y recibes un código. Nadie más puede llevarse esas unidades mientras esté vigente.`,
  },
  {
    icon: Store,
    title: 'Pagas y retiras en caja',
    text: 'Muestra el código en caja, paga ahí y llévate tu compra.',
  },
];

/** Cómo funciona tu reserva: es una secuencia real, por eso va numerada. */
export const AntiOverbookingBanner: React.FC = () => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-6" aria-labelledby="como-funciona">
    <div className="rounded-block bg-aguacate-solid text-white border-2 border-mora p-6 sm:p-10 grid lg:grid-cols-[1fr_2.4fr] gap-8 lg:gap-12">
      <h2 id="como-funciona" className="text-3xl sm:text-4xl leading-tight max-w-[12ch]">
        Apartar es así de fácil
      </h2>
      <ol className="grid sm:grid-cols-3 gap-6 sm:gap-8">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4 sm:block">
            <span
              className="shrink-0 w-12 h-12 rounded-full bg-limon text-mora border-2 border-mora font-display text-2xl font-extrabold flex items-center justify-center shadow-pop-sm"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="sm:mt-4 flex items-center gap-2 font-display text-lg font-extrabold leading-snug">
                <step.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm text-white/90 leading-relaxed">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
