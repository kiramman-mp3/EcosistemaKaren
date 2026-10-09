import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { HeaderBodega } from './src/components/HeaderBodega';
import { TabNavBodega } from './src/components/TabNavBodega';
import { IngresoLoteScreen } from './src/screens/IngresoLoteScreen';
import { AlertasCaducidadScreen } from './src/screens/AlertasCaducidadScreen';
import { InventarioLotesScreen } from './src/screens/InventarioLotesScreen';
import { CajaSiaciScreen } from './src/screens/CajaSiaciScreen';
import { BodegaLoginScreen } from './src/screens/BodegaLoginScreen';
import { AiPromoModal } from './src/components/AiPromoModal';
import { MermaModal } from './src/components/MermaModal';
import {
  BodegaTab,
  BackendLot,
  BackendProduct,
  ExpiryAlertItem,
  BackendPromotion,
} from './src/types';
import { api } from './src/api/client';
import { classifyExpiryDays } from './src/config/businessRules';

// Initial sample data for fallback
const INITIAL_PRODUCTS: BackendProduct[] = [
  {
    id: 'prod-01',
    categoriaId: 'cat-01',
    codigoBarras: '7861000100011',
    nombre: 'Leche Entera Vita 1 Litro',
    descripcion: 'Lácteos',
    precioVenta: 0.95,
    minStockAlerta: 20,
  },
  {
    id: 'prod-02',
    categoriaId: 'cat-01',
    codigoBarras: '7861000200022',
    nombre: 'Yogurt Griego Toni Natural 500g',
    descripcion: 'Lácteos',
    precioVenta: 2.50,
    minStockAlerta: 15,
  },
  {
    id: 'prod-03',
    categoriaId: 'cat-02',
    codigoBarras: '7862000300033',
    nombre: 'Pechuga de Pollo Fresca 1kg',
    descripcion: 'Carnes',
    precioVenta: 4.80,
    minStockAlerta: 10,
  },
  {
    id: 'prod-04',
    categoriaId: 'cat-03',
    codigoBarras: '7863000400044',
    nombre: 'Pan de Molde Integral 500g',
    descripcion: 'Panadería',
    precioVenta: 1.75,
    minStockAlerta: 15,
  },
];

const INITIAL_LOTS: BackendLot[] = [
  {
    id: 'lot-01',
    productoId: 'prod-02',
    productoNombre: 'Yogurt Griego Toni Natural 500g',
    codigoBarras: '7861000200022',
    numeroLote: 'LOT-YG-2026-01',
    fechaCaducidad: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    cantidadIngresada: 50,
    cantidadDisponible: 45,
    cantidadReservada: 5,
    ubicacion: 'PERCHA',
    estado: 'ACTIVO',
  },
  {
    id: 'lot-02',
    productoId: 'prod-01',
    productoNombre: 'Leche Entera Vita 1 Litro',
    codigoBarras: '7861000100011',
    numeroLote: 'LOT-VT-2026-02',
    fechaCaducidad: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    cantidadIngresada: 100,
    cantidadDisponible: 90,
    cantidadReservada: 0,
    ubicacion: 'BODEGA',
    estado: 'ACTIVO',
  },
  {
    id: 'lot-03',
    productoId: 'prod-03',
    productoNombre: 'Pechuga de Pollo Fresca 1kg',
    codigoBarras: '7862000300033',
    numeroLote: 'LOT-PL-2026-05',
    fechaCaducidad: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    cantidadIngresada: 30,
    cantidadDisponible: 12,
    cantidadReservada: 4,
    ubicacion: 'PERCHA',
    estado: 'ACTIVO',
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; email: string; rol: string } | null>(null);
  const [activeTab, setActiveTab] = useState<BodegaTab>('ingreso');
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Core data states
  const [products, setProducts] = useState<BackendProduct[]>(INITIAL_PRODUCTS);
  const [lots, setLots] = useState<BackendLot[]>(INITIAL_LOTS);
  const [alerts, setAlerts] = useState<ExpiryAlertItem[]>([]);

  // Modals state
  const [selectedPromo, setSelectedPromo] = useState<BackendPromotion | null>(null);
  const [isMermaOpen, setIsMermaOpen] = useState(false);
  const [mermaTarget, setMermaTarget] = useState<{
    lotId: string;
    lotNumber: string;
    maxUnits: number;
  } | null>(null);

  // Check server connection
  const checkHeartbeat = useCallback(async () => {
    try {
      const hb = await api.getHeartbeat();
      setIsOnline(hb.status === 'ONLINE' && !hb.reservationsBlocked);
    } catch {
      setIsOnline(false);
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    try {
      const hb = await api.sendHeartbeat();
      setIsOnline(hb.status === 'ONLINE' && !hb.reservationsBlocked);
    } catch {
      setIsOnline(false);
    }
  }, []);

  // Compute alerts from lots
  const computeAlertsFromLots = (currentLots: BackendLot[], prods: BackendProduct[]): ExpiryAlertItem[] => {
    const now = new Date();
    const result: ExpiryAlertItem[] = [];

    for (const lot of currentLots) {
      if (lot.estado !== 'ACTIVO' || lot.cantidadDisponible <= 0) continue;
      try {
        const exp = new Date(lot.fechaCaducidad);
        const diffMs = exp.getTime() - now.getTime();
        const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const nivel = classifyExpiryDays(dias);
        if (nivel !== 'NORMAL') {
          const prod = prods.find((p) => p.id === lot.productoId);
          result.push({
            id: `alert-${lot.id}`,
            loteId: lot.id,
            numeroLote: lot.numeroLote,
            productoNombre: lot.productoNombre || prod?.nombre || 'Producto en Lote',
            codigoBarras: lot.codigoBarras || prod?.codigoBarras || 'S/C',
            fechaCaducidad: lot.fechaCaducidad,
            diasParaVencer: dias,
            nivel,
            cantidadDisponible: lot.cantidadDisponible,
            cantidadReservada: lot.cantidadReservada || 0,
            ubicacion: lot.ubicacion,
          });
        }
      } catch {
        // ignore date error
      }
    }

    return result.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  };

  // Load all live backend data
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkHeartbeat();

      const [prodsData, lotsData, alertsData] = await Promise.all([
        api.getProducts().catch(() => [] as BackendProduct[]),
        api.getLots().catch(() => [] as BackendLot[]),
        api.getAlerts().catch(() => [] as ExpiryAlertItem[]),
      ]);

      const activeProds = prodsData && prodsData.length > 0 ? prodsData : INITIAL_PRODUCTS;
      setProducts(activeProds);

      const activeLots = lotsData && lotsData.length > 0 ? lotsData : INITIAL_LOTS;
      setLots(activeLots);

      if (alertsData && alertsData.length > 0) {
        setAlerts(alertsData);
      } else {
        setAlerts(computeAlertsFromLots(activeLots, activeProds));
      }
    } catch {
      // Fallback local
      setAlerts(computeAlertsFromLots(lots, products));
    } finally {
      setRefreshing(false);
    }
  }, [checkHeartbeat]);

  useEffect(() => {
    if (!currentUser) return;
    const heartbeatAction = currentUser.rol === 'PERCHERO' ? checkHeartbeat : sendHeartbeat;
    void heartbeatAction();
    loadData();
    const interval = setInterval(heartbeatAction, 30000);
    return () => clearInterval(interval);
  }, [loadData, checkHeartbeat, sendHeartbeat, currentUser]);

  const handleOpenMerma = (lotId: string, lotNumber: string, maxUnits: number) => {
    setMermaTarget({ lotId, lotNumber, maxUnits });
    setIsMermaOpen(true);
  };

  const handleConfirmMerma = async (lotId: string, cantidad: number, razon: string) => {
    await api.registerMerma(lotId, cantidad, razon);
    await loadData();
  };

  const criticalAlertsCount = alerts.filter(
    (a) => a.nivel === 'ROJO' || a.nivel === 'VENCIDO'
  ).length;

  if (!currentUser) {
    return <BodegaLoginScreen onLogin={({ user }) => setCurrentUser(user)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Header Bodega */}
      <HeaderBodega
        isOnline={isOnline}
        onRefresh={loadData}
        refreshing={refreshing}
        operatorName={currentUser.nombre}
        onLogout={() => {
          api.logout();
          setCurrentUser(null);
        }}
      />

      {/* Main Screen Body */}
      <View style={styles.body}>
        {activeTab === 'ingreso' && (
          <IngresoLoteScreen
            products={products}
            onLotCreated={loadData}
          />
        )}

        {activeTab === 'alertas' && (
          <AlertasCaducidadScreen
            alerts={alerts}
            onRefresh={loadData}
            onOpenAiPromo={(promo) => setSelectedPromo(promo)}
            onOpenMerma={handleOpenMerma}
          />
        )}

        {activeTab === 'inventario' && (
          <InventarioLotesScreen
            lots={lots}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'caja' && (
          <CajaSiaciScreen
            onReservationUpdated={loadData}
          />
        )}
      </View>

      {/* Bottom Navigation */}
      <TabNavBodega
        activeTab={activeTab}
        onTabChange={setActiveTab}
        criticalAlertsCount={criticalAlertsCount}
      />

      {/* Modals */}
      <AiPromoModal
        visible={Boolean(selectedPromo)}
        promotion={selectedPromo}
        onClose={() => setSelectedPromo(null)}
      />

      {mermaTarget && (
        <MermaModal
          visible={isMermaOpen}
          lotId={mermaTarget.lotId}
          lotNumber={mermaTarget.lotNumber}
          maxUnits={mermaTarget.maxUnits}
          onClose={() => {
            setIsMermaOpen(false);
            setMermaTarget(null);
          }}
          onConfirmMerma={handleConfirmMerma}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  body: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
