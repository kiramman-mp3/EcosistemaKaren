import React, { useState, useEffect, useCallback } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBodega } from './src/components/HeaderBodega';
import { TabNavBodega } from './src/components/TabNavBodega';
import { IngresoLoteScreen } from './src/screens/IngresoLoteScreen';
import { AlertasCaducidadScreen } from './src/screens/AlertasCaducidadScreen';
import { InventarioLotesScreen } from './src/screens/InventarioLotesScreen';
import { CajaSiaciScreen } from './src/screens/CajaSiaciScreen';
import { BodegaLoginScreen } from './src/screens/BodegaLoginScreen';
import { ReportesScreen } from './src/screens/ReportesScreen';
import { AprobacionesScreen } from './src/screens/AprobacionesScreen';
import { CatalogoProductosScreen } from './src/screens/CatalogoProductosScreen';
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
import { daysUntil } from './src/utils/dates';
import { useFonts } from 'expo-font';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Doto_900Black } from '@expo-google-fonts/doto';
import { colors, fonts, themed } from './src/theme/tokens';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

function BodegaAppContent() {
  // Suscribe a este componente al tema: los colores se leen al renderizar y, sin esta
  // suscripción, las pantallas hijas conservaban los del tema anterior hasta volver a montarse.
  useTheme();
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; email: string; rol: string } | null>(null);
  const [activeTab, setActiveTab] = useState<BodegaTab>('ingreso');
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold,
    BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
    Caveat_700Bold, Doto_900Black,
  });

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
    const result: ExpiryAlertItem[] = [];

    for (const lot of currentLots) {
      if (lot.estado !== 'ACTIVO' || lot.cantidadDisponible <= 0) continue;
      try {
        const dias = daysUntil(lot.fechaCaducidad);

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
    // Debe ser bastante menor que HEARTBEAT_TIMEOUT_SECONDS (30 s) del backend, o la tienda parpadearía a "Sin conexión".
    const interval = setInterval(heartbeatAction, 10000);
    return () => clearInterval(interval);
  }, [loadData, checkHeartbeat, sendHeartbeat, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    // El canal SSE solo avisa de lotes nuevos; el estado "online" de la tienda lo
    // decide el heartbeat, no la conexión SSE.
    return api.subscribeAlerts(
      () => { void loadData(); },
      () => {}
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

  // Sin fuentes la app sigue funcionando con las del sistema (fontError).
  if (restoringSession || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaView style={styles.loadingSession}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={[styles.loadingSessionText, fontsLoaded && { fontFamily: fonts.medium }]}>Abriendo Bodega Karen…</Text>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <BodegaLoginScreen onLogin={({ user }) => {
        setActiveTab(user.rol === 'PERCHERO' ? 'alertas' : 'ingreso');
        setCurrentUser(user);
      }} />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.mora} />

      {/* Header Bodega */}
      <HeaderBodega
        isOnline={isOnline}
        operatorName={currentUser.nombre}
        operatorRole={currentUser.rol}
        onOpenReports={() => setActiveTab('reportes')}
        onLogout={() => {
          void api.logout();
          setCurrentUser(null);
          setProducts([]);
          setLots([]);
          setAlerts([]);
          setSelectedPromo(null);
          setMermaTarget(null);
        }}
      />

      {/* Main Screen Body */}
      <View style={styles.body}>
        {activeTab === 'ingreso' && ['BODEGUERO', 'ADMIN'].includes(currentUser.rol) && (
          <IngresoLoteScreen
            products={products}
            onLotCreated={loadData}
            onOpenCatalog={() => setActiveTab('catalogo')}
            onRefresh={loadData}
            refreshing={refreshing}
          />
        )}

        {activeTab === 'catalogo' && (
          <CatalogoProductosScreen role={currentUser.rol} onCatalogChanged={loadData} />
        )}

        {activeTab === 'reportes' && <ReportesScreen />}
        {activeTab === 'promociones' && currentUser.rol === 'ADMIN' && <AprobacionesScreen />}

        {activeTab === 'alertas' && (
          <AlertasCaducidadScreen
            alerts={alerts}
            onRefresh={loadData}
            refreshing={refreshing}
            onOpenAiPromo={(promo) => setSelectedPromo(promo)}
            onOpenMerma={handleOpenMerma}
          />
        )}

        {activeTab === 'inventario' && (
          <InventarioLotesScreen
            lots={lots}
            onRefresh={loadData}
            refreshing={refreshing}
          />
        )}

        {activeTab === 'caja' && ['BODEGUERO', 'ADMIN'].includes(currentUser.rol) && (
          <CajaSiaciScreen
            onReservationUpdated={loadData}
            onRefresh={loadData}
            refreshing={refreshing}
          />
        )}
      </View>

      {/* Bottom Navigation */}
      <TabNavBodega
        activeTab={activeTab}
        onTabChange={setActiveTab}
        role={currentUser.rol}
        criticalAlertsCount={criticalAlertsCount}
      />

      {/* Modals */}
      <AiPromoModal
        visible={Boolean(selectedPromo)}
        promotion={selectedPromo}
        canReview={currentUser.rol === 'ADMIN'}
        onClose={() => setSelectedPromo(null)}
        onReview={() => {
          setSelectedPromo(null);
          setActiveTab('promociones');
        }}
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

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <BodegaAppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = themed(() => StyleSheet.create({
  loadingSession: { flex: 1, backgroundColor: colors.mora, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingSessionText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  safeArea: {
    flex: 1,
    backgroundColor: colors.mora,
  },
  body: {
    flex: 1,
    backgroundColor: colors.aisle,
  },
}));
