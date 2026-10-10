import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api, BackendReservation } from '../api/client';

interface SearchReservationModalMobileProps {
  visible: boolean;
  onClose: () => void;
}

export const SearchReservationModalMobile: React.FC<SearchReservationModalMobileProps> = ({
  visible,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<BackendReservation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleSearch = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReservationByCode(code.trim().toUpperCase());
      setReservation(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'No se encontró ninguna reserva activa con este código.'
      );
      setReservation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!reservation?.id) return;
    setCancelling(true);
    try {
      const updated = await api.cancelReservation(reservation.id);
      setReservation(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'No se pudo cancelar la reserva.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return { bg: '#FEF3C7', text: '#B45309', label: '🟡 PENDIENTE DE RETIRO EN CAJA' };
      case 'CONFIRMADA':
        return { bg: '#DCFCE7', text: '#15803D', label: '🟢 COMPLETADA Y COBRADA' };
      case 'CANCELADA':
        return { bg: '#F1F5F9', text: '#475569', label: '⚪ CANCELADA (STOCK LIBERADO)' };
      case 'EXPIRADA':
      default:
        return { bg: '#FEE2E2', text: '#DC2626', label: '🔴 EXPIRADA (STOCK LIBERADO)' };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Consultar Pase de Retiro</Text>
              <Text style={styles.subtitle}>Verifica tu PIN contra el inventario de tienda</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Ej: KR-X7Y9Z2"
              placeholderTextColor="#94A3B8"
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.searchBtnText}>Consultar</Text>
              )}
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Result Card */}
          {reservation && (
            <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <View style={styles.pinHeader}>
                  <Text style={styles.pinLabel}>PIN REGISTRADO</Text>
                  <Text style={styles.pinCode}>{reservation.codigoRetiro}</Text>
                </View>

                {(() => {
                  const b = getStatusBadgeStyle(reservation.estado);
                  return (
                    <View style={[styles.badge, { backgroundColor: b.bg }]}>
                      <Text style={[styles.badgeText, { color: b.text }]}>{b.label}</Text>
                    </View>
                  );
                })()}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Expira:</Text>
                  <Text style={styles.infoVal}>
                    {new Date(reservation.fechaExpiracion).toLocaleTimeString()}
                  </Text>
                </View>

                <View style={styles.detallesBox}>
                  <Text style={styles.detallesTitle}>
                    Artículos en Reserva ({reservation.detalles?.length || 0}):
                  </Text>
                  {reservation.detalles?.map((d, idx) => (
                    <View key={d.id || idx} style={styles.itemRow}>
                      <Text style={styles.itemText}>
                        • Lote {d.loteId.substring(0, 10)}... ({d.cantidad} un.)
                      </Text>
                      <Text style={styles.itemPrice}>
                        ${(d.precioUnitario * d.cantidad).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Cancel button if PENDIENTE */}
                {reservation.estado === 'PENDIENTE' && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancelReservation}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <ActivityIndicator color="#EF4444" size="small" />
                    ) : (
                      <Text style={styles.cancelBtnText}>Cancelar Reserva y Liberar Stock</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D3557',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1D3557',
  },
  searchBtn: {
    backgroundColor: '#1D3557',
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  resultScroll: {
    marginTop: 8,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pinHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  pinLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  pinCode: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1D3557',
    letterSpacing: 2,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D3557',
  },
  detallesBox: {
    marginTop: 10,
  },
  detallesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D3557',
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemText: {
    fontSize: 11,
    color: '#475569',
  },
  itemPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D3557',
  },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
});
