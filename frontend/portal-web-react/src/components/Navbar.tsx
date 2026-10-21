import React from 'react';
import { LogOut, Moon, Search, ShoppingBasket, Sun, Ticket, User, X } from 'lucide-react';
import { NavTab } from '../types';
import { useTheme } from '../context/ThemeContext';
import { RollingNumber } from './ui/RollingNumber';

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
    <header className="sticky top-0 z-40 bg-surface border-b-2 border-mora/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2.5 sm:gap-4 h-20 sm:h-24">
          <button
            onClick={() => onTabChange('inicio')}
            className="flex items-center shrink-0 group rounded-tag"
            aria-label="Supermercado Karen, ir al inicio"
          >
            {/* El logo siempre va sobre blanco: así conserva su rojo y su texto carbón. */}
            <div className="relative bg-white rounded-tag border-2 border-mora shadow-pop-sm overflow-hidden w-40 sm:w-56 aspect-[2.7/1] transition-transform group-hover:-rotate-2 group-hover:scale-105">
              <img
                src="/supermercado_karen.jpeg"
                alt="Supermercado Karen"
                className="absolute left-1/2 top-1/2 w-[102%] max-w-none -translate-x-1/2 -translate-y-1/2"
              />
            </div>
          </button>

          <form
            role="search"
            className="relative flex-1 min-w-0"
            onSubmit={(event) => { event.preventDefault(); onTabChange('productos'); }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                onSearch(event.target.value);
                if (event.target.value && activeTab !== 'productos') onTabChange('productos');
              }}
              placeholder="¿Qué buscas hoy? Leche, atún, pan…"
              aria-label="Buscar productos"
              className="w-full h-12 pl-10 pr-10 rounded-full bg-page border-2 border-transparent text-sm font-semibold text-ink placeholder:text-ink-muted placeholder:font-normal focus:bg-surface focus:border-mora focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink"
                aria-label="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={(event) => toggleTheme({ x: event.clientX, y: event.clientY })}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="shrink-0 w-11 h-11 rounded-full text-ink hover:bg-limon hover:text-mora flex items-center justify-center transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <span className="text-sm text-ink-soft">Hola, <strong className="font-display font-extrabold text-ink">{firstName}</strong></span>
              <button
                onClick={onLogout}
                className="p-2 text-ink-muted hover:text-karen-text rounded-full"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="shrink-0 h-11 px-3 sm:px-4 rounded-full text-sm font-bold text-ink hover:bg-limon hover:text-mora flex items-center gap-2 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </button>
          )}

          <button
            onClick={onOpenCart}
            data-cart-target
            className="press shrink-0 h-12 pl-3.5 pr-4 rounded-full bg-karen text-white border-2 border-mora flex items-center gap-2.5"
            aria-label={`Abrir mi lista, ${cartCount} productos`}
          >
            <ShoppingBasket className="w-5 h-5" />
            <RollingNumber value={cartCount} className="font-display font-extrabold text-lg" />
            {cartCount > 0 && (
              <span className="hidden lg:inline text-sm font-bold tabular border-l-2 border-white/40 pl-2.5">
                ${cartTotal.toFixed(2)}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 pb-3">
          <nav className="flex gap-1.5 overflow-x-auto no-scrollbar py-1" aria-label="Secciones">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold border-2 flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'bg-limon text-mora border-mora shadow-pop-sm'
                      : 'border-transparent text-ink-soft hover:bg-page hover:text-ink'
                  }`}
                >
                  {tab.id === 'reservas' && <Ticket className="w-4 h-4" />}
                  {tab.label}
                  {tab.id === 'ofertas' && offersCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-naranja text-mora text-[11px] font-extrabold flex items-center justify-center tabular">
                      {offersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <p className="hidden md:flex items-center gap-2 text-xs font-semibold text-ink-muted shrink-0" role="status">
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-aguacate-bright' : 'bg-karen'}`} aria-hidden="true" />
            {isOnline ? 'Puedes apartar ahora' : 'Por ahora no podemos apartar: la tienda no responde'}
          </p>
        </div>
      </div>
    </header>
  );
};
