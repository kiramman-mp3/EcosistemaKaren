import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BodegaTab } from '../types';

interface TabNavBodegaProps {
  activeTab: BodegaTab;
  onTabChange: (tab: BodegaTab) => void;
  criticalAlertsCount: number;
}

export const TabNavBodega: React.FC<TabNavBodegaProps> = ({
  activeTab,
  onTabChange,
  criticalAlertsCount,
}) => {
  return (
    <View style={styles.container}>
      {/* Tab 1: Ingreso Lotes */}
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'ingreso' && styles.tabBtnActive]}
        onPress={() => onTabChange('ingreso')}
        activeOpacity={0.8}
      >
        <Text style={styles.tabIcon}>📦</Text>
        <Text style={[styles.tabText, activeTab === 'ingreso' && styles.tabTextActive]}>
          Ingreso
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Alertas FEFO con Badge */}
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'alertas' && styles.tabBtnActiveRed]}
        onPress={() => onTabChange('alertas')}
        activeOpacity={0.8}
      >
        <View style={styles.iconWithBadge}>
          <Text style={styles.tabIcon}>🚨</Text>
          {criticalAlertsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{criticalAlertsCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabText, activeTab === 'alertas' && styles.tabTextActiveRed]}>
          Alertas
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Inventario */}
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'inventario' && styles.tabBtnActive]}
        onPress={() => onTabChange('inventario')}
        activeOpacity={0.8}
      >
        <Text style={styles.tabIcon}>📋</Text>
        <Text style={[styles.tabText, activeTab === 'inventario' && styles.tabTextActive]}>
          Inventario
        </Text>
      </TouchableOpacity>

      {/* Tab 4: Caja SIACI */}
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'caja' && styles.tabBtnActive]}
        onPress={() => onTabChange('caja')}
        activeOpacity={0.8}
      >
        <Text style={styles.tabIcon}>🧾</Text>
        <Text style={[styles.tabText, activeTab === 'caja' && styles.tabTextActive]}>
          Caja SIACI
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  tabBtnActive: {
    backgroundColor: '#1E293B',
  },
  tabBtnActiveRed: {
    backgroundColor: '#FEE2E2',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  iconWithBadge: {
    position: 'relative',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextActiveRed: {
    color: '#DC2626',
  },
});
