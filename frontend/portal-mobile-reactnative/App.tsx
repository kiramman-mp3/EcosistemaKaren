import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, AppState, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Doto_900Black } from '@expo-google-fonts/doto';
import { NavbarMobile, TabBar } from './src/components/NavbarMobile';
import { PickupPassModal } from './src/components/PickupPassModal';
import { CartDrawerMobile } from './src/components/CartDrawerMobile';
import { LoginModalMobile } from './src/components/LoginModalMobile';
import { HomeScreen } from './src/screens/HomeScreen';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { OffersScreen } from './src/screens/OffersScreen';
import { ReservationsScreen } from './src/screens/ReservationsScreen';
import { NavTab, ProductCategory, Product, FlashOffer, CartItem, ReservationPass, DataLoadState } from './src/types';
import { api, BackendReservation, mediaUrl } from './src/api/client';
import { reservationToPass, selectActiveReservation } from './src/reservations/recovery';
import { formatDate } from './src/utils/dates';
import { notify } from './src/utils/dialogs';
import { colors } from './src/theme/tokens';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const APPROVED_RESERVATION_TTL_SECONDS = 10 * 60;

function secondsUntilExpiration(expiration: string | undefined): number {
  if (!expiration) return APPROVED_RESERVATION_TTL_SECONDS;
  const timestamp = new Date(expiration).getTime();
  if (!Number.isFinite(timestamp)) return APPROVED_RESERVATION_TTL_SECONDS;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

// Las descripciones del catálogo vienen como "Marca · contenido".
const describe = (value?: string) => value?.replace(/\s*·\s*/g, ', ').trim() || undefined;

function PortalAppContent() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold,
    BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
    Caveat_700Bold, Doto_900Black,
  });
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('Todos');
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>(['Todos']);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<FlashOffer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pass, setPass] = useState<ReservationPass | null>(null);
  const [reservations, setReservations] = useState<BackendReservation[]>([]);
  const [syncingReservations, setSyncingReservations] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; email: string; rol?: string } | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reservingOfferId, setReservingOfferId] = useState<string | null>(null);
  const [dataState, setDataState] = useState<DataLoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string>();

  const [isPassOpen, setIsPassOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const syncReservations = useCallback(async (user: { id: string; nombre: string }) => {
    setSyncingReservations(true);
    try {
      const list = await api.getUserReservations(user.id);
      setReservations(list);
      const active = selectActiveReservation(list);
      if (active) setPass({ ...reservationToPass(active), customerName: user.nombre });
      else {
        setPass(null);
        setIsPassOpen(false);
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
    setDataError(undefined);
    try {
      await checkHeartbeat();
      const [backendCats, backendProds, backendLots, backendPromos] = await Promise.all([
        api.getCategories(), api.getProducts(), api.getLots(), api.getPromotions(),
      ]);
      const categoryById = new Map(backendCats.map(category => [category.id, category.nombre]));
      setCategoriesList(Array.from(new Set(['Todos', ...backendCats.map(category => category.nombre)])));

      const stockByProduct = new Map<string, number>();
      for (const lot of backendLots) {
        stockByProduct.set(lot.productoId, (stockByProduct.get(lot.productoId) || 0) + (lot.cantidadDisponible || 0));
      }
      const mappedProducts: Product[] = backendProds.map(bp => ({
        id: bp.id,
        name: bp.nombre,
        category: categoryById.get(bp.categoriaId) || 'Sin categoría',
        price: Number(bp.precioVenta),
        stock: stockByProduct.get(bp.id) || 0,
        image: mediaUrl(bp.imagenUrl),
        description: describe(bp.descripcion),
        barcode: bp.codigoBarras,
      }));
      setProducts(mappedProducts);

      const productById = new Map(backendProds.map(product => [product.id, product]));
      const mappedOffers: FlashOffer[] = backendPromos.flatMap(promo => {
        const lot = backendLots.find(l => l.id === promo.loteId);
        const product = lot && productById.get(lot.productoId);
        if (!lot || !product || lot.cantidadDisponible <= 0) return [];
        const originalPrice = Number(product.precioVenta);
        return [{
          id: promo.id,
          title: promo.frasePromocional || product.nombre,
          category: categoryById.get(product.categoriaId) || 'Oferta',
          discountBadge: `-${promo.descuentoPorcentaje}%`,
          aiBadge: Boolean(promo.razonIa),
          urgencyBadge: `Quedan ${lot.cantidadDisponible}`,
          price: Number((originalPrice * (1 - promo.descuentoPorcentaje / 100)).toFixed(2)),
          originalPrice,
          stockTotal: Math.max(lot.cantidadIngresada || 0, lot.cantidadDisponible),
          stockAvailable: lot.cantidadDisponible,
          expiryText: `Vence: ${formatDate(lot.fechaCaducidad)}`,
          expiresOn: lot.fechaCaducidad,
          productName: product.nombre,
          image: mediaUrl(product.imagenUrl),
          loteId: lot.id,
          productId: product.id,
        }];
      });
      setOffers(mappedOffers);
      setDataState(mappedProducts.length > 0 ? 'ready' : 'empty');
    } catch (error: any) {
      setIsOnline(false);
      setDataState(error?.response ? 'error' : 'offline');
      setDataError(error?.response?.data?.message || 'La tienda no respondió.');
    }
  }, [checkHeartbeat]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadBackendData();
    setRefreshing(false);
  }, [loadBackendData]);

  useEffect(() => {
    void api.restoreSession().then(user => {
      if (user) {
        setCurrentUser(user);
        void syncReservations(user);
      }
    });
    const unsubscribe = api.onSessionExpired(() => {
      setCurrentUser(null);
      setPass(null);
      setReservations([]);
    });
    void loadBackendData();
    const interval = setInterval(checkHeartbeat, 15000);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadBackendData, checkHeartbeat, syncReservations]);

  useEffect(() => {
    if (!currentUser) return;
    const refreshReservations = () => { void syncReservations(currentUser); };
    const interval = setInterval(refreshReservations, 15000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshReservations();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [currentUser, syncReservations]);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      // Nunca más unidades que el stock disponible: la reserva fallaría por sobreventa.
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: Math.min(i.quantity + 1, i.product.stock) } : i);
      }
      return product.stock > 0 ? [...prev, { product, quantity: 1 }] : prev;
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prev => prev
      .map(i => {
        if (i.product.id !== id) return i;
        const next = Math.min(i.quantity + delta, i.product.stock);
        return next > 0 ? { ...i, quantity: next } : null;
      })
      .filter(Boolean) as CartItem[]);
  };

  const openPassFor = async (code: string, fallback: ReservationPass) => {
    const saved = await api.getReservationByCode(code).catch(() => null);
    setPass(saved ? { ...reservationToPass(saved), customerName: currentUser?.nombre } : fallback);
    setIsPassOpen(true);
  };

  const handleConfirmReservation = async () => {
    if (cart.length === 0) return;
    if (!currentUser) {
      setIsCartOpen(false);
      setIsLoginOpen(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const reservation = await api.createReservation({
        usuarioId: currentUser.id,
        items: cart.map(i => ({ productoId: i.product.id, cantidad: i.quantity })),
      });
      const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      setIsCartOpen(false);
      await openPassFor(reservation.codigoRetiro, {
        code: reservation.codigoRetiro,
        status: reservation.estado,
        remainingSeconds: secondsUntilExpiration(reservation.fechaExpiracion),
        storeLocation: 'Sucursal Matriz',
        customerName: currentUser.nombre,
        items: cart.map(i => ({ productName: i.product.name, quantity: i.quantity, price: i.product.price })),
        total,
      });
      setCart([]);
      void syncReservations(currentUser);
      void loadBackendData();
    } catch (err: any) {
      notify('No se pudo crear la reserva', err.response?.data?.message || err.message || 'Revisa tu conexión con la tienda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReserveOffer = async (offer: FlashOffer) => {
    if (!currentUser) {
      setIsLoginOpen(true);
      return;
    }
    const product = products.find(p => p.id === offer.productId);
    if (!product) {
      notify('Esta oferta ya no está disponible', 'Actualizamos la lista de ofertas.');
      void loadBackendData();
      return;
    }
    setReservingOfferId(offer.id);
    try {
      // promocionId hace que el backend cobre el precio con descuento y use el lote en oferta.
      const reservation = await api.createReservation({
        usuarioId: currentUser.id,
        items: [{ productoId: product.id, cantidad: 1, promocionId: offer.id }],
      });
      await openPassFor(reservation.codigoRetiro, {
        code: reservation.codigoRetiro,
        status: reservation.estado,
        remainingSeconds: secondsUntilExpiration(reservation.fechaExpiracion),
        storeLocation: 'Sucursal Matriz',
        customerName: currentUser.nombre,
        items: [{ productName: product.name, quantity: 1, price: offer.price }],
        total: offer.price,
      });
      void syncReservations(currentUser);
      void loadBackendData();
    } catch (err: any) {
      notify('No se pudo reservar la oferta', err.response?.data?.message || err.message || 'Revisa tu conexión con la tienda.');
    } finally {
      setReservingOfferId(null);
    }
  };

  const goTo = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'reservas' && currentUser) void syncReservations(currentUser);
  };

  const { isDark } = useTheme();

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaView style={[styles.splash, isDark && { backgroundColor: '#0B1120' }]}>
        <ActivityIndicator size="large" color={colors.white} />
      </SafeAreaView>
    );
  }

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
  const activeCode = pass && pass.remainingSeconds > 0 ? pass.code : undefined;

  return (
    <SafeAreaView style={[styles.safeArea, isDark && { backgroundColor: '#0F172A' }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0F172A" : colors.white} />
      <NavbarMobile
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAccount={() => setIsLoginOpen(true)}
        userName={currentUser?.nombre}
        isOnline={isOnline}
      />

      <View style={[styles.body, isDark && { backgroundColor: '#0B1120' }]}>
          {activeTab === 'inicio' && (
            <HomeScreen
              products={products}
              categories={categoriesList}
              offers={offers}
              state={dataState}
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              onNavigate={goTo}
              onSelectCategory={category => { setSelectedCategory(category); setActiveTab('productos'); }}
              onReserveOffer={offer => void handleReserveOffer(offer)}
              reservingOfferId={reservingOfferId}
              activePassCode={activeCode}
              onOpenPass={() => setIsPassOpen(true)}
            />
          )}
          {activeTab === 'productos' && (
            <CatalogScreen
              products={products}
              categories={categoriesList}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              cart={cart}
              onAddToCart={handleAddToCart}
              state={dataState}
              error={dataError}
              refreshing={refreshing}
              onRefresh={() => void refresh()}
            />
          )}
          {activeTab === 'ofertas' && (
            <OffersScreen
              offers={offers}
              state={dataState}
              error={dataError}
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              onReserveOffer={offer => void handleReserveOffer(offer)}
              reservingOfferId={reservingOfferId}
            />
          )}
          {activeTab === 'reservas' && (
            <ReservationsScreen
              authenticated={Boolean(currentUser)}
              reservations={reservations}
              syncing={syncingReservations}
              onRefresh={async () => { if (currentUser) await syncReservations(currentUser); }}
              onCancel={async id => {
                await api.cancelReservation(id);
                if (currentUser) await syncReservations(currentUser);
                await loadBackendData();
              }}
              onOpenPass={reservation => {
                setPass({ ...reservationToPass(reservation), customerName: currentUser?.nombre });
                setIsPassOpen(true);
              }}
              onLogin={() => setIsLoginOpen(true)}
              onExplore={() => setActiveTab('productos')}
            />
          )}
        </View>

        <SafeAreaView edges={['bottom']} style={[styles.tabs, isDark && { backgroundColor: '#0F172A' }]}>
          <TabBar activeTab={activeTab} onChange={goTo} offersCount={offers.length} hasActivePass={Boolean(activeCode)} />
        </SafeAreaView>

        {pass && <PickupPassModal pass={pass} visible={isPassOpen} onClose={() => setIsPassOpen(false)} />}

        <CartDrawerMobile
          visible={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onConfirmReservation={() => void handleConfirmReservation()}
          isSubmitting={isSubmitting}
          isLoggedIn={Boolean(currentUser)}
          isOnline={isOnline}
        />

        <LoginModalMobile
          visible={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={user => {
            setCurrentUser(user);
            void syncReservations(user);
          }}
          onLogout={() => {
            setCurrentUser(null);
            setPass(null);
            setReservations([]);
            setCart([]);
          }}
        />
      </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PortalAppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, backgroundColor: colors.aisle },
  tabs: { backgroundColor: colors.white },
});
