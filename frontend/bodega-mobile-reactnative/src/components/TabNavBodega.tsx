import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BodegaTab } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface TabNavBodegaProps {
  activeTab: BodegaTab;
  onTabChange: (tab: BodegaTab) => void;
  role: string;
}

export const TabNavBodega: React.FC<TabNavBodegaProps> = ({
  activeTab,
  onTabChange,
  role,
}) => {
  const tabs: { id: BodegaTab; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; roles: string[] }[] = [
    { id: 'ingreso', icon: 'cube-outline', label: 'Ingreso', roles: ['BODEGUERO','ADMIN'] },
    { id: 'inventario', icon: 'clipboard-outline', label: 'Inventario', roles: ['BODEGUERO','PERCHERO','ADMIN'] },
    { id: 'catalogo', icon: 'grid-outline', label: 'Catálogo', roles: ['BODEGUERO','PERCHERO','ADMIN'] },
    { id: 'caja', icon: 'receipt-outline', label: 'Caja', roles: ['BODEGUERO','ADMIN'] },
    { id: 'promociones', icon: 'pricetags-outline', label: 'Promociones', roles: ['ADMIN'] },
  ];
  return (
    <View style={styles.container}>
      {tabs.filter(tab => tab.roles.includes(role)).map(tab => <TouchableOpacity key={tab.id}
        style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
        onPress={() => onTabChange(tab.id)} activeOpacity={0.8}>
        <Ionicons name={tab.icon} size={21} color={activeTab === tab.id ? '#FFFFFF' : '#64748B'} style={styles.tabIcon} />
        <Text
          style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          maxFontSizeMultiplier={1.15}
        >
          {tab.label}
        </Text>
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
  tabIcon: { marginBottom: 2 },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    width: '100%',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});
