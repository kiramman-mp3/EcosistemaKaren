import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AntiOverbookingBannerMobileProps {
  onBackToSelector?: () => void;
  isOnline?: boolean;
}

export const AntiOverbookingBannerMobile: React.FC<AntiOverbookingBannerMobileProps> = ({
  onBackToSelector,
  isOnline = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.bannerCard}>
        
        {/* Badge Sistema Patentado & Live Status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={styles.patentBadge}>
            <Text style={styles.patentBadgeText}>✨ Sistema patentado</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isOnline ? '#10B981' : '#EF4444' }} />
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
              {isOnline ? 'SIACI Sincronizado' : 'Tienda Offline'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          Reservas <Text style={styles.titleRed}>anti-overbooking</Text> garantizadas
        </Text>

        {/* Copy */}
        <Text style={styles.copy}>
          Al reservar, bloqueamos el stock de la tienda física para que nadie más tome tus productos antes de tu retiro.
        </Text>

        {/* 3 Mini-Features */}
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔒</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Stock bloqueado</Text>
              <Text style={styles.featureDesc}>Descuenta unidades de inmediato en caja y percha.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔑</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>PIN por tiempo limitado</Text>
              <Text style={styles.featureDesc}>Pase intransferible con cuenta regresiva de 10 min.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🛡️</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Retiro garantizado</Text>
              <Text style={styles.featureDesc}>Pago directo en caja SIACI sin colas ni faltantes.</Text>
            </View>
          </View>
        </View>

        {/* Pase Digital Card: PIN, QR Blocks y Countdown Rojo */}
        <View style={styles.passCard}>
          <View style={styles.passHeader}>
            <Text style={styles.passBrand}>SK Supermercado Karen</Text>
            <View style={styles.activeDotBadge}>
              <Text style={styles.activeDotText}>AL RESERVAR</Text>
            </View>
          </View>

          <View style={styles.pinBox}>
            <Text style={styles.pinLabel}>CÓDIGO PIN CAJA SIACI</Text>
            <Text style={styles.pinCode}>SE GENERA AL RESERVAR</Text>
          </View>

          <View style={styles.qrContainer}>
            <View style={styles.qrGrid}>
              <Text style={styles.passIcon}>🛡️</Text>
            </View>
          </View>

          {/* Countdown: 🔴 09m:45s restantes */}
          <View style={styles.countdownBox}>
            <Text style={styles.countdownText}>
              Vigencia: 10 minutos desde la reserva
            </Text>
          </View>
        </View>

        {/* Back Link */}
        {onBackToSelector && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBackToSelector}
          >
            <Text style={styles.backBtnText}>← Volver al selector de apps</Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerCard: {
    backgroundColor: '#1D3557',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  patentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  patentBadgeText: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 8,
  },
  titleRed: {
    color: '#F87171',
  },
  copy: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    borderRadius: 14,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  featureDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  passCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  passHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passBrand: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D3557',
  },
  activeDotBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
  pinBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  pinLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  pinCode: {
    fontSize: 22,
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
    marginBottom: 12,
  },
  qrGrid: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 8,
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passIcon: {
    fontSize: 58,
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
  countdownBox: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  countdownText: {
    color: '#DC2626',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  backBtn: {
    marginTop: 14,
    alignSelf: 'center',
  },
  backBtnText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
  },
});
