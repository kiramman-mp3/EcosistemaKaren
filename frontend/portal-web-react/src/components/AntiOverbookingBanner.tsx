import React from 'react';

const STEPS = [
  {
    title: 'Elige en línea',
    text: 'Ves el stock real de la tienda. Si algo se agota, deja de aparecer.',
  },
  {
    title: 'Te lo apartamos 10 minutos',
    text: 'Al reservar recibes un código. Nadie más puede llevarse esas unidades mientras esté vigente.',
  },
  {
    title: 'Pagas y retiras en caja',
    text: 'Muestra el código en la Sucursal Matriz, pagas ahí y te llevas tu compra.',
  },
];

/** Cómo funciona la reserva: es una secuencia real, por eso va numerada. */
export const AntiOverbookingBanner: React.FC = () => (
  <section className="bg-ink text-white" aria-labelledby="como-funciona">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-[1fr_2.4fr] gap-8 lg:gap-12">
      <h2 id="como-funciona" className="font-tag font-bold text-3xl sm:text-4xl leading-tight">
        Cómo funciona tu reserva
      </h2>
      <ol className="grid sm:grid-cols-3 gap-6 sm:gap-8">
        {STEPS.map((step, index) => (
          <li key={step.title} className="border-t-2 border-sticker pt-4">
            <span className="font-tag font-bold text-sticker text-4xl leading-none tabular">{index + 1}</span>
            <h3 className="mt-3 font-semibold text-lg">{step.title}</h3>
            <p className="mt-1.5 text-sm text-white/75 leading-relaxed">{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
