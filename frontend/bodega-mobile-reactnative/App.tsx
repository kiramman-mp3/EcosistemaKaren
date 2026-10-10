import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { HeaderBodega } from './src/components/HeaderBodega';
import { TabNavBodega } from './src/components/TabNavBodega';
import { IngresoLoteScreen } from './src/screens/IngresoLoteScreen';
import { AlertasCaducidadScreen } from './src/screens/AlertasCaducidadScreen';
import { InventarioLotesScreen } from './src/screens/InventarioLotesScreen';
import { CajaSiaciScreen } from './src/screens/CajaSiaciScreen';
import { BodegaLoginScreen } from './src/screens/BodegaLoginScreen';
import { ReportesScreen } from './src/screens/ReportesScreen';
import { AprobacionesScreen } from './src/screens/AprobacionesScreen';
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; email: string; rol: string } | null>(null);
  const [activeTab, setActiveTab] = useState<BodegaTab>('ingreso');
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [restoringSession, setRestoringSession] = useState(true);

  // Core data states
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [lots, setLots] = useState<BackendLot[]>([]);
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
  useEffect(() => {
    const unsubscribe = api.onSessionExpired(() => setCurrentUser(null));
    void api.restoreSession()
      .then(user => {
        if (user) {
          setActiveTab(user.rol === 'PERCHERO' ? 'alertas' : 'ingreso');
          setCurrentUser(user);
        }
      })
      .finally(() => setRestoringSession(false));
    return unsubscribe;
  }, []);

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
        api.getProducts(), api.getLots(), api.getAlerts(),
      ]);
      setProducts(prodsData);
      setLots(lotsData);
      setAlerts(alertsData.length ? alertsData : computeAlertsFromLots(lotsData, prodsData));
    } catch {
      setIsOnline(false);
      setProducts([]);
      setLots([]);
      setAlerts([]);
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

  useEffect(() => {
    if (!currentUser) return;
    return api.subscribeAlerts(
      () => { void loadData(); },
      connected => { if (connected) setIsOnline(true); }
    );
  }, [currentUser, loadData]);

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

  if (restoringSession) {
    return <SafeAreaView style={styles.loadingSession}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.loadingSessionText}>Restaurando sesión segura…</Text>
    </SafeAreaView>;
  }

  if (!currentUser) {
    return <BodegaLoginScreen onLogin={({ user }) => {
      setActiveTab(user.rol === 'PERCHERO' ? 'alertas' : 'ingreso');
      setCurrentUser(user);
    }} />;
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
          void api.logout();
          setCurrentUser(null);
        }}
      />

      {/* Main Screen Body */}
      <View style={styles.body}>
        {activeTab === 'ingreso' && ['BODEGUERO', 'ADMIN'].includes(currentUser.rol) && (
          <IngresoLoteScreen
            products={products}
            onLotCreated={loadData}
          />
        )}

        {activeTab === 'reportes' && <ReportesScreen />}
        {activeTab === 'aprobaciones' && currentUser.rol === 'ADMIN' && <AprobacionesScreen />}

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

        {activeTab === 'caja' && ['BODEGUERO', 'ADMIN'].includes(currentUser.rol) && (
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
        role={currentUser.rol}
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
  loadingSession: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingSessionText: { color: '#CBD5E1', fontWeight: '700' },
  safeArea: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  body: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
