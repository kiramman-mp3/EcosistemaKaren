import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BackendProduct, UbicacionLote, CreateLotPayload } from '../types';
import { api } from '../api/client';
import { classifyExpiryDays } from '../config/businessRules';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface IngresoLoteScreenProps {
  products: BackendProduct[];
  onLotCreated: () => void;
}

export const IngresoLoteScreen: React.FC<IngresoLoteScreenProps> = ({
  products,
  onLotCreated,
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

  // When barcode changes, auto-find product
  useEffect(() => {
    if (!barcode.trim()) {
      setSelectedProduct(null);
      return;
    }
    const found = products.find(
      (p) =>
        p.codigoBarras === barcode.trim() ||
        p.nombre.toLowerCase().includes(barcode.toLowerCase())
    );
    if (found) {
      setSelectedProduct(found);
    }
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
      return { bg: '#FEE2E2', text: '#DC2626', label: `🔴 CRÍTICO: ${daysLeft} DÍAS (Alerta Roja)` };
    }
    if (level === 'AMARILLO') {
      return { bg: '#FEF3C7', text: '#D97706', label: `🟡 PREVENTIVO: ${daysLeft} DÍAS (Alerta Amarilla)` };
    }
    return { bg: '#DCFCE7', text: '#15803D', label: `🟢 NORMAL: ${daysLeft} DÍAS (Caducidad óptima)` };
  };

  const fefoStatus = getFefoBadge();

  const handleScan = (code: string) => {
    setBarcode(code);
    const prod = products.find((p) => p.codigoBarras === code);
    if (prod) {
      setSelectedProduct(prod);
    }
  };

  const handleSave = async () => {
    if (!selectedProduct) {
      setError('Debes ingresar o escanear un código de barras válido');
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.scanPillText}>📷 Abrir escáner de cámara</Text>
        </TouchableOpacity>
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
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
              placeholder="Ej: 7861000100011"
              placeholderTextColor="#94A3B8"
              value={barcode}
              onChangeText={setBarcode}
              keyboardType="numeric"
            />
            {barcode ? (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setBarcode('')}>
                <Text style={styles.clearBtnText}>✕</Text>
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
        ) : (
          <View style={styles.productEmptyHint}>
            <Text style={styles.productEmptyText}>
              🔍 Ingresa o escanea un código de barras para cargar el producto maestro.
            </Text>
          </View>
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
            >
              <Text
                style={[
                  styles.locationBtnText,
                  ubicacion === 'BODEGA' && styles.locationBtnTextActive,
                ]}
              >
                📦 BODEGA
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.locationBtn,
                ubicacion === 'PERCHA' && styles.locationBtnActive,
              ]}
              onPress={() => setUbicacion('PERCHA')}
            >
              <Text
                style={[
                  styles.locationBtnText,
                  ubicacion === 'PERCHA' && styles.locationBtnTextActive,
                ]}
              >
                🏪 PERCHA (Piso de venta)
              </Text>
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
            <Text style={styles.submitBtnText}>
              💾 Guardar e Ingresar a Inventario FEFO
            </Text>
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scanPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  locationBtnTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
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
