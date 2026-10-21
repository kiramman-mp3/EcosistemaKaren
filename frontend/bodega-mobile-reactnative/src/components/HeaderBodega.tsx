import React, { useState } from 'react';
import { Image, Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confirmAction } from '../utils/dialogs';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

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

const LOGO_WIDTH = 104;
const LOGO_HEIGHT = 40;

export const HeaderBodega: React.FC<HeaderBodegaProps> = ({
  isOnline, operatorName, operatorRole, onOpenReports, onLogout,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const role = ROLE_LABEL[operatorRole] || operatorRole;

  const confirmLogout = () => {
    setProfileOpen(false);
    void confirmAction('Cerrar sesión', '¿Quieres salir de la app de bodega?', {
      confirmLabel: 'Salir', destructive: true,
    }).then(confirmed => { if (confirmed) onLogout(); });
  };

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        {/* El logo siempre va sobre blanco para conservar su rojo y su texto carbón. */}
        <View style={styles.logoPlate} accessible accessibilityLabel="Supermercado Karen">
          <Image
            source={require('../../assets/supermercado_karen.jpeg')}
            style={{ position: 'absolute', width: LOGO_WIDTH - 6, height: LOGO_WIDTH - 6, left: 1, top: (LOGO_HEIGHT - 4 - (LOGO_WIDTH - 6)) / 2 }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.title} numberOfLines={1}>{operatorName}</Text>
          <Text style={styles.operator} numberOfLines={1}>{role}</Text>
        </View>
      </View>

      <View
        style={[styles.status, { backgroundColor: isOnline ? '#0E7A43' : colors.karen }]}
        accessibilityLabel={isOnline ? 'Tienda en línea: las reservas web están activas' : 'Sin conexión con la tienda: reservas web en pausa'}
      >
        <View style={[styles.dot, { backgroundColor: isOnline ? '#7CF0B5' : '#FFFFFF' }]} />
        <Text style={styles.statusText}>{isOnline ? 'En línea' : 'Sin conexión'}</Text>
      </View>

      <TouchableOpacity
        style={styles.iconBtn}
        onPress={toggleTheme}
        accessibilityRole="button"
        accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon-outline'} size={22} color={colors.sticker} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setProfileOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
      >
        <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setProfileOpen(false)}>
          <Pressable style={styles.menu} onPress={event => event.stopPropagation()}>
            <Text style={styles.menuName}>{operatorName}</Text>
            <Text style={styles.menuRole}>{role}</Text>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleTheme(); }} accessibilityRole="button">
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.ink} />
              <Text style={styles.menuItemText}>{isDark ? 'Modo claro' : 'Modo oscuro'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setProfileOpen(false); onOpenReports(); }} accessibilityRole="button">
              <Ionicons name="bar-chart-outline" size={20} color={colors.ink} />
              <Text style={styles.menuItemText}>Movimientos y mermas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={confirmLogout} accessibilityRole="button">
              <Ionicons name="log-out-outline" size={20} color={colors.karenText} />
              <Text style={[styles.menuItemText, { color: colors.karenText }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = themed(() => StyleSheet.create({
  container: {
    backgroundColor: colors.mora, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  logoPlate: { width: LOGO_WIDTH, height: LOGO_HEIGHT, borderRadius: radius.tag, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: colors.sticker, overflow: 'hidden' },
  brandText: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.tag, fontSize: 16, color: colors.sticker, lineHeight: 18 },
  operator: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(42,29,20,0.5)' },
  menu: {
    position: 'absolute', top: 64, right: 12, width: 260, backgroundColor: colors.card,
    borderRadius: radius.block, borderWidth: 2, borderColor: colors.mora, padding: 18,
  },
  menuName: { fontFamily: fonts.tag, fontSize: 20, color: colors.ink },
  menuRole: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  divider: { height: 2, backgroundColor: colors.rule, marginVertical: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  menuItemText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
}));
