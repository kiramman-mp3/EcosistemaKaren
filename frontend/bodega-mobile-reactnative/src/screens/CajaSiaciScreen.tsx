import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackendReservation } from '../types';
import { api } from '../api/client';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { formatDateTime, formatTime } from '../utils/dates';
import { Button, Notice, ScreenTitle } from '../components/ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { getErrorMessage, getErrorStatus } from '../utils/errors';

interface CajaSiaciScreenProps {
  onReservationUpdated?: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const CODE_PATTERN = /^KR-[A-Z0-9]{6,20}$/;

function statusOf(reservation: BackendReservation) {
  const expired = reservation.estado === 'PENDIENTE' && new Date(reservation.fechaExpiracion).getTime() <= Date.now();
  if (expired || reservation.estado === 'EXPIRADA') {
    return { label: 'Venció', text: 'El tiempo para retirar terminó y las unidades volvieron a la percha.', bg: colors.aisle, fg: colors.ink };
  }
  switch (reservation.estado) {
    case 'PENDIENTE':
      return { label: 'Por cobrar', text: `Cobrar antes de las ${formatTime(reservation.fechaExpiracion)}.`, bg: colors.sticker, fg: colors.mora };
    case 'CONFIRMADA':
      return { label: 'Ya cobrada', text: 'Esta reserva ya pasó por caja.', bg: colors.freshTint, fg: colors.fresh };
    default:
      return { label: 'Cancelada', text: 'El cliente canceló esta reserva.', bg: colors.aisle, fg: colors.inkSoft };
  }
}

export const CajaSiaciScreen: React.FC<CajaSiaciScreenProps> = ({ onReservationUpdated, onRefresh, refreshing }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reservation, setReservation] = useState<BackendReservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const lookup = async (rawCode = code) => {
    const value = rawCode.trim().toUpperCase();
    if (!CODE_PATTERN.test(value)) {
      setError('El código tiene la forma KR-XXXXXX. Revísalo con el cliente.');
      return;
    }
    setCode(value);
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      setReservation(await api.getReservationByCode(value));
    } catch (err: unknown) {
      setReservation(null);
      setError(getErrorStatus(err) === 404
        ? `No existe ninguna reserva con el código ${value}.`
        : getErrorMessage(err, 'No se pudo consultar la reserva.'));
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!reservation?.id) return;
    setConfirming(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.confirmReservation(reservation.id);
      setReservation({ ...reservation, ...updated, detalles: reservation.detalles });
      setSuccessMsg(`Cobro registrado. Entrega los productos de ${reservation.clienteNombre || 'el cliente'}.`);
      onReservationUpdated?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No se pudo registrar el cobro.'));
      void lookup(reservation.codigoRetiro);
    } finally {
      setConfirming(false);
    }
  };

  const total = reservation?.detalles?.reduce((sum, d) => sum + Number(d.precioUnitario) * d.cantidad, 0) || 0;
  const status = reservation ? statusOf(reservation) : null;
  const canCharge = reservation?.estado === 'PENDIENTE' && status?.label === 'Por cobrar';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} />}
    >
      <ScreenTitle title="Caja" subtitle="Escanea el código del cliente, cobra y entrega lo reservado." />

      <Button label="Escanear código del cliente" icon="qr-code-outline" variant="danger" onPress={() => setScannerOpen(true)} />

      <View style={styles.manual}>
        <TextInput
          style={styles.codeInput}
          placeholder="KR-XXXXXX"
          placeholderTextColor={colors.inkFaint}
          value={code}
          onChangeText={value => setCode(value.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => void lookup()}
          accessibilityLabel="Código de retiro"
        />
        <Button label="Buscar" onPress={() => void lookup()} loading={loading} style={styles.searchBtn} />
      </View>

      {error && <Notice tone="error" text={error} />}
      {successMsg && <Notice tone="success" text={successMsg} />}

      {reservation && status && (
        <View style={styles.ticket}>
          <View style={styles.ticketHead}>
            <View style={styles.ticketHeadText}>
              <Text style={styles.code}>{reservation.codigoRetiro}</Text>
              <Text style={styles.customer}>{reservation.clienteNombre || 'Cliente'}</Text>
            </View>
            <View style={[styles.status, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.statusNote}>{status.text}</Text>

          <View style={styles.dashed} />

          {reservation.detalles.map((item, index) => (
            <View key={item.id || index} style={styles.line}>
              <Text style={styles.qty}>{item.cantidad}</Text>
              <View style={styles.lineInfo}>
                <Text style={styles.lineName}>{item.productoNombre || 'Producto'}</Text>
                <Text style={styles.lineMeta}>
                  Lote {item.numeroLote || item.loteId.slice(0, 8)}   ${Number(item.precioUnitario).toFixed(2)} c/u
                </Text>
              </View>
              <Text style={styles.lineTotal}>${(item.cantidad * Number(item.precioUnitario)).toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.dashed} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total a cobrar</Text>
            <Text style={styles.total}>${total.toFixed(2)}</Text>
          </View>
          <Text style={styles.expiry}>Reserva válida hasta {formatDateTime(reservation.fechaExpiracion)}</Text>

          {canCharge && (
            <Button
              label="Cobrar y entregar"
              icon="checkmark-done-outline"
              variant="primary"
              loading={confirming}
              onPress={() => void confirmPayment()}
              style={styles.charge}
            />
          )}
          <TouchableOpacity onPress={() => { setReservation(null); setCode(''); setSuccessMsg(null); }} style={styles.next}>
            <Ionicons name="refresh-outline" size={18} color={colors.inkSoft} />
            <Text style={styles.nextText}>Atender al siguiente cliente</Text>
          </TouchableOpacity>
        </View>
      )}

      <BarcodeScannerModal
        visible={scannerOpen}
        title="Escanear código de retiro"
        onClose={() => setScannerOpen(false)}
        onScanned={value => { setScannerOpen(false); void lookup(value); }}
      />
    </ScrollView>
  );
};

const styles = themed(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 40 },
  manual: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 14 },
  codeInput: {
    flex: 1, minWidth: 0, minHeight: 52, borderRadius: radius.tag, borderWidth: 1.5, borderColor: colors.ruleStrong,
    backgroundColor: colors.card, paddingHorizontal: 12, fontFamily: fonts.tag, fontSize: 22, color: colors.ink, letterSpacing: 1,
  },
  searchBtn: { minWidth: 100, flexShrink: 0 },
  ticket: { backgroundColor: colors.card, borderRadius: radius.tag, borderWidth: 1, borderColor: colors.rule, padding: 16 },
  ticketHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ticketHeadText: { flex: 1 },
  code: { fontFamily: fonts.tag, fontSize: 32, lineHeight: 34, color: colors.ink, letterSpacing: 1 },
  customer: { fontFamily: fonts.semibold, fontSize: 16, color: colors.inkSoft, marginTop: 2 },
  status: { borderRadius: radius.tag, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontFamily: fonts.bold, fontSize: 14 },
  statusNote: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, marginTop: 8 },
  dashed: { borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ruleStrong, marginVertical: 14 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  qty: { fontFamily: fonts.tag, fontSize: 22, lineHeight: 24, color: colors.ink, minWidth: 28 },
  lineInfo: { flex: 1 },
  lineName: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  lineMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  lineTotal: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  total: { fontFamily: fonts.tag, fontSize: 40, lineHeight: 42, color: colors.ink },
  expiry: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  charge: { marginTop: 16 },
  next: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, marginTop: 8 },
  nextText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
}));
