import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, mediaUrl } from '../api/client';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { BackendCategory, BackendProduct } from '../types';
import { normalizeBarcode, validateScannedBarcode } from '../utils/barcode';
import { notify } from '../utils/dialogs';
import { Button, Chip, EmptyState, Field, Notice, ScreenTitle } from '../components/ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { getErrorStatus, getServerMessage } from '../utils/errors';

const PAGE_SIZE = 30;
const EMPTY_FORM = { categoriaId: '', nombre: '', descripcion: '', precioVenta: '', impuestoPorcentaje: '15', minStockAlerta: '10' };

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
    } catch (error: unknown) {
      if (id === requestId.current) notify('No se pudo cargar el catálogo', getServerMessage(error) || 'Revisa la conexión con la tienda.');
    } finally {
      if (id === requestId.current) { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    }
  }, [categoryId, products.length, query]);

  useEffect(() => {
    void api.getCategories().then(setCategories).catch(() => notify('No se pudieron cargar las categorías', 'Revisa la conexión con la tienda.'));
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { setProducts([]); void load(false); }, 350);
    return () => clearTimeout(timer);
    // products.length se excluye a propósito: solo los filtros inician una búsqueda nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryId]);

  const openRegistration = (code = '') => {
    setBarcode(normalizeBarcode(code));
    setForm({ ...EMPTY_FORM, categoriaId: categories.length === 1 ? categories[0].id : '' });
    setFormError(null);
    setFormOpen(true);
  };

  const resolveBarcode = async (raw: string) => {
    setScannerOpen(false);
    const normalized = normalizeBarcode(raw);
    if (validateScannedBarcode(normalized) !== 'valid') {
      notify('Código no válido', 'El código leído no es un EAN válido. Vuelve a escanearlo.');
      return;
    }
    try {
      const existing = await api.getProductByBarcode(normalized);
      if (existing) {
        setQuery(normalized);
        notify('Ya está en el catálogo', existing.nombre);
        return;
      }
    } catch (error: unknown) {
      if (getErrorStatus(error) !== 404) {
        notify('Sin conexión', 'No se pudo comprobar el código en el catálogo.');
        return;
      }
    }
    openRegistration(normalized);
  };

  const saveProduct = async () => {
    const price = Number(form.precioVenta.replace(',', '.'));
    const tax = Number(form.impuestoPorcentaje.replace(',', '.'));
    const minimum = Number(form.minStockAlerta);
    if (validateScannedBarcode(barcode) !== 'valid') return setFormError('Escanea o escribe un código EAN válido.');
    if (!form.categoriaId) return setFormError('Elige el pasillo (categoría) del producto.');
    if (form.nombre.trim().length < 3) return setFormError('El nombre debe tener al menos 3 caracteres.');
    if (!Number.isFinite(price) || price <= 0) return setFormError('El PVP debe ser mayor a cero.');
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) return setFormError('El IVA debe estar entre 0 y 100%.');
    if (!Number.isInteger(minimum) || minimum < 0) return setFormError('El stock mínimo debe ser un número entero.');
    setSaving(true); setFormError(null);
    try {
      const created = await api.createProduct({
        categoriaId: form.categoriaId, codigoBarras: barcode, nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined, precioVenta: price, impuestoPorcentaje: tax, minStockAlerta: minimum,
      });
      setFormOpen(false);
      setQuery(created.codigoBarras);
      await onCatalogChanged();
      notify('Producto registrado', `${created.nombre} ya se puede recibir en bodega.`);
    } catch (error: unknown) {
      setFormError(getServerMessage(error) || 'No se pudo registrar el producto.');
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
      const created = await api.createCategory({ nombre: name, descripcion: categoryForm.descripcion.trim() || undefined });
      setCategories(current => [...current, created].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      setCategoryFormOpen(false);
      setCategoryForm({ nombre: '', descripcion: '' });
      setCategoryId(created.id);
      setForm(current => ({ ...current, categoriaId: created.id }));
      notify('Categoría creada', `${created.nombre} ya está disponible.`);
    } catch (error: unknown) {
      setCategoryError(getServerMessage(error) || 'No se pudo crear la categoría.');
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
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(false); }} tintColor={colors.ink} colors={[colors.ink]} />}
      onEndReached={() => { if (!loading && !loadingMore && products.length < total) void load(true); }}
      onEndReachedThreshold={0.35}
      ListHeaderComponent={<>
        <ScreenTitle title="Catálogo" subtitle={`${total} producto${total === 1 ? '' : 's'} con su PVP e IVA.`} />
        {canCreate && <View style={styles.adminActions}>
          <Button label="Registrar producto" icon="barcode-outline" onPress={() => setScannerOpen(true)} style={styles.flex} compact />
          <Button label="Categoría" icon="add" variant="outline" compact onPress={() => { setCategoryError(null); setCategoryFormOpen(true); }} />
        </View>}
        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color={colors.inkMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Nombre o código de barras"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Buscar en el catálogo"
            autoCorrect={false}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clear} accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close" size={20} color={colors.inkMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Chip label="Todos" active={!categoryId} onPress={() => setCategoryId('')} />
          {categories.map(category => (
            <Chip key={category.id} label={category.nombre} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
          ))}
        </ScrollView>
      </>}
      renderItem={({ item }) => {
        const image = mediaUrl(item.imagenUrl);
        return (
          <View style={styles.row}>
            <View style={styles.thumb}>
              {image
                ? <Image source={{ uri: image }} style={styles.thumbImage} resizeMode="contain" accessibilityIgnoresInvertColors />
                : <Ionicons name="image-outline" size={24} color={colors.inkFaint} />}
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.name} numberOfLines={2}>{item.nombre}</Text>
              <Text style={styles.meta} numberOfLines={1}>{categoryName(item.categoriaId)}</Text>
              <Text style={styles.ean}>EAN {item.codigoBarras}</Text>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.price}>${Number(item.precioVenta).toFixed(2)}</Text>
              <Text style={styles.tax}>IVA {Number(item.impuestoPorcentaje || 0).toFixed(0)}%</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={loading
        ? <ActivityIndicator color={colors.ink} size="large" style={styles.loader} />
        : <EmptyState icon="pricetag-outline" title="Sin productos" text="No hay productos con esa búsqueda o en ese pasillo." />}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loader} color={colors.ink} /> : null}
    />

    <BarcodeScannerModal visible={scannerOpen} title="Escanear producto nuevo" onClose={() => setScannerOpen(false)} onScanned={value => void resolveBarcode(value)} />

    <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
      <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Nuevo producto</Text>
              <TouchableOpacity onPress={() => setFormOpen(false)} accessibilityLabel="Cerrar" style={styles.close}>
                <Ionicons name="close" size={26} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>
            {formError && <Notice tone="error" text={formError} />}
            <Field label="Código EAN" value={barcode} keyboardType="number-pad" onChangeText={value => setBarcode(normalizeBarcode(value))} />
            <Text style={styles.label}>Pasillo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {categories.map(category => (
                <Chip
                  key={category.id}
                  label={category.nombre}
                  active={form.categoriaId === category.id}
                  onPress={() => setForm(current => ({ ...current, categoriaId: category.id }))}
                />
              ))}
            </ScrollView>
            <Field label="Nombre como aparece en percha" value={form.nombre} onChangeText={value => setForm(current => ({ ...current, nombre: value }))} placeholder="Leche Vita Entera 1 L" />
            <Field label="Marca y contenido (opcional)" value={form.descripcion} onChangeText={value => setForm(current => ({ ...current, descripcion: value }))} />
            <View style={styles.cols}>
              <View style={styles.flex}>
                <Field label="PVP ($)" keyboardType="decimal-pad" value={form.precioVenta} onChangeText={value => setForm(current => ({ ...current, precioVenta: value }))} />
              </View>
              <View style={styles.flex}>
                <Field label="IVA (%)" keyboardType="decimal-pad" value={form.impuestoPorcentaje} onChangeText={value => setForm(current => ({ ...current, impuestoPorcentaje: value }))} hint="15 o 0" />
              </View>
            </View>
            <Field label="Avisar con menos de (unidades)" keyboardType="number-pad" value={form.minStockAlerta} onChangeText={value => setForm(current => ({ ...current, minStockAlerta: value }))} />
            <Button label="Guardar producto" variant="danger" loading={saving} onPress={() => void saveProduct()} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={categoryFormOpen} transparent animationType="fade" onRequestClose={() => setCategoryFormOpen(false)}>
      <KeyboardAvoidingView style={styles.centerBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.dialog}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Nueva categoría</Text>
            <TouchableOpacity onPress={() => setCategoryFormOpen(false)} disabled={savingCategory} accessibilityLabel="Cerrar" style={styles.close}>
              <Ionicons name="close" size={26} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
          {categoryError && <Notice tone="error" text={categoryError} />}
          <Field label="Nombre" autoFocus maxLength={100} value={categoryForm.nombre} onChangeText={nombre => setCategoryForm(current => ({ ...current, nombre }))} placeholder="Limpieza del hogar" />
          <Field label="Qué incluye (opcional)" maxLength={500} value={categoryForm.descripcion} onChangeText={descripcion => setCategoryForm(current => ({ ...current, descripcion }))} />
          <View style={styles.cols}>
            <Button label="Cancelar" variant="ghost" disabled={savingCategory} onPress={() => setCategoryFormOpen(false)} style={styles.flex} />
            <Button label="Crear" variant="danger" loading={savingCategory} onPress={() => void saveCategory()} style={styles.flex} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
};

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.aisle },
  list: { padding: 16, paddingBottom: 32 },
  flex: { flex: 1, minWidth: 0 },
  adminActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingLeft: 12,
    backgroundColor: colors.card, borderRadius: radius.tag, borderWidth: 1.5, borderColor: colors.ruleStrong,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { gap: 8, paddingVertical: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: radius.tag, borderWidth: 1, borderColor: colors.rule, padding: 10, marginBottom: 8,
  },
  thumb: { width: 60, height: 60, borderRadius: radius.tag, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: 60, height: 60 },
  rowInfo: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  ean: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  priceBox: { alignItems: 'flex-end' },
  price: { fontFamily: fonts.tag, fontSize: 22, color: colors.ink },
  tax: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted },
  loader: { padding: 24 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(42,29,20,0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.card, borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20 },
  centerBackdrop: { flex: 1, backgroundColor: 'rgba(42,29,20,0.55)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: colors.card, borderRadius: radius.tag, padding: 20, width: '100%', maxWidth: 460, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.tag, fontSize: 26, color: colors.ink },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginBottom: -4 },
  cols: { flexDirection: 'row', gap: 10 },
}));
