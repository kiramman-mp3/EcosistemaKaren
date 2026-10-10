import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { DataLoadState, FlashOffer } from '../types';

interface FlashOffersMobileProps {
  onReserveOffer: (offer: FlashOffer) => void;
  offers: FlashOffer[];
  state: DataLoadState;
  error?: string;
  onRetry: () => void;
}

export const FlashOffersMobile: React.FC<FlashOffersMobileProps> = ({
  onReserveOffer,
  offers,
  state,
  error,
  onRetry,
}) => {
  const [reservedId, setReservedId] = useState<string | null>(null);

  const handleReserve = (offer: FlashOffer) => {
    setReservedId(offer.id);
    onReserveOffer(offer);
    setTimeout(() => setReservedId(null), 1500);
  };

  return (
    <View style={styles.container}>
      {/* Banner Rojo Superior */}
      <View style={styles.redBanner}>
        <View style={styles.topTag}>
          <Text style={styles.topTagText}>🔥 LIQUIDACIÓN FEFO IA</Text>
        </View>

        <Text style={styles.bannerTitle}>Precios que vuelan 🔥</Text>
        <Text style={styles.bannerSubtitle}>
          Algoritmo Gemini que detecta vencimientos próximos y desploma precios para evitar desperdicios.
        </Text>

        {/* Widget Contador: PRÓXIMA RENOVACIÓN (02:34:17) */}
        <View style={styles.counterBox}>
          <Text style={styles.counterLabel}>DATOS EN TIEMPO REAL</Text>
          <Text style={styles.counterTime}>FEFO + IA</Text>
        </View>
      </View>

      {/* Lista de Ofertas */}
      <View style={styles.offersList}>
        {state === 'loading' && <Text style={styles.stateText}>Cargando ofertas...</Text>}
        {(state === 'offline' || state === 'error') && (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>{state === 'offline' ? 'Sin conexión' : 'No se pudieron cargar las ofertas'}</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity>
          </View>
        )}
        {state === 'empty' && <Text style={styles.stateText}>No hay ofertas activas en este momento.</Text>}
        {state === 'ready' && offers.map((offer) => {
          const stockPercent = Math.round(
            ((offer.stockTotal - offer.stockAvailable) / offer.stockTotal) * 100
          );
          const isDone = reservedId === offer.id;

          return (
            <View key={offer.id} style={styles.offerCard}>
              {/* Imagen con Badges: [-40%], [✨ IA], [¡Últimas X!] */}
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: offer.image }}
                  style={styles.offerImage}
                  resizeMode="cover"
                />

                <View style={styles.tagDiscount}>
                  <Text style={styles.tagDiscountText}>{offer.discountBadge}</Text>
                </View>

                {offer.aiBadge && (
                  <View style={styles.tagAI}>
                    <Text style={styles.tagAIText}>✨ IA</Text>
                  </View>
                )}

                <View style={styles.tagUrgency}>
                  <Text style={styles.tagUrgencyText}>{offer.urgencyBadge}</Text>
                </View>
              </View>

              {/* Categoría y Título */}
              <Text style={styles.catText}>{offer.category}</Text>
              <Text style={styles.titleText}>{offer.title}</Text>

              {/* Precio en Rojo Destacado + Tachado Gris */}
              <View style={styles.priceRow}>
                <Text style={styles.priceRed}>${offer.price.toFixed(2)}</Text>
                <Text style={styles.priceOriginal}>${offer.originalPrice.toFixed(2)}</Text>
                <View style={styles.saveTag}>
                  <Text style={styles.saveTagText}>
                    -${(offer.originalPrice - offer.price).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Barra de progreso de stock disponible */}
              <View style={styles.stockProgressContainer}>
                <View style={styles.stockProgressTextRow}>
                  <Text style={styles.stockProgressLabel}>Stock reservado: {stockPercent}%</Text>
                  <Text style={styles.stockAvailableText}>¡Solo {offer.stockAvailable} disp.!</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${stockPercent}%` }]} />
                </View>
              </View>

              {/* Alerta de caducidad con reloj: ⏰ Caduca: Hoy, 20:00 */}
              <View style={styles.expiryAlert}>
                <Text style={styles.expiryAlertText}>{offer.expiryText}</Text>
              </View>

              {/* Botón Rojo: Reservar Stock Ahora */}
              <TouchableOpacity
                style={[styles.reserveBtn, isDone && styles.reserveBtnDone]}
                onPress={() => handleReserve(offer)}
                activeOpacity={0.85}
              >
                <Text style={styles.reserveBtnText}>
                  {isDone ? '✓ ¡Stock Reservado!' : 'Reservar Stock Ahora →'}
                </Text>
              </TouchableOpacity>

            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stateBox: { padding: 18, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#1D3557', marginBottom: 6 },
  stateText: { color: '#64748B', textAlign: 'center', paddingVertical: 16 },
  retryButton: { backgroundColor: '#1D3557', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
  container: {
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  redBanner: {
    marginHorizontal: 16,
    backgroundColor: '#EF4444',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  topTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  topTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
    marginBottom: 14,
  },
  counterBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  counterLabel: {
    color: '#FECACA',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  counterTime: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginTop: 2,
  },
  offersList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  tagDiscount: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagDiscountText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  tagAI: {
    position: 'absolute',
    top: 8,
    left: 60,
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagAIText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  tagUrgency: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagUrgencyText: {
    color: '#FCD34D',
    fontWeight: '800',
    fontSize: 10,
  },
  catText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D3557',
    marginTop: 2,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  priceRed: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EF4444',
  },
  priceOriginal: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  saveTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveTagText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  stockProgressContainer: {
    marginBottom: 10,
  },
  stockProgressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stockProgressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  stockAvailableText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  expiryAlert: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  expiryAlertText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  reserveBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  reserveBtnDone: {
    backgroundColor: '#059669',
  },
  reserveBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
});
