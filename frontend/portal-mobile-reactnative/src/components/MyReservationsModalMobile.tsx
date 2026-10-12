import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BackendReservation } from '../api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
  authenticated: boolean;
  reservations: BackendReservation[];
  syncing: boolean;
  onRefresh: () => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onOpenPass: (reservation: BackendReservation) => void;
}

export const MyReservationsModalMobile: React.FC<Props> = props => {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const cancel = (id: string) => Alert.alert('Cancelar reserva', 'El stock será liberado inmediatamente.', [
    { text: 'Volver', style: 'cancel' },
    { text: 'Cancelar reserva', style: 'destructive', onPress: async () => {
      setCancelling(id);
      try { await props.onCancel(id); } catch (error: any) { Alert.alert('No se pudo cancelar', error?.message || 'Intenta nuevamente.'); }
      finally { setCancelling(null); }
    } },
  ]);

  return <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
    <View style={styles.overlay}><View style={styles.sheet}>
      <View style={styles.header}><View><Text style={styles.title}>Mis reservas</Text><Text style={styles.subtitle}>Sincronizadas con caja e inventario</Text></View><TouchableOpacity onPress={props.onClose}><Text style={styles.close}>✕</Text></TouchableOpacity></View>
      {!props.authenticated ? <Text style={styles.empty}>Inicia sesión para consultar tus reservas.</Text> : <>
        <TouchableOpacity style={styles.refresh} onPress={() => void props.onRefresh()} disabled={props.syncing}>{props.syncing ? <ActivityIndicator size="small" color="#1D3557" /> : <Text style={styles.refreshText}>↻ Actualizar estados</Text>}</TouchableOpacity>
        {!props.syncing && props.reservations.length === 0 && <Text style={styles.empty}>Todavía no tienes reservas.</Text>}
        <ScrollView>{props.reservations.map(reservation => {
          const pending = reservation.estado === 'PENDIENTE' && new Date(reservation.fechaExpiracion).getTime() > Date.now();
          const total = reservation.detalles.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario), 0);
          return <View key={reservation.id} style={styles.card}><View style={styles.cardTop}><Text style={styles.code}>{reservation.codigoRetiro}</Text><Text style={[styles.status, pending && styles.statusPending]}>{reservation.estado === 'PENDIENTE' && !pending ? 'EXPIRADA' : reservation.estado}</Text></View><Text style={styles.date}>Expira: {new Date(reservation.fechaExpiracion).toLocaleString()}</Text><Text style={styles.detail}>{reservation.detalles.length} lote(s) · ${total.toFixed(2)}</Text>{pending && <View style={styles.actions}><TouchableOpacity style={styles.passButton} onPress={() => props.onOpenPass(reservation)}><Text style={styles.passText}>Ver pase QR</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} disabled={cancelling === reservation.id} onPress={() => cancel(reservation.id)}><Text style={styles.cancelText}>{cancelling === reservation.id ? 'Cancelando…' : 'Cancelar'}</Text></TouchableOpacity></View>}</View>;
        })}</ScrollView>
      </>}
    </View></View>
  </Modal>;
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.7)' },
  sheet: { backgroundColor: '#FFF', maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }, title: { fontSize: 22, fontWeight: '900', color: '#1D3557' }, subtitle: { fontSize: 11, color: '#64748B' }, close: { fontSize: 18, color: '#64748B', padding: 6 },
  refresh: { alignItems: 'center', padding: 10, backgroundColor: '#F1F5F9', borderRadius: 10, marginBottom: 10 }, refreshText: { color: '#1D3557', fontWeight: '800' }, empty: { textAlign: 'center', padding: 24, backgroundColor: '#FFFBEB', color: '#92400E', borderRadius: 12 },
  card: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 14, marginBottom: 10 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between' }, code: { fontFamily: 'monospace', fontSize: 18, fontWeight: '900', color: '#1D3557' }, status: { fontSize: 10, fontWeight: '800', backgroundColor: '#F1F5F9', padding: 5, borderRadius: 7, color: '#64748B' }, statusPending: { backgroundColor: '#FEF3C7', color: '#92400E' }, date: { fontSize: 11, color: '#64748B', marginTop: 4 }, detail: { fontSize: 12, color: '#334155', marginTop: 8, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 8, marginTop: 12 }, passButton: { flex: 1, backgroundColor: '#1D3557', padding: 10, alignItems: 'center', borderRadius: 10 }, passText: { color: '#FFF', fontWeight: '800', fontSize: 12 }, cancelButton: { flex: 1, borderWidth: 1, borderColor: '#FCA5A5', padding: 10, alignItems: 'center', borderRadius: 10 }, cancelText: { color: '#DC2626', fontWeight: '800', fontSize: 12 },
});
