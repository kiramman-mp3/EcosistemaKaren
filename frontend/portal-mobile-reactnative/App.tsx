import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  Alert,
  AppState,
} from 'react-native';
import { NavbarMobile } from './src/components/NavbarMobile';
import { HeroSectionMobile } from './src/components/HeroSectionMobile';
import { CategoriesGridMobile } from './src/components/CategoriesGridMobile';
import { AntiOverbookingBannerMobile } from './src/components/AntiOverbookingBannerMobile';
import { ProductCatalogMobile } from './src/components/ProductCatalogMobile';
import { FlashOffersMobile } from './src/components/FlashOffersMobile';
import { PickupPassModal } from './src/components/PickupPassModal';
import { CartDrawerMobile } from './src/components/CartDrawerMobile';
import { LoginModalMobile } from './src/components/LoginModalMobile';
import { MyReservationsModalMobile } from './src/components/MyReservationsModalMobile';
import {
  NavTab,
  ProductCategory,
  Product,
  FlashOffer,
  CartItem,
  ReservationPass,
  DataLoadState,
} from './src/types';
import { api, BackendReservation } from './src/api/client';
import { reservationToPass, selectActiveReservation } from './src/reservations/recovery';

const APPROVED_RESERVATION_TTL_SECONDS = 10 * 60;

function secondsUntilExpiration(expiration: string | undefined): number {
  if (!expiration) return APPROVED_RESERVATION_TTL_SECONDS;
  const timestamp = new Date(expiration).getTime();
  if (!Number.isFinite(timestamp)) return APPROVED_RESERVATION_TTL_SECONDS;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

const CATEGORY_IMAGES: Record<string, string> = {
  'Lácteos': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
  'Carnes': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  'Panadería': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'Verduras': 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=600&q=80',
  'Frutas': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
  'Conservas': 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80',
};

export default function App() {
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

  // Connection & status
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [dataState, setDataState] = useState<DataLoadState>('loading');
  const [dataError, setDataError] = useState<string>();

  // Modales
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const syncReservations = useCallback(async (userId: string) => {
    setSyncingReservations(true);
    try {
      const list = await api.getUserReservations(userId);
      setReservations(list);
      const active = selectActiveReservation(list);
      if (active) setPass(reservationToPass(active));
      else {
        setPass(null);
        setIsPassOpen(false);
      }
    } catch {
      // Conserva el último estado visible ante una desconexión temporal.
    } finally { setSyncingReservations(false); }
  }, []);

  // 1. Fetch Backend Heartbeat
  const checkHeartbeat = useCallback(async () => {
    try {
      const hb = await api.getHeartbeat();
      setIsOnline(hb.status === 'ONLINE' && !hb.reservationsBlocked);
    } catch {
      setIsOnline(false);
    }
  }, []);

  // 2. Fetch Catalog & Data from Live Backend
  const loadBackendData = useCallback(async () => {
    setDataState('loading');
    setDataError(undefined);
    try {
      await checkHeartbeat();
      const [backendCats, backendProds, backendLots, backendPromos] = await Promise.all([
        api.getCategories(), api.getProducts(), api.getLots(), api.getPromotions(),
      ]);
      const categoryById = new Map(backendCats.map((category) => [category.id, category.nombre]));
      setCategoriesList(Array.from(new Set(['Todos', ...backendCats.map((category) => category.nombre)])));

      const mappedProducts: Product[] = backendProds.map((bp) => {
          const matchingLots = backendLots.filter(
            (l) => l.productoId === bp.id || l.productoNombre === bp.nombre
          );
          const totalStock = matchingLots.reduce(
            (sum, l) => sum + (l.cantidadDisponible || 0),
            0
          );

          return {
            id: bp.id,
            name: bp.nombre,
            category: categoryById.get(bp.categoriaId) || 'Sin categoría',
            price: Number(bp.precioVenta),
            stock: totalStock,
            image:
              CATEGORY_IMAGES[categoryById.get(bp.categoriaId) || ''] ||
              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
            badge: bp.codigoBarras ? `EAN: ${bp.codigoBarras}` : undefined,
          };
      });
      setProducts(mappedProducts);

      const mappedOffers: FlashOffer[] = backendPromos.flatMap((pr) => {
          const relatedLot = backendLots.find((l) => l.id === pr.loteId);
          const relatedProduct = relatedLot && backendProds.find((product) => product.id === relatedLot.productoId);
          if (!relatedLot || !relatedProduct || relatedLot.cantidadDisponible <= 0) return [];
          const originalPrice = Number(relatedProduct.precioVenta);
          const discountedPrice = originalPrice * (1 - pr.descuentoPorcentaje / 100);

          return [{
            id: pr.id,
            title: pr.frasePromocional || relatedProduct.nombre,
            category: categoryById.get(relatedProduct.categoriaId) || 'Sin categoría',
            discountBadge: `-${pr.descuentoPorcentaje}%`,
            aiBadge: Boolean(pr.razonIa),
            urgencyBadge: `${relatedLot.cantidadDisponible} disponibles`,
            price: Number(discountedPrice.toFixed(2)),
            originalPrice,
            stockTotal: relatedLot.cantidadIngresada,
            stockAvailable: relatedLot.cantidadDisponible,
            expiryText: `Caduca: ${new Date(relatedLot.fechaCaducidad).toLocaleDateString()}`,
            image:
              'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
            loteId: relatedLot.id,
            productId: relatedProduct.id,
          }];
      });
      setOffers(mappedOffers);
      setDataState(mappedProducts.length > 0 ? 'ready' : 'empty');
    } catch (error: any) {
      setProducts([]);
      setOffers([]);
      setCategoriesList(['Todos']);
      setIsOnline(false);
      setDataState(error?.response ? 'error' : 'offline');
      setDataError(error?.response?.data?.message || 'No fue posible obtener información del servidor.');
    }
  }, [checkHeartbeat]);

  useEffect(() => {
    void api.restoreSession().then(user => {
      if (user) {
        setCurrentUser(user);
        void syncReservations(user.id);
      }
    });
    const unsubscribe = api.onSessionExpired(() => {
      setCurrentUser(null);
      setPass(null);
      setReservations([]);
    });
    loadBackendData();
    const interval = setInterval(checkHeartbeat, 15000);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadBackendData, checkHeartbeat, syncReservations]);

  useEffect(() => {
    if (!currentUser) return;
    const refresh = () => { void syncReservations(currentUser.id); };
    const interval = setInterval(refresh, 15000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [currentUser, syncReservations]);

  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === id) {
            const next = i.quantity + delta;
            return next > 0 ? { ...i, quantity: next } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSelectCategory = (cat: ProductCategory) => {
    setSelectedCategory(cat);
    setActiveTab('productos');
  };

  // Confirm Real Anti-Overbooking Reservation
  const handleConfirmReservation = async () => {
    if (cart.length === 0) return;
    if (!currentUser) {
      Alert.alert('Inicio de sesión requerido', 'Debes iniciar sesión para reservar stock.');
      setIsLoginOpen(true);
      return;
    }
    setIsSubmitting(true);

    try {
      const userId = currentUser.id;
      const itemsPayload = cart.map((i) => ({
        productoId: i.product.id,
        cantidad: i.quantity,
      }));

      const reservation = await api.createReservation({
        usuarioId: userId,
        items: itemsPayload,
      });

      const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

      setPass({
        code: reservation.codigoRetiro,
        status: reservation.estado,
        remainingSeconds: secondsUntilExpiration(reservation.fechaExpiracion),
        storeLocation: 'Sucursal Matriz',
        items: cart.map((i) => ({
          productName: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
        total,
      });
      void syncReservations(currentUser.id);

      setCart([]);
      setIsCartOpen(false);
      setIsPassOpen(true);
    } catch (err: any) {
      Alert.alert(
        'No se pudo crear la reserva',
        err.message || 'Comprueba tu sesión y la conexión con la tienda.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reserve single flash offer
  const handleReserveOffer = async (offer: FlashOffer) => {
    if (!currentUser) {
      Alert.alert('Inicio de sesión requerido', 'Debes iniciar sesión para reservar esta oferta.');
      setIsLoginOpen(true);
      return;
    }
    try {
      const userId = currentUser.id;
      const matchingProduct = products.find((p) => p.id === offer.productId);

      if (matchingProduct) {
        const reservation = await api.createReservation({
          usuarioId: userId,
          items: [{ productoId: matchingProduct.id, cantidad: 1 }],
        });

        setPass({
          code: reservation.codigoRetiro,
          status: reservation.estado,
          remainingSeconds: secondsUntilExpiration(reservation.fechaExpiracion),
          storeLocation: 'Sucursal Matriz',
          items: [{ productName: offer.title, quantity: 1, price: offer.price }],
          total: offer.price,
        });
        void syncReservations(currentUser.id);
        setIsPassOpen(true);
        return;
      }
    } catch (err: any) {
      Alert.alert(
        'No se pudo reservar la oferta',
        err.message || 'Comprueba tu sesión y la conexión con la tienda.'
      );
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Navbar Superior con Heartbeat y Consulta de PIN */}
      <NavbarMobile
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        isOnline={isOnline}
        userName={currentUser?.nombre}
        onOpenSearchReservation={() => {
          setIsSearchOpen(true);
          if (currentUser) void syncReservations(currentUser.id);
        }}
      />

      {/* Main Content */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'inicio' && (
          <View>
            <HeroSectionMobile
              onNavigate={setActiveTab}
              onOpenPassPreview={() => pass
                ? setIsPassOpen(true)
                : Alert.alert('Sin reserva activa', 'Crea una reserva para consultar tu pase de retiro.')}
            />
            <CategoriesGridMobile
              onSelectCategory={handleSelectCategory}
              categories={categoriesList}
              products={products}
              state={dataState}
            />
            <AntiOverbookingBannerMobile isOnline={isOnline} />
          </View>
        )}

        {activeTab === 'productos' && (
          <ProductCatalogMobile
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={totalCartCount}
            products={products}
            categories={categoriesList}
            state={dataState}
            error={dataError}
            onRetry={loadBackendData}
          />
        )}

        {activeTab === 'ofertas' && (
          <FlashOffersMobile
            offers={offers}
            onReserveOffer={handleReserveOffer}
            state={dataState === 'ready' && offers.length === 0 ? 'empty' : dataState}
            error={dataError}
            onRetry={loadBackendData}
          />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>SK Supermercado Karen</Text>
          <Text style={styles.footerSubtitle}>
            Sistema Omnicanal de Reservas Anti-Overbooking
          </Text>
          <Text style={[styles.footerStatus, { color: isOnline ? '#16A34A' : '#EF4444' }]}>
            {isOnline
              ? '🟢 Servidor Local Tienda: ONLINE (Sincronizado con Caja SIACI)'
              : '🔴 Servidor Local Tienda: DESCONECTADO (Modo Local Seguro)'}
          </Text>
          <Text style={styles.footerCopy}>
            © 2026 Supermercado Karen. Todos los derechos reservados.
          </Text>
        </View>
      </ScrollView>

      {/* Modales */}
      {pass && (
        <PickupPassModal pass={pass} visible={isPassOpen} onClose={() => setIsPassOpen(false)} />
      )}

      <CartDrawerMobile
        visible={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onConfirmReservation={handleConfirmReservation}
        isSubmitting={isSubmitting}
      />

      <LoginModalMobile
        visible={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          void syncReservations(user.id);
        }}
        onLogout={() => {
          setCurrentUser(null);
          setPass(null);
          setReservations([]);
          setCart([]);
        }}
      />

      <MyReservationsModalMobile
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        authenticated={Boolean(currentUser)}
        reservations={reservations}
        syncing={syncingReservations}
        onRefresh={async () => { if (currentUser) await syncReservations(currentUser.id); }}
        onCancel={async id => {
          await api.cancelReservation(id);
          if (currentUser) await syncReservations(currentUser.id);
          await loadBackendData();
        }}
        onOpenPass={reservation => {
          setPass(reservationToPass(reservation));
          setIsPassOpen(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    gap: 4,
    marginTop: 20,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1D3557',
  },
  footerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  footerStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  footerCopy: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 6,
  },
});
