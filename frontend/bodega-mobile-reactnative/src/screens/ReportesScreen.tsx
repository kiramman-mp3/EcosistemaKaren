import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { formatDateTime } from '../utils/dates';
import { InventoryMovement, InventoryWaste } from '../types';
import { Button, Notice, ScreenTitle } from '../components/ui';
import { colors, fonts, radius, themed } from '../theme/tokens';

const money = (value?: number | null) => value == null ? 'No registrado' : `$${Number(value).toFixed(2)}`;

const MOVEMENT_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso', TRASLADO: 'Traslado', MERMA: 'Merma', RESERVA: 'Reserva web',
  LIBERACION: 'Liberación', VENTA: 'Venta', VENCIMIENTO: 'Vencimiento', AJUSTE: 'Ajuste',
};
const LOCATION_LABEL: Record<string, string> = { BODEGA: 'Bodega', PERCHA: 'Percha' };

export const ReportesScreen: React.FC = () => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [wastes, setWastes] = useState<InventoryWaste[]>([]);
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const [movementData, wasteData] = await Promise.all([api.getInventoryMovements(), api.getInventoryWastes()]);
      setMovements(movementData); setWastes(wasteData);
    } catch (err: any) { setError(err.response?.data?.message || 'No se pudo cargar el reporte.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => ({
    ingresos: movements.filter(item => item.tipo === 'INGRESO').reduce((sum, item) => sum + Number(item.cantidad), 0),
    ventas: movements.filter(item => item.tipo === 'VENTA').reduce((sum, item) => sum + Number(item.cantidad), 0),
    mermas: wastes.reduce((sum, item) => sum + Number(item.cantidad), 0),
    costoMerma: wastes.reduce((sum, item) => sum + Number(item.costoTotal || 0), 0),
  }), [movements, wastes]);
  const selectedWaste = selectedMovement ? wastes.find(item => item.movimientoId === selectedMovement.id) : undefined;

  return <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.ink} colors={[colors.ink]} />}
    >
      <ScreenTitle title="Movimientos y mermas" subtitle={`Últimos ${movements.length} movimientos y ${wastes.length} bajas registradas.`} />
      {loading && !movements.length ? <ActivityIndicator style={styles.loading} color={colors.ink} /> : error ? <>
        <Notice tone="error" text={error} />
        <Button label="Intentar de nuevo" variant="outline" onPress={() => void load()} />
      </> : <>
        <View style={styles.grid}>
          <Metric label="Unidades recibidas" value={String(totals.ingresos)} />
          <Metric label="Unidades vendidas" value={String(totals.ventas)} />
          <Metric label="Unidades de merma" value={String(totals.mermas)} />
          <Metric label="Costo de la merma" value={`$${totals.costoMerma.toFixed(2)}`} alert />
        </View>

        <Text style={styles.section}>Bajas recientes</Text>
        {wastes.slice(0, 20).map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.row}
            onPress={() => {
              const movement = movements.find(entry => entry.id === item.movimientoId);
              if (movement) setSelectedMovement(movement);
            }}
          >
            <View style={styles.rowText}>
              <Text style={styles.product} numberOfLines={1}>{item.productoNombre || 'Producto no identificado'}</Text>
              <Text style={styles.reason} numberOfLines={1}>{item.razon}</Text>
              <Text style={styles.meta}>Lote {item.numeroLote || item.loteId.slice(0, 8)}, {formatDateTime(item.created_at)}</Text>
            </View>
            <View style={styles.amountColumn}>
              <Text style={styles.qtyAlert}>-{item.cantidad}</Text>
              <Text style={styles.cost}>{money(item.costoTotal)}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {wastes.length === 0 && <Text style={styles.empty}>Sin bajas registradas.</Text>}

        <Text style={styles.section}>Últimos movimientos</Text>
        {movements.slice(0, 30).map(item => (
          <TouchableOpacity key={item.id} style={styles.row} onPress={() => setSelectedMovement(item)}>
            <View style={styles.rowText}>
              <Text style={styles.kind}>{MOVEMENT_LABEL[item.tipo] || item.tipo}</Text>
              <Text style={styles.product} numberOfLines={1}>{item.productoNombre || 'Producto no identificado'}</Text>
              <Text style={styles.meta}>Lote {item.numeroLote || item.loteId.slice(0, 8)}, {formatDateTime(item.created_at)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.qty}>{item.cantidad}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
            </View>
          </TouchableOpacity>
        ))}
        {movements.length === 0 && <Text style={styles.empty}>Sin movimientos.</Text>}
      </>}
    </ScrollView>

    <Modal visible={Boolean(selectedMovement)} transparent animationType="fade" onRequestClose={() => setSelectedMovement(null)}>
      <View style={styles.backdrop}>{selectedMovement && <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{MOVEMENT_LABEL[selectedMovement.tipo] || selectedMovement.tipo}</Text>
            <Text style={styles.meta}>{formatDateTime(selectedMovement.created_at)}</Text>
          </View>
          <TouchableOpacity style={styles.close} onPress={() => setSelectedMovement(null)} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={26} color={colors.inkMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Detail label="Producto" value={selectedMovement.productoNombre || 'No identificado'} />
          <Detail label="Código de barras" value={selectedMovement.codigoBarras || 'No registrado'} />
          <Detail label="Lote" value={selectedMovement.numeroLote || selectedMovement.loteId} />
          <Detail label="Unidades" value={String(selectedMovement.cantidad)} />
          <Detail label="Libre (antes → después)" value={`${selectedMovement.disponibleAntes} → ${selectedMovement.disponibleDespues}`} />
          <Detail label="Apartado (antes → después)" value={`${selectedMovement.reservadaAntes} → ${selectedMovement.reservadaDespues}`} />
          <Detail
            label="Ubicación"
            value={selectedMovement.ubicacionOrigen !== selectedMovement.ubicacionDestino
              ? `${LOCATION_LABEL[selectedMovement.ubicacionOrigen || ''] || '—'} → ${LOCATION_LABEL[selectedMovement.ubicacionDestino || ''] || '—'}`
              : LOCATION_LABEL[selectedMovement.ubicacionOrigen || ''] || 'Sin cambio'}
          />
          <Detail label="Costo unitario" value={money(selectedMovement.costoUnitario)} />
          <Detail label="PVP" value={money(selectedMovement.precioVenta)} />
          {selectedWaste && <Detail label="Costo de la merma" value={money(selectedWaste.costoTotal)} emphasis />}
          <Detail label="Motivo" value={selectedMovement.motivo || selectedWaste?.razon || 'No especificado'} />
          <Detail label="Responsable" value={selectedMovement.actorNombre || selectedWaste?.registradaPorNombre || 'Proceso automático'} />
          <Button label="Cerrar" variant="ghost" onPress={() => setSelectedMovement(null)} style={styles.done} />
        </ScrollView>
      </View>}</View>
    </Modal>
  </>;
};

const Metric = ({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) => (
  <View style={styles.metric}>
    <Text style={[styles.metricValue, alert && { color: colors.karenText }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const Detail = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => (
  <View style={styles.detail}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, emphasis && { color: colors.karenText }]}>{value}</Text>
  </View>
);

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 40 },
  loading: { margin: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.card, padding: 14, borderRadius: radius.tag, borderWidth: 1, borderColor: colors.rule },
  metricValue: { fontFamily: fonts.tag, fontSize: 30, lineHeight: 32, color: colors.ink },
  metricLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  section: { fontFamily: fonts.tag, fontSize: 22, color: colors.ink, marginTop: 24, marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.tag,
    borderWidth: 1, borderColor: colors.rule, padding: 12, marginBottom: 8,
  },
  rowText: { flex: 1, minWidth: 0 },
  kind: { fontFamily: fonts.bold, fontSize: 13, color: colors.karenText },
  product: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  reason: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  amountColumn: { alignItems: 'flex-end' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qty: { fontFamily: fonts.tag, fontSize: 22, color: colors.ink },
  qtyAlert: { fontFamily: fonts.tag, fontSize: 22, color: colors.karenText },
  cost: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted },
  empty: { fontFamily: fonts.body, color: colors.inkMuted, textAlign: 'center', padding: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(42,17,72,0.6)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius.tag, padding: 18, maxHeight: '90%', width: '100%', maxWidth: 480, alignSelf: 'center' },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.rule, paddingBottom: 12, marginBottom: 4 },
  cardTitle: { fontFamily: fonts.tag, fontSize: 26, color: colors.ink },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.aisle },
  detailLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.inkMuted },
  detailValue: { flex: 1.4, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textAlign: 'right' },
  done: { marginTop: 14 },
}));
