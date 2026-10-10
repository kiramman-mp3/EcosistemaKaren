import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BackendReservation } from '../types';
import { api } from '../api/client';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface CajaSiaciScreenProps {
  onReservationUpdated?: () => void;
}

export const CajaSiaciScreen: React.FC<CajaSiaciScreenProps> = ({
  onReservationUpdated,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reservation, setReservation] = useState<BackendReservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleSearch = async () => {
    if (!code.trim()) {
      setError('Ingresa el código PIN de reserva (ej: KR-X7Y9Z2)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const data = await api.getReservationByCode(code.trim());
      setReservation(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          `No se encontró ninguna reserva activa con el PIN '${code.toUpperCase()}'.`
      );
      setReservation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!reservation?.id) return;

    setConfirming(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await api.confirmReservation(reservation.id);
      setReservation(updated);
      setSuccessMsg(
        `✓ ¡Cobro confirmado en Caja SIACI! El stock fue descontado en firme y la reserva sellada.`
      );
      if (onReservationUpdated) onReservationUpdated();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Error al procesar el cobro en caja SIACI'
      );
    } finally {
      setConfirming(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return {
          bg: '#FEF3C7',
          text: '#D97706',
          label: '🟡 PENDIENTE DE COBRO EN CAJA',
        };
      case 'CONFIRMADA':
        return {
          bg: '#DCFCE7',
          text: '#15803D',
          label: '🟢 COMPLETADA Y COBRADA EN CAJA SIACI',
        };
      case 'CANCELADA':
        return {
          bg: '#F1F5F9',
          text: '#64748B',
          label: '⚪ CANCELADA (STOCK DEVUELTO)',
        };
      case 'EXPIRADA':
      default:
        return {
          bg: '#FEE2E2',
          text: '#DC2626',
          label: '🔴 EXPIRADA (STOCK LIBERADO)',
        };
    }
  };

  const totalAmount =
    reservation?.detalles?.reduce(
      (sum, d) => sum + d.precioUnitario * d.cantidad,
      0
    ) || 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.badgeTop}>
          <Text style={styles.badgeTopText}>PUNTO DE VENTA Y DESPACHO</Text>
        </View>
        <Text style={styles.title}>Módulo de Cobro Caja SIACI</Text>
        <Text style={styles.subtitle}>
          Ingresa o escanea el PIN presentado por el cliente para sellar la compra.
        </Text>
      </View>

      {/* Input Box */}
      <View style={styles.searchCard}>
        <Text style={styles.inputLabel}>CÓDIGO PIN DE RETIRO:</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="KR-XXXXXX"
            placeholderTextColor="#94A3B8"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
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
              <Text style={styles.searchBtnText}>Validar PIN</Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.scannerBtn} onPress={() => setScannerOpen(true)}>
          <Text style={styles.scannerBtnText}>📷 Escanear QR o código del retiro</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {successMsg && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      )}

      {/* Reservation Details Card */}
      {reservation && (
        <View style={styles.resultCard}>
          <View style={styles.pinHeader}>
            <Text style={styles.pinSmall}>PIN VERIFICADO</Text>
            <Text style={styles.pinBig}>{reservation.codigoRetiro}</Text>
          </View>

          {(() => {
            const b = getStatusBadge(reservation.estado);
            return (
              <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
                <Text style={[styles.statusBadgeText, { color: b.text }]}>
                  {b.label}
                </Text>
              </View>
            );
          })()}

          <View style={styles.infoTable}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cliente ID:</Text>
              <Text style={styles.infoVal}>{reservation.usuarioId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de Expiración:</Text>
              <Text style={styles.infoVal}>
                {new Date(reservation.fechaExpiracion).toLocaleTimeString()} (
                {new Date(reservation.fechaExpiracion).toLocaleDateString()})
              </Text>
            </View>
          </View>

          {/* Reserved Items breakdown */}
          <View style={styles.itemsBox}>
            <Text style={styles.itemsTitle}>
              Desglose de Lotes Asignados ({reservation.detalles?.length || 0}):
            </Text>
            {reservation.detalles?.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <View>
                  <Text style={styles.itemLot}>Lote: {item.loteId.slice(0, 15)}...</Text>
                  <Text style={styles.itemQty}>{item.cantidad} unidades a ${Number(item.precioUnitario).toFixed(2)}</Text>
                </View>
                <Text style={styles.itemSubtotal}>
                  ${(item.cantidad * item.precioUnitario).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total a Cobrar:</Text>
            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
          </View>

          {/* Confirm Action Button */}
          {reservation.estado === 'PENDIENTE' && (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmPayment}
              disabled={confirming}
              activeOpacity={0.85}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  💳 Confirmar Cobro y Despachar en Caja SIACI
                </Text>
              )}
            </TouchableOpacity>
          )}

          {reservation.estado === 'CONFIRMADA' && (
            <View style={styles.completedNotice}>
              <Text style={styles.completedNoticeIcon}>✓</Text>
              <Text style={styles.completedNoticeText}>
                Esta reserva ya fue cobrada y retirada exitosamente.
              </Text>
            </View>
          )}
        </View>
      )}
      <BarcodeScannerModal
        visible={scannerOpen}
        title="Escanear código de retiro"
        onClose={() => setScannerOpen(false)}
        onScanned={(value) => setCode(value.trim().toUpperCase())}
      />
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
    marginBottom: 14,
  },
  badgeTop: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeTopText: {
    color: '#15803D',
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
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#1E293B',
  },
  searchBtn: {
    backgroundColor: '#1E293B',
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
  quickPinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  quickPinsLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  quickPinBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quickPinText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#475569',
  },
  scannerBtn: {
    marginTop: 10,
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scannerBtnText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  successText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 40,
  },
  pinHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  pinSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  pinBig: {
    fontSize: 30,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1E293B',
    letterSpacing: 2,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemsBox: {
    marginBottom: 14,
  },
  itemsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemLot: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemQty: {
    fontSize: 10,
    color: '#64748B',
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803D',
  },
  confirmBtn: {
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 12,
  },
  completedNoticeIcon: {
    color: '#15803D',
    fontWeight: '900',
    fontSize: 16,
  },
  completedNoticeText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 12,
  },
});
