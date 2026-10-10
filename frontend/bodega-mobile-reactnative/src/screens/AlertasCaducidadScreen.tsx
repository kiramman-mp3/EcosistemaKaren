import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ExpiryAlertItem, BackendPromotion } from '../types';
import { api } from '../api/client';

interface AlertasCaducidadScreenProps {
  alerts: ExpiryAlertItem[];
  onRefresh: () => void;
  onOpenAiPromo: (promo: BackendPromotion) => void;
  onOpenMerma: (lotId: string, lotNumber: string, maxUnits: number) => void;
}

export const AlertasCaducidadScreen: React.FC<AlertasCaducidadScreenProps> = ({
  alerts,
  onRefresh,
  onOpenAiPromo,
  onOpenMerma,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ROJO' | 'AMARILLO'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filtered = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.nivel === filter;
  });

  const criticalCount = alerts.filter((a) => a.nivel === 'ROJO' || a.nivel === 'VENCIDO').length;
  const warningCount = alerts.filter((a) => a.nivel === 'AMARILLO').length;

  const handleMoverPercha = async (item: ExpiryAlertItem) => {
    setActionLoadingId(item.loteId);
    try {
      await api.updateLotLocation(item.loteId, 'PERCHA');
      Alert.alert('Éxito', `Lote ${item.numeroLote} trasladado a PERCHA para rotación.`);
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Error al mover a percha');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGenerateAiPromo = async (item: ExpiryAlertItem) => {
    setActionLoadingId(item.loteId);
    try {
      const promo = await api.generatePromotion(item.loteId);
      onOpenAiPromo(promo);
      onRefresh();
    } catch (err: any) {
      const status = err.response?.status;
      const backendError = err.response?.data?.error;
      const messages: Record<number, string> = {
        429: 'Gemini alcanzó temporalmente su límite de solicitudes. Intenta nuevamente en unos minutos.',
        502: 'Gemini devolvió una respuesta no válida. No se creó ningún borrador; puedes intentarlo otra vez.',
        503: backendError === 'GeminiNotConfigured'
          ? 'Gemini no está configurado en el backend. Define GEMINI_API_KEY y reinicia el servidor.'
          : 'El servicio de promociones con IA no se encuentra disponible.',
        504: 'Gemini tardó demasiado en responder. No se confirmó ningún borrador; inténtalo nuevamente.',
      };
      const message = messages[status]
        || err.response?.data?.message
        || err.message
        || 'Error al generar promoción con IA';
      Alert.alert('Error', message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.badgeTop}>
          <Text style={styles.badgeTopText}>CONTROL PREVENTIVO DE MERMAS</Text>
        </View>
        <Text style={styles.title}>Alertas de Caducidad FEFO</Text>
        <Text style={styles.subtitle}>
          Monitorea lotes con riesgo de caducidad para priorizar su exhibición o descuento.
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.chip, filter === 'ALL' && styles.chipActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.chipText, filter === 'ALL' && styles.chipTextActive]}>
            Todos ({alerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, filter === 'ROJO' && styles.chipActiveRed]}
          onPress={() => setFilter('ROJO')}
        >
          <Text style={[styles.chipText, filter === 'ROJO' && styles.chipTextActiveRed]}>
            🔴 Críticos &lt; 7d ({criticalCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, filter === 'AMARILLO' && styles.chipActiveYellow]}
          onPress={() => setFilter('AMARILLO')}
        >
          <Text style={[styles.chipText, filter === 'AMARILLO' && styles.chipTextActiveYellow]}>
            🟡 Preventivos &lt; 15d ({warningCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerts List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Sin alertas en esta categoría</Text>
          <Text style={styles.emptySub}>
            Los lotes cuentan con fechas de caducidad saludables.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((item) => {
            const isRed = item.nivel === 'ROJO' || item.nivel === 'VENCIDO';
            const isExpired = item.nivel === 'VENCIDO';
            const isProcessing = actionLoadingId === item.loteId;

            return (
              <View
                key={item.id || item.loteId}
                style={[
                  styles.card,
                  isRed ? styles.cardRedBorder : styles.cardYellowBorder,
                ]}
              >
                {/* Header card */}
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.riskBadge,
                      { backgroundColor: isRed ? '#FEE2E2' : '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskBadgeText,
                        { color: isRed ? '#DC2626' : '#D97706' },
                      ]}
                    >
                      {isRed ? '🔴 CRÍTICO' : '🟡 PREVENTIVO'} • {item.diasParaVencer} DÍAS RESTANTES
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.locationBadge,
                      {
                        backgroundColor:
                          item.ubicacion === 'BODEGA' ? '#EEF2FF' : '#DCFCE7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.locationBadgeText,
                        {
                          color:
                            item.ubicacion === 'BODEGA' ? '#4F46E5' : '#15803D',
                        },
                      ]}
                    >
                      {item.ubicacion}
                    </Text>
                  </View>
                </View>

                {/* Product Name & Lot */}
                <Text style={styles.productName}>{item.productoNombre}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaItem}>Lote: <Text style={styles.bold}>{item.numeroLote}</Text></Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaItem}>Expira: <Text style={styles.bold}>{new Date(item.fechaCaducidad).toLocaleDateString()}</Text></Text>
                </View>

                {/* Stock Details */}
                <View style={styles.stockRow}>
                  <View style={styles.stockItem}>
                    <Text style={styles.stockLabel}>Stock Libre:</Text>
                    <Text style={styles.stockValue}>{item.cantidadDisponible} un.</Text>
                  </View>
                  <View style={styles.stockItem}>
                    <Text style={styles.stockLabel}>Stock Reservado:</Text>
                    <Text style={styles.stockValueReserved}>{item.cantidadReservada || 0} un.</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  {item.ubicacion === 'BODEGA' && (
                    <TouchableOpacity
                      style={styles.actionBtnBlue}
                      onPress={() => handleMoverPercha(item)}
                      disabled={isProcessing}
                    >
                      <Text style={styles.actionBtnTextBlue}>🚚 Pasar a Percha</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtnPurple, isExpired && styles.actionBtnDisabled]}
                    onPress={() => handleGenerateAiPromo(item)}
                    disabled={isProcessing || isExpired}
                  >
                    <Text style={[styles.actionBtnTextPurple, isExpired && styles.actionBtnTextDisabled]}>
                      {isExpired ? 'No promocionable' : '✨ Promo Gemini IA'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnRed}
                    onPress={() =>
                      onOpenMerma(item.loteId, item.numeroLote, item.cantidadDisponible)
                    }
                    disabled={isProcessing}
                  >
                    <Text style={styles.actionBtnTextRed}>⚠️ Merma</Text>
                  </TouchableOpacity>
                </View>

                {isProcessing && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#4F46E5" />
                    <Text style={styles.loadingOverlayText}>Procesando acción...</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  badgeTop: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeTopText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  chipActiveRed: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  chipActiveYellow: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextActiveRed: {
    color: '#FFFFFF',
  },
  chipTextActiveYellow: {
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  list: {
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  cardRedBorder: {
    borderColor: '#FCA5A5',
  },
  cardYellowBorder: {
    borderColor: '#FDE68A',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  locationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  metaItem: {
    fontSize: 11,
    color: '#64748B',
  },
  metaDot: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  bold: {
    fontWeight: '700',
    color: '#1E293B',
  },
  stockRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    justifyContent: 'space-around',
  },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  stockValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#15803D',
  },
  stockValueReserved: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D97706',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnBlue: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  actionBtnTextBlue: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 11,
  },
  actionBtnPurple: {
    flex: 1.2,
    backgroundColor: '#FAF5FF',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  actionBtnTextPurple: {
    color: '#9333EA',
    fontWeight: '800',
    fontSize: 11,
  },
  actionBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    opacity: 0.75,
  },
  actionBtnTextDisabled: {
    color: '#64748B',
  },
  actionBtnRed: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionBtnTextRed: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 11,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  loadingOverlayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
