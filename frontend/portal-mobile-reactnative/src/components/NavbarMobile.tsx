import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavTab } from '../types';
import { colors, fonts, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface HeaderProps {
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  userName?: string;
  isOnline: boolean;
}

/** Cabecera: marca, cuenta y lista con el total en curso. */
export const NavbarMobile: React.FC<HeaderProps> = ({ cartCount, cartTotal, onOpenCart, onOpenAccount, userName, isOnline }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <View>
      <View style={[styles.header, isDark && { backgroundColor: '#0F172A', borderBottomColor: '#1E293B' }]}>
        <View style={styles.brand}>
          <View style={styles.logo}><Text style={styles.logoText}>K</Text></View>
          <View>
            <Text style={[styles.brandSmall, isDark && { color: '#94A3B8' }]}>Supermercado</Text>
            <Text style={[styles.brandName, isDark && { color: '#F8FAFC' }]}>Karen</Text>
          </View>
        </View>

        {/* Toggle Modo Oscuro / Modo Claro */}
        <TouchableOpacity
          style={styles.themeToggle}
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          <Ionicons name={isDark ? "sunny" : "moon-outline"} size={22} color={isDark ? "#FBBF24" : colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.account} onPress={onOpenAccount} accessibilityRole="button" accessibilityLabel={userName ? `Tu cuenta, ${userName}` : 'Ingresar'}>
          <Ionicons name={userName ? 'person-circle' : 'person-circle-outline'} size={26} color={isDark ? '#F8FAFC' : colors.ink} />
          <Text style={[styles.accountText, isDark && { color: '#F8FAFC' }]} numberOfLines={1}>{userName ? userName.split(' ')[0] : 'Ingresar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cart, isDark && { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }]}
          onPress={onOpenCart}
          accessibilityRole="button"
          accessibilityLabel={`Mi lista, ${cartCount} productos`}
        >
          <Ionicons name="basket-outline" size={22} color={colors.white} />
          <Text style={styles.cartCount}>{cartCount}</Text>
          {cartCount > 0 && <Text style={styles.cartTotal}>${cartTotal.toFixed(2)}</Text>}
        </TouchableOpacity>
      </View>
      {!isOnline && (
        <View style={styles.offline} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
          <Text style={styles.offlineText}>La tienda no responde. Puedes ver productos, pero las reservas están en pausa.</Text>
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
}) => {
  const { isDark } = useTheme();

  return (
    <View style={[styles.tabs, isDark && { backgroundColor: '#0F172A', borderTopColor: '#1E293B' }]} accessibilityRole="tablist">
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
            <View style={[styles.indicator, active && styles.indicatorActive]} />
            <View>
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={23}
                color={active ? (isDark ? '#F8FAFC' : colors.ink) : (isDark ? '#94A3B8' : colors.inkMuted)}
              />
              {badge && (
                <View style={[styles.badge, tab.id === 'ofertas' ? styles.badgeSticker : styles.badgeKaren, isDark && { borderColor: '#0F172A' }]}>
                  <Text style={[styles.badgeText, tab.id === 'ofertas' && { color: colors.ink }]}>{Number(badge) > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabText, isDark && { color: '#94A3B8' }, active && (isDark ? { color: '#F8FAFC', fontFamily: fonts.bold } : styles.tabTextActive)]} numberOfLines={1}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.rule,
  },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 36, height: 36, borderRadius: radius.tag, backgroundColor: colors.karen, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: fonts.tag, fontSize: 24, lineHeight: 28, color: colors.white },
  brandSmall: { fontFamily: fonts.medium, fontSize: 10, color: colors.inkMuted, lineHeight: 12 },
  brandName: { fontFamily: fonts.tag, fontSize: 20, color: colors.ink, lineHeight: 22 },
  themeToggle: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  account: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 6, maxWidth: 120 },
  accountText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, flexShrink: 1 },
  cart: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.tag, backgroundColor: colors.ink },
  cartCount: { fontFamily: fonts.tag, fontSize: 18, color: colors.white },
  cartTotal: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.karen, paddingHorizontal: 16, paddingVertical: 8 },
  offlineText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.white },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.rule },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, gap: 2, paddingBottom: 4 },
  indicator: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 3, borderRadius: 2 },
  indicatorActive: { backgroundColor: colors.karen },
  tabText: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted },
  tabTextActive: { fontFamily: fonts.bold, color: colors.ink },
  badge: { position: 'absolute', top: -5, right: -14, minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  badgeSticker: { backgroundColor: colors.sticker },
  badgeKaren: { backgroundColor: colors.karen },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
});
