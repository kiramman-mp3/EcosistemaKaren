import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CategoriesGrid } from './components/CategoriesGrid';
import { AntiOverbookingBanner } from './components/AntiOverbookingBanner';
import { ProductCatalog } from './components/ProductCatalog';
import { FlashOffersSection } from './components/FlashOffersSection';
import { ReservationModal } from './components/ReservationModal';
import { SearchReservationModal } from './components/SearchReservationModal';
import { CartDrawer } from './components/CartDrawer';
import { LoginModal } from './components/LoginModal';
import { INITIAL_SAMPLE_PASS, PRODUCTS_CATALOG, FLASH_OFFERS_DATA, SAMPLE_QR_MATRIX } from './data/mockData';
import { NavTab, ProductCategory, Product, FlashOffer, CartItem, ReservationPass } from './types';
import { CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api, BackendLot } from './api/client';

// Product image fallbacks by category
const CATEGORY_IMAGES: Record<string, string> = {
  'Lácteos': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
  'Carnes': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  'Panadería': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'Verduras': 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=600&q=80',
  'Frutas': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
  'Conservas': 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80',
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('Todos');
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([
    'Todos', 'Carnes', 'Lácteos', 'Frutas', 'Panadería', 'Verduras', 'Conservas'
  ]);
  
  const [products, setProducts] = useState<Product[]>(PRODUCTS_CATALOG);
  const [offers, setOffers] = useState<FlashOffer[]>(FLASH_OFFERS_DATA);
  const [rawLots, setRawLots] = useState<BackendLot[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([
    {
      product: PRODUCTS_CATALOG[1], // Yogurt Toni
      quantity: 1
    },
    {
      product: PRODUCTS_CATALOG[0], // Leche Vita
      quantity: 1
    }
  ]);
  
  const [currentPass, setCurrentPass] = useState<ReservationPass>(INITIAL_SAMPLE_PASS);
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; email: string; rol?: string } | null>(null);
  
  // Connection & loading flags
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState<boolean>(false);
  const [isGeneratingPromo, setIsGeneratingPromo] = useState<boolean>(false);
  const [cartError, setCartError] = useState<string | null>(null);

  // Modals & Drawers
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSearchReservationOpen, setIsSearchReservationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Backend Heartbeat
  const checkHeartbeat = useCallback(async () => {
    try {
      const hb = await api.getHeartbeat();
      setIsOnline(hb.status === 'ONLINE' && !hb.reservationsBlocked);
    } catch {
      setIsOnline(false);
    }
  }, []);

  // 2. Fetch Categories, Products & Lots from Live Backend
  const loadBackendData = useCallback(async () => {
    setLoadingProducts(true);
    try {
      // Heartbeat
      await checkHeartbeat();

      // Categories
      const backendCats = await api.getCategories();
      if (backendCats && backendCats.length > 0) {
        const catNames = ['Todos', ...backendCats.map(c => c.nombre)];
        setCategoriesList(Array.from(new Set(catNames)));
      }

      // Products & Lots
      const [backendProds, backendLots] = await Promise.all([
        api.getProducts(),
        api.getLots()
      ]);

      setRawLots(backendLots);

      if (backendProds && backendProds.length > 0) {
        // Map backend products and compute real stock from active lots
        const mappedProducts: Product[] = backendProds.map((bp) => {
          // Find matching lots for real stock calculation
          const matchingLots = backendLots.filter(
            l => (l.productoId === bp.id || l.productoId === bp.aliasId) && l.estado === 'ACTIVO'
          );
          const computedStock = matchingLots.reduce((sum, l) => sum + (l.cantidadDisponible || 0), 0);

          // Find mock product to preserve image / units
          const mockMatch = PRODUCTS_CATALOG.find(
            mp => mp.name.toLowerCase().includes(bp.nombre.toLowerCase().substring(0, 10)) ||
                  mp.id === bp.aliasId
          );

          // Determine category name
          const catObj = backendCats.find(c => c.id === bp.categoriaId);
          const catName = catObj ? catObj.nombre : (mockMatch?.category || 'General');

          return {
            id: bp.id,
            name: bp.nombre,
            category: catName,
            price: bp.precioVenta,
            originalPrice: mockMatch?.originalPrice || (bp.precioVenta * 1.25),
            stock: computedStock > 0 ? computedStock : (mockMatch?.stock || 20),
            image: mockMatch?.image || CATEGORY_IMAGES[catName] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
            badge: catName,
            unit: mockMatch?.unit || 'Unidad',
            barcode: bp.codigoBarras
          };
        });

        setProducts(mappedProducts);
      }

      // Promotions
      const backendPromos = await api.getPromotions();
      if (backendPromos && backendPromos.length > 0) {
        const mappedOffers: FlashOffer[] = backendPromos.map((p, idx) => {
          const matchingLot = backendLots.find(l => l.id === p.loteId);
          const lotProd = backendProds.find(pr => pr.id === matchingLot?.productoId);
          
          const origPrice = lotProd?.precioVenta || 4.20;
          const discountedPrice = +(origPrice * (1 - (p.descuentoPorcentaje / 100))).toFixed(2);

          const mockImg = FLASH_OFFERS_DATA[idx % FLASH_OFFERS_DATA.length]?.image;

          return {
            id: p.id,
            title: p.frasePromocional || `Oferta IA: ${lotProd?.nombre || 'Producto Fresco'}`,
            category: 'Liquidación FEFO',
            discountBadge: `-${p.descuentoPorcentaje}%`,
            aiBadge: true,
            urgencyBadge: `¡${matchingLot?.cantidadDisponible || 5} en percha!`,
            price: discountedPrice,
            originalPrice: origPrice,
            stockTotal: matchingLot?.cantidadIngresada || 20,
            stockAvailable: matchingLot?.cantidadDisponible || 5,
            expiryText: matchingLot?.fechaCaducidad ? `⏰ Caduca: ${new Date(matchingLot.fechaCaducidad).toLocaleDateString()}` : '⏰ Caduca pronto',
            image: mockImg || 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
            loteId: p.loteId,
            razonIa: p.razonIa
          };
        });

        // Combine backend promotions with static flash offers
        setOffers([...mappedOffers, ...FLASH_OFFERS_DATA.slice(mappedOffers.length)]);
      }

    } catch (err) {
      console.warn('Backend offline o inaccesible, operando con datos locales de contingencia.', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [checkHeartbeat]);

  // Initial mount & periodic heartbeat sync
  useEffect(() => {
    // Check saved user session
    const savedUser = api.getCurrentUser();
    if (savedUser) setCurrentUser(savedUser);

    loadBackendData();

    // Heartbeat polling every 20 seconds
    const hbInterval = setInterval(() => {
      checkHeartbeat();
    }, 20000);

    return () => clearInterval(hbInterval);
  }, [loadBackendData, checkHeartbeat]);

  // Handle Manual Heartbeat Ping
  const handlePingHeartbeat = async () => {
    try {
      const res = await api.pingHeartbeat();
      setIsOnline(res.status === 'ONLINE');
      showToast('✓ Conexión establecida con el servidor local de tienda física (ONLINE).');
      loadBackendData();
    } catch {
      showToast('⚠️ No se pudo contactar al servidor local de tienda.');
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id || item.product.name === product.name);
      if (existing) {
        return prev.map((item) =>
          (item.product.id === product.id || item.product.name === product.name)
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

  // Create Anti-Overbooking Reservation from Cart
  const handleConfirmReservationFromCart = async () => {
    if (cart.length === 0) return;

    if (!isOnline) {
      setCartError('⚠️ El servidor de tienda física está desconectado. Las reservas están bloqueadas temporalmente para evitar sobreventas.');
      return;
    }

    setIsSubmittingReservation(true);
    setCartError(null);

    const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const userId = currentUser?.id || 'u8a7b6c5-1111-2222-3333-444455556666'; // fallback to demo client

    try {
      // Map items to backend payload
      const reservationPayload = {
        usuarioId: userId,
        items: cart.map(i => ({
          productoId: i.product.id,
          cantidad: i.quantity
        }))
      };

      const result = await api.createReservation(reservationPayload);

      // Generate Pass UI Model
      const newPass: ReservationPass = {
        code: result.codigoRetiro,
        status: 'ACTIVA',
        initialSeconds: 600,
        remainingSeconds: 600,
        customerName: currentUser?.nombre || 'Cliente Supermercado Karen',
        storeLocation: 'Sucursal Matriz - Calle Principal 102 (Caja SIACI)',
        qrBlocks: SAMPLE_QR_MATRIX,
        items: cart.map(i => ({
          productName: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
          lotCode: result.detalles?.[0]?.loteId ? `LOT-${result.detalles[0].loteId.substring(0, 8)}` : 'LOT-FEFO'
        })),
        total
      };

      setCurrentPass(newPass);
      setCart([]);
      setIsCartOpen(false);
      setIsPassModalOpen(true);
      showToast(`¡Reserva creada en backend! PIN: ${result.codigoRetiro} (Stock apartado 10 min)`);

      // Refresh stock in catalog
      loadBackendData();

    } catch (err: any) {
      setCartError(err.message || 'Error al procesar la reserva con el backend.');
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  // Reserve a Flash Offer directly
  const handleReserveOffer = async (offer: FlashOffer) => {
    if (!isOnline) {
      showToast('⚠️ Servidor local sin conexión. Reservas temporalmente suspendidas.');
      return;
    }

    // Try finding matching product in catalog
    const matchingProd = products.find(p => p.name.toLowerCase().includes('yogurt') || p.id === offer.id) || products[0];
    const userId = currentUser?.id || 'u8a7b6c5-1111-2222-3333-444455556666';

    try {
      const result = await api.createReservation({
        usuarioId: userId,
        items: [{ productoId: matchingProd?.id || 'c8a4d2e1-1111-2222-3333-444455556667', cantidad: 1 }]
      });

      const newPass: ReservationPass = {
        code: result.codigoRetiro,
        status: 'ACTIVA',
        initialSeconds: 600,
        remainingSeconds: 600,
        customerName: currentUser?.nombre || 'Cliente Supermercado Karen',
        storeLocation: 'Sucursal Matriz - Sección Ofertas FEFO',
        qrBlocks: SAMPLE_QR_MATRIX,
        items: [
          {
            productName: offer.title,
            quantity: 1,
            price: offer.price,
            lotCode: offer.loteId ? `LOT-${offer.loteId.substring(0, 8)}` : 'LOT-IA-2026'
          }
        ],
        total: offer.price
      };

      setCurrentPass(newPass);
      setIsPassModalOpen(true);
      showToast(`¡Oferta reservada! PIN: ${result.codigoRetiro}`);
      loadBackendData();
    } catch (err: any) {
      showToast(`⚠️ ${err.message || 'No se pudo reservar la oferta'}`);
    }
  };

  // Generate dynamic Gemini AI Promotion
  const handleGenerateGeminiPromo = async () => {
    if (rawLots.length === 0) {
      showToast('No hay lotes disponibles para análisis de IA.');
      return;
    }
    setIsGeneratingPromo(true);
    try {
      // Find a lot that hasn't expired yet
      const candidateLot = rawLots[Math.floor(Math.random() * rawLots.length)];
      await api.generatePromotion(candidateLot.id);
      showToast('✨ Gemini IA ha analizado lotes FEFO y generado una nueva oferta de liquidación.');
      await loadBackendData();
    } catch (err: any) {
      showToast(`⚠️ Error al generar promoción IA: ${err.message}`);
    } finally {
      setIsGeneratingPromo(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    showToast('Sesión cerrada correctamente.');
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

      {/* Offline Alert Strip if backend is offline */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Advertencia: Conexión local con tienda perdida. Las reservas en caja están pausadas temporalmente por anti-overbooking.</span>
          <button
            onClick={handlePingHeartbeat}
            className="underline ml-2 hover:text-amber-100"
          >
            Reconectar
          </button>
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
        isOnline={isOnline}
        user={currentUser}
        onLogout={handleLogout}
        onOpenSearchReservation={() => setIsSearchReservationOpen(true)}
        onPingHeartbeat={handlePingHeartbeat}
      />

      {/* Main Content Controlled by Tabs */}
      <main className="flex-1">
        
        {/* VIEW 1: INICIO */}
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
                  Productos frescos con stock en tiempo real
                </h3>
                <p className="text-slate-500 max-w-lg mx-auto text-sm">
                  Explora las ofertas del día o navega por todas nuestras categorías con inventario físico sincronizado.
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

        {/* VIEW 2: PRODUCTOS */}
        {activeTab === 'productos' && (
          <ProductCatalog
            products={products}
            categories={categoriesList}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={totalCartCount}
            loading={loadingProducts}
            onRefresh={loadBackendData}
          />
        )}

        {/* VIEW 3: OFERTAS */}
        {activeTab === 'ofertas' && (
          <FlashOffersSection
            offers={offers}
            onReserveOffer={handleReserveOffer}
            onGenerateGeminiPromo={handleGenerateGeminiPromo}
            isGenerating={isGeneratingPromo}
          />
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
              <button
                onClick={handlePingHeartbeat}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all ${
                  isOnline
                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-red-600 bg-red-50 hover:bg-red-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                Servidor Tienda: {isOnline ? 'CONECTADO (ONLINE)' : 'DESCONECTADO (RECONECTAR)'}
              </button>
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

      <SearchReservationModal
        isOpen={isSearchReservationOpen}
        onClose={() => setIsSearchReservationOpen(false)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => {
          setIsCartOpen(false);
          setCartError(null);
        }}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onConfirmReservation={handleConfirmReservationFromCart}
        isSubmitting={isSubmittingReservation}
        error={cartError}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`¡Bienvenido, ${user.nombre}!`);
        }}
      />

    </div>
  );
};
