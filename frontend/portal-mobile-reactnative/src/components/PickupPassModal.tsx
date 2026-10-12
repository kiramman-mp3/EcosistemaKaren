import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ReservationPass } from '../types';
import { Button } from './ui';
import { colors, fonts, radius } from '../theme/tokens';

interface PickupPassModalProps {
  pass: ReservationPass;
  visible: boolean;
  onClose: () => void;
}

const formatCountdown = (total: number) =>
  `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;

/** Pase de retiro con forma de ticket térmico: código, QR, cuenta regresiva y artículos. */
export const PickupPassModal: React.FC<PickupPassModalProps> = ({ pass, visible, onClose }) => {
  const [seconds, setSeconds] = useState(pass.remainingSeconds || 0);

  useEffect(() => {
    if (!visible) return;
    setSeconds(pass.remainingSeconds || 0);
    const timer = setInterval(() => setSeconds(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [visible, pass.code, pass.remainingSeconds]);

  const expired = seconds <= 0;
  const urgent = !expired && seconds <= 120;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.ticket}>
            <Text style={styles.store}>Supermercado Karen</Text>
            <Text style={styles.branch}>{pass.storeLocation}</Text>
            <View style={styles.dashed} />

            {pass.customerName ? <Text style={styles.customer}>Pase de retiro de {pass.customerName}</Text> : null}
            <View style={styles.qr}>
              <QRCode value={pass.code} size={170} ecl="M" color={colors.ink} />
            </View>
            <Text style={styles.code} accessibilityLabel={`Código ${pass.code.split('').join(' ')}`}>{pass.code}</Text>

            <View style={[styles.timer, expired ? styles.timerExpired : urgent ? styles.timerUrgent : null]} accessibilityLiveRegion="polite">
              {expired ? (
                <Text style={styles.expiredText}>Este código venció. Las unidades volvieron a la percha.</Text>
              ) : (
                <>
                  <Text style={[styles.countdown, urgent && styles.urgentText]}>{formatCountdown(seconds)}</Text>
                  <Text style={[styles.timerCaption, urgent && styles.urgentText]}>para retirar y pagar en caja</Text>
                </>
              )}
            </View>

            {pass.items.length > 0 && (
              <>
                <View style={styles.dashed} />
                {pass.items.map((item, index) => (
                  <View key={`${item.productName}-${index}`} style={styles.line}>
                    <Text style={styles.lineName}>{item.quantity} × {item.productName}</Text>
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(19,40,75,0.75)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  ticket: { backgroundColor: colors.white, padding: 20, borderRadius: 4, width: '100%', maxWidth: 420, alignSelf: 'center' },
  store: { fontFamily: fonts.tag, fontSize: 26, color: colors.ink, textAlign: 'center' },
  branch: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textAlign: 'center' },
  dashed: { borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ruleStrong, marginVertical: 14 },
  customer: { fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginBottom: 12 },
  qr: { alignSelf: 'center', padding: 8, borderWidth: 1, borderColor: colors.rule, borderRadius: radius.tag },
  code: { fontFamily: fonts.tag, fontSize: 40, color: colors.ink, textAlign: 'center', letterSpacing: 2, marginTop: 10 },
  timer: { backgroundColor: colors.sticker, borderRadius: radius.tag, padding: 12, alignItems: 'center', marginTop: 12 },
  timerUrgent: { backgroundColor: colors.karen },
  timerExpired: { backgroundColor: colors.aisle },
  countdown: { fontFamily: fonts.tag, fontSize: 48, lineHeight: 52, color: colors.ink },
  timerCaption: { fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  urgentText: { color: colors.white },
  expiredText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  lineName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  lineTotal: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  total: { fontFamily: fonts.tag, fontSize: 26, color: colors.ink },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textAlign: 'center', marginTop: 12 },
  done: { marginTop: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
});
