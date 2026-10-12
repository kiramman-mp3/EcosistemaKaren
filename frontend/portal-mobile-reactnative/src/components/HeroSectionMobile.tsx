import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { NavTab } from '../types';

interface HeroSectionMobileProps {
  onNavigate: (tab: NavTab) => void;
  onOpenPassPreview: () => void;
}

export const HeroSectionMobile: React.FC<HeroSectionMobileProps> = ({
  onNavigate,
  onOpenPassPreview,
}) => {
  return (
    <View style={styles.container}>
      {/* Pill Badge: ✨ Nuevo sistema de reservas */}
      <View style={styles.pillBadge}>
        <Text style={styles.pillBadgeText}>✨ Nuevo sistema de reservas</Text>
      </View>

      {/* Big Bicolor Title: "El placer de comprar local" */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleNavy}>El placer de </Text>
        <Text style={styles.titleRed}>comprar local</Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        Reserva tus productos frescos favoritos con garantía anti-overbooking.
        Bloqueamos tu stock en tiempo real en la tienda física para que retires en caja
        en 15 minutos sin filas.
      </Text>

      {/* Action Buttons: [Explorar tienda] & [Ver ofertas →] */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.btnRedFilled}
          onPress={() => onNavigate('productos')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnRedFilledText}>Explorar tienda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnGhost}
          onPress={() => onNavigate('ofertas')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnGhostText}>Ver ofertas →</Text>
        </TouchableOpacity>
      </View>

      {/* KPIs: 4,200+ Productos | 98% Sin overbooking | 15 min Retiro express */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiNumber}>4,200+</Text>
          <Text style={styles.kpiLabel}>Productos</Text>
        </View>

        <View style={[styles.kpiBox, styles.kpiBorder]}>
          <Text style={styles.kpiNumber}>98%</Text>
          <Text style={styles.kpiLabel}>Sin overbooking</Text>
        </View>

        <View style={[styles.kpiBox, styles.kpiBorder]}>
          <Text style={styles.kpiNumber}>15 min</Text>
          <Text style={styles.kpiLabel}>Retiro express</Text>
        </View>
      </View>

      {/* Image Hero: Estante de vegetales con badge -40% y tarjeta flotante checkmark */}
      <View style={styles.heroImageWrapper}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
          }}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Badge superpuesto: '-40% Oferta hoy' */}
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>-40% Oferta hoy</Text>
        </View>

        {/* Floating card: 'Stock confirmado - Reserva #KR-X7Y9Z2' */}
        <TouchableOpacity
          style={styles.floatingCard}
          onPress={onOpenPassPreview}
          activeOpacity={0.9}
        >
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <View>
            <Text style={styles.floatingTag}>TIEMPO REAL 🟢</Text>
            <Text style={styles.floatingTitle}>Stock confirmado</Text>
            <Text style={styles.floatingCode}>Reserva #KR-X7Y9Z2</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  pillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  pillBadgeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  titleContainer: {
    marginBottom: 10,
  },
  titleNavy: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1D3557',
    lineHeight: 36,
  },
  titleRed: {
    fontSize: 32,
    fontWeight: '900',
    color: '#EF4444',
    lineHeight: 36,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  btnRedFilled: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  btnRedFilledText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  btnGhost: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  btnGhostText: {
    color: '#1D3557',
    fontWeight: '700',
    fontSize: 14,
  },
  kpiContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D3557',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  heroImageWrapper: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    height: 220,
    backgroundColor: '#E2E8F0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  floatingCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#16A34A',
    fontWeight: '900',
    fontSize: 16,
  },
  floatingTag: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
  },
  floatingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D3557',
  },
  floatingCode: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
});
