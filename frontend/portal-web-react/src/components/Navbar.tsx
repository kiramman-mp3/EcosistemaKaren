import React, { useState } from 'react';
import { ShoppingCart, Menu, X, User } from 'lucide-react';
import { NavTab } from '../types';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  cartCount,
  onOpenCart,
  onOpenLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Brand: SK Supermercado Karen */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => handleNavClick('inicio')}
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-navy to-navy-dark flex items-center justify-center text-white font-bold text-lg shadow-soft group-hover:scale-105 transition-transform">
              <span className="text-karenRed font-black">S</span>
              <span className="text-white font-extrabold">K</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-xl tracking-tight text-navy">
                  Supermercado <span className="text-karenRed">Karen</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-navy/10 text-navy rounded-full">
                  Portal Clientes
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">
                Reservas Anti-Overbooking • Frescura Local
              </p>
            </div>
          </div>

          {/* Menú Desktop: [Inicio, Productos, Ofertas] */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => handleNavClick('inicio')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                activeTab === 'inicio'
                  ? 'text-navy bg-slate-100/80 font-bold'
                  : 'text-slate-600 hover:text-navy hover:bg-slate-50'
              }`}
            >
              Inicio
            </button>
            <button
              onClick={() => handleNavClick('productos')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                activeTab === 'productos'
                  ? 'text-navy bg-slate-100/80 font-bold'
                  : 'text-slate-600 hover:text-navy hover:bg-slate-50'
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => handleNavClick('ofertas')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 relative ${
                activeTab === 'ofertas'
                  ? 'text-karenRed bg-red-50/80 font-bold'
                  : 'text-slate-600 hover:text-karenRed hover:bg-red-50/40'
              }`}
            >
              <span className="flex items-center gap-1.5">
                Ofertas
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-karenRed text-white animate-pulse">
                  IA 🔥
                </span>
              </span>
            </button>
          </nav>

          {/* Botones de Acción Derecha */}
          <div className="hidden md:flex items-center gap-3">
            {/* Botón Iniciar Sesión (outline azul) */}
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-navy border-2 border-navy hover:bg-navy/5 active:scale-95 transition-all shadow-sm"
            >
              <User className="w-4 h-4" />
              <span>Iniciar sesión</span>
            </button>

            {/* Botón Explorar Tienda (rojo filled) */}
            <button
              onClick={() => handleNavClick('productos')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-karenRed hover:bg-karenRed-hover active:scale-95 transition-all shadow-glow-red"
            >
              <span>Explorar tienda</span>
            </button>

            {/* Botón Carrito */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl text-navy bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
              aria-label="Ver carrito"
            >
              <ShoppingCart className="w-5 h-5 text-navy" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-karenRed text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenCart}
              className="relative p-2 rounded-xl text-navy bg-slate-100 active:scale-95"
              aria-label="Ver carrito"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-karenRed text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-navy hover:bg-slate-100 active:scale-95"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <button
            onClick={() => handleNavClick('inicio')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-base font-semibold ${
              activeTab === 'inicio' ? 'bg-slate-100 text-navy font-bold' : 'text-slate-600'
            }`}
          >
            Inicio
          </button>
          <button
            onClick={() => handleNavClick('productos')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-base font-semibold ${
              activeTab === 'productos' ? 'bg-slate-100 text-navy font-bold' : 'text-slate-600'
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => handleNavClick('ofertas')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-base font-semibold flex items-center justify-between ${
              activeTab === 'ofertas' ? 'bg-red-50 text-karenRed font-bold' : 'text-slate-600'
            }`}
          >
            <span>Ofertas Relámpago</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-karenRed text-white">
              IA 🔥
            </span>
          </button>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => { onOpenLogin(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-navy border-2 border-navy text-center"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => handleNavClick('productos')}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-karenRed hover:bg-karenRed-hover text-center"
            >
              Explorar tienda
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
