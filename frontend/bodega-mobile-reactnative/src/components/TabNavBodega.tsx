import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BodegaTab } from '../types';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { Bump } from './motion';

interface TabNavBodegaProps {
  activeTab: BodegaTab;
  onTabChange: (tab: BodegaTab) => void;
  role: string;
  criticalAlertsCount: number;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { id: BodegaTab; icon: IconName; label: string; roles: string[] }[] = [
  { id: 'ingreso', icon: 'cube-outline', label: 'Recibir', roles: ['BODEGUERO', 'ADMIN'] },
  { id: 'alertas', icon: 'time-outline', label: 'Por vencer', roles: ['BODEGUERO', 'PERCHERO', 'ADMIN'] },
  { id: 'inventario', icon: 'layers-outline', label: 'Lotes', roles: ['BODEGUERO', 'PERCHERO', 'ADMIN'] },
  { id: 'caja', icon: 'qr-code-outline', label: 'Caja', roles: ['BODEGUERO', 'ADMIN'] },
  { id: 'catalogo', icon: 'pricetag-outline', label: 'Catálogo', roles: ['BODEGUERO', 'PERCHERO', 'ADMIN'] },
  { id: 'promociones', icon: 'megaphone-outline', label: 'Ofertas', roles: ['ADMIN'] },
];

export const TabNavBodega: React.FC<TabNavBodegaProps> = ({ activeTab, onTabChange, role, criticalAlertsCount }) => (
  <View style={styles.container} accessibilityRole="tablist">
    {TABS.filter(tab => tab.roles.includes(role)).map(tab => {
      const active = activeTab === tab.id;
      const badge = tab.id === 'alertas' && criticalAlertsCount > 0;
      return (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={badge ? `${tab.label}, ${criticalAlertsCount} lotes críticos` : tab.label}
        >
          <View style={[styles.pill, active && styles.pillActive]}>
            <Ionicons name={tab.icon} size={24} color={active ? colors.mora : colors.inkMuted} />
            {badge && (
              <Bump trigger={criticalAlertsCount} style={styles.badgeWrap}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{criticalAlertsCount > 99 ? '99+' : criticalAlertsCount}</Text>
                </View>
              </Bump>
            )}
          </View>
          <Text
            style={[styles.label, active && styles.labelActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.2}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = themed(() => StyleSheet.create({
  container: {
    flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 2, borderTopColor: colors.mora,
    paddingBottom: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 64, gap: 2, paddingTop: 6 },
  pill: { minWidth: 52, height: 34, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.sticker, borderColor: colors.mora },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted, paddingHorizontal: 2 },
  labelActive: { fontFamily: fonts.bold, color: colors.ink },
  badgeWrap: { position: 'absolute', top: -6, right: -8 },
  badge: {
    minWidth: 22, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.karen, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
}));
