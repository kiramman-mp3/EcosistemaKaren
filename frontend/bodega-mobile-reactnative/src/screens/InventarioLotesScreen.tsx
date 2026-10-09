import React, { useState, useMemo } from 'react';
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
import { BackendLot } from '../types';
import { api } from '../api/client';
import { classifyExpiryDays } from '../config/businessRules';

interface InventarioLotesScreenProps {
  lots: BackendLot[];
  onRefresh: () => void;
}

export const InventarioLotesScreen: React.FC<InventarioLotesScreenProps> = ({
  lots,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<'ALL' | 'BODEGA' | 'PERCHA'>('ALL');
  const [movingLotId, setMovingLotId] = useState<string | null>(null);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const matchLoc = locationFilter === 'ALL' || lot.ubicacion === locationFilter;
      const q = search.toLowerCase();
      const matchSearch =
        (lot.productoNombre || '').toLowerCase().includes(q) ||
        (lot.numeroLote || '').toLowerCase().includes(q) ||
        (lot.codigoBarras || '').includes(q);
      return matchLoc && matchSearch;
    });
  }, [lots, locationFilter, search]);

  const handleToggleLocation = async (lot: BackendLot) => {
    const nextLoc = lot.ubicacion === 'BODEGA' ? 'PERCHA' : 'BODEGA';
    setMovingLotId(lot.id);
    try {
      await api.updateLotLocation(lot.id, nextLoc);
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Error al cambiar ubicación');
    } finally {
      setMovingLotId(null);
    }
  };

  const getDaysLeft = (fecha: string) => {
    try {
      const target = new Date(fecha);
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badgeTop}>
          <Text style={styles.badgeTopText}>TRAZABILIDAD FEFO TOTAL</Text>
        </View>
        <Text style={styles.title}>Inventario de Lotes en Tienda</Text>
        <Text style={styles.subtitle}>
          Control de stock disponible vs reservado por ubicación física.
        </Text>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por producto, lote o EAN..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Location Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.pill, locationFilter === 'ALL' && styles.pillActive]}
            onPress={() => setLocationFilter('ALL')}
          >
            <Text style={[styles.pillText, locationFilter === 'ALL' && styles.pillTextActive]}>
              Todos ({lots.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, locationFilter === 'BODEGA' && styles.pillActive]}
            onPress={() => setLocationFilter('BODEGA')}
          >
            <Text style={[styles.pillText, locationFilter === 'BODEGA' && styles.pillTextActive]}>
              📦 Bodega ({lots.filter((l) => l.ubicacion === 'BODEGA').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, locationFilter === 'PERCHA' && styles.pillActive]}
            onPress={() => setLocationFilter('PERCHA')}
          >
            <Text style={[styles.pillText, locationFilter === 'PERCHA' && styles.pillTextActive]}>
              🏪 Percha ({lots.filter((l) => l.ubicacion === 'PERCHA').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lots List */}
      <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
        {filteredLots.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No se encontraron lotes</Text>
            <Text style={styles.emptySub}>Prueba ajustando los filtros de búsqueda.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredLots.map((lot) => {
              const days = getDaysLeft(lot.fechaCaducidad);
              const expiryLevel = classifyExpiryDays(days);
              const isCritical = expiryLevel === 'VENCIDO' || expiryLevel === 'ROJO';
              const isWarning = expiryLevel === 'AMARILLO';
              const isMoving = movingLotId === lot.id;

              return (
                <View key={lot.id} style={styles.lotCard}>
                  {/* Top Bar */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.lotNumber}>Lote: {lot.numeroLote}</Text>
                    <View
                      style={[
                        styles.locPill,
                        {
                          backgroundColor:
                            lot.ubicacion === 'BODEGA' ? '#EEF2FF' : '#DCFCE7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.locPillText,
                          {
                            color:
                              lot.ubicacion === 'BODEGA' ? '#4F46E5' : '#15803D',
                          },
                        ]}
                      >
                        {lot.ubicacion === 'BODEGA' ? '📦 BODEGA' : '🏪 PERCHA'}
                      </Text>
                    </View>
                  </View>

                  {/* Product Title */}
                  <Text style={styles.productTitle}>
                    {lot.productoNombre || 'Producto en catálogo'}
                  </Text>

                  {/* Date and Days Badge */}
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>
                      Caducidad: {new Date(lot.fechaCaducidad).toLocaleDateString()}
                    </Text>
                    <View
                      style={[
                        styles.daysPill,
                        {
                          backgroundColor: isCritical
                            ? '#FEE2E2'
                            : isWarning
                            ? '#FEF3C7'
                            : '#DCFCE7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.daysText,
                          {
                            color: isCritical
                              ? '#DC2626'
                              : isWarning
                              ? '#D97706'
                              : '#15803D',
                          },
                        ]}
                      >
                        {days} días
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateLabel}>
                    Elaboración: {lot.fechaElaboracion
                      ? new Date(lot.fechaElaboracion).toLocaleDateString()
                      : 'Dato histórico no disponible'} · Costo unitario: {lot.costoUnitario != null
                      ? `$${Number(lot.costoUnitario).toFixed(4)}`
                      : 'No registrado'}
                  </Text>

                  {/* Stock Metrics */}
                  <View style={styles.metricsBox}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Disponible:</Text>
                      <Text style={styles.metricValGreen}>{lot.cantidadDisponible} un.</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Apartado Web:</Text>
                      <Text style={styles.metricValOrange}>{lot.cantidadReservada || 0} un.</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Inicial:</Text>
                      <Text style={styles.metricValGray}>{lot.cantidadIngresada} un.</Text>
                    </View>
                  </View>

                  {/* Action to switch location */}
                  <TouchableOpacity
                    style={styles.switchBtn}
                    onPress={() => handleToggleLocation(lot)}
                    disabled={isMoving}
                  >
                    {isMoving ? (
                      <ActivityIndicator size="small" color="#1E293B" />
                    ) : (
                      <Text style={styles.switchBtnText}>
                        🔄 Mover a {lot.ubicacion === 'BODEGA' ? '🏪 PERCHA' : '📦 BODEGA'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  clearText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: 'bold',
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  listScroll: {
    flex: 1,
    padding: 16,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  list: {
    gap: 12,
    paddingBottom: 40,
  },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lotNumber: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 12,
    color: '#475569',
  },
  locPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  locPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  daysPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  daysText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metricsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValGreen: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
  },
  metricValOrange: {
    fontSize: 13,
    fontWeight: '900',
    color: '#D97706',
  },
  metricValGray: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  switchBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
});
