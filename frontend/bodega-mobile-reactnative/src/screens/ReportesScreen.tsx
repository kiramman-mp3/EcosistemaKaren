import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  const exportPDF = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Movimientos y Mermas - Supermercado Karen</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #2A1D14; background: #FFF; margin: 0; }
            .header { border-bottom: 3px solid #2A1D14; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
            .brand { font-size: 28px; font-weight: 800; color: #C42418; margin: 0; }
            .sub { color: #6E5E50; font-size: 13px; margin-top: 4px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
            .kpi { background: #FBF6EC; border: 2px solid #2A1D14; border-radius: 12px; padding: 14px; }
            .kpi-val { font-size: 26px; font-weight: 900; margin-bottom: 4px; color: #2A1D14; }
            .kpi-lbl { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #6E5E50; }
            .alert { color: #C42418; font-weight: bold; }
            .sec-title { font-size: 18px; font-weight: 800; margin: 28px 0 12px; border-left: 5px solid #FFD400; padding-left: 10px; color: #2A1D14; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
            th { background: #FFD400; border: 1.5px solid #2A1D14; padding: 10px; text-align: left; font-weight: 800; }
            td { border: 1px solid #EADFCB; padding: 8px 10px; }
            tr:nth-child(even) { background: #FBF6EC; }
            .footer { margin-top: 40px; border-top: 1px solid #EADFCB; padding-top: 12px; font-size: 11px; color: #9A8A76; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="brand">Supermercado Karen S.A.</h1>
              <div class="sub">Sistema de Bodega · Reporte Oficial de Movimientos y Bajas</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #54443A;">
              <div><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC')}</div>
              <div><strong>Sucursal:</strong> Matriz Guayaquil · RUC 0992345678001</div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi">
              <div class="kpi-val">${totals.ingresos}</div>
              <div class="kpi-lbl">Unidades Recibidas</div>
            </div>
            <div class="kpi">
              <div class="kpi-val">${totals.ventas}</div>
              <div class="kpi-lbl">Unidades Vendidas</div>
            </div>
            <div class="kpi">
              <div class="kpi-val">${totals.mermas}</div>
              <div class="kpi-lbl">Unidades de Merma</div>
            </div>
            <div class="kpi">
              <div class="kpi-val alert">$${totals.costoMerma.toFixed(2)}</div>
              <div class="kpi-lbl">Costo Total Merma</div>
            </div>
          </div>

          <div class="sec-title">Bajas Registradas y Mermas (${wastes.length})</div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Lote</th>
                <th>Motivo / Razón</th>
                <th>Cantidad</th>
                <th>Costo Total</th>
                <th>Fecha y Hora</th>
              </tr>
            </thead>
            <tbody>
              ${wastes.map(item => `
                <tr>
                  <td><strong>${item.productoNombre || 'Sin nombre'}</strong></td>
                  <td>${item.numeroLote || item.loteId.slice(0, 8)}</td>
                  <td>${item.razon}</td>
                  <td class="alert">-${item.cantidad}</td>
                  <td>${money(item.costoTotal)}</td>
                  <td>${formatDateTime(item.created_at)}</td>
                </tr>
              `).join('')}
              ${wastes.length === 0 ? '<tr><td colspan="6" style="text-align:center;">Sin bajas registradas</td></tr>' : ''}
            </tbody>
          </table>

          <div class="sec-title">Últimos Movimientos de Inventario (${movements.length})</div>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Lote</th>
                <th>Cantidad</th>
                <th>Ubicación</th>
                <th>Fecha y Hora</th>
              </tr>
            </thead>
            <tbody>
              ${movements.map(item => `
                <tr>
                  <td><strong>${MOVEMENT_LABEL[item.tipo] || item.tipo}</strong></td>
                  <td>${item.productoNombre || 'Sin nombre'}</td>
                  <td>${item.numeroLote || item.loteId.slice(0, 8)}</td>
                  <td>${item.cantidad}</td>
                  <td>${item.ubicacionOrigen || '—'} → ${item.ubicacionDestino || '—'}</td>
                  <td>${formatDateTime(item.created_at)}</td>
                </tr>
              `).join('')}
              ${movements.length === 0 ? '<tr><td colspan="6" style="text-align:center;">Sin movimientos</td></tr>' : ''}
            </tbody>
          </table>

          <div class="footer">
            Documento oficial generado por Supermercado Karen S.A.
          </div>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const exportExcel = () => {
    const lines: string[] = [];
    lines.push('SUPERMERCADO KAREN S.A. - REPORTE DE MOVIMIENTOS Y MERMAS');
    lines.push(`Fecha de emision,${new Date().toLocaleString('es-EC')}`);
    lines.push('Sucursal,Matriz Guayaquil');
    lines.push('');
    lines.push('RESUMEN DE METRICAS');
    lines.push(`Unidades Recibidas,${totals.ingresos}`);
    lines.push(`Unidades Vendidas,${totals.ventas}`);
    lines.push(`Unidades de Merma,${totals.mermas}`);
    lines.push(`Costo Total de Merma,${totals.costoMerma.toFixed(2)}`);
    lines.push('');
    lines.push('BAJAS Y MERMAS');
    lines.push('ID,Producto,Lote,Motivo,Cantidad,Costo Total,Responsable,Fecha');
    wastes.forEach(item => {
      lines.push(`"${item.id}","${(item.productoNombre || '').replace(/"/g, '""')}","${item.numeroLote || item.loteId}","${(item.razon || '').replace(/"/g, '""')}",-${item.cantidad},${Number(item.costoTotal || 0).toFixed(2)},"${(item.registradaPorNombre || '').replace(/"/g, '""')}","${item.created_at}"`);
    });
    lines.push('');
    lines.push('MOVIMIENTOS DE INVENTARIO');
    lines.push('ID,Tipo,Producto,Codigo Barras,Lote,Cantidad,Disponible Antes,Disponible Despues,Ubicacion Origen,Ubicacion Destino,Costo Unitario,PVP,Responsable,Fecha');
    movements.forEach(item => {
      lines.push(`"${item.id}","${item.tipo}","${(item.productoNombre || '').replace(/"/g, '""')}","${item.codigoBarras || ''}","${item.numeroLote || item.loteId}",${item.cantidad},${item.disponibleAntes},${item.disponibleDespues},"${item.ubicacionOrigen || ''}","${item.ubicacionDestino || ''}",${Number(item.costoUnitario || 0).toFixed(2)},${Number(item.precioVenta || 0).toFixed(2)},"${(item.actorNombre || '').replace(/"/g, '""')}","${item.created_at}"`);
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_bodega_karen_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
            onPress={exportPDF}
            accessibilityRole="button"
            accessibilityLabel="Exportar PDF"
          >
            <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, styles.excelBtn]}
            onPress={exportExcel}
            accessibilityRole="button"
            accessibilityLabel="Exportar Excel"
          >
            <Ionicons name="grid-outline" size={16} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>Excel</Text>
          </TouchableOpacity>
        </View>
      </View>
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
