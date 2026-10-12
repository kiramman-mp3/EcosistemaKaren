import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BodegaTab } from '../types';
import { colors, fonts } from '../theme/tokens';

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
          <View style={[styles.indicator, active && styles.indicatorActive]} />
          <View>
            <Ionicons name={tab.icon} size={24} color={active ? colors.ink : colors.inkMuted} />
            {badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{criticalAlertsCount > 99 ? '99+' : criticalAlertsCount}</Text>
              </View>
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.rule,
    paddingBottom: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, gap: 2 },
  indicator: { position: 'absolute', top: 0, left: '18%', right: '18%', height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.karen },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted, paddingHorizontal: 2 },
  labelActive: { fontFamily: fonts.bold, color: colors.ink },
  badge: {
    position: 'absolute', top: -6, right: -14, minWidth: 22, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.karen, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
});
