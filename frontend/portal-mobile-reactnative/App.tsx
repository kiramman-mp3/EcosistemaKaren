import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, AppState, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { ChatBotModal } from './src/components/ChatBotModal';
import { PrivacyPolicyModal } from './src/components/PrivacyPolicyModal';
import { ServerConfigModal } from './src/components/ServerConfigModal';
import { PopPressable } from './src/components/motion';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { OffersScreen } from './src/screens/OffersScreen';
import { ReservationsScreen } from './src/screens/ReservationsScreen';
import { NavTab, ProductCategory, Product, FlashOffer, CartItem, ReservationPass, DataLoadState } from './src/types';
import { api, BackendReservation, mediaUrl } from './src/api/client';
import { getServerUrl, loadServerUrl, onServerUrlChange, SERVER_CONFIG_ENABLED } from './src/api/serverConfig';
import { describeServerUrl } from './src/api/serverUrl';
import { reservationToPass, selectActiveReservation } from './src/reservations/recovery';
import { isAwaitingStore, waitForStoreResolution } from './src/reservations/awaitStore';
import { formatDate } from './src/utils/dates';
import { notify } from './src/utils/dialogs';
import { getErrorMessage, getErrorStatus, getServerMessage } from './src/utils/errors';
import { colors, fonts, themed } from './src/theme/tokens';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { bestSellerIds, isNewProduct } from './src/config/catalogRules';
import { offerEnded, offerUnitsAvailable } from './src/config/offerRules';
import { STORE_INFO } from './src/config/storeInfo';
import { DEFAULT_RESERVATION_MINUTES, RESERVATION_EXTENSION_MINUTES } from './src/config/reservationRules';

const APPROVED_RESERVATION_TTL_SECONDS = 30 * 60;

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
  const [catalogStale, setCatalogStale] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reservingOfferId, setReservingOfferId] = useState<string | null>(null);
  const [dataState, setDataState] = useState<DataLoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string>();

  const [isPassOpen, setIsPassOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isServerOpen, setIsServerOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(getServerUrl());

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
      void api.getCatalogStatus().then(status => setCatalogStale(Boolean(status?.stale)));
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
        createdAt: bp.created_at,
        soldLast30d: bp.vendidos30d ?? 0,
        isNew: isNewProduct(bp.created_at),
      }));
      const bestSellers = bestSellerIds(mappedProducts);
      for (const product of mappedProducts) product.isBestSeller = bestSellers.has(product.id);
      setProducts(mappedProducts);

      const productById = new Map(backendProds.map(product => [product.id, product]));
      const mappedOffers: FlashOffer[] = backendPromos.flatMap(promo => {
        const lot = backendLots.find(l => l.id === promo.loteId);
        const product = lot && productById.get(lot.productoId);
        if (!lot || !product || lot.cantidadDisponible <= 0 || offerEnded(promo.vigenteHasta)) return [];
        const originalPrice = Number(product.precioVenta);
        // Con stock de oferta, el medidor y las unidades son los de la oferta; sin él, los del lote.
        const units = offerUnitsAvailable({ lotAvailable: lot.cantidadDisponible, unidadesRestantes: promo.unidadesRestantes });
        if (units <= 0) return [];
        return [{
          id: promo.id,
          title: promo.frasePromocional || product.nombre,
          category: categoryById.get(product.categoriaId) || 'Oferta',
          discountBadge: `-${promo.descuentoPorcentaje}%`,
          aiBadge: Boolean(promo.razonIa),
          urgencyBadge: `Quedan ${units}`,
          price: Number((originalPrice * (1 - promo.descuentoPorcentaje / 100)).toFixed(2)),
          originalPrice,
          stockTotal: promo.stockOferta ? Math.max(promo.stockOferta, units) : Math.max(lot.cantidadIngresada || 0, units),
          stockAvailable: units,
          maxPerOrder: promo.limitePorPedido ?? null,
          endsAt: promo.vigenteHasta ?? null,
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
    } catch (error: unknown) {
      setIsOnline(false);
      setDataState(getErrorStatus(error) !== undefined ? 'error' : 'offline');
      setDataError(getServerMessage(error) || 'La tienda no respondió.');
    }
  }, [checkHeartbeat]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadBackendData();
    setRefreshing(false);
  }, [loadBackendData]);

  useEffect(() => {
    let cancelled = false;
    // Primero la dirección guardada del servidor: la sesión y los datos se piden a ese servidor.
    void loadServerUrl().then(() => {
      if (cancelled) return;
      void api.restoreSession().then(user => {
        if (user && !cancelled) {
          setCurrentUser(user);
          void syncReservations(user);
        }
      });
      void loadBackendData();
    });
    const unsubscribe = api.onSessionExpired(() => {
      setCurrentUser(null);
      setPass(null);
      setReservations([]);
    });
    const unsubscribeServer = onServerUrlChange(setServerUrl);
    const interval = setInterval(checkHeartbeat, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe();
      unsubscribeServer();
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

  // Mientras la tienda confirma una reserva, la lista se actualiza sola hasta que la resuelva.
  useEffect(() => {
    if (!currentUser || !reservations.some(isAwaitingStore)) return undefined;
    const interval = setInterval(() => { void syncReservations(currentUser); }, 4000);
    return () => clearInterval(interval);
  }, [currentUser, reservations, syncReservations]);

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

  /**
   * Con la tienda separada del portal, la reserva puede quedar en PENDIENTE_SYNC mientras la tienda
   * responde. Espera a que la acepte o la rechace; devuelve null si sigue en proceso (la reserva
   * aparecerá sola en "Mis reservas") y lanza el motivo si la tienda no pudo apartarla.
   */
  const settleReservation = async (
    reservation: BackendReservation,
    user: { id: string }
  ): Promise<(BackendReservation & { codigoRetiro: string }) | null> => {
    let settled: BackendReservation | null = reservation;
    if (isAwaitingStore(reservation)) {
      settled = await waitForStoreResolution(reservation.id, () => api.getUserReservations(user.id));
      if (!settled || isAwaitingStore(settled)) return null;
    }
    if (settled.estado === 'RECHAZADA') {
      throw new Error(settled.mensajeRechazo || 'La tienda no pudo apartar tus productos. Intenta de nuevo.');
    }
    if (settled.estado !== 'PENDIENTE' || !settled.codigoRetiro) {
      throw new Error('La reserva ya no está vigente. Intenta apartar de nuevo.');
    }
    return settled as BackendReservation & { codigoRetiro: string };
  };

  const notifyReservationInProgress = (user: { id: string; nombre: string }) => {
    void syncReservations(user);
    setActiveTab('reservas');
    notify('Tu reserva está en proceso', 'Aparecerá en Mis reservas apenas la tienda la confirme.');
  };

  const handleConfirmReservation = async (ttlMinutos: number = DEFAULT_RESERVATION_MINUTES) => {
    if (cart.length === 0) return;
    if (!currentUser) {
      setIsCartOpen(false);
      setIsLoginOpen(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await api.createReservation({
        usuarioId: currentUser.id,
        ttlMinutos,
        items: cart.map(i => ({ productoId: i.product.id, cantidad: i.quantity })),
      });
      const reservation = await settleReservation(created, currentUser);
      if (!reservation) {
        setIsCartOpen(false);
        setCart([]);
        notifyReservationInProgress(currentUser);
        return;
      }
      const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      setIsCartOpen(false);
      await openPassFor(reservation.codigoRetiro, {
        code: reservation.codigoRetiro,
        status: reservation.estado,
        initialSeconds: ttlMinutos * 60,
        remainingSeconds: secondsUntilExpiration(reservation.fechaExpiracion),
        storeLocation: STORE_INFO.tradeName,
        customerName: currentUser.nombre,
        items: cart.map(i => ({ productName: i.product.name, quantity: i.quantity, price: i.product.price })),
        total,
      });
      setCart([]);
      void syncReservations(currentUser);
      void loadBackendData();
    } catch (err: unknown) {
      notify('No pudimos apartar tus productos', getErrorMessage(err, 'Revisa tu conexión con la tienda.'));
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
      const created = await api.createReservation({
        usuarioId: currentUser.id,
        items: [{ productoId: product.id, cantidad: 1, promocionId: offer.id }],
      });
      const reservation = await settleReservation(created, currentUser);
      if (!reservation) {
        notifyReservationInProgress(currentUser);
        return;
      }
      await openPassFor(reservation.codigoRetiro, {
        code: reservation.codigoRetiro,
        status: reservation.estado,
        remainingSeconds: secondsUntilExpiration(reservation.fechaExpiracion),
        storeLocation: STORE_INFO.tradeName,
        customerName: currentUser.nombre,
        items: [{ productName: product.name, quantity: 1, price: offer.price }],
        total: offer.price,
      });
      void syncReservations(currentUser);
      void loadBackendData();
    } catch (err: unknown) {
      notify('No pudimos apartar la oferta', getErrorMessage(err, 'Revisa tu conexión con la tienda.'));
      // La oferta pudo agotarse o terminar: se actualizan las unidades que se muestran.
      void loadBackendData();
    } finally {
      setReservingOfferId(null);
    }
  };

  // La tienda fija el nuevo vencimiento; al volver a leer las reservas, la lista y el pase abierto lo reflejan.
  const handleExtendReservation = async (id: string) => {
    await api.extendReservation(id, RESERVATION_EXTENSION_MINUTES);
    if (currentUser) await syncReservations(currentUser);
  };

  const goTo = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'reservas' && currentUser) void syncReservations(currentUser);
  };

  // Otro servidor es otra base de clientes: la sesión, el carrito y los datos cargados ya no valen.
  const handleServerChanged = () => {
    void api.logout();
    setCurrentUser(null);
    setPass(null);
    setReservations([]);
    setCart([]);
    setDataState('loading');
    void loadBackendData();
  };

  const { isDark } = useTheme();

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaView style={styles.splash}>
        <ActivityIndicator size="large" color={colors.sticker} />
      </SafeAreaView>
    );
  }

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
  const activeCode = pass && pass.remainingSeconds > 0 ? pass.code : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.card} />
      <NavbarMobile
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAccount={() => setIsLoginOpen(true)}
        userName={currentUser?.nombre}
        isOnline={isOnline}
      />

      {isOnline && catalogStale && (
        <View style={styles.staleBar} accessibilityRole="alert">
          <Ionicons name="warning-outline" size={16} color={colors.mora} />
          <Text style={styles.staleText}>El stock que ves puede no estar al día. Si algo ya no está, te avisaremos al apartar.</Text>
        </View>
      )}

      {SERVER_CONFIG_ENABLED && (
        <TouchableOpacity
          style={styles.serverBar}
          onPress={() => setIsServerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Servidor ${describeServerUrl(serverUrl)}. Cambiar`}
        >
          <Text style={styles.serverBarText} numberOfLines={1}>Servidor: {describeServerUrl(serverUrl)}  ·  cambiar</Text>
        </TouchableOpacity>
      )}

      <View style={styles.body}>
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
              userName={currentUser?.nombre.split(' ')[0]}
              onOpenPrivacy={() => setIsPrivacyOpen(true)}
            />
          )}
          {activeTab === 'productos' && (
            <CatalogScreen
              products={products}
              offers={offers}
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
              onExtend={handleExtendReservation}
              onOpenPass={reservation => {
                setPass({ ...reservationToPass(reservation), customerName: currentUser?.nombre });
                setIsPassOpen(true);
              }}
              onLogin={() => setIsLoginOpen(true)}
              onExplore={() => setActiveTab('productos')}
            />
          )}

          <View style={styles.chatFab} pointerEvents="box-none">
            <PopPressable
              onPress={() => setIsChatOpen(true)}
              backgroundColor={colors.sticker}
              accessibilityLabel="Abrir chat de ayuda con KarenBot"
              bodyStyle={styles.chatFabBody}
            >
              <Ionicons name="chatbubbles-outline" size={26} color={colors.mora} />
            </PopPressable>
          </View>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.tabs}>
          <TabBar activeTab={activeTab} onChange={goTo} offersCount={offers.length} hasActivePass={Boolean(activeCode)} />
        </SafeAreaView>

        {pass && <PickupPassModal pass={pass} visible={isPassOpen} onClose={() => setIsPassOpen(false)} onExtend={handleExtendReservation} />}

        <CartDrawerMobile
          visible={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onConfirmReservation={ttl => void handleConfirmReservation(ttl)}
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
          onOpenPrivacy={() => { setIsLoginOpen(false); setIsPrivacyOpen(true); }}
          onLogout={() => {
            setCurrentUser(null);
            setPass(null);
            setReservations([]);
            setCart([]);
          }}
        />

        <ChatBotModal visible={isChatOpen} onClose={() => setIsChatOpen(false)} />
        <PrivacyPolicyModal visible={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
        {SERVER_CONFIG_ENABLED && (
          <ServerConfigModal visible={isServerOpen} onClose={() => setIsServerOpen(false)} onChanged={handleServerChanged} />
        )}
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

const styles = themed(() => StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.mora, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1, backgroundColor: colors.card },
  body: { flex: 1, backgroundColor: colors.aisle },
  tabs: { backgroundColor: colors.card },
  serverBar: { backgroundColor: colors.mora, paddingVertical: 5, paddingHorizontal: 12, alignItems: 'center' },
  staleBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.sticker, paddingVertical: 6, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: colors.mora },
  staleText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.mora },
  serverBarText: { fontFamily: fonts.medium, fontSize: 11, color: '#FFFFFF' },
  chatFab: { position: 'absolute', right: 14, bottom: 14 },
  chatFabBody: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
}));
