import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackendProduct, UbicacionLote, CreateLotPayload } from '../types';
import { api } from '../api/client';
import { addDays, daysUntil, parseBusinessDate, toDateOnly } from '../utils/dates';
import { classifyExpiryDays } from '../config/businessRules';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { normalizeBarcode, validateScannedBarcode } from '../utils/barcode';
import { Button, DaysCounter, ExpiryStamp, Field, Notice, ScreenTitle } from '../components/ui';
import { colors, fonts, levelColors, radius, themed } from '../theme/tokens';

type BarcodeLookupState = 'idle' | 'loading' | 'found' | 'invalid' | 'not-found' | 'error';

interface IngresoLoteScreenProps {
  products: BackendProduct[];
  onLotCreated: () => void;
  onOpenCatalog: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const newLotNumber = () => `LOT-IN-${Math.floor(1000 + Math.random() * 9000)}`;

export const IngresoLoteScreen: React.FC<IngresoLoteScreenProps> = ({
  products, onLotCreated, onOpenCatalog, onRefresh, refreshing,
}) => {
  const [barcode, setBarcode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<BackendProduct | null>(null);
  const [numeroLote, setNumeroLote] = useState('');
  const [fechaElaboracion, setFechaElaboracion] = useState('');
  const [fechaCaducidad, setFechaCaducidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [cantidad, setCantidad] = useState('50');
  const [ubicacion, setUbicacion] = useState<UbicacionLote>('BODEGA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeState, setBarcodeState] = useState<BarcodeLookupState>('idle');

  // Fechas por defecto: elaborado hoy y caducidad en 20 días.
  useEffect(() => {
    const today = new Date();
    setFechaElaboracion(toDateOnly(today));
    setFechaCaducidad(toDateOnly(addDays(today, 20)));
    setNumeroLote(newLotNumber());
  }, []);

  // Valida el GTIN y lo busca en el catálogo maestro.
  useEffect(() => {
    const normalized = normalizeBarcode(barcode);
    let cancelled = false;
    if (!normalized) {
      setSelectedProduct(null);
      setBarcodeState('idle');
      return () => { cancelled = true; };
    }
    if (validateScannedBarcode(normalized) !== 'valid') {
      setSelectedProduct(null);
      setBarcodeState('invalid');
      return () => { cancelled = true; };
    }

    const localProduct = products.find(product => product.codigoBarras === normalized);
    if (localProduct) {
      setSelectedProduct(localProduct);
      setBarcodeState('found');
      return () => { cancelled = true; };
    }

    setSelectedProduct(null);
    setBarcodeState('loading');
    const timer = setTimeout(() => {
      void api.getProductByBarcode(normalized)
        .then(product => {
          if (cancelled) return;
          setSelectedProduct(product);
          setBarcodeState(product ? 'found' : 'not-found');
        })
        .catch((requestError: any) => {
          if (cancelled) return;
          setBarcodeState(requestError.response?.status === 404 ? 'not-found' : 'error');
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [barcode, products]);

  const daysLeft = (() => {
    const days = daysUntil(fechaCaducidad);
    return Number.isFinite(days) ? days : null;
  })();
  const level = daysLeft === null ? null : classifyExpiryDays(daysLeft);

  const handleSave = async () => {
    if (!selectedProduct) {
      setError(
        barcodeState === 'not-found'
          ? 'El código es válido, pero el producto no está en el catálogo. Regístralo primero.'
          : barcodeState === 'error'
            ? 'No se pudo consultar el catálogo. Revisa la conexión con la tienda.'
            : 'Escanea o escribe un código de barras válido.'
      );
      return;
    }
    if (!numeroLote.trim()) {
      setError('Escribe el número de lote impreso en la caja.');
      return;
    }
    const produced = parseBusinessDate(fechaElaboracion);
    const expires = parseBusinessDate(fechaCaducidad);
    if (!expires) {
      setError('La fecha de caducidad no es válida. Usa el formato AAAA-MM-DD.');
      return;
    }
    if (!produced || produced >= expires) {
      setError('La fecha de elaboración debe ser anterior a la de caducidad.');
      return;
    }
    const cost = Number(costoUnitario.replace(',', '.'));
    if (!Number.isFinite(cost) || cost <= 0) {
      setError('Escribe el costo unitario de compra (mayor a cero).');
      return;
    }
    const qty = parseInt(cantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Escribe cuántas unidades llegaron.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload: CreateLotPayload = {
      productoId: selectedProduct.id,
      numeroLote: numeroLote.trim(),
      fechaElaboracion: fechaElaboracion.trim(),
      fechaCaducidad: fechaCaducidad.trim(),
      costoUnitario: cost,
      cantidadIngresada: qty,
      ubicacion,
    };

    try {
      const created = await api.createLot(payload);
      setSuccessMsg(`Lote ${created.numeroLote} registrado: ${created.cantidadIngresada} unidades en ${created.ubicacion === 'PERCHA' ? 'percha' : 'bodega'}.`);
      setNumeroLote(newLotNumber());
      setBarcode('');
      onLotCreated();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'No se pudo registrar el lote.');
    } finally {
      setLoading(false);
    }
  };

  const hint = barcodeState === 'invalid'
    ? 'El código no es un EAN válido. Revisa la lectura o el último dígito.'
    : barcodeState === 'not-found'
      ? 'Código válido, pero no está en el catálogo.'
      : barcodeState === 'error'
        ? 'No se pudo consultar el catálogo.'
        : undefined;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} />}
    >
      <ScreenTitle title="Recibir mercadería" subtitle="Escanea el producto y registra el lote que llegó del proveedor." />

      {error && <Notice tone="error" text={error} />}
      {successMsg && <Notice tone="success" text={successMsg} />}

      <Section step={1} title="Producto">
        <Button label="Escanear código de barras" icon="barcode-outline" onPress={() => setScannerOpen(true)} />
        <View style={styles.gap} />
        <Field
          label="O escríbelo"
          placeholder="7861000100014"
          value={barcode}
          onChangeText={value => { setError(null); setBarcode(value); }}
          keyboardType="number-pad"
          invalid={barcodeState === 'invalid'}
          hint={hint}
          right={barcode ? (
            <TouchableOpacity style={styles.clear} onPress={() => setBarcode('')} accessibilityLabel="Borrar código">
              <Ionicons name="close" size={22} color={colors.inkMuted} />
            </TouchableOpacity>
          ) : null}
        />
        {barcodeState === 'loading' && (
          <View style={styles.lookup}>
            <ActivityIndicator size="small" color={colors.ink} />
            <Text style={styles.lookupText}>Buscando en el catálogo…</Text>
          </View>
        )}
        {selectedProduct && (
          <View style={styles.product} accessibilityLabel={`Producto: ${selectedProduct.nombre}`}>
            <Ionicons name="checkmark-circle" size={22} color={colors.fresh} />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{selectedProduct.nombre}</Text>
              <Text style={styles.productMeta}>
                EAN {selectedProduct.codigoBarras}   PVP ${Number(selectedProduct.precioVenta).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
        {barcodeState === 'not-found' && (
          <Button label="Registrar producto en el catálogo" icon="add-circle-outline" variant="outline" compact onPress={onOpenCatalog} />
        )}
      </Section>

      <Section step={2} title="Lote y fechas">
        <Field label="Número de lote" value={numeroLote} onChangeText={setNumeroLote} autoCapitalize="characters" placeholder="LOT-VT-2026-99" />
        <View style={styles.row}>
          <View style={styles.col}>
            <Field label="Elaboración" value={fechaElaboracion} onChangeText={setFechaElaboracion} placeholder="AAAA-MM-DD" autoCorrect={false} />
          </View>
          <View style={styles.col}>
            <Field label="Caducidad" value={fechaCaducidad} onChangeText={setFechaCaducidad} placeholder="AAAA-MM-DD" autoCorrect={false} />
          </View>
        </View>
        {daysLeft !== null && level && (
          <View style={[styles.preview, { borderLeftColor: levelColors(level).band }]}>
            <DaysCounter days={daysLeft} color={level === 'AMARILLO' ? colors.ink : levelColors(level).band} />
            <View style={styles.previewText}>
              <Text style={[styles.previewLevel, { color: levelColors(level).text }]}>{levelColors(level).label}</Text>
              <ExpiryStamp date={fechaCaducidad} />
              {level !== 'NORMAL' && (
                <Text style={styles.previewNote}>
                  {level === 'VENCIDO' ? 'No se puede vender un lote vencido.' : 'Este lote aparecerá en "Por vencer" apenas se registre.'}
                </Text>
              )}
            </View>
          </View>
        )}
      </Section>

      <Section step={3} title="Cantidad y ubicación">
        <View style={styles.row}>
          <View style={styles.col}>
            <Field label="Unidades" value={cantidad} onChangeText={setCantidad} keyboardType="number-pad" />
          </View>
          <View style={styles.col}>
            <Field label="Costo unitario ($)" value={costoUnitario} onChangeText={setCostoUnitario} keyboardType="decimal-pad" placeholder="1.2500" />
          </View>
        </View>
        <Text style={styles.label}>Dónde queda</Text>
        <View style={styles.row}>
          {(['BODEGA', 'PERCHA'] as UbicacionLote[]).map(option => {
            const active = ubicacion === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.toggle, active && styles.toggleActive]}
                onPress={() => setUbicacion(option)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Ionicons name={option === 'BODEGA' ? 'cube-outline' : 'storefront-outline'} size={22} color={active ? colors.card : colors.ink} />
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{option === 'BODEGA' ? 'Bodega' : 'Percha'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <Button label="Registrar lote" icon="checkmark-outline" variant="danger" loading={loading} onPress={() => void handleSave()} />

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={code => { setError(null); setBarcode(normalizeBarcode(code)); }}
      />
    </ScrollView>
  );
};

const Section: React.FC<{ step: number; title: string; children: React.ReactNode }> = ({ step, title, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Text style={styles.step}>{step}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const styles = themed(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: colors.card, borderRadius: radius.tag, borderWidth: 1, borderColor: colors.rule,
    padding: 16, marginBottom: 14,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 14 },
  step: { fontFamily: fonts.tag, fontSize: 26, color: colors.karenText },
  sectionTitle: { fontFamily: fonts.tag, fontSize: 22, color: colors.ink },
  gap: { height: 14 },
  clear: { width: 48, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.tag, backgroundColor: colors.aisle },
  lookup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  lookupText: { fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  product: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.freshTint,
    borderRadius: radius.tag, padding: 12, marginBottom: 4,
  },
  productInfo: { flex: 1 },
  productName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  productMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, minWidth: 0 },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.aisle,
    borderRadius: radius.tag, borderLeftWidth: 6, padding: 12,
  },
  previewText: { flex: 1, gap: 2 },
  previewLevel: { fontFamily: fonts.bold, fontSize: 15 },
  previewNote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft, marginTop: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  toggle: {
    flex: 1, minHeight: 56, borderRadius: radius.tag, borderWidth: 2, borderColor: colors.ink,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card,
  },
  toggleActive: { backgroundColor: colors.ink },
  toggleText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  toggleTextActive: { color: '#FFFFFF' },
}));
