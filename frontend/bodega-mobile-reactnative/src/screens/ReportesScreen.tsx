import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import { InventoryMovement, InventoryWaste } from '../types';
import { Ionicons } from '@expo/vector-icons';

const money = (value?: number | null) => value == null ? 'No registrado' : `$${Number(value).toFixed(2)}`;
const dateTime = (value: string) => new Date(value).toLocaleString();

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} alwaysBounceVertical
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#1D4ED8" colors={['#1D4ED8']} />}>
      <Text style={styles.title}>Reportes operativos</Text>
      <Text style={styles.subtitle}>Resumen auditable basado en movimientos reales de inventario.</Text>
      {loading ? <ActivityIndicator style={styles.loading} /> : error ? <View style={styles.error}><Text>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.link}>Reintentar</Text></TouchableOpacity></View> : <>
        <View style={styles.grid}>
          <Metric label="Unidades ingresadas" value={totals.ingresos.toString()} />
          <Metric label="Unidades vendidas" value={totals.ventas.toString()} />
          <Metric label="Unidades de merma" value={totals.mermas.toString()} />
          <Metric label="Costo de merma" value={`$${totals.costoMerma.toFixed(2)}`} />
        </View>

        <Text style={styles.section}>Productos dados de baja</Text>
        <Text style={styles.sectionHelp}>Historial de mermas con su impacto económico.</Text>
        {wastes.slice(0, 20).map(item => <TouchableOpacity key={item.id} style={styles.wasteCard} onPress={() => {
          const movement = movements.find(entry => entry.id === item.movimientoId);
          if (movement) setSelectedMovement(movement);
        }}>
          <View style={styles.rowMain}><View style={styles.rowText}>
            <Text style={styles.wasteProduct}>{item.productoNombre || 'Producto no identificado'}</Text>
            <Text style={styles.meta}>Lote {item.numeroLote || item.loteId.slice(0, 8)} · {dateTime(item.created_at)}</Text>
            <Text style={styles.wasteReason}>{item.razon}</Text>
          </View><View style={styles.wasteTotals}>
            <Text style={styles.wasteQuantity}>{item.cantidad} un.</Text><Text style={styles.wasteCost}>{money(item.costoTotal)}</Text>
          </View></View>
        </TouchableOpacity>)}
        {wastes.length === 0 && <Text style={styles.empty}>No se han registrado productos dados de baja.</Text>}

        <Text style={styles.section}>Últimos movimientos</Text>
        <Text style={styles.sectionHelp}>Toca una tarjeta para consultar su trazabilidad completa.</Text>
        {movements.slice(0, 30).map(item => <TouchableOpacity key={item.id} style={styles.row} onPress={() => setSelectedMovement(item)}>
          <View style={styles.rowText}><Text style={styles.kind}>{item.tipo}</Text>
            <Text style={styles.productName}>{item.productoNombre || 'Producto no identificado'}</Text>
            <Text style={styles.meta}>Lote {item.numeroLote || item.loteId.slice(0, 8)} · {dateTime(item.created_at)}</Text>
          </View><View style={styles.movementValue}><Text style={styles.quantity}>{item.cantidad}</Text><Text style={styles.detailHint}>Ver detalle ›</Text></View>
        </TouchableOpacity>)}
        {movements.length === 0 && <Text style={styles.empty}>No existen movimientos para reportar.</Text>}
      </>}
    </ScrollView>

    <Modal visible={Boolean(selectedMovement)} transparent animationType="fade" onRequestClose={() => setSelectedMovement(null)}>
      <View style={styles.modalOverlay}>{selectedMovement && <View style={styles.modalCard}>
        <View style={styles.modalHeader}><View><Text style={styles.modalType}>{selectedMovement.tipo}</Text><Text style={styles.modalDate}>{dateTime(selectedMovement.created_at)}</Text></View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMovement(null)}><Ionicons name="close" size={26} color="#64748B" /></TouchableOpacity></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Detail label="Producto" value={selectedMovement.productoNombre || 'No identificado'} />
          <Detail label="Código de barras" value={selectedMovement.codigoBarras || 'No registrado'} />
          <Detail label="Número de lote" value={selectedMovement.numeroLote || selectedMovement.loteId} />
          <Detail label="Cantidad involucrada" value={`${selectedMovement.cantidad} unidades`} />
          <Detail label="Stock disponible" value={`${selectedMovement.disponibleAntes} → ${selectedMovement.disponibleDespues}`} />
          <Detail label="Stock reservado" value={`${selectedMovement.reservadaAntes} → ${selectedMovement.reservadaDespues}`} />
          <Detail label="Ubicación" value={selectedMovement.ubicacionOrigen || selectedMovement.ubicacionDestino ? `${selectedMovement.ubicacionOrigen || '—'} → ${selectedMovement.ubicacionDestino || '—'}` : 'Sin cambio de ubicación'} />
          <Detail label="Costo unitario" value={money(selectedMovement.costoUnitario)} />
          <Detail label="Precio de venta" value={money(selectedMovement.precioVenta)} />
          {selectedWaste && <Detail label="Costo total de la merma" value={money(selectedWaste.costoTotal)} emphasis />}
          <Detail label="Motivo" value={selectedMovement.motivo || selectedWaste?.razon || 'No especificado'} />
          <Detail label="Responsable" value={selectedMovement.actorNombre || selectedWaste?.registradaPorNombre || 'Proceso automático'} />
          <TouchableOpacity style={styles.doneBtn} onPress={() => setSelectedMovement(null)}><Text style={styles.doneText}>Cerrar detalle</Text></TouchableOpacity>
        </ScrollView>
      </View>}</View>
    </Modal>
  </>;
};

const Metric = ({ label, value }: { label: string; value: string }) => <View style={styles.metric}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>;
const Detail = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={[styles.detailValue, emphasis && styles.detailValueEmphasis]}>{value}</Text></View>;

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8FAFC'},content:{padding:16,paddingBottom:40},title:{fontSize:22,fontWeight:'900',color:'#1E293B'},subtitle:{color:'#64748B',marginBottom:16},loading:{margin:40},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{width:'48%',backgroundColor:'#FFF',padding:14,borderRadius:14,borderWidth:1,borderColor:'#E2E8F0'},value:{fontSize:22,fontWeight:'900',color:'#1D4ED8'},label:{fontSize:11,color:'#64748B'},
  section:{fontSize:17,fontWeight:'900',marginTop:22,color:'#0F172A'},sectionHelp:{color:'#64748B',fontSize:10,marginBottom:9},row:{backgroundColor:'#FFF',padding:14,borderRadius:14,marginBottom:9,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},rowMain:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},rowText:{flex:1,paddingRight:8},kind:{fontWeight:'900',color:'#1E293B'},productName:{fontSize:12,fontWeight:'700',color:'#334155',marginTop:2},meta:{fontSize:10,color:'#64748B',marginTop:2},quantity:{fontSize:20,fontWeight:'900',color:'#0F172A',textAlign:'right'},movementValue:{alignItems:'flex-end'},detailHint:{color:'#2563EB',fontSize:9,fontWeight:'700',marginTop:3},
  wasteCard:{backgroundColor:'#FFF7ED',borderWidth:1,borderColor:'#FED7AA',padding:13,borderRadius:14,marginBottom:9},wasteProduct:{color:'#9A3412',fontSize:13,fontWeight:'900'},wasteReason:{color:'#7C2D12',fontSize:10,marginTop:4},wasteTotals:{alignItems:'flex-end'},wasteQuantity:{color:'#C2410C',fontSize:17,fontWeight:'900'},wasteCost:{color:'#9A3412',fontSize:10,fontWeight:'700',marginTop:2},
  error:{padding:16,backgroundColor:'#FEE2E2',borderRadius:12},link:{color:'#1D4ED8',fontWeight:'800',marginTop:8},empty:{color:'#64748B',textAlign:'center',padding:20},
  modalOverlay:{flex:1,backgroundColor:'rgba(15,23,42,0.72)',justifyContent:'center',padding:20},modalCard:{backgroundColor:'#FFFFFF',borderRadius:20,padding:18,maxHeight:'90%'},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#E2E8F0',paddingBottom:12,marginBottom:6},modalType:{color:'#1D4ED8',fontSize:20,fontWeight:'900'},modalDate:{color:'#64748B',fontSize:10,marginTop:2},closeBtn:{width:34,height:34,borderRadius:17,backgroundColor:'#F1F5F9',alignItems:'center',justifyContent:'center'},closeText:{color:'#64748B',fontSize:24,lineHeight:26},detailRow:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#F1F5F9'},detailLabel:{color:'#64748B',fontSize:10,fontWeight:'700',flex:1},detailValue:{color:'#1E293B',fontSize:11,fontWeight:'800',flex:1.6,textAlign:'right'},detailValueEmphasis:{color:'#DC2626',fontSize:13},doneBtn:{backgroundColor:'#1E293B',borderRadius:12,padding:12,alignItems:'center',marginTop:14},doneText:{color:'#FFFFFF',fontWeight:'900'},
});
