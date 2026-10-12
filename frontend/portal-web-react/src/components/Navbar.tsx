import React from 'react';
import { LogOut, Search, ShoppingBasket, Ticket, User, X } from 'lucide-react';
import { NavTab } from '../types';

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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-aisle-rule">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-5 h-16">
          <button
            onClick={() => onTabChange('inicio')}
            className="flex items-center gap-2.5 shrink-0"
            aria-label="Supermercado Karen, ir al inicio"
          >
            <span className="w-9 h-9 rounded-tag bg-karen text-white font-tag font-bold text-2xl leading-none flex items-center justify-center">
              K
            </span>
            <span className="hidden md:flex flex-col items-start leading-none">
              <span className="text-[11px] font-semibold text-ink-muted">Supermercado</span>
              <span className="font-tag font-bold text-xl text-ink">Karen</span>
            </span>
          </button>

          <form
            role="search"
            className="relative flex-1 min-w-0"
            onSubmit={(event) => { event.preventDefault(); onTabChange('productos'); }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                onSearch(event.target.value);
                if (event.target.value && activeTab !== 'productos') onTabChange('productos');
              }}
              placeholder="Busca leche, atún, pan…"
              aria-label="Buscar productos"
              className="w-full h-11 pl-9 pr-9 rounded-tag bg-aisle border border-transparent text-sm text-ink placeholder:text-ink-faint focus:bg-white focus:border-ink focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink"
                aria-label="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {user ? (
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <span className="text-sm text-ink-soft">Hola, <strong className="text-ink">{firstName}</strong></span>
              <button
                onClick={onLogout}
                className="p-2 text-ink-muted hover:text-karen rounded-tag"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="shrink-0 h-11 px-3 sm:px-4 rounded-tag text-sm font-semibold text-ink hover:bg-aisle flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </button>
          )}

          <button
            onClick={onOpenCart}
            className="shrink-0 h-11 pl-3 pr-3.5 rounded-tag bg-ink text-white flex items-center gap-2.5 hover:bg-ink-soft"
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
                  className={`shrink-0 h-11 px-3 text-sm font-semibold border-b-[3px] flex items-center gap-1.5 ${
                    active ? 'border-karen text-ink' : 'border-transparent text-ink-muted hover:text-ink'
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
          <p className="hidden md:flex items-center gap-2 text-xs text-ink-muted shrink-0" role="status">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-fresh' : 'bg-karen'}`} aria-hidden="true" />
            {isOnline ? 'Reservas en línea disponibles' : 'Reservas en pausa: la tienda no responde'}
          </p>
        </div>
      </div>
    </header>
  );
};
