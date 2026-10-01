import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  Alert,
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
import { SearchReservationModalMobile } from './src/components/SearchReservationModalMobile';
import { INITIAL_PASS, PRODUCTS_CATALOG, FLASH_OFFERS_DATA } from './src/data/mockData';
import {
  NavTab,
  ProductCategory,
  Product,
  FlashOffer,
  CartItem,
  ReservationPass,
} from './src/types';
import { api, BackendProduct, BackendLot, BackendPromotion } from './src/api/client';

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
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([
    'Todos', 'Carnes', 'Lácteos', 'Frutas', 'Panadería', 'Verduras', 'Conservas'
  ]);

  const [products, setProducts] = useState<Product[]>(PRODUCTS_CATALOG);
  const [offers, setOffers] = useState<FlashOffer[]>(FLASH_OFFERS_DATA);

  const [cart, setCart] = useState<CartItem[]>([
    {
      product: PRODUCTS_CATALOG[1],
      quantity: 1,
    },
    {
      product: PRODUCTS_CATALOG[0],
      quantity: 1,
    },
  ]);

  const [pass, setPass] = useState<ReservationPass>(INITIAL_PASS);
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; email: string; rol?: string } | null>(null);

  // Connection & status
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modales
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
    try {
      await checkHeartbeat();

      // Categories
      const backendCats = await api.getCategories().catch(() => []);
      if (backendCats && backendCats.length > 0) {
        const catNames = ['Todos', ...backendCats.map((c) => c.nombre as ProductCategory)];
        setCategoriesList(Array.from(new Set(catNames)) as ProductCategory[]);
      }

      // Products & Lots
      const [backendProds, backendLots] = await Promise.all([
        api.getProducts().catch(() => [] as BackendProduct[]),
        api.getLots().catch(() => [] as BackendLot[]),
      ]);

      if (backendProds && backendProds.length > 0) {
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
            category: (bp.descripcion && categoriesList.includes(bp.descripcion as any)
              ? bp.descripcion
              : 'Lácteos') as ProductCategory,
            price: Number(bp.precioVenta) || 1.0,
            stock: totalStock > 0 ? totalStock : 25,
            image:
              CATEGORY_IMAGES[bp.descripcion || ''] ||
              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
            badge: bp.codigoBarras ? `EAN: ${bp.codigoBarras}` : undefined,
          };
        });
        setProducts(mappedProducts);
      }

      // Promotions
      const backendPromos = await api.getPromotions().catch(() => [] as BackendPromotion[]);
      if (backendPromos && backendPromos.length > 0) {
        const mappedOffers: FlashOffer[] = backendPromos.map((pr) => {
          const relatedLot = backendLots.find((l) => l.id === pr.loteId);
          const originalPrice = 2.50;
          const discountedPrice = originalPrice * (1 - pr.descuentoPorcentaje / 100);

          return {
            id: pr.id,
            title: pr.frasePromocional || 'Oferta Relámpago Anti-Desperdicio',
            category: 'Lácteos',
            discountBadge: `-${pr.descuentoPorcentaje}%`,
            aiBadge: Boolean(pr.razonIa),
            urgencyBadge: '¡Algoritmo Gemini!',
            price: Number(discountedPrice.toFixed(2)),
            originalPrice,
            stockTotal: relatedLot ? relatedLot.cantidadIngresada : 50,
            stockAvailable: relatedLot ? relatedLot.cantidadDisponible : 15,
            expiryText: relatedLot
              ? `⏰ Caduca: ${new Date(relatedLot.fechaCaducidad).toLocaleDateString()}`
              : '⏰ Caduca: Próximamente',
            image:
              'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
          };
        });
        setOffers(mappedOffers);
      }
    } catch {
      // Graceful fallback to default mock data
    }
  }, [checkHeartbeat]);

  useEffect(() => {
    loadBackendData();
    const interval = setInterval(checkHeartbeat, 15000);
    return () => clearInterval(interval);
  }, [loadBackendData, checkHeartbeat]);

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
    setIsSubmitting(true);

    try {
      const userId = currentUser?.id || 'u8a7b6c5-demo-user';
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
        ...INITIAL_PASS,
        code: reservation.codigoRetiro,
        remainingSeconds: 600,
        items: cart.map((i) => ({
          productName: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
        total,
      });

      setCart([]);
      setIsCartOpen(false);
      setIsPassOpen(true);
    } catch (err: any) {
      // Fallback local if server is offline or fails
      const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      const fakeCode = `KR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      setPass({
        ...INITIAL_PASS,
        code: fakeCode,
        remainingSeconds: 600,
        items: cart.map((i) => ({
          productName: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
        total,
      });

      setCart([]);
      setIsCartOpen(false);
      setIsPassOpen(true);

      if (err.message) {
        Alert.alert('Aviso de Reserva', err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reserve single flash offer
  const handleReserveOffer = async (offer: FlashOffer) => {
    try {
      const userId = currentUser?.id || 'u8a7b6c5-demo-user';
      // Search matching product in catalog
      const matchingProduct = products.find((p) => p.name === offer.title) || products[0];

      if (matchingProduct) {
        const reservation = await api.createReservation({
          usuarioId: userId,
          items: [{ productoId: matchingProduct.id, cantidad: 1 }],
        });

        setPass({
          ...INITIAL_PASS,
          code: reservation.codigoRetiro,
          remainingSeconds: 600,
          items: [{ productName: offer.title, quantity: 1, price: offer.price }],
          total: offer.price,
        });
        setIsPassOpen(true);
        return;
      }
    } catch {
      // Fallback local
    }

    setPass({
      ...INITIAL_PASS,
      code: `KR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      remainingSeconds: 600,
      items: [{ productName: offer.title, quantity: 1, price: offer.price }],
      total: offer.price,
    });
    setIsPassOpen(true);
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
        onOpenSearchReservation={() => setIsSearchOpen(true)}
      />

      {/* Main Content */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'inicio' && (
          <View>
            <HeroSectionMobile
              onNavigate={setActiveTab}
              onOpenPassPreview={() => setIsPassOpen(true)}
            />
            <CategoriesGridMobile onSelectCategory={handleSelectCategory} />
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
          />
        )}

        {activeTab === 'ofertas' && (
          <FlashOffersMobile
            offers={offers}
            onReserveOffer={handleReserveOffer}
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
      <PickupPassModal
        pass={pass}
        visible={isPassOpen}
        onClose={() => setIsPassOpen(false)}
      />

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
        onLoginSuccess={(user) => setCurrentUser(user)}
        onLogout={() => setCurrentUser(null)}
      />

      <SearchReservationModalMobile
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
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
