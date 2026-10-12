import React, { useState } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confirmAction } from '../utils/dialogs';
import { colors, fonts, radius } from '../theme/tokens';

interface HeaderBodegaProps {
  isOnline: boolean;
  operatorName: string;
  operatorRole: string;
  onOpenReports: () => void;
  onLogout: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  BODEGUERO: 'Bodega',
  PERCHERO: 'Percha',
  ADMIN: 'Administración',
};

export const HeaderBodega: React.FC<HeaderBodegaProps> = ({
  isOnline, operatorName, operatorRole, onOpenReports, onLogout,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const role = ROLE_LABEL[operatorRole] || operatorRole;

  const confirmLogout = () => {
    setProfileOpen(false);
    void confirmAction('Cerrar sesión', '¿Deseas salir de la aplicación de bodega?', {
      confirmLabel: 'Salir', destructive: true,
    }).then(confirmed => { if (confirmed) onLogout(); });
  };

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logo}><Text style={styles.logoText}>K</Text></View>
        <View style={styles.brandText}>
          <Text style={styles.title}>Bodega Karen</Text>
          <Text style={styles.operator} numberOfLines={1}>{operatorName}, {role}</Text>
        </View>
      </View>

      <View
        style={[styles.status, { backgroundColor: isOnline ? 'rgba(18,128,92,0.22)' : 'rgba(213,43,30,0.28)' }]}
        accessibilityLabel={isOnline ? 'Tienda en línea: las reservas web están activas' : 'Sin conexión con la tienda: reservas web en pausa'}
      >
        <View style={[styles.dot, { backgroundColor: isOnline ? '#3DDC97' : '#FF8A80' }]} />
        <Text style={styles.statusText}>{isOnline ? 'En línea' : 'Sin conexión'}</Text>
      </View>

      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => setProfileOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
      >
        <Ionicons name="person-circle-outline" size={28} color={colors.white} />
      </TouchableOpacity>

      <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setProfileOpen(false)}>
          <Pressable style={styles.menu} onPress={event => event.stopPropagation()}>
            <Text style={styles.menuName}>{operatorName}</Text>
            <Text style={styles.menuRole}>{role}</Text>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setProfileOpen(false); onOpenReports(); }}
              accessibilityRole="button"
            >
              <Ionicons name="bar-chart-outline" size={20} color={colors.ink} />
              <Text style={styles.menuItemText}>Movimientos y mermas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={confirmLogout} accessibilityRole="button">
              <Ionicons name="log-out-outline" size={20} color={colors.karen} />
              <Text style={[styles.menuItemText, { color: colors.karenDeep }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  logo: { width: 36, height: 36, borderRadius: radius.tag, backgroundColor: colors.karen, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: fonts.tag, fontSize: 24, color: colors.white, lineHeight: 28 },
  brandText: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.tag, fontSize: 20, color: colors.white, lineHeight: 22 },
  operator: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.72)' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
  profileBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(19,40,75,0.4)' },
  menu: {
    position: 'absolute', top: 60, right: 12, width: 250, backgroundColor: colors.white,
    borderRadius: radius.tag, padding: 16,
  },
  menuName: { fontFamily: fonts.tag, fontSize: 20, color: colors.ink },
  menuRole: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  divider: { height: 1, backgroundColor: colors.rule, marginVertical: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  menuItemText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
});
