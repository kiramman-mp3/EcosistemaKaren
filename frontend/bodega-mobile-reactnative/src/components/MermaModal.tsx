import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confirmAction } from '../utils/dialogs';
import { sheetFrame } from '../theme/layout';
import { Button, Chip, Field, Notice } from './ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { getErrorMessage } from '../utils/errors';

interface MermaModalProps {
  visible: boolean;
  lotId: string | null;
  lotNumber: string | null;
  maxUnits: number;
  onClose: () => void;
  onConfirmMerma: (lotId: string, cantidad: number, razon: string) => Promise<void>;
}

const COMMON_REASONS = [
  'Producto vencido',
  'Empaque dañado',
  'Golpeado en el traslado',
  'Cadena de frío interrumpida',
  'Devolución en mal estado',
];

export const MermaModal: React.FC<MermaModalProps> = ({ visible, lotId, lotNumber, maxUnits, onClose, onConfirmMerma }) => {
  const [cantidad, setCantidad] = useState('1');
  const [razon, setRazon] = useState(COMMON_REASONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCantidad('1');
    setRazon(COMMON_REASONS[0]);
    setError(null);
  }, [visible, lotId]);

  if (!lotId) return null;

  const submit = async (qty: number) => {
    setLoading(true);
    setError(null);
    try {
      await onConfirmMerma(lotId, qty, razon.trim());
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No se pudo registrar la merma.'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const qty = parseInt(cantidad, 10);
    if (isNaN(qty) || qty <= 0) return setError('Escribe cuántas unidades se dan de baja.');
    if (qty > maxUnits) return setError(`Solo hay ${maxUnits} unidades libres en este lote.`);
    if (razon.trim().length < 3) return setError('Indica el motivo de la baja.');
    if (qty === maxUnits) {
      void confirmAction(
        'Dar de baja todo el lote',
        `Se registrarán como merma las ${maxUnits} unidades libres. Queda registrado con tu usuario.`,
        { confirmLabel: 'Dar de baja todo', destructive: true },
      ).then(confirmed => { if (confirmed) void submit(qty); });
      return;
    }
    void submit(qty);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, sheetFrame]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.title}>Registrar merma</Text>
                <Text style={styles.subtitle}>Lote {lotNumber}, {maxUnits} unidades libres</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={26} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>

            {error && <Notice tone="error" text={error} />}

            <Field
              label="Unidades a dar de baja"
              value={cantidad}
              onChangeText={value => { setCantidad(value); setError(null); }}
              keyboardType="number-pad"
              right={
                <TouchableOpacity
                  style={styles.all}
                  onPress={() => { setCantidad(String(maxUnits)); setError(null); }}
                  disabled={loading || maxUnits <= 0}
                  accessibilityRole="button"
                >
                  <Text style={styles.allText}>Todo ({maxUnits})</Text>
                </TouchableOpacity>
              }
            />

            <Text style={styles.label}>Motivo</Text>
            <View style={styles.reasons}>
              {COMMON_REASONS.map(reason => (
                <Chip key={reason} label={reason} active={razon === reason} onPress={() => setRazon(reason)} />
              ))}
            </View>
            <Field label="O descríbelo" value={razon} onChangeText={setRazon} maxLength={500} />

            <Button label="Registrar merma" icon="trash-outline" variant="danger" loading={loading} onPress={handleConfirm} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(42,29,20,0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.card, borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  title: { fontFamily: fonts.tag, fontSize: 26, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  all: {
    minHeight: 50, paddingHorizontal: 12, borderRadius: radius.tag, borderWidth: 1.5, borderColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  allText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginBottom: 8 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
}));
