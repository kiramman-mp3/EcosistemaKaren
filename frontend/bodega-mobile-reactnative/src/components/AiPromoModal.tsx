import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackendPromotion } from '../types';
import { Button } from './ui';
import { colors, fonts, radius } from '../theme/tokens';

interface AiPromoModalProps {
  visible: boolean;
  promotion: BackendPromotion | null;
  /** Solo un administrador puede revisar y publicar ofertas. */
  canReview: boolean;
  onClose: () => void;
  onReview: () => void;
}

export const AiPromoModal: React.FC<AiPromoModalProps> = ({ visible, promotion, canReview, onClose, onReview }) => {
  if (!promotion) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView>
            <View style={styles.head}>
              <Text style={styles.title}>Oferta sugerida</Text>
              <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={26} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.tag}>
              <Text style={styles.discount}>-{promotion.descuentoPorcentaje}%</Text>
              <Text style={styles.phrase}>{promotion.frasePromocional}</Text>
            </View>

            {!!promotion.razonIa && (
              <View style={styles.reason}>
                <Text style={styles.reasonLabel}>Por qué se sugiere</Text>
                <Text style={styles.reasonText}>{promotion.razonIa}</Text>
              </View>
            )}

            <View style={styles.pending}>
              <Ionicons name="time-outline" size={18} color={colors.ink} />
              <Text style={styles.pendingText}>
                {canReview
                  ? 'Todavía no la ven los clientes. Revísala y publícala desde Ofertas.'
                  : 'Todavía no la ven los clientes. Un administrador la revisará antes de publicarla.'}
              </Text>
            </View>

            {canReview
              ? <>
                <Button label="Revisar y publicar" variant="danger" onPress={onReview} />
                <Button label="Más tarde" variant="ghost" compact onPress={onClose} style={styles.secondary} />
              </>
              : <Button label="Entendido" onPress={onClose} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(19,40,75,0.6)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.tag, padding: 20, maxHeight: '90%', width: '100%', maxWidth: 460, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: fonts.tag, fontSize: 26, color: colors.ink },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tag: { backgroundColor: colors.sticker, borderRadius: radius.tag, padding: 16, marginBottom: 14 },
  discount: { fontFamily: fonts.tag, fontSize: 48, lineHeight: 50, color: colors.karen },
  phrase: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink, marginTop: 6 },
  reason: { backgroundColor: colors.aisle, borderRadius: radius.tag, padding: 12, marginBottom: 14 },
  reasonLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, marginBottom: 4 },
  reasonText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  pending: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 16 },
  pendingText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  secondary: { marginTop: 8 },
});
