import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ReservationPass } from '../types';
import { Button } from './ui';
import { Illustration } from './Illustration';
import { Pulse, Stamp, tap } from './motion';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { RESERVATION_EXTENSION_MINUTES, RESERVATION_MAX_TOTAL_MINUTES, formatMinutes } from '../config/reservationRules';
import { getErrorMessage } from '../utils/errors';

interface PickupPassModalProps {
  pass: ReservationPass;
  visible: boolean;
  onClose: () => void;
  /** Pide más tiempo a la tienda; al terminar, el pase se actualiza con el nuevo vencimiento. */
  onExtend?: (reservationId: string) => Promise<void>;
}

const formatCountdown = (total: number) =>
  `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;

/**
 * Pase de retiro con forma de ticket térmico. El papel es siempre blanco con tinta mora para que
 * se vea y se escanee igual en modo oscuro.
 */
export const PickupPassModal: React.FC<PickupPassModalProps> = ({ pass, visible, onClose, onExtend }) => {
  const [seconds, setSeconds] = useState(pass.remainingSeconds || 0);
  const [extending, setExtending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  // El aviso de éxito se quita solo; el de error se queda hasta el próximo intento.
  useEffect(() => {
    if (!notice || notice.error) return undefined;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const extend = async () => {
    if (!pass.id || !onExtend || extending) return;
    setExtending(true);
    setNotice(null);
    try {
      await onExtend(pass.id);
      setNotice({ text: `+${RESERVATION_EXTENSION_MINUTES} minutos añadidos con éxito.`, error: false });
    } catch (error: unknown) {
      setNotice({ text: getErrorMessage(error, 'No se pudo extender el tiempo.'), error: true });
    } finally { setExtending(false); }
  };

  useEffect(() => {
    if (!visible) return;
    setSeconds(pass.remainingSeconds || 0);
    if ((pass.remainingSeconds || 0) > 0) tap('success');
    const timer = setInterval(() => setSeconds(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [visible, pass.code, pass.remainingSeconds]);

  const expired = seconds <= 0;
  const urgent = !expired && seconds <= 120;
  // Tras una extensión el tiempo restante supera la duración original: la barra parte de nuevo desde llena.
  const initial = Math.max(pass.initialSeconds || 1800, pass.remainingSeconds || 0);
  const percent = Math.max(0, Math.min(100, (seconds / initial) * 100));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.ticket}>
            {!expired && (
              <Stamp style={styles.stamp}>
                <Text style={styles.stampText}>¡APARTADO!</Text>
              </Stamp>
            )}
            <Text style={styles.store}>Supermercado Karen</Text>
            <Text style={styles.branch}>{pass.storeLocation}</Text>
            <View style={styles.dashed} />

            {pass.customerName ? <Text style={styles.customer}>Pase de retiro de <Text style={styles.customerName}>{pass.customerName}</Text></Text> : null}
            <View style={styles.qr}>
              <QRCode value={pass.code} size={170} ecl="M" color={colors.mora} backgroundColor="#FFFFFF" />
            </View>
            <Text style={styles.code} accessibilityLabel={`Código ${pass.code.split('').join(' ')}`}>{pass.code}</Text>

            <View style={[styles.timer, expired ? styles.timerExpired : urgent ? styles.timerUrgent : null]} accessibilityLiveRegion="polite">
              {expired ? (
                <>
                  <Illustration name="expired" size={80} light />
                  <Text style={styles.expiredTitle}>Este código venció.</Text>
                  <Text style={styles.expiredText}>Liberamos tus productos; puedes volver a apartarlos.</Text>
                </>
              ) : (
                <>
                  <Pulse active={urgent}>
                    <Text style={styles.countdown}>{formatCountdown(seconds)}</Text>
                  </Pulse>
                  <Text style={styles.timerCaption}>{urgent ? 'Se acaba el tiempo: pasa a caja ya' : 'para retirar y pagar en caja'}</Text>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${percent}%` }]} /></View>
                </>
              )}
            </View>

            {!expired && pass.id && onExtend ? (
              <View style={styles.extendBox}>
                {pass.canExtend === false ? (
                  <Text style={styles.extendMax}>Llegaste al máximo de {formatMinutes(RESERVATION_MAX_TOTAL_MINUTES)} para esta reserva.</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.extendButton, extending && styles.extendButtonBusy]}
                    disabled={extending}
                    onPress={() => void extend()}
                    accessibilityRole="button"
                    accessibilityLabel={`Añadir ${RESERVATION_EXTENSION_MINUTES} minutos a la reserva`}
                    accessibilityState={{ disabled: extending, busy: extending }}
                  >
                    <Ionicons name="time-outline" size={16} color={INK} />
                    <Text style={styles.extendText}>{extending ? 'Extendiendo…' : `¿Necesitas más tiempo? +${RESERVATION_EXTENSION_MINUTES} min`}</Text>
                  </TouchableOpacity>
                )}
                {notice ? <Text style={[styles.extendNotice, notice.error && styles.extendNoticeError]} accessibilityLiveRegion="polite">{notice.text}</Text> : null}
              </View>
            ) : null}

            {pass.items.length > 0 && (
              <>
                <View style={styles.dashed} />
                {pass.items.map((item, index) => (
                  <View key={`${item.productName}-${index}`} style={styles.line}>
                    <Text style={styles.lineName}><Text style={styles.qty}>{item.quantity} × </Text>{item.productName}</Text>
                    <Text style={styles.lineTotal}>${(item.quantity * item.price).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.dashed} />
                <View style={styles.line}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.total}>${pass.total.toFixed(2)}</Text>
                </View>
              </>
            )}
            <Text style={styles.note}>Muestra este código en caja. Pagas ahí mismo.</Text>
          </View>
          <Button label="Listo" variant="sticker" onPress={onClose} style={styles.done} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const INK = '#2A1D14';

const styles = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42,29,20,0.78)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  ticket: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 6, width: '100%', maxWidth: 420, alignSelf: 'center' },
  stamp: { alignSelf: 'center', marginBottom: 10 },
  stampText: { fontFamily: fonts.tag, fontSize: 15, color: '#0E7A43', borderWidth: 3, borderColor: '#0E7A43', borderRadius: radius.tag, paddingHorizontal: 8, paddingVertical: 3 },
  store: { fontFamily: fonts.tag, fontSize: 26, color: INK, textAlign: 'center' },
  branch: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(42,29,20,0.7)', textAlign: 'center' },
  dashed: { borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: '#D4C4A8', marginVertical: 14 },
  customer: { fontFamily: fonts.medium, fontSize: 14, color: INK, textAlign: 'center', marginBottom: 12 },
  customerName: { fontFamily: fonts.tag },
  qr: { alignSelf: 'center', padding: 8, borderWidth: 2, borderColor: INK, borderRadius: radius.tag },
  code: { fontFamily: fonts.stamp, fontSize: 38, color: INK, textAlign: 'center', letterSpacing: 2, marginTop: 10 },
  timer: { backgroundColor: '#FFD400', borderRadius: radius.tag, borderWidth: 2, borderColor: INK, padding: 12, alignItems: 'center', marginTop: 12 },
  timerUrgent: { backgroundColor: '#FF7A1A' },
  timerExpired: { backgroundColor: '#EFEAF5' },
  countdown: { fontFamily: fonts.tag, fontSize: 52, lineHeight: 56, color: INK },
  timerCaption: { fontFamily: fonts.semibold, fontSize: 14, color: INK },
  bar: { alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: 'rgba(42,29,20,0.2)', marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: INK, borderRadius: 5 },
  extendBox: { alignItems: 'center', marginTop: 10 },
  extendButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'stretch', minHeight: 44,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(42,29,20,0.45)', borderRadius: radius.tag, paddingHorizontal: 12,
  },
  extendButtonBusy: { opacity: 0.6 },
  extendText: { fontFamily: fonts.bold, fontSize: 13, color: INK },
  extendMax: { fontFamily: fonts.semibold, fontSize: 12, color: 'rgba(42,29,20,0.7)', textAlign: 'center' },
  extendNotice: { fontFamily: fonts.bold, fontSize: 12, color: '#0E7A43', textAlign: 'center', marginTop: 6 },
  extendNoticeError: { color: '#A81E14' },
  expiredTitle: { fontFamily: fonts.tag, fontSize: 18, color: INK, textAlign: 'center' },
  expiredText: { fontFamily: fonts.body, fontSize: 14, color: INK, textAlign: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  lineName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: INK },
  qty: { fontFamily: fonts.bold },
  lineTotal: { fontFamily: fonts.medium, fontSize: 14, color: INK },
  totalLabel: { fontFamily: fonts.bold, fontSize: 16, color: INK },
  total: { fontFamily: fonts.tag, fontSize: 28, color: INK },
  note: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(42,29,20,0.7)', textAlign: 'center', marginTop: 12 },
  done: { marginTop: 14, width: '100%', maxWidth: 420, alignSelf: 'center' },
}));
