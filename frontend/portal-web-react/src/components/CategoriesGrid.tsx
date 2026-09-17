import React from 'react';
import { CATEGORIES_DATA } from '../data/mockData';
import { ProductCategory } from '../types';
import { ArrowUpRight } from 'lucide-react';

interface CategoriesGridProps {
  onSelectCategory: (category: ProductCategory) => void;
}

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({ onSelectCategory }) => {
  return (
    <section className="py-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy/5 text-navy text-xs font-bold uppercase tracking-wider mb-2">
              <span>Frescura Diaria</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-navy tracking-tight">
              Explora por categoría
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-2 sm:mt-0 font-medium">
            Selecciona un pasillo para apartar tus productos con garantía FEFO
          </p>
        </div>

        {/* 6 Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
          {CATEGORIES_DATA.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300 text-left flex flex-col justify-between h-40 relative overflow-hidden"
            >
              {/* Decorative background gradient tint */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

              {/* Top: Icon + Arrow icon on hover */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-white flex items-center justify-center text-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <div className="w-6 h-6 rounded-full bg-navy/5 group-hover:bg-karenRed group-hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bottom: Name + Count */}
              <div className="relative z-10">
                <h3 className="text-base font-bold text-navy group-hover:text-karenRed transition-colors">
                  {cat.name}
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {cat.count} productos
                </span>
              </div>
            </button>
          ))}
        </div>

      </div>
    </section>
  );
};
