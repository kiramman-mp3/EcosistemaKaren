import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { STORE_INFO } from '../config/storeInfo';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const SECTIONS: { title: string; text: string }[] = [
  {
    title: 'Datos que recopilamos',
    text: 'Tu nombre completo, tu correo electrónico, el registro de tus reservas y las consultas que haces al asistente KarenBot.',
  },
  {
    title: 'Para qué los usamos',
    text: 'Solo para gestionar tus reservas, verificar tu identidad en caja, darte soporte y emitir los comprobantes autorizados por el Servicio de Rentas Internas (SRI).',
  },
  {
    title: 'No los vendemos ni los compartimos',
    text: `${STORE_INFO.tradeName} no comercializa, no alquila ni comparte tus datos personales con terceros ni con empresas de marketing.`,
  },
  {
    title: 'Almacenamiento en tu teléfono',
    text: 'La app guarda tu sesión en el almacenamiento seguro del dispositivo y tu preferencia de tema (claro u oscuro). No usamos rastreadores de publicidad. Al cerrar sesión se borra la sesión guardada.',
  },
  {
    title: 'Tus derechos (LOPDP)',
    text: `Conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador, puedes ejercer tus derechos de acceso, rectificación, cancelación u oposición escribiendo a ${STORE_INFO.privacyEmail} o acudiendo a Atención al Cliente.`,
  },
];

/** Política de privacidad de la app, adaptativa para móvil, tableta y navegador web. */
export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.centerWrapper}>
        <View style={styles.cardContainer}>
          <View style={styles.head}>
            <View style={styles.flex}>
              <Text style={styles.title} accessibilityRole="header">Política de privacidad</Text>
              <Text style={styles.subtitle}>{STORE_INFO.tradeName} · {STORE_INFO.legalName} · RUC {STORE_INFO.ruc} · {STORE_INFO.city} · LOPDP 2026</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar política de privacidad">
              <Ionicons name="close" size={26} color={colors.mora} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.intro}>
              Cuidamos tus datos personales conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador.
            </Text>
            {SECTIONS.map(section => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionText}>{section.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Entendido" variant="sticker" onPress={onClose} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  </Modal>
);

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  screen: { flex: 1, backgroundColor: colors.aisle },
  centerWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    backgroundColor: colors.aisle,
    ...(Platform.OS === 'web' ? {
      borderLeftWidth: 1.5,
      borderRightWidth: 1.5,
      borderColor: colors.mora,
    } : {}),
  },
  head: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.sticker,
    borderBottomWidth: 2, borderBottomColor: colors.mora, paddingHorizontal: 16, paddingVertical: 14,
  },
  title: { fontFamily: fonts.tag, fontSize: 24, color: colors.mora },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.mora, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -8 },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  intro: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.ink },
  section: { backgroundColor: colors.card, borderRadius: radius.tag, borderWidth: 2, borderColor: colors.rule, padding: 14 },
  sectionTitle: { fontFamily: fonts.tag, fontSize: 17, color: colors.ink, marginBottom: 4 },
  sectionText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  footer: { padding: 16, borderTopWidth: 2, borderTopColor: colors.rule, backgroundColor: colors.card },
}));
