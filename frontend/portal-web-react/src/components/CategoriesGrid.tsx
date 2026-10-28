import React, { useMemo } from 'react';
import { DataLoadState, Product, ProductCategory } from '../types';
import { ProductImage } from './ui/Tag';
import { categoryTone, TONE_SOLID } from '../lib/categoryTone';

interface CategoriesGridProps {
  categories: ProductCategory[];
  products: Product[];
  state: DataLoadState;
  onSelectCategory: (category: ProductCategory) => void;
}

/** Pasillos: cada categoría es un bloque de su color, como el letrero colgante, con productos reales debajo. */
export const CategoriesGrid: React.FC<CategoriesGridProps> = ({ categories, products, state, onSelectCategory }) => {
  const aisles = useMemo(() => categories
    .map(name => {
      const inAisle = products.filter(product => product.category === name);
      return {
        name,
        count: inAisle.length,
        samples: inAisle.filter(product => product.stock > 0).slice(0, 3),
      };
    })
    .filter(aisle => aisle.count > 0)
    .sort((a, b) => b.count - a.count), [categories, products]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14" aria-labelledby="pasillos-title">
      <div className="flex items-end justify-between gap-4 mb-7">
        <h2 id="pasillos-title" className="text-4xl sm:text-5xl text-ink">Date una vuelta por los pasillos</h2>
        {state === 'ready' && (
          <p className="hidden sm:block text-sm font-semibold text-ink-muted tabular">{products.length} productos en {aisles.length} pasillos</p>
        )}
      </div>

      {state === 'loading' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-44 rounded-block skeleton" />
          ))}
        </div>
      ) : aisles.length === 0 ? (
        <p className="text-ink-muted">Los pasillos aparecen cuando la tienda publica su catálogo.</p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {aisles.map(aisle => {
            const tone = categoryTone(aisle.name);
            return (
              <li key={aisle.name}>
                <button
                  onClick={() => onSelectCategory(aisle.name)}
                  className={`group press w-full h-full text-left rounded-block border-2 border-mora p-3.5 ${TONE_SOLID[tone]}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-display text-lg sm:text-xl font-extrabold leading-tight">{aisle.name}</span>
                    <span className="shrink-0 rounded-full bg-mora/90 px-2 py-0.5 text-xs font-extrabold text-white tabular">{aisle.count}</span>
                  </span>
                  <span className="mt-3 grid grid-cols-3 grid-rows-1 gap-1.5 h-20 sm:h-24 overflow-hidden" aria-hidden="true">
                    {aisle.samples.map((product, index) => (
                      <span key={product.id} className="block h-full min-h-0 transition-transform duration-200 group-hover:-translate-y-1" style={{ transitionDelay: `${index * 40}ms` }}>
                        <ProductImage src={product.image} alt="" sizes="120px" className="h-full rounded-tag bg-white p-1" />
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
