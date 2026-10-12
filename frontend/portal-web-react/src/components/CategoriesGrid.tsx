import React, { useMemo } from 'react';
import { DataLoadState, Product, ProductCategory } from '../types';
import { ProductImage } from './ui/Tag';

interface CategoriesGridProps {
  categories: ProductCategory[];
  products: Product[];
  state: DataLoadState;
  onSelectCategory: (category: ProductCategory) => void;
}

/** Pasillos: cada categoría como el letrero colgante del supermercado, con productos reales debajo. */
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12" aria-labelledby="pasillos-title">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h2 id="pasillos-title" className="font-tag font-bold text-3xl sm:text-4xl text-ink">Pasillos</h2>
        {state === 'ready' && (
          <p className="text-sm text-ink-muted tabular">{products.length} productos en {aisles.length} pasillos</p>
        )}
      </div>

      {state === 'loading' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-44 rounded-tag bg-white border border-aisle-rule animate-pulse" />
          ))}
        </div>
      ) : aisles.length === 0 ? (
        <p className="text-ink-muted">Los pasillos aparecerán cuando la tienda publique su catálogo.</p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {aisles.map(aisle => (
            <li key={aisle.name}>
              <button
                onClick={() => onSelectCategory(aisle.name)}
                className="group w-full text-left rounded-tag overflow-hidden bg-white border border-aisle-rule hover:border-ink focus-visible:border-ink"
              >
                <span className="flex items-baseline justify-between gap-2 bg-ink px-3.5 py-2.5">
                  <span className="font-tag font-bold text-white text-lg leading-tight">{aisle.name}</span>
                  <span className="shrink-0 text-xs text-white/70 tabular">{aisle.count}</span>
                </span>
                <span className="grid grid-cols-3 gap-1 p-2 h-24" aria-hidden="true">
                  {aisle.samples.map(product => (
                    <ProductImage key={product.id} src={product.image} alt="" className="h-full" />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
