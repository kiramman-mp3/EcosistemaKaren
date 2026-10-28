import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip } from './ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { STORE_INFO } from '../config/storeInfo';
import { TERMS_INTRO, TERMS_TABS, TermsCategory, clausesFor } from '../config/terms';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pestaña con la que abre: la privacidad desde su enlace, todas desde "Términos y condiciones". */
  category?: TermsCategory;
}

/** Términos y condiciones del servicio, con pestañas por tema (privacidad, reservas, FEFO y pagos). */
export const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose, category = 'todos' }) => {
  const [active, setActive] = useState<TermsCategory>(category);

  useEffect(() => {
    if (visible) setActive(category);
  }, [visible, category]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.centerWrapper}>
            <View style={styles.cardContainer}>
              <View style={styles.head}>
                <View style={styles.flex}>
                  <Text style={styles.title} accessibilityRole="header">Términos y condiciones</Text>
                  <Text style={styles.subtitle}>{STORE_INFO.tradeName} · {STORE_INFO.legalName} · RUC {STORE_INFO.ruc} · {STORE_INFO.city} · LOPDP 2026</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar términos y condiciones">
                  <Ionicons name="close" size={26} color={colors.mora} />
                </TouchableOpacity>
              </View>

              <View style={styles.tabsBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                  {TERMS_TABS.map(tab => (
                    <Chip key={tab.id} label={tab.label} active={active === tab.id} onPress={() => setActive(tab.id)} />
                  ))}
                </ScrollView>
              </View>

              <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.intro}>{TERMS_INTRO}</Text>
                {clausesFor(active).map(clause => (
                  <View key={clause.title} style={styles.section}>
                    <Text style={styles.sectionTitle}>{clause.title}</Text>
                    <Text style={styles.sectionText}>{clause.intro}</Text>
                    {clause.bullets.map(bullet => (
                      <View key={bullet} style={styles.bullet}>
                        <Text style={styles.bulletMark}>•</Text>
                        <Text style={[styles.sectionText, styles.flex]}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footer}>
                <Button label="Entendido" variant="sticker" onPress={onClose} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  screen: { flex: 1, backgroundColor: colors.aisle },
  centerWrapper: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  cardContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    backgroundColor: colors.aisle,
    ...(Platform.OS === 'web' ? { borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.mora } : {}),
  },
  head: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.sticker,
    borderBottomWidth: 2, borderBottomColor: colors.mora, paddingHorizontal: 16, paddingVertical: 14,
  },
  title: { fontFamily: fonts.tag, fontSize: 24, color: colors.mora },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.mora, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -8 },
  tabsBar: { borderBottomWidth: 2, borderBottomColor: colors.rule, backgroundColor: colors.aisle },
  tabs: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  intro: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.ink },
  section: { backgroundColor: colors.card, borderRadius: radius.tag, borderWidth: 2, borderColor: colors.rule, padding: 14, gap: 6 },
  sectionTitle: { fontFamily: fonts.tag, fontSize: 17, color: colors.ink },
  sectionText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  bullet: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  bulletMark: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  footer: { padding: 16, borderTopWidth: 2, borderTopColor: colors.rule, backgroundColor: colors.card },
}));
