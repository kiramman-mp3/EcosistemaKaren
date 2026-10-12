import React, { useState } from 'react';
import { Alert, Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderBodegaProps {
  isOnline: boolean;
  operatorName: string;
  operatorRole: string;
  criticalAlertsCount: number;
  alertsActive: boolean;
  onOpenAlerts: () => void;
  onOpenReports: () => void;
  onLogout: () => void;
}

export const HeaderBodega: React.FC<HeaderBodegaProps> = ({
  isOnline,
  operatorName,
  operatorRole,
  criticalAlertsCount,
  alertsActive,
  onOpenAlerts,
  onOpenReports,
  onLogout,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);

  const confirmLogout = () => {
    setProfileOpen(false);
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas salir de la aplicación de bodega?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="storefront-outline" size={22} color="#F87171" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.titleMain}>Supermercado </Text>
              <Text style={styles.titleKaren}>Karen</Text>
            </View>
            <Text style={styles.subtitle}>Inventario y Catálogo</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.headerAction, alertsActive && styles.alertActionActive]}
            onPress={onOpenAlerts}
            accessibilityRole="button"
            accessibilityLabel={`Alertas${criticalAlertsCount ? `, ${criticalAlertsCount} críticas` : ''}`}
          >
            <Ionicons name="warning-outline" size={22} color={alertsActive ? '#FFFFFF' : '#FBBF24'} />
            {criticalAlertsCount > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{criticalAlertsCount > 99 ? '99+' : criticalAlertsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => setProfileOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
          >
            <Ionicons name="person-outline" size={21} color="#E2E8F0" />
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

      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setProfileOpen(false)}>
          <Pressable style={styles.profileMenu} onPress={(event) => event.stopPropagation()}>
            <View style={styles.profileMenuHeader}>
              <View style={styles.profileAvatar}><Ionicons name="person-outline" size={22} color="#475569" /></View>
              <View style={styles.profileIdentity}>
                <Text style={styles.profileName}>{operatorName}</Text>
                <Text style={styles.profileRole}>{operatorRole}</Text>
              </View>
            </View>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.reportMenuBtn} onPress={() => {
              setProfileOpen(false);
              onOpenReports();
            }}>
              <Ionicons name="bar-chart-outline" size={18} color="#334155" />
              <Text style={styles.reportMenuText}>Reportes y movimientos</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.logoutMenuBtn} onPress={confirmLogout}>
              <Ionicons name="log-out-outline" size={19} color="#DC2626" />
              <Text style={styles.logoutMenuText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAction: {
    width: 38,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  alertActionActive: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  headerActionIcon: {
    fontSize: 18,
  },
  alertBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  profileBtn: {
    width: 38,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 18,
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  profileMenu: {
    position: 'absolute',
    top: 66,
    right: 16,
    width: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 12,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 20 },
  profileIdentity: { flex: 1 },
  profileName: { color: '#1E293B', fontSize: 13, fontWeight: '900' },
  profileRole: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  reportMenuBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  reportMenuIcon: { fontSize: 17 },
  reportMenuText: { color: '#1E293B', fontSize: 12, fontWeight: '900' },
  logoutMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  logoutMenuIcon: { color: '#DC2626', fontSize: 17, fontWeight: '900' },
  logoutMenuText: { color: '#B91C1C', fontSize: 12, fontWeight: '900' },
});
