import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { formatDateTime } from '../utils/dates';
import { InventoryMovement, InventoryWaste } from '../types';
import { Button, Notice, ScreenTitle } from '../components/ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { getErrorMessage, getServerMessage } from '../utils/errors';
import { buildCsv, buildReportHtml, formatAmount, formatCount, money, MOVEMENT_LABEL } from '../utils/reportExport';
import { exportCsvFile, exportPdfFile } from '../utils/exportReport';
import { notify } from '../utils/dialogs';

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
    } catch (err: unknown) { setError(getServerMessage(err) || 'No se pudo cargar el reporte.'); }
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

  // PDF y Excel (CSV): en el navegador se descargan o imprimen; en el teléfono abren la hoja de compartir.
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const exportReport = async (kind: 'pdf' | 'csv') => {
    if (exporting) return;
    setExporting(kind);
    try {
      const report = { totals, wastes, movements, issuedAt: new Date() };
      if (kind === 'pdf') await exportPdfFile(buildReportHtml(report));
      else await exportCsvFile(buildCsv(report), `reporte_bodega_karen_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (cause: unknown) {
      notify('No se pudo exportar el reporte', getErrorMessage(cause, 'Inténtalo de nuevo.'));
    } finally {
      setExporting(null);
    }
  };

  return <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.ink} colors={[colors.ink]} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <ScreenTitle title="Movimientos y mermas" subtitle={`Últimos ${movements.length} movimientos y ${wastes.length} bajas registradas.`} />
        </View>
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={[styles.exportBtn, styles.pdfBtn]}
            onPress={() => void exportReport('pdf')}
            disabled={exporting !== null}
            accessibilityRole="button"
            accessibilityLabel="Exportar PDF"
          >
            {exporting === 'pdf' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />}
            <Text style={styles.exportBtnText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, styles.excelBtn]}
            onPress={() => void exportReport('csv')}
            disabled={exporting !== null}
            accessibilityRole="button"
            accessibilityLabel="Exportar a Excel (CSV)"
          >
            {exporting === 'csv' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="grid-outline" size={16} color="#FFFFFF" />}
            <Text style={styles.exportBtnText}>Excel</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading && !movements.length ? <ActivityIndicator style={styles.loading} color={colors.ink} /> : error ? <>
        <Notice tone="error" text={error} />
        <Button label="Intentar de nuevo" variant="outline" onPress={() => void load()} />
      </> : <>
        <View style={styles.grid}>
          <Metric label="Unidades recibidas" value={formatCount(totals.ingresos)} />
          <Metric label="Unidades vendidas" value={formatCount(totals.ventas)} />
          <Metric label="Unidades de merma" value={formatCount(totals.mermas)} />
          <Metric label="Costo de la merma" value={formatAmount(totals.costoMerma)} alert />
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
    {/* Una sola línea: en un teléfono de 375 px el costo de la merma se partía en dos. */}
    <Text style={[styles.metricValue, alert && { color: colors.karenText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
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
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 1080, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  titleWrap: { flex: 1, minWidth: 260 },
  actionsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.mora, elevation: 2,
  },
  pdfBtn: { backgroundColor: colors.karenText },
  excelBtn: { backgroundColor: '#0E7A43' },
  exportBtnText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
  loading: { margin: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.card, padding: 14, borderRadius: radius.tag, borderWidth: 1, borderColor: colors.rule },
  metricValue: { fontFamily: fonts.tag, fontSize: 26, lineHeight: 30, color: colors.ink },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(42,29,20,0.6)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius.tag, padding: 18, maxHeight: '90%', width: '100%', maxWidth: 480, alignSelf: 'center' },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.rule, paddingBottom: 12, marginBottom: 4 },
  cardTitle: { fontFamily: fonts.tag, fontSize: 26, color: colors.ink },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.aisle },
  detailLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.inkMuted },
  detailValue: { flex: 1.4, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textAlign: 'right' },
  done: { marginTop: 14 },
}));
