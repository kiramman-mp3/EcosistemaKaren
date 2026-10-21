import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavTab } from '../types';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Bump, PopPressable } from './motion';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface HeaderProps {
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  userName?: string;
  isOnline: boolean;
}

const LOGO_WIDTH = 124;
const LOGO_HEIGHT = 46;

/** Cabecera: logo, tema, cuenta y la canasta con el total en curso. */
export const NavbarMobile: React.FC<HeaderProps> = ({ cartCount, cartTotal, onOpenCart, onOpenAccount, userName, isOnline }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.brand}>
          {/* El logo siempre va sobre blanco para conservar su rojo y su texto carbón. */}
          <View style={styles.logoPlate} accessible accessibilityLabel="Supermercado Karen">
            <Image
              source={require('../../assets/supermercado_karen.jpeg')}
              style={{ position: 'absolute', width: LOGO_WIDTH - 6, height: LOGO_WIDTH - 6, left: 1, top: (LOGO_HEIGHT - 4 - (LOGO_WIDTH - 6)) / 2 }}
              resizeMode="contain"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon-outline'} size={22} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.account} onPress={onOpenAccount} accessibilityRole="button" accessibilityLabel={userName ? `Tu cuenta, ${userName}` : 'Ingresar'}>
          <Ionicons name={userName ? 'person-circle' : 'person-circle-outline'} size={26} color={colors.ink} />
          <Text style={styles.accountText} numberOfLines={1}>{userName ? userName.split(' ')[0] : 'Ingresar'}</Text>
        </TouchableOpacity>

        <Bump trigger={cartCount}>
          <PopPressable
            onPress={onOpenCart}
            backgroundColor={colors.karen}
            accessibilityLabel={`Mi lista, ${cartCount} productos`}
            bodyStyle={styles.cart}
          >
            <Ionicons name="basket-outline" size={22} color="#FFFFFF" />
            <Text style={styles.cartCount}>{cartCount}</Text>
            {cartCount > 0 && <Text style={styles.cartTotal}>${cartTotal.toFixed(2)}</Text>}
          </PopPressable>
        </Bump>
      </View>
      {!isOnline && (
        <View style={styles.offline} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
          <Text style={styles.offlineText}>Por ahora no podemos apartar productos. Puedes seguir mirando el catálogo.</Text>
        </View>
      )}
    </View>
  );
};

const TABS: { id: NavTab; label: string; icon: IconName; activeIcon: IconName }[] = [
  { id: 'inicio', label: 'Inicio', icon: 'home-outline', activeIcon: 'home' },
  { id: 'productos', label: 'Productos', icon: 'grid-outline', activeIcon: 'grid' },
  { id: 'ofertas', label: 'Por vencer', icon: 'pricetag-outline', activeIcon: 'pricetag' },
  { id: 'reservas', label: 'Mis reservas', icon: 'ticket-outline', activeIcon: 'ticket' },
];

export const TabBar: React.FC<{ activeTab: NavTab; onChange: (tab: NavTab) => void; offersCount: number; hasActivePass: boolean }> = ({
  activeTab, onChange, offersCount, hasActivePass,
}) => (
  <View style={styles.tabs} accessibilityRole="tablist">
    {TABS.map(tab => {
      const active = activeTab === tab.id;
      const badge = tab.id === 'ofertas' && offersCount > 0 ? String(offersCount) : tab.id === 'reservas' && hasActivePass ? '1' : null;
      return (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onChange(tab.id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={tab.label}
        >
          <View style={[styles.iconPill, active && styles.iconPillActive]}>
            <Ionicons name={active ? tab.activeIcon : tab.icon} size={22} color={active ? colors.mora : colors.inkMuted} />
            {badge && (
              <View style={[styles.badge, tab.id === 'ofertas' ? styles.badgeOffers : styles.badgeKaren]}>
                <Text style={[styles.badgeText, tab.id === 'ofertas' && { color: colors.mora }]}>{Number(badge) > 99 ? '99+' : badge}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>{tab.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = themed(() => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.card, borderBottomWidth: 2, borderBottomColor: colors.mora,
  },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  logoPlate: {
    width: LOGO_WIDTH, height: LOGO_HEIGHT, borderRadius: radius.tag, backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: colors.mora, overflow: 'hidden',
  },
  iconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  account: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 4, maxWidth: 96 },
  accountText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, flexShrink: 1 },
  cart: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14 },
  cartCount: { fontFamily: fonts.tag, fontSize: 18, color: '#FFFFFF' },
  cartTotal: { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.karen, paddingHorizontal: 16, paddingVertical: 8 },
  offlineText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: '#FFFFFF' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 2, borderTopColor: colors.mora },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 64, gap: 2, paddingVertical: 6 },
  iconPill: { minWidth: 52, height: 32, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  iconPillActive: { backgroundColor: colors.sticker, borderColor: colors.mora },
  tabText: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted },
  tabTextActive: { fontFamily: fonts.bold, color: colors.ink },
  badge: { position: 'absolute', top: -6, right: -4, minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
  badgeOffers: { backgroundColor: colors.naranja },
  badgeKaren: { backgroundColor: colors.karen },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
}));
