import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CategoriesGrid } from './components/CategoriesGrid';
import { AntiOverbookingBanner } from './components/AntiOverbookingBanner';
import { ProductCatalog } from './components/ProductCatalog';
import { FlashOffersSection } from './components/FlashOffersSection';
import { OfferTag } from './components/ProductTag';
import { ReservationModal } from './components/ReservationModal';
import { MyReservationsPage } from './components/MyReservationsPage';
import { CartDrawer } from './components/CartDrawer';
import { LoginModal } from './components/LoginModal';
import { SpecialOffersSlider } from './components/SpecialOffersSlider';
import { TermsModal } from './components/TermsModal';
import { HelpChatWidget } from './components/HelpChatWidget';
import { Footer } from './components/Footer';
import { ThemeProvider } from './context/ThemeContext';
import { NavTab, ProductCategory, Product, FlashOffer, CartItem, ReservationPass, DataLoadState } from './types';
import { AlertTriangle } from 'lucide-react';
import { api, BackendCategory, BackendReservation } from './api/client';
import { reservationToPass, selectActiveReservation } from './reservations/recovery';
import { daysUntil, formatDate } from './utils/dates';

// Foto neutra si un producto aún no tiene imagen propia.
const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='#EFF1F4'/><text x='60' y='68' font-family='Arial' font-size='14' fill='#8C96A8' text-anchor='middle'>Sin foto</text></svg>"
);

const APPROVED_RESERVATION_TTL_SECONDS = 10 * 60;

function secondsUntilExpiration(expiration: string | undefined): number {
  if (!expiration) return APPROVED_RESERVATION_TTL_SECONDS;
  const timestamp = new Date(expiration).getTime();
  if (!Number.isFinite(timestamp)) return APPROVED_RESERVATION_TTL_SECONDS;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

// Las descripciones del catálogo vienen como "Marca · contenido".
const describe = (value?: string) => value?.replace(/\s*·\s*/g, ', ').trim() || undefined;

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('Todos');
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>(['Todos']);
  const [searchQuery, setSearchQuery] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<FlashOffer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [backendCategories, setBackendCategories] = useState<BackendCategory[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [stockByProduct, setStockByProduct] = useState<Map<string, number>>(new Map());

  const [currentPass, setCurrentPass] = useState<ReservationPass | null>(null);
  const [reservations, setReservations] = useState<BackendReservation[]>([]);
  const [syncingReservations, setSyncingReservations] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; email: string; rol?: string } | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [dataState, setDataState] = useState<DataLoadState>('loading');
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState<boolean>(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Un solo temporizador: un toast nuevo no debe cerrarse por el temporizador del anterior.
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const goTo = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const syncReservations = useCallback(async (user: { id: string; nombre: string }) => {
    setSyncingReservations(true);
    try {
      const list = await api.getUserReservations(user.id);
      setReservations(list);
      const active = selectActiveReservation(list);
      if (active) setCurrentPass(reservationToPass(active, user.nombre));
      else {
        setCurrentPass(null);
        setIsPassModalOpen(false);
      }
    } catch {
      // Conserva el último estado visible ante una desconexión temporal.
    } finally { setSyncingReservations(false); }
  }, []);

  const checkHeartbeat = useCallback(async () => {
    try {
      const hb = await api.getHeartbeat();
      setIsOnline(hb.status === 'ONLINE' && !hb.reservationsBlocked);
    } catch {
      setIsOnline(false);
    }
  }, []);

  const loadBackendData = useCallback(async () => {
    setLoadingProducts(true);
    setDataError(null);
    try {
      await checkHeartbeat();
      const [backendCats, pageRes, backendLots, backendPromos] = await Promise.all([
        api.getCategories(), api.getProductsPage({ limit: 24, offset: 0 }), api.getLots(), api.getPromotions(),
      ]);
      setBackendCategories(backendCats);
      setTotalProducts(pageRes.total);
      const categoryById = new Map(backendCats.map(category => [category.id, category.nombre]));
      setCategoriesList(Array.from(new Set(['Todos', ...backendCats.map(category => category.nombre)])));

      const stockMap = new Map<string, number>();
      for (const lot of backendLots) {
        if (lot.estado !== 'ACTIVO') continue;
        stockMap.set(lot.productoId, (stockMap.get(lot.productoId) || 0) + (lot.cantidadDisponible || 0));
      }
      setStockByProduct(stockMap);

      const mappedProducts: Product[] = pageRes.items.map(bp => {
        const catName = categoryById.get(bp.categoriaId) || 'Sin categoría';
        return {
          id: bp.id,
          name: bp.nombre,
          category: catName,
          price: Number(bp.precioVenta),
          stock: stockMap.get(bp.id) || 0,
          image: bp.imagenUrl || FALLBACK_IMAGE,
          badge: catName,
          unit: 'Unidad',
          description: describe(bp.descripcion),
          barcode: bp.codigoBarras,
        };
      });
      setProducts(mappedProducts);

      const productById = new Map(pageRes.items.map(product => [product.id, product]));
      const mappedOffers: FlashOffer[] = backendPromos.flatMap(promo => {
        const lot = backendLots.find(l => l.id === promo.loteId);
        const product = lot && productById.get(lot.productoId);
        if (!lot || !product || lot.cantidadDisponible <= 0) return [];
        const originalPrice = Number(product.precioVenta);
        return [{
          id: promo.id,
          title: promo.frasePromocional,
          category: categoryById.get(product.categoriaId) || 'Oferta',
          discountBadge: `-${promo.descuentoPorcentaje}%`,
          aiBadge: true,
          urgencyBadge: `Quedan ${lot.cantidadDisponible}`,
          price: +(originalPrice * (1 - promo.descuentoPorcentaje / 100)).toFixed(2),
          originalPrice,
          stockTotal: Math.max(lot.cantidadIngresada || 0, lot.cantidadDisponible),
          stockAvailable: lot.cantidadDisponible,
          expiryText: `Vence: ${formatDate(lot.fechaCaducidad)}`,
          expiresOn: lot.fechaCaducidad,
          productName: product.nombre,
          image: product.imagenUrl || FALLBACK_IMAGE,
          loteId: promo.loteId,
          productId: product.id,
          razonIa: promo.razonIa,
        }];
      });
      setOffers(mappedOffers);
      setDataState(mappedProducts.length === 0 ? 'empty' : 'ready');
    } catch {
      setProducts([]);
      setOffers([]);
      setCategoriesList(['Todos']);
      setDataState('offline');
      setDataError('La tienda no respondió.');
      setIsOnline(false);
    } finally {
      setLoadingProducts(false);
    }
  }, [checkHeartbeat]);

  useEffect(() => {
    void api.getCurrentUser().then(savedUser => {
      if (savedUser) {
        setCurrentUser(savedUser);
        void syncReservations(savedUser);
      }
    });
    void loadBackendData();
    const hbInterval = setInterval(() => { void checkHeartbeat(); }, 20000);
    return () => clearInterval(hbInterval);
  }, [loadBackendData, checkHeartbeat, syncReservations]);

  // Debounce para búsqueda en servidor
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Al cambiar búsqueda o categoría, reiniciar paginación
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch, selectedCategory]);

  // Consultar productos del servidor ante cambios de filtro o página
  const fetchProductsPage = useCallback(async (q: string, category: string, page: number) => {
    if (backendCategories.length === 0) return;
    setLoadingProducts(true);
    try {
      const selectedCat = backendCategories.find(c => c.nombre === category);
      const categoriaId = category !== 'Todos' && selectedCat ? selectedCat.id : undefined;
      const pageSize = 24;
      const res = await api.getProductsPage({
        q: q.trim() || undefined,
        categoriaId,
        limit: pageSize,
        offset: page * pageSize,
      });
      setTotalProducts(res.total);
      const categoryById = new Map(backendCategories.map(c => [c.id, c.nombre]));
      const mappedProducts: Product[] = res.items.map(bp => {
        const catName = categoryById.get(bp.categoriaId) || 'Sin categoría';
        return {
          id: bp.id,
          name: bp.nombre,
          category: catName,
          price: Number(bp.precioVenta),
          stock: stockByProduct.get(bp.id) || 0,
          image: bp.imagenUrl || FALLBACK_IMAGE,
          badge: catName,
          unit: 'Unidad',
          description: describe(bp.descripcion),
          barcode: bp.codigoBarras,
        };
      });
      setProducts(mappedProducts);
      setDataState(mappedProducts.length === 0 ? 'empty' : 'ready');
    } catch {
      // Ignorar fallo transitorio
    } finally {
      setLoadingProducts(false);
    }
  }, [backendCategories, stockByProduct]);

  useEffect(() => {
    if (backendCategories.length > 0 && activeTab === 'productos') {
      void fetchProductsPage(debouncedSearch, selectedCategory, currentPage);
    }
  }, [debouncedSearch, selectedCategory, currentPage, activeTab, fetchProductsPage, backendCategories.length]);

  useEffect(() => {
    if (!currentUser) return;
    const refresh = () => { void syncReservations(currentUser); };
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser, syncReservations]);

  useEffect(() => {
    const clearExpiredSession = () => {
      setCurrentUser(null);
      setCurrentPass(null);
      setReservations([]);
    };
    window.addEventListener('karen:session-expired', clearExpiredSession);
    return () => window.removeEventListener('karen:session-expired', clearExpiredSession);
  }, []);

  const handleRetryConnection = async () => {
    await loadBackendData();
    showToast('Volvimos a consultar la tienda.');
  };

  const handleAddToCart = (product: Product, { silent = false } = {}) => {
    if (product.stock <= 0) return;
    const existing = cart.find(item => item.product.id === product.id);
    if (existing && existing.quantity >= product.stock) {
      showToast(`Solo quedan ${product.stock} de ${product.name}.`);
      return;
    }
    setCart(prev => existing
      ? prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...prev, { product, quantity: 1 }]);
    if (!silent) showToast(`${product.name} está en tu lista.`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(item => {
        if (item.product.id !== productId) return item;
        const next = Math.min(item.quantity + delta, item.product.stock);
        return next > 0 ? { ...item, quantity: next } : null;
      })
      .filter(Boolean) as CartItem[]);
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleSelectCategory = (category: ProductCategory) => {
    setSelectedCategory(category);
    setSearchQuery('');
    goTo('productos');
  };

  const handleConfirmReservationFromCart = async () => {
    if (cart.length === 0) return;
    if (!currentUser) {
      setCartError(null);
      setIsLoginOpen(true);
      return;
    }
    if (!isOnline) {
      setCartError('La tienda no está respondiendo y no podemos apartar productos ahora. Inténtalo en unos minutos.');
      return;
    }

    setIsSubmittingReservation(true);
    setCartError(null);
    const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

    try {
      const result = await api.createReservation({
        usuarioId: currentUser.id,
        items: cart.map(i => ({
          productoId: i.product.reservationProductId || i.product.id,
          cantidad: i.quantity,
          promocionId: i.product.promotionId,
        })),
      });
      const remainingSeconds = secondsUntilExpiration(result.fechaExpiracion);
      // La respuesta de creación no trae nombres ni lotes legibles: se consulta la
      // reserva completa (FEFO puede repartir un producto en varios lotes).
      const saved = await api.getReservationByCode(result.codigoRetiro).catch(() => null);

      setCurrentPass(saved ? reservationToPass(saved, currentUser.nombre) : {
        code: result.codigoRetiro,
        status: 'ACTIVA',
        initialSeconds: remainingSeconds,
        remainingSeconds,
        customerName: currentUser.nombre,
        storeLocation: 'Sucursal Matriz',
        items: cart.map(i => ({ productName: i.product.name, quantity: i.quantity, price: i.product.price, lotCode: 'FEFO' })),
        total,
      });
      void syncReservations(currentUser);
      setCart([]);
      setIsCartOpen(false);
      setIsPassModalOpen(true);
      void loadBackendData();
    } catch (err: any) {
      setCartError(err.message || 'No pudimos crear la reserva. Inténtalo de nuevo.');
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  const handleReserveOffer = async (offer: FlashOffer) => {
    const offerProduct = products.find(product => product.id === offer.productId);
    if (!offerProduct) {
      showToast('Esta oferta ya no está disponible. Actualizamos la lista.');
      void loadBackendData();
      return;
    }
    handleAddToCart({
      ...offerProduct,
      id: `${offerProduct.id}::offer::${offer.id}`,
      reservationProductId: offerProduct.id,
      promotionId: offer.id,
      offerLotId: offer.loteId,
      isOffer: true,
      price: offer.price,
      originalPrice: offer.originalPrice,
      stock: offer.stockAvailable,
      badge: offer.discountBadge,
    }, { silent: true });
    setIsCartOpen(true);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentPass(null);
    setReservations([]);
    setCart([]);
    showToast('Cerraste sesión.');
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartValue = cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0);

  const offersByExpiry = useMemo(() => [...offers].sort((a, b) =>
    (daysUntil(a.expiresOn) || 0) - (daysUntil(b.expiresOn) || 0)), [offers]);
  const featuredOffer = useMemo(() => offers.reduce<FlashOffer | undefined>((best, offer) =>
    !best || offer.originalPrice - offer.price > best.originalPrice - best.price ? offer : best, undefined), [offers]);

  const activeCode = currentPass && currentPass.remainingSeconds > 0 ? currentPass.code : undefined;

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-aisle dark:bg-[#0B1120] text-ink dark:text-slate-100 transition-colors duration-200">
        {!isOnline && (
        <div className="bg-karen text-white text-sm" role="alert">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>La tienda no está respondiendo. Puedes ver productos, pero las reservas están en pausa.</span>
            <button onClick={() => void handleRetryConnection()} className="font-semibold underline underline-offset-2">
              Volver a intentar
            </button>
          </div>
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        onTabChange={goTo}
        cartCount={totalCartCount}
        cartTotal={totalCartValue}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        isOnline={isOnline}
        user={currentUser}
        onLogout={() => void handleLogout()}
        offersCount={offers.length}
        searchQuery={searchQuery}
        onSearch={query => { setSearchQuery(query); if (query) setSelectedCategory('Todos'); }}
      />

      <main className="flex-1">
        {activeTab === 'inicio' && (
          <>
            <HeroSection
              onNavigate={goTo}
              featuredOffer={featuredOffer}
              onReserveOffer={offer => void handleReserveOffer(offer)}
              activePassCode={activeCode}
              onOpenPass={() => setIsPassModalOpen(true)}
            />

            <SpecialOffersSlider
              realOffers={offers}
              onReserveFlashOffer={offer => void handleReserveOffer(offer)}
              onExploreProducts={() => goTo('productos')}
              onExploreOffers={() => goTo('ofertas')}
            />

            {offersByExpiry.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12" aria-labelledby="por-vencer">
                <div className="flex items-end justify-between gap-4 mb-6">
                  <div>
                    <h2 id="por-vencer" className="font-tag font-bold text-3xl sm:text-4xl text-ink">Por vencer, con descuento</h2>
                    <p className="mt-1 text-ink-soft">Lo que vence primero, primero.</p>
                  </div>
                  <button onClick={() => goTo('ofertas')} className="shrink-0 text-sm font-semibold text-ink underline underline-offset-4">
                    Ver las {offers.length} ofertas
                  </button>
                </div>
                <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible">
                  {offersByExpiry.slice(0, 4).map(offer => (
                    <div key={offer.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                      <OfferTag offer={offer} onReserve={handleReserveOffer} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <CategoriesGrid
              categories={categoriesList.filter(category => category !== 'Todos')}
              products={products}
              state={dataState}
              onSelectCategory={handleSelectCategory}
            />

            <AntiOverbookingBanner />
          </>
        )}

        {activeTab === 'productos' && (
          <ProductCatalog
            products={products}
            categories={categoriesList}
            selectedCategory={selectedCategory}
            onSelectCategory={category => { setSelectedCategory(category); setSearchQuery(''); setCurrentPage(0); }}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={totalCartCount}
            loading={loadingProducts}
            state={dataState}
            errorMessage={dataError}
            onRefresh={() => void loadBackendData()}
            offers={offers}
            onReserveOffer={handleReserveOffer}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            currentPage={currentPage}
            totalProducts={totalProducts}
            pageSize={24}
            onPageChange={page => setCurrentPage(page)}
          />
        )}

        {activeTab === 'ofertas' && (
          <FlashOffersSection
            offers={offers}
            state={dataState === 'ready' && offers.length === 0 ? 'empty' : dataState}
            errorMessage={dataError}
            onRefresh={() => void loadBackendData()}
            onReserveOffer={handleReserveOffer}
          />
        )}

        {activeTab === 'reservas' && (
          <MyReservationsPage
            authenticated={Boolean(currentUser)}
            reservations={reservations}
            syncing={syncingReservations}
            onRefresh={async () => { if (currentUser) await syncReservations(currentUser); }}
            onCancel={async id => {
              await api.cancelReservation(id);
              if (currentUser) await syncReservations(currentUser);
              await loadBackendData();
              showToast('Reserva cancelada. Las unidades volvieron a la percha.');
            }}
            onOpenPass={reservation => {
              if (!currentUser) return;
              setCurrentPass(reservationToPass(reservation, currentUser.nombre));
              setIsPassModalOpen(true);
            }}
            onLogin={() => setIsLoginOpen(true)}
            onExplore={() => goTo('productos')}
          />
        )}
      </main>

      <Footer
        onNavigate={goTo}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenChat={() => {
          const chatBtn = document.querySelector('button[aria-label="Abrir chat de ayuda en línea"]') as HTMLButtonElement | null;
          chatBtn?.click();
        }}
      />

      {toastMessage && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100%-2rem)] rounded-tag bg-ink text-white text-sm px-4 py-3 shadow-lift animate-slide-up"
          role="status"
        >
          {toastMessage}
        </div>
      )}

      {currentPass && (
        <ReservationModal pass={currentPass} isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} />
      )}

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <HelpChatWidget />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => { setIsCartOpen(false); setCartError(null); }}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onConfirmReservation={() => void handleConfirmReservationFromCart()}
        isSubmitting={isSubmittingReservation}
        error={cartError}
        isLoggedIn={Boolean(currentUser)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          void syncReservations(user);
          showToast(`Hola, ${user.nombre.split(' ')[0]}.`);
        }}
      />
      </div>
    </ThemeProvider>
  );
};
