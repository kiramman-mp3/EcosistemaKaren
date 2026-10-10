import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import { BackendPromotion } from '../types';
import { Ionicons } from '@expo/vector-icons';

type Filter = 'TODAS' | 'PENDIENTES' | 'ACTIVAS' | 'FINALIZADAS' | 'RECHAZADAS';
const FILTERS: Filter[] = ['TODAS', 'PENDIENTES', 'ACTIVAS', 'FINALIZADAS', 'RECHAZADAS'];

export const AprobacionesScreen: React.FC = () => {
  const [items, setItems] = useState<BackendPromotion[]>([]);
  const [filter, setFilter] = useState<Filter>('PENDIENTES');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BackendPromotion | null>(null);
  const [discount, setDiscount] = useState('');
  const [phrase, setPhrase] = useState('');
  const [rejectReason, setRejectReason] = useState('No cumple los criterios comerciales');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = filter === 'PENDIENTES' ? { estado: 'PENDIENTE_APROBACION' }
      : filter === 'ACTIVAS' ? { estado: 'APROBADA', activa: true }
        : filter === 'FINALIZADAS' ? { estado: 'APROBADA', activa: false }
          : filter === 'RECHAZADAS' ? { estado: 'RECHAZADA' } : {};
    try { setItems(await api.getManagedPromotions(params)); }
    catch (error: any) { Alert.alert('Error', error.response?.data?.message || 'No se pudieron cargar las promociones.'); }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const open = (item: BackendPromotion) => {
    setSelected(item); setDiscount(String(item.descuentoPorcentaje)); setPhrase(item.frasePromocional);
    setRejectReason('No cumple los criterios comerciales');
  };
  const run = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    try { await action(); setSelected(null); await load(); Alert.alert('Promociones', success); }
    catch (error: any) { Alert.alert('Operación rechazada', error.response?.data?.message || error.message); }
    finally { setSaving(false); }
  };
  const save = () => {
    if (!selected) return;
    const value = Number(discount.replace(',', '.'));
    if (!Number.isFinite(value) || value < 5 || value > 50) return Alert.alert('Dato inválido', 'El descuento debe estar entre 5% y 50%.');
    if (phrase.trim().length < 3 || phrase.trim().length > 180) return Alert.alert('Dato inválido', 'La frase debe tener entre 3 y 180 caracteres.');
    void run(() => api.updatePromotion(selected.id, { descuentoPorcentaje: value, frasePromocional: phrase.trim() }), 'El borrador fue actualizado.');
  };
  const remove = () => selected && Alert.alert('Eliminar borrador', 'Esta acción elimina el borrador sin publicar.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => void run(() => api.deletePromotionDraft(selected.id), 'El borrador fue eliminado.') }
  ]);
  const finish = () => selected && Alert.alert('Finalizar promoción', 'La oferta dejará de mostrarse a los clientes y conservará su historial.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Finalizar', style: 'destructive', onPress: () => void run(() => api.deactivatePromotion(selected.id), 'La promoción fue finalizada.') }
  ]);

  return <View style={styles.container}>
    <ScrollView style={styles.list} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={['#DC2626']} />}>
      <Text style={styles.eyebrow}>CONTROL COMERCIAL</Text><Text style={styles.title}>Promociones</Text><Text style={styles.subtitle}>Revisa, edita y controla las ofertas antes y después de publicarlas.</Text>
      <ScrollView style={styles.filtersScroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map(value => <TouchableOpacity key={value} style={[styles.filter, filter === value && styles.filterActive]} onPress={() => setFilter(value)}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value}</Text></TouchableOpacity>)}
      </ScrollView>
      {loading ? <ActivityIndicator style={styles.loader} /> : items.map(item => <TouchableOpacity key={item.id} style={styles.card} onPress={() => open(item)}>
        <View style={styles.cardTop}><Text style={styles.product}>{item.productoNombre || 'Producto'}</Text><Text style={styles.discount}>-{item.descuentoPorcentaje}%</Text></View>
        <Text style={styles.phrase}>{item.frasePromocional}</Text>
        <Text style={styles.lot}>Lote: {item.numeroLote || item.loteId.slice(0, 8)} · Stock: {item.cantidadDisponible ?? '—'} un.</Text>
        <View style={[styles.status, item.estado === 'RECHAZADA' ? styles.rejected : item.estado === 'APROBADA' && item.activa ? styles.active : item.estado === 'APROBADA' ? styles.finished : styles.pending]}><Text style={styles.statusText}>{item.estado === 'APROBADA' ? item.activa ? 'ACTIVA' : 'FINALIZADA' : item.estado === 'RECHAZADA' ? 'RECHAZADA' : 'PENDIENTE'}</Text></View>
      </TouchableOpacity>)}
      {!loading && !items.length && <Text style={styles.empty}>No hay promociones en este estado.</Text>}
    </ScrollView>

    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.modal}><ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}><View style={styles.modalHeading}><Text style={styles.modalTitle}>{selected?.productoNombre || 'Promoción'}</Text><Text style={styles.modalSub}>Lote {selected?.numeroLote || selected?.loteId}</Text></View><TouchableOpacity onPress={() => setSelected(null)}><Ionicons name="close" size={28} color="#64748B" /></TouchableOpacity></View>
        {selected?.estado === 'PENDIENTE_APROBACION' ? <>
          <Text style={styles.label}>DESCUENTO (5%–50%)</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={discount} onChangeText={setDiscount} />
          <Text style={styles.label}>FRASE COMERCIAL</Text><TextInput style={[styles.input, styles.textarea]} multiline maxLength={180} value={phrase} onChangeText={setPhrase} />
          <Text style={styles.label}>JUSTIFICACIÓN DE IA (NO EDITABLE)</Text><Text style={styles.aiReason}>{selected.razonIa}</Text>
          <TouchableOpacity style={styles.save} disabled={saving} onPress={save}><Text style={styles.buttonText}>Guardar cambios</Text></TouchableOpacity>
          <View style={styles.actionRow}><TouchableOpacity style={styles.approve} disabled={saving} onPress={() => void run(() => api.approvePromotion(selected.id), 'La promoción fue publicada.')}><Text style={styles.buttonText}>Aprobar</Text></TouchableOpacity><TouchableOpacity style={[styles.delete, styles.rowDelete]} disabled={saving} onPress={remove}><Text style={styles.buttonText}>Eliminar borrador</Text></TouchableOpacity></View>
          <Text style={styles.label}>MOTIVO DE RECHAZO</Text><TextInput style={styles.input} value={rejectReason} onChangeText={setRejectReason} /><TouchableOpacity style={styles.rejectButton} disabled={saving} onPress={() => void run(() => api.rejectPromotion(selected.id, rejectReason), 'La promoción fue rechazada.')}><Text style={styles.rejectText}>Rechazar promoción</Text></TouchableOpacity>
        </> : <>
          <View style={styles.readOnly}><Text style={styles.readOnlyDiscount}>-{selected?.descuentoPorcentaje}%</Text><Text style={styles.readOnlyPhrase}>{selected?.frasePromocional}</Text></View>
          {!!selected?.razonIa && <><Text style={styles.label}>JUSTIFICACIÓN DE IA</Text><Text style={styles.aiReason}>{selected.razonIa}</Text></>}
          {!!selected?.motivoRechazo && <><Text style={styles.label}>MOTIVO DE RECHAZO</Text><Text style={styles.aiReason}>{selected.motivoRechazo}</Text></>}
          {selected?.estado === 'APROBADA' && selected.activa && <TouchableOpacity style={styles.delete} disabled={saving} onPress={finish}><Text style={styles.buttonText}>Finalizar promoción</Text></TouchableOpacity>}
        </>}
      </ScrollView></View></KeyboardAvoidingView>
    </Modal>
  </View>;
};

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8FAFC'},filtersScroll:{flexGrow:0,marginBottom:14},filters:{gap:8,paddingRight:8},filter:{height:36,justifyContent:'center',paddingHorizontal:13,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:'#CBD5E1'},filterActive:{backgroundColor:'#1E293B',borderColor:'#1E293B'},filterText:{fontSize:10,fontWeight:'900',color:'#64748B'},filterTextActive:{color:'#FFF'},list:{flex:1},content:{padding:16,paddingTop:16,paddingBottom:30},eyebrow:{fontSize:10,fontWeight:'900',color:'#DC2626',letterSpacing:1},title:{fontSize:25,fontWeight:'900',color:'#0F172A'},subtitle:{color:'#64748B',fontSize:12,marginBottom:12},loader:{margin:30},card:{backgroundColor:'#FFF',borderRadius:15,padding:15,marginBottom:11,borderWidth:1,borderColor:'#E2E8F0'},cardTop:{flexDirection:'row',justifyContent:'space-between',gap:10},product:{flex:1,fontSize:15,fontWeight:'900',color:'#0F172A'},discount:{fontSize:20,fontWeight:'900',color:'#DC2626'},phrase:{color:'#334155',fontSize:13,fontWeight:'700',marginTop:7},lot:{color:'#64748B',fontSize:11,marginTop:8},status:{alignSelf:'flex-start',borderRadius:10,paddingHorizontal:9,paddingVertical:4,marginTop:10},pending:{backgroundColor:'#FEF3C7'},active:{backgroundColor:'#DCFCE7'},finished:{backgroundColor:'#E2E8F0'},rejected:{backgroundColor:'#FEE2E2'},statusText:{fontSize:9,fontWeight:'900',color:'#334155'},empty:{textAlign:'center',color:'#64748B',padding:35},backdrop:{flex:1,backgroundColor:'rgba(15,23,42,.6)',justifyContent:'flex-end'},modal:{maxHeight:'92%',backgroundColor:'#FFF',borderTopLeftRadius:24,borderTopRightRadius:24,padding:20},modalHeader:{flexDirection:'row',justifyContent:'space-between'},modalHeading:{flex:1},modalTitle:{fontSize:21,fontWeight:'900',color:'#0F172A'},modalSub:{color:'#64748B',fontSize:11,marginTop:3},close:{fontSize:32,color:'#64748B'},label:{fontSize:10,fontWeight:'900',color:'#475569',marginTop:15,marginBottom:6},input:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:11,padding:11,color:'#0F172A',backgroundColor:'#F8FAFC'},textarea:{height:95,textAlignVertical:'top'},aiReason:{backgroundColor:'#F8FAFC',padding:12,borderRadius:11,color:'#475569',fontSize:12,lineHeight:17},save:{backgroundColor:'#1E293B',padding:14,borderRadius:12,alignItems:'center',marginTop:18},buttonText:{color:'#FFF',fontWeight:'900',fontSize:12},actionRow:{flexDirection:'row',gap:8,marginTop:9,alignItems:'stretch'},approve:{flex:1,minHeight:52,backgroundColor:'#16A34A',padding:13,borderRadius:11,alignItems:'center',justifyContent:'center'},delete:{flex:1,minHeight:52,backgroundColor:'#F87171',padding:13,borderRadius:11,alignItems:'center',justifyContent:'center',marginTop:9},rowDelete:{marginTop:0},rejectButton:{borderWidth:1,borderColor:'#F87171',padding:12,borderRadius:11,alignItems:'center',marginTop:9,marginBottom:12},rejectText:{color:'#F87171',fontWeight:'900'},readOnly:{backgroundColor:'#FEF2F2',borderRadius:14,padding:15,marginTop:15},readOnlyDiscount:{fontSize:28,fontWeight:'900',color:'#DC2626'},readOnlyPhrase:{fontSize:14,fontWeight:'700',color:'#334155',marginTop:6},
});
