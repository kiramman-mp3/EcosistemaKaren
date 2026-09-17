import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { ReservationPass } from '../types';

interface PickupPassModalProps {
  pass: ReservationPass;
  visible: boolean;
  onClose: () => void;
}

export const PickupPassModal: React.FC<PickupPassModalProps> = ({
  pass,
  visible,
  onClose,
}) => {
  const [seconds, setSeconds] = useState(pass.remainingSeconds || 585);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}m:${s}s`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>

          <Text style={styles.title}>Pase de Retiro Digital</Text>
          <Text style={styles.subtitle}>
            Stock apartado en tienda física. Presenta este PIN en caja SIACI.
          </Text>

          {/* PIN */}
          <View style={styles.pinBox}>
            <Text style={styles.pinLabel}>CÓDIGO PIN CAJA</Text>
            <Text style={styles.pinCode}>{pass.code}</Text>
          </View>

          {/* QR */}
          <View style={styles.qrContainer}>
            <View style={styles.qrGrid}>
              {pass.qrBlocks.map((row, rIdx) => (
                <View key={rIdx} style={styles.qrRow}>
                  {row.map((cell, cIdx) => (
                    <View
                      key={cIdx}
                      style={[
                        styles.qrCell,
                        cell === 1 ? styles.qrCellBlack : styles.qrCellWhite,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
            <Text style={styles.qrSub}>ESCANEAR EN CAJA O PERCHA</Text>
          </View>

          {/* Countdown */}
          <View style={styles.countdownBox}>
            <Text style={styles.countdownText}>
              🔴 Tiempo restante: {formatTime(seconds)}
            </Text>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
            <Text style={styles.actionBtnText}>Entendido, ir a pagar a caja</Text>
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
  content: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  checkCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    color: '#16A34A',
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D3557',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  pinBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  pinLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  pinCode: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1D3557',
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginTop: 2,
  },
  qrContainer: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  qrGrid: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 8,
  },
  qrRow: {
    flexDirection: 'row',
  },
  qrCell: {
    width: 14,
    height: 14,
    margin: 1,
    borderRadius: 2,
  },
  qrCellBlack: {
    backgroundColor: '#000000',
  },
  qrCellWhite: {
    backgroundColor: '#FFFFFF',
  },
  qrSub: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 1,
  },
  countdownBox: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  countdownText: {
    color: '#DC2626',
    fontWeight: '900',
    fontSize: 12,
  },
  actionBtn: {
    width: '100%',
    backgroundColor: '#1D3557',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
