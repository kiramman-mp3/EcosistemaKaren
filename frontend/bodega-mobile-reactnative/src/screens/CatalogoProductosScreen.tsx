import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { api } from '../api/client';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { BackendCategory, BackendProduct } from '../types';
import { normalizeBarcode, validateScannedBarcode } from '../utils/barcode';
import { Ionicons } from '@expo/vector-icons';

const PAGE_SIZE = 30;
const EMPTY_FORM = { categoriaId: '', nombre: '', descripcion: '', precioVenta: '', impuestoPorcentaje: '0', minStockAlerta: '10' };

interface Props { role: string; onCatalogChanged: () => void | Promise<void>; }

export const CatalogoProductosScreen: React.FC<Props> = ({ role, onCatalogChanged }) => {
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ nombre: '', descripcion: '' });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const requestId = useRef(0);
  const canCreate = role === 'ADMIN';

  const load = useCallback(async (append = false) => {
    const id = ++requestId.current;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const offset = append ? products.length : 0;
      const result = await api.getProductsPage({ q: query.trim() || undefined, categoriaId: categoryId || undefined, limit: PAGE_SIZE, offset });
      if (id !== requestId.current) return;
      setProducts(current => append ? [...current, ...result.items] : result.items);
      setTotal(result.total);
    } catch (error: any) {
      if (id === requestId.current) Alert.alert('Catálogo no disponible', error.response?.data?.message || 'No se pudieron cargar los productos.');
    } finally {
      if (id === requestId.current) { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    }
  }, [categoryId, products.length, query]);

  useEffect(() => { void api.getCategories().then(setCategories).catch(() => Alert.alert('Error', 'No se pudieron cargar las categorías.')); }, []);
  useEffect(() => {
    const timer = setTimeout(() => { setProducts([]); void load(false); }, 350);
    return () => clearTimeout(timer);
    // products.length is intentionally excluded: only filters start a new search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryId]);

  const openRegistration = (code = '') => {
    setBarcode(normalizeBarcode(code));
    setForm({ ...EMPTY_FORM, categoriaId: categories.length === 1 ? categories[0].id : '' });
    setFormError(null);
    setFormOpen(true);
  };

  const resolveBarcode = async (raw: string) => {
    const normalized = normalizeBarcode(raw);
    if (validateScannedBarcode(normalized) !== 'valid') {
      Alert.alert('Código inválido', 'El código leído no es un EAN/GTIN válido.');
      return;
    }
    try {
      const existing = await api.getProductByBarcode(normalized);
      if (existing) {
        setQuery(normalized);
        Alert.alert('Producto existente', `${existing.nombre} ya está registrado en el catálogo.`);
        return;
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        Alert.alert('Sin conexión', 'No se pudo comprobar el código en el catálogo.');
        return;
      }
    }
    openRegistration(normalized);
  };

  const saveProduct = async () => {
    const price = Number(form.precioVenta.replace(',', '.'));
    const tax = Number(form.impuestoPorcentaje.replace(',', '.'));
    const minimum = Number(form.minStockAlerta);
    if (validateScannedBarcode(barcode) !== 'valid') return setFormError('Escanea o escribe un EAN/GTIN válido.');
    if (!form.categoriaId) return setFormError('Selecciona una categoría.');
    if (form.nombre.trim().length < 3) return setFormError('El nombre debe tener al menos 3 caracteres.');
    if (!Number.isFinite(price) || price <= 0) return setFormError('El precio debe ser mayor a cero.');
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) return setFormError('El impuesto debe estar entre 0 y 100%.');
    if (!Number.isInteger(minimum) || minimum < 0) return setFormError('El stock mínimo debe ser un entero positivo.');
    setSaving(true); setFormError(null);
    try {
      const created = await api.createProduct({ categoriaId: form.categoriaId, codigoBarras: barcode, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || undefined, precioVenta: price, impuestoPorcentaje: tax, minStockAlerta: minimum });
      setFormOpen(false);
      setQuery(created.codigoBarras);
      await onCatalogChanged();
      Alert.alert('Producto registrado', `${created.nombre} ya puede utilizarse al ingresar lotes.`);
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'No se pudo registrar el producto.');
    } finally { setSaving(false); }
  };

  const saveCategory = async () => {
    const name = categoryForm.nombre.trim();
    if (name.length < 2) {
      setCategoryError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    setSavingCategory(true);
    setCategoryError(null);
    try {
      const created = await api.createCategory({
        nombre: name,
        descripcion: categoryForm.descripcion.trim() || undefined,
      });
      setCategories(current => [...current, created].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      setCategoryFormOpen(false);
      setCategoryForm({ nombre: '', descripcion: '' });
      setCategoryId(created.id);
      setForm(current => ({ ...current, categoriaId: created.id }));
      Alert.alert('Categoría creada', `${created.nombre} ya está disponible en el catálogo.`);
    } catch (error: any) {
      setCategoryError(error.response?.data?.message || 'No se pudo crear la categoría.');
    } finally {
      setSavingCategory(false);
    }
  };

  const categoryName = (id: string) => categories.find(category => category.id === id)?.nombre || 'Sin categoría';

  return <View style={styles.screen}>
    <FlatList
      data={products}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(false); }} />}
      onEndReached={() => { if (!loading && !loadingMore && products.length < total) void load(true); }}
      onEndReachedThreshold={0.35}
      ListHeaderComponent={<>
        <Text style={styles.eyebrow}>CATÁLOGO MAESTRO</Text>
        <Text style={styles.title}>Productos del mercado</Text>
        <Text style={styles.subtitle}>Busca por nombre o código. Se cargan {PAGE_SIZE} productos a medida que avanzas.</Text>
        {canCreate && <View style={styles.adminActions}>
          <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerOpen(true)}><Ionicons name="barcode-outline" size={19} color="#FFF" /><Text style={styles.scanBtnText}>Escanear producto</Text></TouchableOpacity>
          <TouchableOpacity style={styles.categoryBtn} onPress={() => { setCategoryError(null); setCategoryFormOpen(true); }}><Ionicons name="add" size={19} color="#1E293B" /><Text style={styles.categoryBtnText}>Categoría</Text></TouchableOpacity>
        </View>}
        <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Buscar nombre o código de barras…" placeholderTextColor="#94A3B8" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <TouchableOpacity style={[styles.filter, !categoryId && styles.filterActive]} onPress={() => setCategoryId('')}><Text style={[styles.filterText, !categoryId && styles.filterTextActive]}>Todos</Text></TouchableOpacity>
          {categories.map(category => <TouchableOpacity key={category.id} style={[styles.filter, categoryId === category.id && styles.filterActive]} onPress={() => setCategoryId(category.id)}><Text style={[styles.filterText, categoryId === category.id && styles.filterTextActive]}>{category.nombre}</Text></TouchableOpacity>)}
        </ScrollView>
        <Text style={styles.count}>{total} producto{total === 1 ? '' : 's'}</Text>
      </>}
      renderItem={({ item }) => <View style={styles.card}>
        <View style={styles.cardTop}><Text style={styles.productName}>{item.nombre}</Text><Text style={styles.price}>${Number(item.precioVenta).toFixed(2)}</Text></View>
        <Text style={styles.barcode}>EAN/GTIN: {item.codigoBarras}</Text>
        <View style={styles.meta}><Text style={styles.category}>{categoryName(item.categoriaId)}</Text><Text style={styles.tax}>Impuesto: {Number(item.impuestoPorcentaje || 0).toFixed(2)}%</Text></View>
        {!!item.descripcion && <Text style={styles.description}>{item.descripcion}</Text>}
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator color="#1E293B" size="large" /> : <Text style={styles.empty}>No hay productos para estos filtros.</Text>}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color="#1E293B" /> : null}
    />

    <BarcodeScannerModal visible={scannerOpen} title="Escanear producto del catálogo" onClose={() => setScannerOpen(false)} onScanned={value => void resolveBarcode(value)} />
    <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalCard}><ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.modalTitleRow}><View><Text style={styles.modalTitle}>Nuevo producto</Text><Text style={styles.modalSubtitle}>Completa los datos que no contiene el código.</Text></View><TouchableOpacity onPress={() => setFormOpen(false)}><Ionicons name="close" size={28} color="#64748B" /></TouchableOpacity></View>
          {formError && <Text style={styles.formError}>{formError}</Text>}
          <Text style={styles.label}>CÓDIGO EAN/GTIN</Text><TextInput style={styles.input} value={barcode} keyboardType="number-pad" onChangeText={value => setBarcode(normalizeBarcode(value))} />
          <Text style={styles.label}>CATEGORÍA</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map(category => <TouchableOpacity key={category.id} style={[styles.formCategory, form.categoriaId === category.id && styles.formCategoryActive]} onPress={() => setForm(current => ({ ...current, categoriaId: category.id }))}><Text style={form.categoriaId === category.id ? styles.formCategoryTextActive : styles.formCategoryText}>{category.nombre}</Text></TouchableOpacity>)}</ScrollView>
          <Text style={styles.label}>NOMBRE</Text><TextInput style={styles.input} value={form.nombre} onChangeText={value => setForm(current => ({ ...current, nombre: value }))} />
          <Text style={styles.label}>DESCRIPCIÓN (OPCIONAL)</Text><TextInput style={[styles.input, styles.multiline]} multiline value={form.descripcion} onChangeText={value => setForm(current => ({ ...current, descripcion: value }))} />
          <View style={styles.formRow}><View style={styles.formColumn}><Text style={styles.label}>PRECIO</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={form.precioVenta} onChangeText={value => setForm(current => ({ ...current, precioVenta: value }))} /></View><View style={styles.formColumn}><Text style={styles.label}>IMPUESTO %</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={form.impuestoPorcentaje} onChangeText={value => setForm(current => ({ ...current, impuestoPorcentaje: value }))} /></View></View>
          <Text style={styles.label}>STOCK MÍNIMO DE ALERTA</Text><TextInput style={styles.input} keyboardType="number-pad" value={form.minStockAlerta} onChangeText={value => setForm(current => ({ ...current, minStockAlerta: value }))} />
          <TouchableOpacity style={[styles.saveBtn, styles.brandAction, saving && styles.disabled]} disabled={saving} onPress={() => void saveProduct()}><Text style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar en catálogo maestro'}</Text></TouchableOpacity>
        </ScrollView></View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={categoryFormOpen} transparent animationType="fade" onRequestClose={() => setCategoryFormOpen(false)}>
      <KeyboardAvoidingView style={styles.centeredBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.categoryModalCard}>
          <View style={styles.modalTitleRow}>
            <View style={styles.modalHeading}><Text style={styles.modalTitle}>Nueva categoría</Text><Text style={styles.modalSubtitle}>Organiza los productos del catálogo maestro.</Text></View>
            <TouchableOpacity onPress={() => setCategoryFormOpen(false)} disabled={savingCategory}><Ionicons name="close" size={28} color="#64748B" /></TouchableOpacity>
          </View>
          {categoryError && <Text style={styles.formError}>{categoryError}</Text>}
          <Text style={styles.label}>NOMBRE</Text>
          <TextInput style={styles.input} autoFocus maxLength={100} value={categoryForm.nombre} onChangeText={nombre => setCategoryForm(current => ({ ...current, nombre }))} placeholder="Ej: Limpieza del hogar" placeholderTextColor="#94A3B8" />
          <Text style={styles.label}>DESCRIPCIÓN (OPCIONAL)</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline maxLength={500} value={categoryForm.descripcion} onChangeText={descripcion => setCategoryForm(current => ({ ...current, descripcion }))} placeholder="Describe qué productos pertenecen aquí" placeholderTextColor="#94A3B8" />
          <View style={styles.categoryModalActions}>
            <TouchableOpacity style={styles.cancelBtn} disabled={savingCategory} onPress={() => setCategoryFormOpen(false)}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveCategoryBtn, styles.brandAction, savingCategory && styles.disabled]} disabled={savingCategory} onPress={() => void saveCategory()}>{savingCategory ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Crear categoría</Text>}</TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
};

const styles = StyleSheet.create({
  brandAction:{backgroundColor:'#F87171'},
  screen:{flex:1,backgroundColor:'#F8FAFC'},list:{padding:16,paddingBottom:30},eyebrow:{color:'#DC2626',fontSize:11,fontWeight:'900',letterSpacing:1},title:{fontSize:25,fontWeight:'900',color:'#0F172A',marginTop:4},subtitle:{color:'#64748B',fontSize:13,lineHeight:19,marginTop:4},adminActions:{flexDirection:'row',gap:8,marginTop:14},scanBtn:{flex:1,flexDirection:'row',gap:7,backgroundColor:'#1E293B',borderRadius:13,padding:14,alignItems:'center',justifyContent:'center'},scanBtnText:{color:'#FFF',fontWeight:'900'},categoryBtn:{flexDirection:'row',gap:4,alignItems:'center',backgroundColor:'#FFF',borderWidth:1,borderColor:'#1E293B',borderRadius:13,paddingHorizontal:14,justifyContent:'center'},categoryBtnText:{color:'#1E293B',fontWeight:'900'},search:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#CBD5E1',borderRadius:13,paddingHorizontal:14,paddingVertical:12,color:'#0F172A',marginTop:12},filters:{gap:8,paddingVertical:12},filter:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#CBD5E1',borderRadius:20,paddingHorizontal:14,paddingVertical:8},filterActive:{backgroundColor:'#1E293B',borderColor:'#1E293B'},filterText:{color:'#475569',fontWeight:'800',fontSize:12},filterTextActive:{color:'#FFF'},count:{color:'#64748B',fontWeight:'700',marginBottom:8},card:{backgroundColor:'#FFF',borderRadius:16,padding:15,marginBottom:10,borderWidth:1,borderColor:'#E2E8F0'},cardTop:{flexDirection:'row',justifyContent:'space-between',gap:10},productName:{flex:1,color:'#0F172A',fontSize:16,fontWeight:'900'},price:{color:'#DC2626',fontSize:17,fontWeight:'900'},barcode:{color:'#64748B',fontSize:12,marginTop:7},meta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10},category:{backgroundColor:'#EFF6FF',color:'#1D4ED8',paddingHorizontal:9,paddingVertical:4,borderRadius:10,fontSize:11,fontWeight:'800'},tax:{color:'#475569',fontSize:11,fontWeight:'700'},description:{color:'#64748B',fontSize:12,lineHeight:17,marginTop:9},empty:{textAlign:'center',color:'#64748B',padding:32},footer:{padding:18},modalBackdrop:{flex:1,backgroundColor:'rgba(15,23,42,.55)',justifyContent:'flex-end'},centeredBackdrop:{flex:1,backgroundColor:'rgba(15,23,42,.55)',justifyContent:'center',padding:20},modalCard:{maxHeight:'92%',backgroundColor:'#FFF',borderTopLeftRadius:24,borderTopRightRadius:24,padding:20},categoryModalCard:{backgroundColor:'#FFF',borderRadius:20,padding:20},modalTitleRow:{flexDirection:'row',justifyContent:'space-between'},modalHeading:{flex:1,paddingRight:10},modalTitle:{fontSize:22,fontWeight:'900',color:'#0F172A'},modalSubtitle:{fontSize:12,color:'#64748B',marginTop:3},close:{fontSize:32,color:'#64748B',lineHeight:32},formError:{backgroundColor:'#FEE2E2',color:'#B91C1C',padding:10,borderRadius:10,marginTop:12},label:{fontSize:11,fontWeight:'900',color:'#334155',marginTop:14,marginBottom:6},input:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,paddingHorizontal:12,paddingVertical:11,color:'#0F172A',backgroundColor:'#F8FAFC'},multiline:{height:72,textAlignVertical:'top'},formCategory:{borderWidth:1,borderColor:'#CBD5E1',paddingHorizontal:11,paddingVertical:8,borderRadius:15,marginRight:7},formCategoryActive:{backgroundColor:'#1E293B',borderColor:'#1E293B'},formCategoryText:{color:'#475569',fontWeight:'700',fontSize:11},formCategoryTextActive:{color:'#FFF',fontWeight:'800',fontSize:11},formRow:{flexDirection:'row',gap:10},formColumn:{flex:1},saveBtn:{backgroundColor:'#DC2626',borderRadius:13,padding:15,alignItems:'center',marginTop:20,marginBottom:14},saveBtnText:{color:'#FFF',fontWeight:'900'},categoryModalActions:{flexDirection:'row',gap:10,marginTop:20},cancelBtn:{flex:1,borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,padding:14,alignItems:'center'},cancelBtnText:{color:'#475569',fontWeight:'900'},saveCategoryBtn:{flex:1.5,backgroundColor:'#DC2626',borderRadius:12,padding:14,alignItems:'center'},disabled:{opacity:.6},
});
