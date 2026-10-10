import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface HeaderBodegaProps {
  isOnline: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  operatorName: string;
  onLogout: () => void;
}

export const HeaderBodega: React.FC<HeaderBodegaProps> = ({
  isOnline,
  onRefresh,
  refreshing,
  operatorName,
  onLogout,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🏬</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.titleMain}>Bodega & Perchas </Text>
              <Text style={styles.titleKaren}>Karen</Text>
            </View>
            <Text style={styles.subtitle}>Back-Office Móvil • Control FEFO</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.syncBtn, refreshing && styles.syncBtnRefreshing]}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            <Text style={styles.syncIcon}>{refreshing ? '⏳' : '🔄'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statusBar}>
        <View style={styles.operatorBox}>
          <Text style={styles.operatorLabel}>OPERADOR:</Text>
          <Text style={styles.operatorName}>{operatorName}</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: isOnline ? '#DCFCE7' : '#FEE2E2' },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: isOnline ? '#16A34A' : '#DC2626' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isOnline ? '#15803D' : '#B91C1C' },
            ]}
          >
            {isOnline ? 'LAN Tienda: ONLINE' : 'LAN Tienda: OFFLINE'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoIcon: {
    fontSize: 20,
  },
  titleRow: {
    flexDirection: 'row',
  },
  titleMain: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  titleKaren: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F87171',
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  syncBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#7F1D1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FEE2E2',
    fontWeight: '800',
    fontSize: 11,
  },
  syncBtnRefreshing: {
    opacity: 0.6,
  },
  syncIcon: {
    fontSize: 16,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  operatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  operatorLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  operatorName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
