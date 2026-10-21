import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BackendReservation } from '../api/client';
import { Button, Chip, EmptyState, SectionTitle } from '../components/ui';
import { confirmAction, notify } from '../utils/dialogs';
import { formatDateTime } from '../utils/dates';
import { colors, fonts, radius, themed } from '../theme/tokens';

interface ReservationsScreenProps {
  authenticated: boolean;
  reservations: BackendReservation[];
  syncing: boolean;
  onRefresh: () => Promise<void>;
  onCancel: (id: string) => Promise<void>;
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
    case 'PENDIENTE': return { label: 'Por retirar', bg: colors.sticker, fg: colors.mora };
    case 'CONFIRMADA': return { label: 'Retirada', bg: colors.freshTint, fg: colors.fresh };
    case 'EXPIRADA': return { label: 'Venció', bg: colors.aisle, fg: colors.inkMuted };
    default: return { label: 'Cancelada', bg: colors.aisle, fg: colors.inkMuted };
  }
};

export const ReservationsScreen: React.FC<ReservationsScreenProps> = ({
  authenticated, reservations, syncing, onRefresh, onCancel, onOpenPass, onLogin, onExplore,
}) => {
  const [filter, setFilter] = useState<Filter>('TODAS');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const normalized = useMemo(() => reservations.map(reservation => {
    const expiredPending = reservation.estado === 'PENDIENTE' && new Date(reservation.fechaExpiracion).getTime() <= Date.now();
    return { reservation, status: expiredPending ? 'EXPIRADA' as const : reservation.estado };
  }), [reservations]);

  const visible = useMemo(() => normalized.filter(({ status }) => {
    if (filter === 'TODAS') return true;
    if (filter === 'PENDIENTES') return status === 'PENDIENTE';
    if (filter === 'COMPLETADAS') return status === 'CONFIRMADA';
    return status === 'CANCELADA' || status === 'EXPIRADA';
  }), [filter, normalized]);

  const cancel = async (id: string) => {
    const confirmed = await confirmAction('Cancelar reserva', 'Las unidades vuelven a la percha de inmediato.', {
      confirmLabel: 'Cancelar reserva', cancelLabel: 'Volver', destructive: true,
    });
    if (!confirmed) return;
    setCancelling(id);
    try { await onCancel(id); }
    catch (error: any) { notify('No se pudo cancelar', error?.response?.data?.message || error?.message || 'Inténtalo de nuevo.'); }
    finally { setCancelling(null); }
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
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={visible}
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
        const total = reservation.detalles.reduce((sum, d) => sum + Number(d.cantidad) * Number(d.precioUnitario), 0);
        const names = reservation.detalles.map(d => d.productoNombre).filter(Boolean).join(', ');
        const badge = statusOf(status);
        return (
          <View style={[styles.card, pending && styles.cardPending]}>
            <View style={styles.cardHead}>
              <View style={styles.flex}>
                <Text style={styles.code}>{reservation.codigoRetiro}</Text>
                <Text style={styles.date}>
                  {pending ? `Retira antes de ${formatDateTime(reservation.fechaExpiracion)}` : `Apartada el ${formatDateTime(reservation.created_at || reservation.fechaExpiracion)}`}
                </Text>
              </View>
              <View style={[styles.status, { backgroundColor: badge.bg }]}><Text style={[styles.statusText, { color: badge.fg }]}>{badge.label}</Text></View>
            </View>
            <View style={styles.dashed} />
            {names ? <Text style={styles.names} numberOfLines={2}>{names}</Text> : null}
            <Text style={styles.total}>Total reservado: <Text style={styles.totalValue}>${total.toFixed(2)}</Text></Text>
            {pending && (
              <View style={styles.actions}>
                <Button label="Ver pase" icon="qr-code-outline" compact onPress={() => onOpenPass(reservation)} style={styles.flex} />
                <Button label={cancelling === reservation.id ? 'Cancelando…' : 'Cancelar'} variant="outline" compact disabled={cancelling === reservation.id} onPress={() => void cancel(reservation.id)} style={styles.flex} />
              </View>
            )}
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
  total: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, marginTop: 6 },
  totalValue: { fontFamily: fonts.tag, color: colors.ink },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
}));
