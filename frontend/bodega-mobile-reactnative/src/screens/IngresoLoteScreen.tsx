import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BackendProduct, UbicacionLote, CreateLotPayload } from '../types';
import { api } from '../api/client';
import { classifyExpiryDays } from '../config/businessRules';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { normalizeBarcode, validateScannedBarcode } from '../utils/barcode';
import { Ionicons } from '@expo/vector-icons';

type BarcodeLookupState = 'idle' | 'loading' | 'found' | 'invalid' | 'not-found' | 'error';

interface IngresoLoteScreenProps {
  products: BackendProduct[];
  onLotCreated: () => void;
  onOpenCatalog: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const IngresoLoteScreen: React.FC<IngresoLoteScreenProps> = ({
  products,
  onLotCreated,
  onOpenCatalog,
  onRefresh,
  refreshing,
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

  // Set default expiration date 20 days ahead
  useEffect(() => {
    const d = new Date();
    const productionYear = d.getFullYear();
    const productionMonth = String(d.getMonth() + 1).padStart(2, '0');
    const productionDay = String(d.getDate()).padStart(2, '0');
    setFechaElaboracion(`${productionYear}-${productionMonth}-${productionDay}`);
    d.setDate(d.getDate() + 20);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setFechaCaducidad(`${yyyy}-${mm}-${dd}`);
    setNumeroLote(`LOT-IN-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  // Validate the GTIN and resolve it against the product master.
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

    const localProduct = products.find((product) => product.codigoBarras === normalized);
    if (localProduct) {
      setSelectedProduct(localProduct);
      setBarcodeState('found');
      return () => { cancelled = true; };
    }

    setSelectedProduct(null);
    setBarcodeState('loading');
    const timer = setTimeout(() => {
      void api.getProductByBarcode(normalized)
        .then((product) => {
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

  // Calculate days to expire
  const calculateDaysLeft = (): number | null => {
    if (!fechaCaducidad || !fechaCaducidad.includes('-')) return null;
    try {
      const target = new Date(fechaCaducidad);
      if (isNaN(target.getTime())) return null;
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const daysLeft = calculateDaysLeft();

  const getFefoBadge = () => {
    if (daysLeft === null) return null;
    const level = classifyExpiryDays(daysLeft);
    if (level === 'VENCIDO') {
      return { bg: '#FEE2E2', text: '#DC2626', label: '⛔ FECHA CADUCADA' };
    }
    if (level === 'ROJO') {
      return { bg: '#FEE2E2', text: '#DC2626', label: `CRÍTICO: ${daysLeft} DÍAS` };
    }
    if (level === 'AMARILLO') {
      return { bg: '#FEF3C7', text: '#D97706', label: `PREVENTIVO: ${daysLeft} DÍAS` };
    }
    return { bg: '#DCFCE7', text: '#15803D', label: `NORMAL: ${daysLeft} DÍAS` };
  };

  const fefoStatus = getFefoBadge();

  const handleScan = (code: string) => {
    setError(null);
    setBarcode(normalizeBarcode(code));
  };

  const handleSave = async () => {
    if (!selectedProduct) {
      setError(
        barcodeState === 'not-found'
          ? 'El código es válido, pero el producto no está registrado en el catálogo maestro.'
          : barcodeState === 'error'
            ? 'No se pudo consultar el catálogo. Verifica la conexión con el backend.'
            : 'El código no es un GTIN/EAN válido. Revisa la lectura o el dígito verificador.'
      );
      return;
    }
    if (!numeroLote.trim()) {
      setError('El número de lote es obligatorio');
      return;
    }
    if (!fechaCaducidad.trim()) {
      setError('La fecha de caducidad es requerida (YYYY-MM-DD)');
      return;
    }
    if (!fechaElaboracion.trim() || new Date(fechaElaboracion) >= new Date(fechaCaducidad)) {
      setError('La fecha de elaboración es obligatoria y debe ser anterior a la caducidad');
      return;
    }
    const cost = Number(costoUnitario.replace(',', '.'));
    if (!Number.isFinite(cost) || cost <= 0) {
      setError('El costo unitario debe ser un número mayor a cero');
      return;
    }
    const qty = parseInt(cantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('La cantidad ingresada debe ser un número mayor a cero');
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
      setSuccessMsg(
        `✓ Lote ${created.numeroLote} ingresado con éxito en ${created.ubicacion} (${created.cantidadIngresada} un.)`
      );
      // Reset form
      setNumeroLote(`LOT-IN-${Math.floor(1000 + Math.random() * 9000)}`);
      onLotCreated();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al guardar el lote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" colors={['#4F46E5']} />}
    >
      {/* Title */}
      <View style={styles.sectionHeader}>
        <View style={styles.badgeTop}>
          <Text style={styles.badgeTopText}>RECEPCIÓN DE MERCADERÍA</Text>
        </View>
        <Text style={styles.title}>Ingreso de Lotes por Caducidad</Text>
        <Text style={styles.subtitle}>
          Registra mercadería recibida de proveedores para control FEFO inmediato.
        </Text>
      </View>

      {/* Scanner de cámara o lector físico conectado al campo */}
      <View style={styles.scanSimBox}>
        <Text style={styles.scanSimLabel}>LECTOR DE PRODUCTOS</Text>
        <TouchableOpacity style={styles.scanPill} onPress={() => setScannerOpen(true)}>
          <Ionicons name="barcode-outline" size={19} color="#FFFFFF" />
          <Text style={styles.scanPillText}>Escanear producto</Text>
        </TouchableOpacity>
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {successMsg && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* Barcode Input */}
        <View style={styles.field}>
          <Text style={styles.label}>CÓDIGO DE BARRAS / EAN-13:</Text>
          <View style={styles.barcodeInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Ej: 7861000100014"
              placeholderTextColor="#94A3B8"
              value={barcode}
              onChangeText={(value) => {
                setError(null);
                setBarcode(value);
              }}
              keyboardType="numeric"
            />
            {barcode ? (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setBarcode('')}>
                <Ionicons name="close" size={21} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Detected Product Card */}
        {selectedProduct ? (
          <View style={styles.productDetectedCard}>
            <View style={styles.productDetectedHeader}>
              <Text style={styles.productDetectedBadge}>✓ PRODUCTO VINCULADO</Text>
              <Text style={styles.productDetectedPrice}>
                ${Number(selectedProduct.precioVenta).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.productDetectedName}>{selectedProduct.nombre}</Text>
            <Text style={styles.productDetectedDesc}>
              EAN: {selectedProduct.codigoBarras} • Alerta mínima: {selectedProduct.minStockAlerta} un.
            </Text>
          </View>
        ) : barcodeState === 'loading' ? (
          <View style={styles.productEmptyHint}>
            <ActivityIndicator size="small" color="#4F46E5" />
            <Text style={styles.productEmptyText}>Consultando catálogo maestro…</Text>
          </View>
        ) : (
          <View style={styles.productEmptyHint}>
            <Text style={styles.productEmptyText}>
              {barcodeState === 'invalid'
                ? 'El formato o dígito verificador del código no es válido.'
                : barcodeState === 'not-found'
                  ? `El código ${normalizeBarcode(barcode)} es válido, pero no está registrado en el catálogo maestro.`
                  : barcodeState === 'error'
                    ? 'No se pudo consultar el catálogo maestro.'
                    : 'Ingresa o escanea un código de barras para cargar el producto maestro.'}
            </Text>
          </View>
        )}

        {barcodeState === 'not-found' && (
          <TouchableOpacity style={styles.registerProductBtn} onPress={onOpenCatalog}>
            <Text style={styles.registerProductBtnText}>Abrir Catálogo para registrar producto</Text>
          </TouchableOpacity>
        )}

        {/* Lot Number */}
        <View style={styles.field}>
          <Text style={styles.label}>NÚMERO DE LOTE:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: LOT-VT-2026-99"
            placeholderTextColor="#94A3B8"
            value={numeroLote}
            onChangeText={setNumeroLote}
            autoCapitalize="characters"
          />
        </View>

        {/* Expiration Date */}
        <View style={styles.field}>
          <Text style={styles.label}>FECHA DE ELABORACIÓN (YYYY-MM-DD):</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-09-01"
            placeholderTextColor="#94A3B8"
            value={fechaElaboracion}
            onChangeText={setFechaElaboracion}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>FECHA DE CADUCIDAD (YYYY-MM-DD):</Text>
            {fefoStatus && (
              <View style={[styles.fefoBadge, { backgroundColor: fefoStatus.bg }]}>
                <Text style={[styles.fefoBadgeText, { color: fefoStatus.text }]}>
                  {fefoStatus.label}
                </Text>
              </View>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="2026-09-25"
            placeholderTextColor="#94A3B8"
            value={fechaCaducidad}
            onChangeText={setFechaCaducidad}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>COSTO UNITARIO DE ADQUISICIÓN:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 1.2500"
            placeholderTextColor="#94A3B8"
            value={costoUnitario}
            onChangeText={setCostoUnitario}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={styles.label}>CANTIDAD INGRESADA (UNIDADES):</Text>
          <TextInput
            style={styles.input}
            placeholder="50"
            placeholderTextColor="#94A3B8"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
          />
        </View>

        {/* Location selector */}
        <View style={styles.field}>
          <Text style={styles.label}>UBICACIÓN FÍSICA INICIAL:</Text>
          <View style={styles.locationToggleRow}>
            <TouchableOpacity
              style={[
                styles.locationBtn,
                ubicacion === 'BODEGA' && styles.locationBtnActive,
              ]}
              onPress={() => setUbicacion('BODEGA')}
              accessibilityRole="button"
              accessibilityLabel="Ubicación inicial: Bodega"
            >
              <View style={styles.locationBtnContent}>
                <Ionicons name="cube-outline" size={22} color={ubicacion === 'BODEGA' ? '#FFFFFF' : '#334155'} />
                <Text style={[styles.locationBtnText, ubicacion === 'BODEGA' && styles.locationBtnTextActive]}>
                  Bodega
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.locationBtn,
                ubicacion === 'PERCHA' && styles.locationBtnActive,
              ]}
              onPress={() => setUbicacion('PERCHA')}
              accessibilityRole="button"
              accessibilityLabel="Ubicación inicial: Percha"
            >
              <View style={styles.locationBtnContent}>
                <Ionicons name="storefront-outline" size={22} color={ubicacion === 'PERCHA' ? '#FFFFFF' : '#334155'} />
                <Text style={[styles.locationBtnText, ubicacion === 'PERCHA' && styles.locationBtnTextActive]}>
                  Percha
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <><Ionicons name="save-outline" size={20} color="#FFFFFF" /><Text style={styles.submitBtnText}>Guardar e Ingresar a Inventario FEFO</Text></>
          )}
        </TouchableOpacity>
      </View>
      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScan}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  badgeTop: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeTopText: {
    color: '#4F46E5',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scanSimBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  scanSimLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
  },
  scanRow: {
    gap: 6,
  },
  scanPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  scanPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 40,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  successText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fefoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fefoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  barcodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearBtn: {
    backgroundColor: '#E2E8F0',
    width: 38,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  productDetectedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  productDetectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productDetectedBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#16A34A',
  },
  productDetectedPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
  },
  productDetectedName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532D',
  },
  productDetectedDesc: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  productEmptyHint: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  productEmptyText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  registerProductBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: -6,
    marginBottom: 14,
  },
  registerProductBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  adminNotice: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    marginTop: -6,
    marginBottom: 14,
  },
  productFormCard: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 12,
    marginTop: -6,
    marginBottom: 16,
  },
  productFormTitle: {
    color: '#312E81',
    fontSize: 15,
    fontWeight: '900',
  },
  productFormSubtitle: {
    color: '#6366F1',
    fontSize: 10,
    marginTop: 3,
    marginBottom: 12,
  },
  productFormError: {
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 8,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  categoryLoader: {
    marginVertical: 10,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryBtnActive: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  categoryBtnText: {
    color: '#4338CA',
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
  },
  productFormInput: {
    marginBottom: 11,
    backgroundColor: '#FFFFFF',
  },
  productNumericRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  productNumericField: {
    flex: 1,
  },
  productFormActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelProductBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#A5B4FC',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelProductBtnText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '800',
  },
  saveProductBtn: {
    flex: 1.5,
    backgroundColor: '#4338CA',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveProductBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  locationToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationBtnActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  locationBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  locationBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  locationBtnIcon: {
    fontSize: 18,
  },
  locationBtnTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
});
