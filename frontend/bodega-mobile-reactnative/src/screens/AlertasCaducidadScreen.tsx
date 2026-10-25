import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ExpiryAlertItem, BackendPromotion } from '../types';
import { api } from '../api/client';
import { notify } from '../utils/dialogs';
import { Button, Chip, EmptyState, ScreenTitle } from '../components/ui';
import { LotLabel } from '../components/LotLabel';
import { contentFrame, useLayout } from '../theme/layout';
import { colors, levelColors, themed } from '../theme/tokens';
import { getErrorCode, getErrorMessage, getErrorStatus } from '../utils/errors';

interface AlertasCaducidadScreenProps {
  alerts: ExpiryAlertItem[];
  onRefresh: () => void;
  refreshing: boolean;
  onOpenAiPromo: (promo: BackendPromotion) => void;
  onOpenMerma: (lotId: string, lotNumber: string, maxUnits: number) => void;
}

type Filter = 'TODOS' | 'VENCIDO' | 'ROJO' | 'AMARILLO';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'VENCIDO', label: 'Vencidos' },
  { id: 'ROJO', label: 'Menos de 7 días' },
  { id: 'AMARILLO', label: '7 a 14 días' },
];

const AI_ERRORS: Record<number, string> = {
  429: 'El asistente alcanzó su límite de solicitudes. Inténtalo en unos minutos.',
  502: 'El asistente devolvió una respuesta no válida. No se creó ningún borrador; puedes intentarlo otra vez.',
  504: 'El asistente tardó demasiado. No se creó ningún borrador; inténtalo otra vez.',
};

export const AlertasCaducidadScreen: React.FC<AlertasCaducidadScreenProps> = ({
  alerts, onRefresh, refreshing, onOpenAiPromo, onOpenMerma,
}) => {
  const { listColumns: columns, gutter } = useLayout();
  const [filter, setFilter] = useState<Filter>('TODOS');
  const [busyLotId, setBusyLotId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    TODOS: alerts.length,
    VENCIDO: alerts.filter(a => a.nivel === 'VENCIDO').length,
    ROJO: alerts.filter(a => a.nivel === 'ROJO').length,
    AMARILLO: alerts.filter(a => a.nivel === 'AMARILLO').length,
  }), [alerts]);

  const visible = useMemo(
    () => (filter === 'TODOS' ? alerts : alerts.filter(a => a.nivel === filter)),
    [alerts, filter],
  );

  const moveToShelf = async (item: ExpiryAlertItem) => {
    setBusyLotId(item.loteId);
    try {
      await api.updateLotLocation(item.loteId, 'PERCHA');
      notify('Lote en percha', `${item.productoNombre} (lote ${item.numeroLote}) quedó en percha para venderse primero.`);
      onRefresh();
    } catch (err: unknown) {
      notify('No se pudo mover el lote', getErrorMessage(err, 'Inténtalo de nuevo.'));
    } finally {
      setBusyLotId(null);
    }
  };

  const createOffer = async (item: ExpiryAlertItem) => {
    setBusyLotId(item.loteId);
    try {
      onOpenAiPromo(await api.generatePromotion(item.loteId));
      onRefresh();
    } catch (err: unknown) {
      const status = getErrorStatus(err);
      const notConfigured = status === 503 && getErrorCode(err) === 'GeminiNotConfigured';
      notify('No se pudo crear la oferta', notConfigured
        ? 'El asistente de ofertas no está configurado en el servidor (falta GEMINI_API_KEY).'
        : AI_ERRORS[status] || getErrorMessage(err, 'Inténtalo de nuevo.'));
    } finally {
      setBusyLotId(null);
    }
  };

  return (
    <FlatList
      key={columns}
      style={styles.list}
      contentContainerStyle={[styles.content, contentFrame, { padding: gutter }]}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.columns : undefined}
      data={visible}
      keyExtractor={item => item.id || item.loteId}
      initialNumToRender={8}
      windowSize={7}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.karen} colors={[colors.karen]} />}
      ListHeaderComponent={
        <View>
          <ScreenTitle
            title="Por vencer"
            subtitle="Primero lo que vence antes: muévelo a percha, ponlo en oferta o da de baja lo vencido."
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map(option => (
              <Chip
                key={option.id}
                label={option.label}
                count={counts[option.id]}
                active={filter === option.id}
                accent={option.id === 'TODOS' ? undefined : levelColors(option.id).band}
                onPress={() => setFilter(option.id)}
              />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="checkmark-done-outline"
          title={filter === 'TODOS' ? 'Nada por vencer' : 'Ningún lote en este grupo'}
          text="Los lotes con stock están lejos de su fecha de caducidad."
        />
      }
      renderItem={({ item }) => {
        const expired = item.nivel === 'VENCIDO';
        const busy = busyLotId === item.loteId;
        return (
          <View style={styles.cell}>
          <LotLabel
            productName={item.productoNombre}
            lotNumber={item.numeroLote}
            expiresOn={item.fechaCaducidad}
            days={item.diasParaVencer}
            level={item.nivel}
            location={item.ubicacion}
            available={item.cantidadDisponible}
            reserved={item.cantidadReservada}
          >
            {expired ? (
              <Button
                label="Dar de baja"
                icon="trash-outline"
                variant="danger"
                compact
                disabled={busy || item.cantidadDisponible <= 0}
                onPress={() => onOpenMerma(item.loteId, item.numeroLote, item.cantidadDisponible)}
                style={styles.action}
              />
            ) : (
              <>
                {item.ubicacion === 'BODEGA' && (
                  <Button
                    label="A percha"
                    icon="arrow-forward-outline"
                    variant="primary"
                    compact
                    loading={busy}
                    onPress={() => void moveToShelf(item)}
                    style={styles.action}
                  />
                )}
                <Button
                  label="Crear oferta"
                  icon="sparkles-outline"
                  variant="sticker"
                  compact
                  disabled={busy || item.cantidadDisponible <= 0}
                  onPress={() => void createOffer(item)}
                  style={styles.action}
                />
                <Button
                  label="Merma"
                  icon="remove-circle-outline"
                  variant="ghost"
                  compact
                  disabled={busy || item.cantidadDisponible <= 0}
                  onPress={() => onOpenMerma(item.loteId, item.numeroLote, item.cantidadDisponible)}
                  style={styles.action}
                />
              </>
            )}
          </LotLabel>
          </View>
        );
      }}
    />
  );
};

const styles = themed(() => StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 32 },
  columns: { gap: 12 },
  cell: { flex: 1, minWidth: 0 },

  filters: { gap: 8, paddingBottom: 14 },
  action: { flexGrow: 1 },
}));
