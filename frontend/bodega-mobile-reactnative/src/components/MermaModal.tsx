import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface MermaModalProps {
  visible: boolean;
  lotId: string | null;
  lotNumber: string | null;
  maxUnits: number;
  onClose: () => void;
  onConfirmMerma: (lotId: string, cantidad: number, razon: string) => Promise<void>;
}

export const MermaModal: React.FC<MermaModalProps> = ({
  visible,
  lotId,
  lotNumber,
  maxUnits,
  onClose,
  onConfirmMerma,
}) => {
  const [cantidad, setCantidad] = useState('1');
  const [razon, setRazon] = useState('Producto caducado en percha');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lotId) return null;

  const handleConfirm = async () => {
    const qty = parseInt(cantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Ingresa una cantidad mayor a 0');
      return;
    }
    if (qty > maxUnits) {
      setError(`No puedes dar de baja más de ${maxUnits} unidades disponibles`);
      return;
    }
    if (!razon.trim()) {
      setError('Ingresa el motivo de la baja');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirmMerma(lotId, qty, razon.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al registrar la merma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>Registrar Merma / Baja</Text>
            <Text style={styles.subtitle}>
              Lote: <Text style={styles.boldText}>{lotNumber}</Text> (Disp: {maxUnits} un.)
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>CANTIDAD A DAR DE BAJA:</Text>
            <TextInput
              style={styles.input}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="numeric"
              placeholder="Ej: 5"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>MOTIVO / RAZÓN:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={razon}
              onChangeText={setRazon}
              multiline
              numberOfLines={2}
              placeholder="Ej: Caducidad vencida en percha"
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Confirmar Baja de Inventario</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
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
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  boldText: {
    fontWeight: '800',
    color: '#1D3557',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
