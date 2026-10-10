import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BackendPromotion } from '../types';

interface AiPromoModalProps {
  visible: boolean;
  promotion: BackendPromotion | null;
  onClose: () => void;
}

export const AiPromoModal: React.FC<AiPromoModalProps> = ({
  visible,
  promotion,
  onClose,
}) => {
  if (!promotion) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Text style={styles.icon}>✨</Text>
          </View>

          <Text style={styles.badge}>ALGORITMO GEMINI IA • BORRADOR</Text>
          <Text style={styles.title}>Promoción Generada</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>⏳ PENDIENTE DE APROBACIÓN POR ADMIN</Text>
          </View>
          <Text style={styles.subtitle}>
            Borrador generado en base a FEFO. Requiere aprobación de un Administrador antes de publicarse en tienda.
          </Text>

          <View style={styles.discountBox}>
            <Text style={styles.discountLabel}>DESCUENTO SUGERIDO</Text>
            <Text style={styles.discountValue}>-{promotion.descuentoPorcentaje}%</Text>
          </View>

          <View style={styles.phraseBox}>
            <Text style={styles.phraseLabel}>FRASE COMERCIAL PROPUESTA:</Text>
            <Text style={styles.phraseText}>"{promotion.frasePromocional}"</Text>
          </View>

          {promotion.razonIa && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>JUSTIFICACIÓN TÉCNICA IA:</Text>
              <Text style={styles.reasonText}>{promotion.razonIa}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Entendido (Pendiente de Aprobación)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 26,
  },
  badge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  discountBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  discountLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  discountValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: 2,
  },
  phraseBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  phraseLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  phraseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    fontStyle: 'italic',
  },
  reasonBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  reasonLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
});
