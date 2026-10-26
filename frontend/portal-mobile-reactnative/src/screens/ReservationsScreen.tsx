import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BackendReservation } from '../api/client';
import { Button, Chip, EmptyState, SectionTitle } from '../components/ui';
import { confirmAction, notify } from '../utils/dialogs';
import { formatDateTime } from '../utils/dates';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { getErrorMessage } from '../utils/errors';
import { RESERVATION_EXTENSION_MINUTES, RESERVATION_MAX_TOTAL_MINUTES, formatMinutes } from '../config/reservationRules';
import { canExtendReservation } from '../reservations/extension';
import { useLayout } from '../theme/layout';

interface ReservationsScreenProps {
  authenticated: boolean;
  reservations: BackendReservation[];
  syncing: boolean;
  onRefresh: () => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onExtend: (id: string) => Promise<void>;
  onOpenPass: (reservation: BackendReservation) => void;
  onLogin: () => void;
  onExplore: () => void;
}

type Filter = 'TODAS' | 'PENDIENTES' | 'COMPLETADAS' | 'CANCELADAS';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'PENDIENTES', label: 'Por retirar' },
  { id: 'COMPLETADAS', label: 'Retiradas' },
  { id: 'CANCELADAS', label: 'Canceladas o vencidas' },
];

const statusOf = (estado: BackendReservation['estado']): { label: string; bg: string; fg: string } => {
  switch (estado) {
    case 'PENDIENTE_SYNC': return { label: 'Confirmando', bg: colors.aisle, fg: colors.ink };
    case 'PENDIENTE': return { label: 'Por retirar', bg: colors.sticker, fg: colors.mora };
    case 'CONFIRMADA': return { label: 'Retirada', bg: colors.freshTint, fg: colors.fresh };
    case 'EXPIRADA': return { label: 'Venció', bg: colors.aisle, fg: colors.inkMuted };
    case 'RECHAZADA': return { label: 'No disponible', bg: colors.aisle, fg: colors.inkMuted };
    default: return { label: 'Cancelada', bg: colors.aisle, fg: colors.inkMuted };
  }
};

export const ReservationsScreen: React.FC<ReservationsScreenProps> = ({
  authenticated, reservations, syncing, onRefresh, onCancel, onExtend, onOpenPass, onLogin, onExplore,
}) => {
  const { reservationColumns: columns, gutter, isTablet } = useLayout();
  const [filter, setFilter] = useState<Filter>('TODAS');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [extending, setExtending] = useState<string | null>(null);

  const normalized = useMemo(() => reservations.map(reservation => {
    const expiredPending = (reservation.estado === 'PENDIENTE' || reservation.estado === 'PENDIENTE_SYNC')
      && new Date(reservation.fechaExpiracion).getTime() <= Date.now();
    return { reservation, status: expiredPending ? 'EXPIRADA' as const : reservation.estado };
  }), [reservations]);

  const visible = useMemo(() => normalized.filter(({ status }) => {
    if (filter === 'TODAS') return true;
    if (filter === 'PENDIENTES') return status === 'PENDIENTE' || status === 'PENDIENTE_SYNC';
    if (filter === 'COMPLETADAS') return status === 'CONFIRMADA';
    return status === 'CANCELADA' || status === 'EXPIRADA' || status === 'RECHAZADA';
  }), [filter, normalized]);

  const cancel = async (id: string) => {
    const confirmed = await confirmAction('Cancelar reserva', 'Las unidades vuelven a la percha de inmediato.', {
      confirmLabel: 'Cancelar reserva', cancelLabel: 'Volver', destructive: true,
    });
    if (!confirmed) return;
    setCancelling(id);
    try { await onCancel(id); }
    catch (error: unknown) { notify('No se pudo cancelar', getErrorMessage(error, 'Inténtalo de nuevo.')); }
    finally { setCancelling(null); }
  };

  const extend = async (id: string) => {
    setExtending(id);
    try {
      await onExtend(id);
      notify('Tiempo extendido', `Se añadieron ${RESERVATION_EXTENSION_MINUTES} minutos a la reserva.`);
    } catch (error: unknown) {
      notify('No se pudo extender el tiempo', getErrorMessage(error, 'Inténtalo de nuevo.'));
    } finally { setExtending(null); }
  };

  if (!authenticated) {
    return (
      <View style={[styles.screen, styles.content]}>
        <SectionTitle title="Mis reservas" />
        <EmptyState
          illustration="ticket"
          title="Ingresa para ver tus reservas"
          text="Tus códigos de retiro están protegidos por tu cuenta."
          action={<Button label="Ingresar" compact onPress={onLogin} />}
        />
      </View>
    );
  }

  return (
    <FlatList
      key={columns}
      style={styles.screen}
      // En tableta vertical la lista es una sola columna centrada: una tarjeta de reserva no gana nada estirándose.
      contentContainerStyle={[styles.content, { padding: gutter }, isTablet && columns === 1 && styles.contentNarrow]}
      data={visible}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.columns : undefined}
      keyExtractor={item => item.reservation.id}
      refreshControl={<RefreshControl refreshing={syncing} onRefresh={() => void onRefresh()} tintColor={colors.ink} colors={[colors.ink]} />}
      ListHeaderComponent={
        <View>
          <SectionTitle title="Mis reservas" subtitle="Tus códigos de retiro y lo que ya pasó por caja." />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map(option => <Chip key={option.id} label={option.label} active={filter === option.id} onPress={() => setFilter(option.id)} />)}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={reservations.length === 0
        ? <EmptyState illustration="ticket" title="Todavía no tienes reservas" text="Arma tu lista y apártala: aquí aparece tu código de retiro." action={<Button label="Ver productos" variant="danger" compact onPress={onExplore} />} />
        : <EmptyState icon="file-tray-outline" title="Nada en este grupo" />}
      renderItem={({ item: { reservation, status } }) => {
        const pending = status === 'PENDIENTE';
        const awaitingStore = status === 'PENDIENTE_SYNC';
        const rejected = status === 'RECHAZADA';
        const total = reservation.detalles.reduce((sum, d) => sum + Number(d.cantidad) * Number(d.precioUnitario), 0);
        const names = reservation.detalles.map(d => d.productoNombre).filter(Boolean).join(', ');
        const badge = statusOf(status);
        return (
          <View style={[styles.card, columns > 1 && styles.cardColumn, (pending || awaitingStore) && styles.cardPending]}>
            <View style={styles.cardHead}>
              <View style={styles.flex}>
                <Text style={styles.code}>{reservation.codigoRetiro || (rejected ? 'Sin código' : 'Confirmando…')}</Text>
                <Text style={styles.date}>
                  {pending ? `Retira antes de ${formatDateTime(reservation.fechaExpiracion)}` : `Apartada el ${formatDateTime(reservation.created_at || reservation.fechaExpiracion)}`}
                </Text>
              </View>
              <View style={[styles.status, { backgroundColor: badge.bg }]}><Text style={[styles.statusText, { color: badge.fg }]}>{badge.label}</Text></View>
            </View>
            <View style={styles.dashed} />
            {awaitingStore ? <Text style={styles.names}>Estamos confirmando tu reserva con la tienda. Se actualiza sola.</Text> : null}
            {rejected ? <Text style={styles.rejection}>{reservation.mensajeRechazo || 'La tienda no pudo apartar estos productos.'}</Text> : null}
            {names ? <Text style={styles.names} numberOfLines={2}>{names}</Text> : null}
            {reservation.detalles.length > 0
              ? <Text style={styles.total}>Total reservado: <Text style={styles.totalValue}>${total.toFixed(2)}</Text></Text>
              : null}
            {awaitingStore && (
              <View style={styles.actions}>
                <Button label={cancelling === reservation.id ? 'Cancelando…' : 'Cancelar'} variant="outline" compact disabled={cancelling === reservation.id} onPress={() => void cancel(reservation.id)} style={styles.flex} />
              </View>
            )}
            {pending && (
              <View style={styles.actions}>
                <Button label="Ver pase" icon="qr-code-outline" compact onPress={() => onOpenPass(reservation)} style={styles.flex} />
                <Button label={cancelling === reservation.id ? 'Cancelando…' : 'Cancelar'} variant="outline" compact disabled={cancelling === reservation.id} onPress={() => void cancel(reservation.id)} style={styles.flex} />
              </View>
            )}
            {pending && (canExtendReservation(reservation)
              ? (
                <Button
                  label={extending === reservation.id ? 'Extendiendo…' : `Añadir más tiempo (+${RESERVATION_EXTENSION_MINUTES} min)`}
                  icon="time-outline"
                  variant="ghost"
                  compact
                  disabled={extending === reservation.id || cancelling === reservation.id}
                  onPress={() => void extend(reservation.id)}
                  style={styles.extend}
                />
              )
              : <Text style={styles.maxNote}>Llegaste al máximo de {formatMinutes(RESERVATION_MAX_TOTAL_MINUTES)} para esta reserva.</Text>)}
          </View>
        );
      }}
    />
  );
};

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 24 },
  contentNarrow: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  columns: { gap: 12 },
  cardColumn: { flex: 1, maxWidth: '50%' },
  chips: { gap: 8, paddingBottom: 14 },
  card: { backgroundColor: colors.card, borderRadius: radius.block, borderWidth: 2, borderColor: colors.rule, padding: 16, marginBottom: 12 },
  cardPending: { borderColor: colors.mora },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  code: { fontFamily: fonts.stamp, fontSize: 28, lineHeight: 30, color: colors.ink, letterSpacing: 1 },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  status: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontFamily: fonts.tag, fontSize: 12 },
  dashed: { borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ruleStrong, marginVertical: 10 },
  names: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  rejection: { fontFamily: fonts.tag, fontSize: 14, lineHeight: 19, color: colors.karenDeep },
  total: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, marginTop: 6 },
  totalValue: { fontFamily: fonts.tag, color: colors.ink },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  extend: { marginTop: 10 },
  maxNote: { fontFamily: fonts.semibold, fontSize: 12, color: colors.inkMuted, textAlign: 'center', marginTop: 10 },
}));
