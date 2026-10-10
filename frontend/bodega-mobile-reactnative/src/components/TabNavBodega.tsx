import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BodegaTab } from '../types';

interface TabNavBodegaProps {
  activeTab: BodegaTab;
  onTabChange: (tab: BodegaTab) => void;
  criticalAlertsCount: number;
  role: string;
}

export const TabNavBodega: React.FC<TabNavBodegaProps> = ({
  activeTab,
  onTabChange,
  criticalAlertsCount,
  role,
}) => {
  const tabs: { id: BodegaTab; icon: string; label: string; roles: string[] }[] = [
    { id: 'ingreso', icon: '📦', label: 'Ingreso', roles: ['BODEGUERO','ADMIN'] },
    { id: 'alertas', icon: '🚨', label: 'Alertas', roles: ['BODEGUERO','PERCHERO','ADMIN'] },
    { id: 'inventario', icon: '📋', label: 'Inventario', roles: ['BODEGUERO','PERCHERO','ADMIN'] },
    { id: 'caja', icon: '🧾', label: 'Caja', roles: ['BODEGUERO','ADMIN'] },
    { id: 'reportes', icon: '📊', label: 'Reportes', roles: ['BODEGUERO','PERCHERO','ADMIN'] },
    { id: 'aprobaciones', icon: '✅', label: 'Aprobar', roles: ['ADMIN'] },
  ];
  return (
    <View style={styles.container}>
      {tabs.filter(tab => tab.roles.includes(role)).map(tab => <TouchableOpacity key={tab.id}
        style={[styles.tabBtn, activeTab === tab.id && (tab.id === 'alertas' ? styles.tabBtnActiveRed : styles.tabBtnActive)]}
        onPress={() => onTabChange(tab.id)} activeOpacity={0.8}>
        <View style={styles.iconWithBadge}><Text style={styles.tabIcon}>{tab.icon}</Text>{tab.id === 'alertas' && criticalAlertsCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{criticalAlertsCount}</Text></View>}</View>
        <Text style={[styles.tabText, activeTab === tab.id && (tab.id === 'alertas' ? styles.tabTextActiveRed : styles.tabTextActive)]}>{tab.label}</Text>
      </TouchableOpacity>)}
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
