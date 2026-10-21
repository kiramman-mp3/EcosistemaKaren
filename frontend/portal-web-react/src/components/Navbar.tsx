import React from 'react';
import { LogOut, Moon, Search, ShoppingBasket, Sun, Ticket, User, X } from 'lucide-react';
import { NavTab } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenLogin: () => void;
  isOnline?: boolean;
  user?: { id: string; nombre: string; email: string; rol?: string } | null;
  onLogout?: () => void;
  offersCount: number;
  searchQuery: string;
  onSearch: (query: string) => void;
}

const TABS: { id: NavTab; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'productos', label: 'Productos' },
  { id: 'ofertas', label: 'Ofertas por vencer' },
  { id: 'reservas', label: 'Mis reservas' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, onTabChange, cartCount, cartTotal, onOpenCart, onOpenLogin, isOnline = true,
  user = null, onLogout, offersCount, searchQuery, onSearch,
}) => {
  const firstName = user?.nombre.split(' ')[0];
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#0F172A] border-b border-aisle-rule dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2.5 sm:gap-5 h-20 sm:h-24">
          <button
            onClick={() => onTabChange('inicio')}
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-karen rounded-2xl"
            aria-label="Supermercado Karen, ir al inicio"
          >
            <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-md border border-slate-200 dark:border-slate-700/80 flex items-center justify-center transition-transform group-hover:scale-105">
              <img
                src="/supermercado_karen.jpeg"
                alt="Supermercado Karen"
                className="h-13 sm:h-16 md:h-18 w-auto max-w-[210px] sm:max-w-[290px] object-contain"
              />
            </div>
          </button>

          <form
            role="search"
            className="relative flex-1 min-w-0"
            onSubmit={(event) => { event.preventDefault(); onTabChange('productos'); }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted dark:text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                onSearch(event.target.value);
                if (event.target.value && activeTab !== 'productos') onTabChange('productos');
              }}
              placeholder="Busca leche, atún, pan…"
              aria-label="Buscar productos"
              className="w-full h-11 pl-9 pr-9 rounded-tag bg-aisle dark:bg-slate-800/90 border border-transparent dark:border-slate-700 text-sm text-ink dark:text-slate-100 placeholder:text-ink-faint dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-ink dark:focus:border-slate-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200"
                aria-label="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Botón de Modo Oscuro / Modo Claro */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="shrink-0 p-2.5 rounded-tag text-ink-muted hover:text-ink dark:text-slate-300 dark:hover:text-amber-300 hover:bg-aisle dark:hover:bg-slate-800 border border-transparent dark:border-slate-700/60 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-ink-soft" />
            )}
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <span className="text-sm text-ink-soft dark:text-slate-300">Hola, <strong className="text-ink dark:text-white">{firstName}</strong></span>
              <button
                onClick={onLogout}
                className="p-2 text-ink-muted hover:text-karen dark:text-slate-400 dark:hover:text-karen rounded-tag"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="shrink-0 h-11 px-3 sm:px-4 rounded-tag text-sm font-semibold text-ink dark:text-slate-200 hover:bg-aisle dark:hover:bg-slate-800 flex items-center gap-2 border border-transparent dark:border-slate-700/60"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </button>
          )}

          <button
            onClick={onOpenCart}
            className="shrink-0 h-11 pl-3 pr-3.5 rounded-tag bg-ink dark:bg-slate-800 text-white dark:text-slate-100 flex items-center gap-2.5 hover:bg-ink-soft dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 shadow-sm"
            aria-label={`Abrir mi lista, ${cartCount} productos`}
          >
            <ShoppingBasket className="w-5 h-5" />
            <span className="font-tag font-bold text-lg leading-none tabular">{cartCount}</span>
            {cartCount > 0 && (
              <span className="hidden lg:inline text-sm text-white/80 tabular border-l border-white/25 pl-2.5">
                ${cartTotal.toFixed(2)}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 -mb-px">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar" aria-label="Secciones">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 h-11 px-3 text-sm font-semibold border-b-[3px] flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'border-karen text-ink dark:text-white font-bold'
                      : 'border-transparent text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-slate-200'
                  }`}
                >
                  {tab.id === 'reservas' && <Ticket className="w-4 h-4" />}
                  {tab.label}
                  {tab.id === 'ofertas' && offersCount > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-sticker text-ink text-[11px] font-bold flex items-center justify-center tabular">
                      {offersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <p className="hidden md:flex items-center gap-2 text-xs text-ink-muted dark:text-slate-400 shrink-0" role="status">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-fresh' : 'bg-karen'}`} aria-hidden="true" />
            {isOnline ? 'Reservas en línea disponibles' : 'Reservas en pausa: la tienda no responde'}
          </p>
        </div>
      </div>
    </header>
  );
};
