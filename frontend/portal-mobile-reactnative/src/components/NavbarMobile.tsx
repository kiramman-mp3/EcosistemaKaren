import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavTab } from '../types';

interface NavbarMobileProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenLogin: () => void;
}

export const NavbarMobile: React.FC<NavbarMobileProps> = ({
  activeTab,
  onTabChange,
  cartCount,
  onOpenCart,
  onOpenLogin,
}) => {
  return (
    <View style={styles.container}>
      {/* Brand Row */}
      <View style={styles.topRow}>
        <TouchableOpacity 
          style={styles.brand} 
          onPress={() => onTabChange('inicio')}
          activeOpacity={0.8}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeS}>S</Text>
            <Text style={styles.logoBadgeK}>K</Text>
          </View>
          <View>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>Supermercado </Text>
              <Text style={styles.brandTitleKaren}>Karen</Text>
            </View>
            <Text style={styles.brandSubtitle}>Reservas Anti-Overbooking</Text>
          </View>
        </TouchableOpacity>

        {/* Right Actions */}
        <View style={styles.actionRow}>
          {/* Iniciar sesión (outline azul) */}
          <TouchableOpacity 
            style={styles.loginOutlineBtn} 
            onPress={onOpenLogin}
            activeOpacity={0.7}
          >
            <Text style={styles.loginOutlineText}>Acceder</Text>
          </TouchableOpacity>

          {/* Botón Carrito */}
          <TouchableOpacity 
            style={styles.cartBtn} 
            onPress={onOpenCart}
            activeOpacity={0.8}
          >
            <Text style={styles.cartIconText}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Menu: [Inicio, Productos, Ofertas] */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'inicio' && styles.tabBtnActive]}
          onPress={() => onTabChange('inicio')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'inicio' && styles.tabTextActive,
            ]}
          >
            Inicio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'productos' && styles.tabBtnActive]}
          onPress={() => onTabChange('productos')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'productos' && styles.tabTextActive,
            ]}
          >
            Productos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ofertas' && styles.tabBtnActiveRed]}
          onPress={() => onTabChange('ofertas')}
        >
          <View style={styles.tabOfferContent}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'ofertas' && styles.tabTextActiveRed,
              ]}
            >
              Ofertas
            </Text>
            <View style={styles.pillFire}>
              <Text style={styles.pillFireText}>IA 🔥</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1D3557',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeS: {
    color: '#EF4444',
    fontWeight: '900',
    fontSize: 16,
  },
  logoBadgeK: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  brandTitleRow: {
    flexDirection: 'row',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D3557',
  },
  brandTitleKaren: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginOutlineBtn: {
    borderWidth: 1.5,
    borderColor: '#1D3557',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  loginOutlineText: {
    color: '#1D3557',
    fontSize: 12,
    fontWeight: '700',
  },
  cartBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 7,
    position: 'relative',
  },
  cartIconText: {
    fontSize: 16,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  tabBtnActive: {
    backgroundColor: '#1D3557',
  },
  tabBtnActiveRed: {
    backgroundColor: '#FEE2E2',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabTextActiveRed: {
    color: '#EF4444',
    fontWeight: '800',
  },
  tabOfferContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillFire: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pillFireText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
