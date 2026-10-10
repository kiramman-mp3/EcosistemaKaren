import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { BackendPromotion } from '../types';

export const AprobacionesScreen: React.FC = () => {
  const [items, setItems] = useState<BackendPromotion[]>([]);
  const [reason, setReason] = useState('No cumple los criterios comerciales');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setItems(await api.getPendingPromotions()); } catch (e:any) { Alert.alert('Error', e.response?.data?.message || 'No se pudieron cargar las aprobaciones.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const execute = async (id: string, action: 'approve'|'reject') => { try { action === 'approve' ? await api.approvePromotion(id) : await api.rejectPromotion(id, reason); await load(); } catch(e:any) { Alert.alert('Operación rechazada', e.response?.data?.message || e.message); } };
  return <ScrollView style={styles.container}><Text style={styles.title}>Aprobación de ofertas IA</Text><Text style={styles.subtitle}>Solo ADMIN puede publicar o rechazar borradores.</Text>
    {loading ? <ActivityIndicator style={{margin:30}}/> : items.map(item => <View key={item.id} style={styles.card}>
      <Text style={styles.discount}>-{item.descuentoPorcentaje}%</Text><Text style={styles.phrase}>{item.frasePromocional}</Text><Text style={styles.reason}>{item.razonIa}</Text>
      <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Motivo de rechazo" />
      <View style={styles.actions}><TouchableOpacity style={styles.reject} onPress={()=>execute(item.id,'reject')}><Text style={styles.buttonText}>Rechazar</Text></TouchableOpacity><TouchableOpacity style={styles.approve} onPress={()=>execute(item.id,'approve')}><Text style={styles.buttonText}>Aprobar</Text></TouchableOpacity></View>
    </View>)}
    {!loading && items.length===0 && <Text style={styles.empty}>No hay promociones pendientes.</Text>}
  </ScrollView>;
};
const styles=StyleSheet.create({container:{flex:1,padding:16,backgroundColor:'#F8FAFC'},title:{fontSize:22,fontWeight:'900'},subtitle:{color:'#64748B',marginBottom:16},card:{backgroundColor:'#FFF',padding:16,borderRadius:16,marginBottom:12,borderWidth:1,borderColor:'#E2E8F0'},discount:{color:'#DC2626',fontSize:22,fontWeight:'900'},phrase:{fontSize:15,fontWeight:'800',marginVertical:5},reason:{fontSize:11,color:'#64748B'},input:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,padding:10,marginTop:12},actions:{flexDirection:'row',gap:8,marginTop:10},reject:{flex:1,backgroundColor:'#DC2626',padding:11,borderRadius:10,alignItems:'center'},approve:{flex:1,backgroundColor:'#16A34A',padding:11,borderRadius:10,alignItems:'center'},buttonText:{color:'#FFF',fontWeight:'800'},empty:{textAlign:'center',padding:30,color:'#64748B'}});
