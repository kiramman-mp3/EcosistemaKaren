import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackendLot } from '../types';
import { api } from '../api/client';
import { daysUntil, formatDate } from '../utils/dates';
import { classifyExpiryDays } from '../config/businessRules';
import { notify } from '../utils/dialogs';
import { Button, Chip, EmptyState, ScreenTitle } from '../components/ui';
import { LotLabel } from '../components/LotLabel';
import { colors, fonts, radius } from '../theme/tokens';

interface InventarioLotesScreenProps {
  lots: BackendLot[];
  onRefresh: () => void;
  refreshing: boolean;
}

type LocationFilter = 'TODOS' | 'BODEGA' | 'PERCHA';

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const InventarioLotesScreen: React.FC<InventarioLotesScreenProps> = ({ lots, onRefresh, refreshing }) => {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<LocationFilter>('TODOS');
  const [movingLotId, setMovingLotId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    TODOS: lots.length,
    BODEGA: lots.filter(lot => lot.ubicacion === 'BODEGA').length,
    PERCHA: lots.filter(lot => lot.ubicacion === 'PERCHA').length,
  }), [lots]);

  const visible = useMemo(() => {
    const q = fold(search.trim());
    return lots.filter(lot =>
      (location === 'TODOS' || lot.ubicacion === location)
      && (!q || fold(lot.productoNombre || '').includes(q) || fold(lot.numeroLote || '').includes(q)
        || (lot.codigoBarras || '').includes(q)));
  }, [lots, location, search]);

  const toggleLocation = async (lot: BackendLot) => {
    const next = lot.ubicacion === 'BODEGA' ? 'PERCHA' : 'BODEGA';
    setMovingLotId(lot.id);
    try {
      await api.updateLotLocation(lot.id, next);
      onRefresh();
    } catch (err: any) {
      notify('No se pudo mover el lote', err.response?.data?.message || err.message || 'Inténtalo de nuevo.');
    } finally {
      setMovingLotId(null);
    }
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={visible}
      keyExtractor={lot => lot.id}
      initialNumToRender={8}
      windowSize={7}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} />}
      ListHeaderComponent={
        <View>
          <ScreenTitle title="Lotes" subtitle="Lotes vigentes con stock, en orden de vencimiento." />
          <View style={styles.search}>
            <Ionicons name="search-outline" size={20} color={colors.inkMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Producto, lote o código de barras"
              placeholderTextColor={colors.inkFaint}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Buscar lotes"
              autoCorrect={false}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Borrar búsqueda" style={styles.clear}>
                <Ionicons name="close" size={20} color={colors.inkMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.filters}>
            <Chip label="Todos" count={counts.TODOS} active={location === 'TODOS'} onPress={() => setLocation('TODOS')} />
            <Chip label="Bodega" count={counts.BODEGA} active={location === 'BODEGA'} onPress={() => setLocation('BODEGA')} />
            <Chip label="Percha" count={counts.PERCHA} active={location === 'PERCHA'} onPress={() => setLocation('PERCHA')} />
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="layers-outline"
          title={lots.length ? 'Ningún lote coincide' : 'No hay lotes vigentes'}
          text={lots.length ? 'Prueba con otra palabra o quita el filtro de ubicación.' : 'Los lotes aparecen aquí al recibir mercadería.'}
        />
      }
      renderItem={({ item: lot }) => {
        const days = daysUntil(lot.fechaCaducidad);
        const safeDays = Number.isFinite(days) ? days : 0;
        return (
          <LotLabel
            productName={lot.productoNombre || 'Producto'}
            lotNumber={lot.numeroLote}
            expiresOn={lot.fechaCaducidad}
            days={safeDays}
            level={classifyExpiryDays(safeDays)}
            location={lot.ubicacion}
            available={lot.cantidadDisponible}
            reserved={lot.cantidadReservada || 0}
            received={lot.cantidadIngresada}
          >
            <Text style={styles.detail}>
              {lot.fechaElaboracion ? `Elaborado ${formatDate(lot.fechaElaboracion)}` : 'Sin fecha de elaboración'}
              {'   '}
              {lot.costoUnitario != null ? `Costo $${Number(lot.costoUnitario).toFixed(4)}` : 'Costo no registrado'}
            </Text>
            <Button
              label={lot.ubicacion === 'BODEGA' ? 'Pasar a percha' : 'Regresar a bodega'}
              icon={lot.ubicacion === 'BODEGA' ? 'arrow-forward-outline' : 'arrow-back-outline'}
              variant={lot.ubicacion === 'BODEGA' ? 'primary' : 'outline'}
              compact
              loading={movingLotId === lot.id}
              onPress={() => void toggleLocation(lot)}
              style={styles.action}
            />
          </LotLabel>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 32 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingLeft: 12,
    backgroundColor: colors.white, borderRadius: radius.tag, borderWidth: 1.5, borderColor: colors.ruleStrong,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 14 },
  detail: { width: '100%', fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  action: { flexGrow: 1 },
});
