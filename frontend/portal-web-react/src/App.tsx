import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CategoriesGrid } from './components/CategoriesGrid';
import { AntiOverbookingBanner } from './components/AntiOverbookingBanner';
import { ProductCatalog } from './components/ProductCatalog';
import { FlashOffersSection } from './components/FlashOffersSection';
import { ReservationModal } from './components/ReservationModal';
import { CartDrawer } from './components/CartDrawer';
import { LoginModal } from './components/LoginModal';
import { INITIAL_SAMPLE_PASS } from './data/mockData';
import { NavTab, ProductCategory, Product, FlashOffer, CartItem, ReservationPass } from './types';
import { CheckCircle, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('Todos');
  const [cart, setCart] = useState<CartItem[]>([
    {
      product: {
        id: 'prod-02',
        name: 'Yogurt Griego Toni Natural 500g',
        category: 'Lácteos',
        price: 2.50,
        originalPrice: 3.25,
        stock: 45,
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80'
      },
      quantity: 2
    },
    {
      product: {
        id: 'prod-01',
        name: 'Leche Entera Pasteurizada 1 Litro',
        category: 'Lácteos',
        price: 0.95,
        originalPrice: 1.20,
        stock: 90,
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80'
      },
      quantity: 1
    }
  ]);
  const [currentPass, setCurrentPass] = useState<ReservationPass>(INITIAL_SAMPLE_PASS);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`✓ "${product.name}" añadido a tu lista`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSelectCategory = (category: ProductCategory) => {
    setSelectedCategory(category);
    setActiveTab('productos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReserveOffer = (offer: FlashOffer) => {
    // Generate pass for this specific offer
    const newPass: ReservationPass = {
      ...INITIAL_SAMPLE_PASS,
      code: `KR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      remainingSeconds: 600, // 10 minutes
      items: [
        {
          productName: offer.title,
          quantity: 1,
          price: offer.price,
          lotCode: 'LOT-IA-2026'
        }
      ],
      total: offer.price
    };
    setCurrentPass(newPass);
    setIsPassModalOpen(true);
    showToast(`¡Reserva creada! Stock apartado por 10 min.`);
  };

  const handleConfirmReservationFromCart = () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const newPass: ReservationPass = {
      ...INITIAL_SAMPLE_PASS,
      code: `KR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      remainingSeconds: 600,
      items: cart.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
        lotCode: 'LOT-KR-FEFO'
      })),
      total
    };
    setCurrentPass(newPass);
    setIsCartOpen(false);
    setIsPassModalOpen(true);
    showToast(`¡Reserva de lista confirmada! Código PIN emitido.`);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 bg-navy text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Navbar Superior */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Main Content Controlled by Tabs or Seamless Landing */}
      <main className="flex-1">
        
        {/* VIEW 1: INICIO (Hero, Categories Grid & Anti-Overbooking Banner) */}
        {activeTab === 'inicio' && (
          <div>
            <HeroSection
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenPassPreview={() => setIsPassModalOpen(true)}
            />

            <CategoriesGrid onSelectCategory={handleSelectCategory} />

            <AntiOverbookingBanner
              onBackToAppSelector={() => {
                // Navigate back to the local index
                window.location.href = '../index.html';
              }}
            />

            {/* Quick Teaser of Products */}
            <div className="bg-white py-12 border-t border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
                <span className="text-xs font-bold text-karenRed uppercase tracking-wider">
                  Catálogo Completo
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-navy">
                  Miles de productos frescos esperan por ti
                </h3>
                <p className="text-slate-500 max-w-lg mx-auto text-sm">
                  Explora las ofertas del día o navega por todas nuestras categorías con stock garantizado en tienda física.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setActiveTab('productos');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-6 py-3 rounded-2xl bg-navy text-white text-sm font-bold hover:bg-navy-dark transition-all shadow-soft"
                  >
                    Ver todo el catálogo →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: PRODUCTOS (Img 3) */}
        {activeTab === 'productos' && (
          <ProductCatalog
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={totalCartCount}
          />
        )}

        {/* VIEW 3: OFERTAS (Img 4) */}
        {activeTab === 'ofertas' && (
          <FlashOffersSection onReserveOffer={handleReserveOffer} />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center text-white font-bold text-sm">
                <span className="text-karenRed font-black">S</span>K
              </div>
              <div>
                <span className="font-display font-extrabold text-base text-navy">
                  Supermercado <span className="text-karenRed">Karen</span>
                </span>
                <p className="text-xs text-slate-400">
                  Sistema Omnicanal de Reservas Anti-Overbooking
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Servidor Tienda: CONECTADO (LAN 192.168.1.50)
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-navy" />
                Algoritmo FEFO Activo
              </span>
            </div>

            <div className="text-xs text-slate-400">
              © 2026 Supermercado Karen. Todos los derechos reservados.
            </div>

          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ReservationModal
        pass={currentPass}
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onConfirmReservation={handleConfirmReservationFromCart}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

    </div>
  );
};
