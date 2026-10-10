import React, { useState } from 'react';
import { ShoppingCart, Menu, X, User, Search, Wifi, WifiOff, LogOut } from 'lucide-react';
import { NavTab } from '../types';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenLogin: () => void;
  isOnline?: boolean;
  user?: { id: string; nombre: string; email: string; rol?: string } | null;
  onLogout?: () => void;
  onOpenSearchReservation?: () => void;
  onPingHeartbeat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  cartCount,
  onOpenCart,
  onOpenLogin,
  isOnline = true,
  user = null,
  onLogout,
  onOpenSearchReservation,
  onPingHeartbeat
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
                  : 'text-karenRed hover:bg-red-50/40'
              }`}
            >
              Ofertas
            </button>
          </nav>

          {/* Botones de Acción Derecha */}
          <div className="hidden md:flex items-center gap-3">
            {/* Live Backend Connection Indicator */}
            <button
              onClick={onPingHeartbeat}
              title={isOnline ? 'Servidor de tienda en línea' : 'Servidor desconectado. Haz clic para reconectar.'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tienda Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-600" />
                  <span>Tienda Offline (Reconectar)</span>
                </>
              )}
            </button>

            {/* Historial de reservas */}
            {onOpenSearchReservation && (
              <button
                onClick={onOpenSearchReservation}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${activeTab === 'reservas' ? 'text-white bg-navy border-navy' : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200/80'}`}
                title="Consultar y administrar mis reservas"
              >
                <Search className="w-3.5 h-3.5 text-navy" />
                <span>Mis reservas</span>
              </button>
            )}

            {/* Iniciar Sesión / Usuario Logueado */}
            {user ? (
              <div className="flex items-center gap-2 bg-navy/5 px-3 py-1.5 rounded-xl border border-navy/10">
                <div className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                  {user.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="text-left leading-tight">
                  <span className="text-xs font-bold text-navy block max-w-[100px] truncate">
                    {user.nombre}
                  </span>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">
                    {user.rol || 'Cliente'}
                  </span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1 text-slate-400 hover:text-karenRed transition-colors ml-1"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-navy border-2 border-navy hover:bg-navy/5 active:scale-95 transition-all shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}

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
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <button
              onClick={onPingHeartbeat}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
              <span>{isOnline ? 'Tienda Online' : 'Tienda Desconectada'}</span>
            </button>

            {onOpenSearchReservation && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSearchReservation();
                }}
                className="text-xs font-bold text-navy flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-lg"
              >
                <Search className="w-3 h-3" />
                <span>Mis reservas</span>
              </button>
            )}
          </div>

          <button
            onClick={() => handleNavClick('inicio')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
              activeTab === 'inicio' ? 'bg-slate-100 text-navy' : 'text-slate-600'
            }`}
          >
            Inicio
          </button>
          <button
            onClick={() => handleNavClick('productos')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
              activeTab === 'productos' ? 'bg-slate-100 text-navy' : 'text-slate-600'
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => handleNavClick('ofertas')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
              activeTab === 'ofertas' ? 'bg-red-50 text-karenRed' : 'text-karenRed'
            }`}
          >
            Ofertas
          </button>

          <div className="pt-2 border-t border-slate-100">
            {user ? (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-navy block">{user.nombre}</span>
                  <span className="text-[10px] text-slate-400">{user.email}</span>
                </div>
                {onLogout && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="text-xs text-karenRed font-bold flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salir</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-navy border-2 border-navy text-center"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
