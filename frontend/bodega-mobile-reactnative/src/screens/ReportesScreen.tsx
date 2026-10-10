import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { InventoryMovement, InventoryWaste } from '../types';

export const ReportesScreen: React.FC = () => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [wastes, setWastes] = useState<InventoryWaste[]>([]);
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
  return <ScrollView style={styles.container}>
    <Text style={styles.title}>Reportes operativos</Text>
    <Text style={styles.subtitle}>Resumen auditable basado en movimientos reales de inventario.</Text>
    {loading ? <ActivityIndicator style={styles.loading} /> : error ? <View style={styles.error}><Text>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.link}>Reintentar</Text></TouchableOpacity></View> : <>
      <View style={styles.grid}>
        <Metric label="Unidades ingresadas" value={totals.ingresos.toString()} />
        <Metric label="Unidades vendidas" value={totals.ventas.toString()} />
        <Metric label="Unidades de merma" value={totals.mermas.toString()} />
        <Metric label="Costo de merma" value={`$${totals.costoMerma.toFixed(2)}`} />
      </View>
      <Text style={styles.section}>Últimos movimientos</Text>
      {movements.slice(0, 30).map(item => <View key={item.id} style={styles.row}>
        <View><Text style={styles.kind}>{item.tipo}</Text><Text style={styles.meta}>Lote {item.loteId.slice(0, 8)} · {new Date(item.created_at).toLocaleString()}</Text></View>
        <Text style={styles.quantity}>{item.cantidad}</Text>
      </View>)}
      {movements.length === 0 && <Text style={styles.empty}>No existen movimientos para reportar.</Text>}
    </>}
  </ScrollView>;
};
const Metric = ({ label, value }: { label: string; value: string }) => <View style={styles.metric}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>;
const styles = StyleSheet.create({
  container:{flex:1,padding:16,backgroundColor:'#F8FAFC'}, title:{fontSize:22,fontWeight:'900',color:'#1E293B'}, subtitle:{color:'#64748B',marginBottom:16}, loading:{margin:40},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10}, metric:{width:'48%',backgroundColor:'#FFF',padding:14,borderRadius:14,borderWidth:1,borderColor:'#E2E8F0'}, value:{fontSize:22,fontWeight:'900',color:'#1D4ED8'},label:{fontSize:11,color:'#64748B'},
  section:{fontSize:16,fontWeight:'900',marginTop:20,marginBottom:8},row:{backgroundColor:'#FFF',padding:12,borderRadius:12,marginBottom:8,flexDirection:'row',justifyContent:'space-between'},kind:{fontWeight:'800'},meta:{fontSize:10,color:'#64748B'},quantity:{fontSize:18,fontWeight:'900'},
  error:{padding:16,backgroundColor:'#FEE2E2',borderRadius:12},link:{color:'#1D4ED8',fontWeight:'800',marginTop:8},empty:{color:'#64748B',textAlign:'center',padding:20}
});
