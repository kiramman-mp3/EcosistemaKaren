import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { BackendPromotion } from '../types';
import { confirmAction, notify } from '../utils/dialogs';
import { contentFrame, sheetFrame, useLayout } from '../theme/layout';
import { Button, Chip, EmptyState, ExpiryStamp, Field, Notice, ScreenTitle } from '../components/ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { getErrorMessage, getServerMessage } from '../utils/errors';
import {
  END_PRESETS, OfferTermsInput, describeOfferTerms, presetEnd, sameTerms, termsToInput, validateOfferTerms,
} from '../utils/offerTerms';

type Filter = 'PENDIENTES' | 'ACTIVAS' | 'FINALIZADAS' | 'RECHAZADAS' | 'TODAS';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'PENDIENTES', label: 'Por revisar' },
  { id: 'ACTIVAS', label: 'Publicadas' },
  { id: 'FINALIZADAS', label: 'Finalizadas' },
  { id: 'RECHAZADAS', label: 'Rechazadas' },
  { id: 'TODAS', label: 'Todas' },
];

function statusOf(item: BackendPromotion) {
  if (item.estado === 'RECHAZADA') return { label: 'Rechazada', bg: colors.karenTint, fg: colors.karenDeep };
  if (item.estado === 'APROBADA') return item.activa
    ? { label: 'Publicada', bg: colors.freshTint, fg: colors.fresh }
    : { label: 'Finalizada', bg: colors.aisle, fg: colors.inkSoft };
  return { label: 'Por revisar', bg: colors.sticker, fg: colors.mora };
}

export const AprobacionesScreen: React.FC = () => {
  const { listColumns: columns, gutter } = useLayout();
  const [items, setItems] = useState<BackendPromotion[]>([]);
  const [filter, setFilter] = useState<Filter>('PENDIENTES');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BackendPromotion | null>(null);
  const [discount, setDiscount] = useState('');
  const [phrase, setPhrase] = useState('');
  const [terms, setTerms] = useState<OfferTermsInput>({ limit: '', stock: '', endDate: '', endTime: '' });
  const setTerm = (key: keyof OfferTermsInput) => (value: string) => setTerms(current => ({ ...current, [key]: value }));
  const [rejectReason, setRejectReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = filter === 'PENDIENTES' ? { estado: 'PENDIENTE_APROBACION' }
      : filter === 'ACTIVAS' ? { estado: 'APROBADA', activa: true }
        : filter === 'FINALIZADAS' ? { estado: 'APROBADA', activa: false }
          : filter === 'RECHAZADAS' ? { estado: 'RECHAZADA' } : {};
    try { setItems(await api.getManagedPromotions(params)); }
    catch (error: unknown) { notify('No se pudieron cargar las ofertas', getServerMessage(error) || 'Revisa la conexión con la tienda.'); }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const open = (item: BackendPromotion) => {
    setSelected(item);
    setDiscount(String(item.descuentoPorcentaje));
    setPhrase(item.frasePromocional);
    setTerms(termsToInput(item));
    setRejectReason('');
    setFormError(null);
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setFormError(null);
    try {
      await action();
      setSelected(null);
      await load();
      notify('Listo', success);
    } catch (error: unknown) {
      setFormError(getErrorMessage(error, 'No se pudo completar la acción.'));
    } finally { setSaving(false); }
  };

  // Valida el borrador; devuelve los valores o null si hay un error visible.
  const validDraft = () => {
    const value = Number(discount.replace(',', '.'));
    if (!Number.isFinite(value) || value < 5 || value > 50) { setFormError('El descuento debe estar entre 5% y 50%.'); return null; }
    if (phrase.trim().length < 3 || phrase.trim().length > 180) { setFormError('La frase debe tener entre 3 y 180 caracteres.'); return null; }
    const limits = validateOfferTerms(terms, selected?.cantidadDisponible);
    if ('error' in limits) { setFormError(limits.error); return null; }
    return { descuentoPorcentaje: value, frasePromocional: phrase.trim(), ...limits.terms };
  };

  const parsedTerms = selected ? validateOfferTerms(terms, selected.cantidadDisponible) : null;
  const isEdited = selected
    ? Number(discount.replace(',', '.')) !== Number(selected.descuentoPorcentaje) || phrase.trim() !== selected.frasePromocional
      || !parsedTerms || 'error' in parsedTerms || !sameTerms(parsedTerms.terms, selected)
    : false;

  const save = () => {
    if (!selected) return;
    const draft = validDraft();
    if (draft) void run(() => api.updatePromotion(selected.id, draft), 'Cambios guardados.');
  };

  // Si el administrador editó el borrador, primero se guarda: antes se publicaba la versión anterior.
  const approve = () => {
    if (!selected) return;
    const draft = validDraft();
    if (!draft) return;
    void run(async () => {
      if (isEdited) await api.updatePromotion(selected.id, draft);
      await api.approvePromotion(selected.id);
    }, 'La oferta ya aparece en el portal de clientes.');
  };

  const reject = () => {
    if (!selected) return;
    if (rejectReason.trim().length < 3) { setFormError('Escribe el motivo del rechazo (mínimo 3 caracteres).'); return; }
    void run(() => api.rejectPromotion(selected.id, rejectReason.trim()), 'Oferta rechazada.');
  };

  const remove = () => selected && void confirmAction('Eliminar borrador', 'El borrador se elimina sin publicarse.', { confirmLabel: 'Eliminar', destructive: true })
    .then(confirmed => { if (confirmed) void run(() => api.deletePromotionDraft(selected.id), 'Borrador eliminado.'); });

  const finish = () => selected && void confirmAction('Finalizar oferta', 'La oferta deja de mostrarse a los clientes. Su historial se conserva.', { confirmLabel: 'Finalizar', destructive: true })
    .then(confirmed => { if (confirmed) void run(() => api.deactivatePromotion(selected.id), 'Oferta finalizada.'); });

  return <View style={styles.container}>
    <FlatList
      key={columns}
      data={items}
      keyExtractor={item => item.id}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.columns : undefined}
      contentContainerStyle={[styles.content, contentFrame, { padding: gutter }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.karen} colors={[colors.karen]} />}
      ListHeaderComponent={<>
        <ScreenTitle title="Ofertas" subtitle="Revisa los descuentos sugeridos antes de que los vean los clientes." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map(option => <Chip key={option.id} label={option.label} active={filter === option.id} onPress={() => setFilter(option.id)} />)}
        </ScrollView>
      </>}
      ListEmptyComponent={loading
        ? <ActivityIndicator color={colors.ink} style={styles.loader} />
        : <EmptyState icon="megaphone-outline" title="Nada en este grupo" text="Las ofertas sugeridas desde 'Por vencer' aparecen aquí para revisarlas." />}
      renderItem={({ item }) => {
        const status = statusOf(item);
        const limits = describeOfferTerms(item);
        return (
          <TouchableOpacity style={[styles.card, columns > 1 && styles.cardColumn]} onPress={() => open(item)} accessibilityRole="button" accessibilityLabel={`${item.productoNombre || 'Oferta'}, ${status.label}`}>
            <View style={styles.discount}>
              <Text style={styles.discountText}>-{item.descuentoPorcentaje}%</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.product} numberOfLines={2}>{item.productoNombre || 'Producto'}</Text>
              <Text style={styles.phrase} numberOfLines={2}>{item.frasePromocional}</Text>
              {limits.length > 0 && <Text style={styles.limits} numberOfLines={2}>{limits.join(' · ')}</Text>}
              <View style={styles.cardMeta}>
                {item.fechaCaducidad ? <ExpiryStamp date={item.fechaCaducidad} /> : null}
                <View style={[styles.status, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />

    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, sheetFrame]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHead}>
              <View style={styles.flex}>
                <Text style={styles.sheetTitle}>{selected?.productoNombre || 'Oferta'}</Text>
                <Text style={styles.sheetSub}>
                  Lote {selected?.numeroLote || selected?.loteId.slice(0, 8)}
                  {selected?.cantidadDisponible != null ? `, ${selected.cantidadDisponible} unidades libres` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.close} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={26} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>

            {formError && <Notice tone="error" text={formError} />}

            {selected?.estado === 'PENDIENTE_APROBACION' ? <>
              <Field label="Descuento (%)" hint="Entre 5 y 50." keyboardType="decimal-pad" value={discount} onChangeText={setDiscount} />
              <Field label="Frase que verá el cliente" multiline maxLength={180} value={phrase} onChangeText={setPhrase} style={styles.textarea} />
              <Text style={styles.sectionLabel}>Límites de la oferta</Text>
              <Text style={styles.sectionHint}>Opcionales. Vacío: todo el lote, hasta que caduque.</Text>
              {/* Cada campo va en su propia columna flexible: el estilo de Field se aplica al cuadro de texto. */}
              <View style={styles.cols}>
                <View style={styles.col}>
                  <Field label="Máx. por pedido" placeholder="Sin tope" keyboardType="number-pad" value={terms.limit} onChangeText={setTerm('limit')} />
                </View>
                <View style={styles.col}>
                  <Field label="Stock de oferta" placeholder="Todo el lote"
                    hint={selected.cantidadDisponible != null ? `Hasta ${selected.cantidadDisponible}.` : undefined}
                    keyboardType="number-pad" value={terms.stock} onChangeText={setTerm('stock')} />
                </View>
              </View>
              <View style={styles.cols}>
                <View style={styles.col}>
                  <Field label="Termina el" placeholder="AAAA-MM-DD" autoCapitalize="none" maxLength={10} value={terms.endDate} onChangeText={setTerm('endDate')} />
                </View>
                <View style={styles.col}>
                  <Field label="A las" placeholder="HH:MM" maxLength={5} value={terms.endTime} onChangeText={setTerm('endTime')} />
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
                {END_PRESETS.map(preset => {
                  const end = presetEnd(preset.id);
                  return <Chip key={preset.id} label={preset.label}
                    active={terms.endDate === end.endDate && terms.endTime === end.endTime}
                    onPress={() => setTerms(current => ({ ...current, ...end }))} />;
                })}
                <Chip label="Sin fecha de fin" active={!terms.endDate && !terms.endTime}
                  onPress={() => setTerms(current => ({ ...current, endDate: '', endTime: '' }))} />
              </ScrollView>
              {!!selected.razonIa && (
                <View style={styles.reason}>
                  <Text style={styles.reasonLabel}>Por qué se sugiere</Text>
                  <Text style={styles.reasonText}>{selected.razonIa}</Text>
                </View>
              )}
              <Button label={isEdited ? 'Guardar y publicar' : 'Publicar oferta'} icon="checkmark-outline" variant="danger" loading={saving} onPress={approve} />
              <View style={styles.cols}>
                <Button label="Solo guardar" variant="outline" compact disabled={saving || !isEdited} onPress={save} style={styles.flex} />
                <Button label="Eliminar" variant="ghost" compact disabled={saving} onPress={remove} style={styles.flex} />
              </View>
              <View style={styles.divider} />
              <Field label="Motivo para rechazarla" placeholder="El margen no lo permite" value={rejectReason} onChangeText={setRejectReason} />
              <Button label="Rechazar" variant="outline" compact disabled={saving} onPress={reject} />
            </> : <>
              <View style={styles.readOnly}>
                <Text style={styles.readOnlyDiscount}>-{selected?.descuentoPorcentaje}%</Text>
                <Text style={styles.readOnlyPhrase}>{selected?.frasePromocional}</Text>
                {selected && describeOfferTerms(selected).map(line => <Text key={line} style={styles.readOnlyLimit}>{line}</Text>)}
              </View>
              {!!selected?.razonIa && (
                <View style={styles.reason}>
                  <Text style={styles.reasonLabel}>Por qué se sugirió</Text>
                  <Text style={styles.reasonText}>{selected.razonIa}</Text>
                </View>
              )}
              {!!selected?.motivoRechazo && (
                <View style={styles.reason}>
                  <Text style={styles.reasonLabel}>Motivo del rechazo</Text>
                  <Text style={styles.reasonText}>{selected.motivoRechazo}</Text>
                </View>
              )}
              {selected?.estado === 'APROBADA' && selected.activa && (
                <Button label="Finalizar oferta" variant="danger" loading={saving} onPress={finish} />
              )}
            </>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
};

const styles = themed(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 32 },
  columns: { gap: 12 },
  cardColumn: { flex: 1, minWidth: 0, maxWidth: '50%' },
  flex: { flex: 1 },
  filters: { gap: 8, paddingBottom: 14 },
  loader: { margin: 30 },
  card: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.block, borderWidth: 2,
    borderColor: colors.rule, marginBottom: 10, overflow: 'hidden',
  },
  discount: { width: 76, backgroundColor: colors.sticker, alignItems: 'center', justifyContent: 'center' },
  discountText: { fontFamily: fonts.tag, fontSize: 26, color: '#A81E14' },
  cardBody: { flex: 1, padding: 12, gap: 4 },
  product: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  phrase: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  limits: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.mora },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  status: { borderRadius: radius.tag, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: fonts.bold, fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(42,29,20,0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.card, borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  sheetTitle: { fontFamily: fonts.tag, fontSize: 24, lineHeight: 26, color: colors.ink },
  sheetSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  textarea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  reason: { backgroundColor: colors.aisle, borderRadius: radius.tag, padding: 12, marginBottom: 14 },
  reasonLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, marginBottom: 4 },
  reasonText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  cols: { flexDirection: 'row', gap: 10, marginTop: 10 },
  col: { flex: 1, minWidth: 0 },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, marginTop: 6 },
  sectionHint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  presets: { gap: 8, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: colors.rule, marginVertical: 18 },
  readOnly: { backgroundColor: colors.sticker, borderRadius: radius.tag, padding: 16, marginBottom: 14 },
  readOnlyDiscount: { fontFamily: fonts.tag, fontSize: 40, lineHeight: 42, color: '#A81E14' },
  readOnlyPhrase: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.mora, marginTop: 6 },
  readOnlyLimit: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink, marginTop: 4 },
}));
