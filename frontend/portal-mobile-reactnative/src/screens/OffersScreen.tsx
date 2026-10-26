import React, { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { DataLoadState, FlashOffer } from '../types';
import { EmptyState, SectionTitle } from '../components/ui';
import { OfferTag } from '../components/ProductTag';
import { daysUntil } from '../utils/dates';
import { colors, themed } from '../theme/tokens';
import { useLayout } from '../theme/layout';

interface OffersScreenProps {
  offers: FlashOffer[];
  state: DataLoadState;
  error?: string;
  refreshing: boolean;
  onRefresh: () => void;
  onReserveOffer: (offer: FlashOffer) => void;
  reservingOfferId: string | null;
}

export const OffersScreen: React.FC<OffersScreenProps> = ({ offers, state, error, refreshing, onRefresh, onReserveOffer, reservingOfferId }) => {
  // Lo que vence primero, primero.
  const { offerColumns: columns, gutter } = useLayout();
  const sorted = useMemo(() => [...offers].sort((a, b) => (daysUntil(a.expiresOn) || 0) - (daysUntil(b.expiresOn) || 0)), [offers]);
  return (
    <FlatList
      key={columns}
      style={styles.screen}
      contentContainerStyle={[styles.content, { padding: gutter }]}
      data={sorted}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.columns : undefined}
      keyExtractor={offer => offer.id}
      initialNumToRender={4}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.karen} colors={[colors.karen]} />}
      ListHeaderComponent={
        <SectionTitle
          title="Ofertas por vencer"
          subtitle="Productos en buen estado que vencen pronto. Mientras más cerca la fecha, más grande el descuento."
        />
      }
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListEmptyComponent={
        state === 'offline' || state === 'error'
          ? <EmptyState illustration="offline" title="No pudimos cargar las ofertas" text={error || 'La tienda no respondió.'} />
          : <EmptyState illustration="search" title="Hoy no hay ofertas por vencer" text="Cuando un lote se acerque a su fecha, aparece aquí con descuento." />
      }
      renderItem={({ item }) => (
        <View style={[styles.cell, columns > 1 && { maxWidth: `${100 / columns}%` }]}>
          <OfferTag offer={item} onReserve={onReserveOffer} busy={reservingOfferId === item.id} />
        </View>
      )}
    />
  );
};

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 24 },
  gap: { height: 16 },
  columns: { gap: 16 },
  // Cada oferta ocupa su columna completa; con una sola columna es todo el ancho.
  cell: { flex: 1 },
}));
