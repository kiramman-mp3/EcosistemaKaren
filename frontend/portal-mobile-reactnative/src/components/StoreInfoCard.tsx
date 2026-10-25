import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { STORE_FULL_ADDRESS, STORE_INFO, STORE_MAPS_URL, whatsappLink } from '../config/storeInfo';
import { notify } from '../utils/dialogs';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const open = (url: string) => {
  Linking.openURL(url).catch(() => notify('No pudimos abrir el enlace', 'Inténtalo de nuevo desde tu navegador.'));
};

const Row: React.FC<{ icon: IconName; label: string; text: string; url?: string }> = ({ icon, label, text, url }) => {
  const content = (
    <>
      <Ionicons name={icon} size={20} color={colors.ink} />
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowText, url ? styles.rowLink : null]}>{text}</Text>
      </View>
    </>
  );
  return url ? (
    <TouchableOpacity style={styles.row} onPress={() => open(url)} accessibilityRole="link" accessibilityLabel={`${label}: ${text}`}>{content}</TouchableOpacity>
  ) : (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${text}`}>{content}</View>
  );
};

/** Dónde queda la tienda y cómo contactarla: dirección, horario, teléfono, correo, WhatsApp, Facebook y mapa. */
export const StoreInfoCard: React.FC = () => (
  <View style={styles.card}>
    <Text style={styles.title}>{STORE_INFO.tradeName}</Text>
    <Row icon="location-outline" label="Dirección" text={STORE_FULL_ADDRESS} />
    <Row icon="time-outline" label="Horario" text={STORE_INFO.hours.long} />
    <Row icon="call-outline" label="Teléfono" text={STORE_INFO.phone.label} url={STORE_INFO.phone.href} />
    <Row icon="mail-outline" label="Correo" text={STORE_INFO.email} url={`mailto:${STORE_INFO.email}`} />
    <View style={styles.actions}>
      <Button label="Cómo llegar" icon="map-outline" variant="outline" compact onPress={() => open(STORE_MAPS_URL)} style={styles.flex} />
      <Button
        label="WhatsApp"
        icon="logo-whatsapp"
        variant="outline"
        compact
        onPress={() => open(whatsappLink(`Hola ${STORE_INFO.tradeName}, necesito ayuda con una reserva`))}
        accessibilityLabel={`Escribir por WhatsApp al ${STORE_INFO.whatsapp.label}`}
        style={styles.flex}
      />
    </View>
    <TouchableOpacity style={styles.facebook} onPress={() => open(STORE_INFO.facebookUrl)} accessibilityRole="link" accessibilityLabel="Abrir Facebook de la tienda">
      <Ionicons name="logo-facebook" size={18} color={colors.inkSoft} />
      <Text style={styles.facebookText}>Síguenos en Facebook</Text>
    </TouchableOpacity>
  </View>
);

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: {
    marginHorizontal: 16, marginTop: 20, padding: 16, gap: 12, backgroundColor: colors.card,
    borderRadius: radius.block, borderWidth: 2, borderColor: colors.rule,
  },
  title: { fontFamily: fonts.tag, fontSize: 22, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44 },
  rowLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.inkMuted },
  rowText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  rowLink: { textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  facebook: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  facebookText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
}));
