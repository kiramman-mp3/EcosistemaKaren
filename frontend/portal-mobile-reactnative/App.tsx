import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  Text,
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
import { INITIAL_PASS } from './src/data/mockData';
import {
  NavTab,
  ProductCategory,
  Product,
  FlashOffer,
  CartItem,
  ReservationPass,
} from './src/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('Todos');
  const [cart, setCart] = useState<CartItem[]>([
    {
      product: {
        id: 'prod-02',
        name: 'Yogurt Griego Toni Natural 500g',
        category: 'Lácteos',
        price: 2.50,
        stock: 45,
        image:
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
      },
      quantity: 2,
    },
    {
      product: {
        id: 'prod-01',
        name: 'Leche Entera Pasteurizada 1 Litro',
        category: 'Lácteos',
        price: 0.95,
        stock: 90,
        image:
          'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
      },
      quantity: 1,
    },
  ]);
  const [pass, setPass] = useState<ReservationPass>(INITIAL_PASS);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

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

  const handleReserveOffer = (offer: FlashOffer) => {
    setPass({
      ...INITIAL_PASS,
      code: `KR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      remainingSeconds: 600,
      items: [{ productName: offer.title, quantity: 1, price: offer.price }],
      total: offer.price,
    });
    setIsPassOpen(true);
  };

  const handleConfirmReservation = () => {
    const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    setPass({
      ...INITIAL_PASS,
      code: `KR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      remainingSeconds: 600,
      items: cart.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
      })),
      total,
    });
    setIsCartOpen(false);
    setIsPassOpen(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Navbar Superior */}
      <NavbarMobile
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
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
            <AntiOverbookingBannerMobile />
          </View>
        )}

        {activeTab === 'productos' && (
          <ProductCatalogMobile
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={totalCartCount}
          />
        )}

        {activeTab === 'ofertas' && (
          <FlashOffersMobile onReserveOffer={handleReserveOffer} />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>SK Supermercado Karen</Text>
          <Text style={styles.footerSubtitle}>
            Sistema Omnicanal de Reservas Anti-Overbooking
          </Text>
          <Text style={styles.footerStatus}>
            🟢 Servidor Local Tienda: ONLINE (192.168.1.50)
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
      />

      <LoginModalMobile
        visible={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
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
    color: '#16A34A',
    marginTop: 4,
  },
  footerCopy: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 6,
  },
});
