import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Moon, Search, ShoppingBasket, Sun, Ticket, User, X } from 'lucide-react';
import { NavTab } from '../types';
import { useTheme } from '../context/ThemeContext';
import { RollingNumber } from './ui/RollingNumber';
import { Logo } from './ui/Logo';

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

  const headerRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  // En pantallas angostas la barra de pestañas se desplaza: la activa debe quedar a la vista.
  useEffect(() => {
    const nav = tabsRef.current;
    const tab = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !tab) return;
    nav.scrollTo({ left: tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
  }, [activeTab]);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      // No se esconde mientras la persona escribe en la búsqueda.
      const busy = headerRef.current?.contains(document.activeElement) ?? false;
      setHidden(y > last && y > 120 && !busy);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    // En móvil el encabezado ocupa casi 190px: se esconde al bajar y reaparece al subir (o al enfocar la búsqueda).
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 bg-surface border-b-2 border-mora/90 transition-transform duration-200 sm:translate-y-0 ${hidden ? '-translate-y-full' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* En móvil: logo y acciones arriba y la búsqueda a todo el ancho debajo; desde sm, una sola fila. */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 py-2.5 sm:flex-nowrap sm:gap-4 sm:h-24 sm:py-0">
          <button
            onClick={() => onTabChange('inicio')}
            className="order-1 flex items-center shrink-0 group rounded-tag"
            aria-label="Supermercado Karen, ir al inicio"
          >
            <div className="p-1 sm:p-1.5 w-32 sm:w-56 transition-transform group-hover:-rotate-2 group-hover:scale-105">
              <Logo alt="Supermercado Karen" className="w-full" />
            </div>
          </button>

          <form
            role="search"
            className="relative order-last basis-full min-w-0 sm:order-2 sm:basis-auto sm:flex-1"
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
              className="w-full h-12 pl-10 pr-10 rounded-full bg-page border-2 border-transparent text-base sm:text-sm font-semibold text-ink placeholder:text-ink-muted placeholder:font-normal focus:bg-surface focus:border-mora focus:outline-none transition-colors"
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
            className="order-2 ml-auto sm:ml-0 sm:order-3 shrink-0 w-11 h-11 rounded-full text-ink hover:bg-limon hover:text-mora flex items-center justify-center transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="order-3 sm:order-4 flex items-center gap-1 shrink-0">
              <span className="hidden sm:inline text-sm text-ink-soft">Hola, <strong className="font-display font-extrabold text-ink">{firstName}</strong></span>
              <button
                onClick={onLogout}
                className="w-11 h-11 flex items-center justify-center text-ink-muted hover:text-karen-text rounded-full"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              aria-label="Ingresar"
              className="order-3 sm:order-4 shrink-0 h-11 px-3 sm:px-4 rounded-full text-sm font-bold text-ink hover:bg-limon hover:text-mora flex items-center gap-2 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </button>
          )}

          <button
            onClick={onOpenCart}
            data-cart-target
            className="order-4 sm:order-5 press shrink-0 h-12 pl-3.5 pr-4 rounded-full bg-karen text-white border-2 border-mora flex items-center gap-2.5"
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
          <nav ref={tabsRef} className="relative flex gap-1.5 overflow-x-auto no-scrollbar py-1" aria-label="Secciones">
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
