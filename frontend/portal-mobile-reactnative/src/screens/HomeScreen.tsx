import React, { useMemo } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DataLoadState, FlashOffer, NavTab, Product } from '../types';
import { EmptyState, ExpiryStamp, OldPrice, Price, ProductImage, SectionTitle } from '../components/ui';
import { OfferTag } from '../components/ProductTag';
import { colors, fonts, radius } from '../theme/tokens';

interface HomeScreenProps {
  products: Product[];
  categories: string[];
  offers: FlashOffer[];
  state: DataLoadState;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigate: (tab: NavTab) => void;
  onSelectCategory: (category: string) => void;
  onReserveOffer: (offer: FlashOffer) => void;
  reservingOfferId: string | null;
  activePassCode?: string;
  onOpenPass: () => void;
}

const STEPS = [
  { title: 'Elige en línea', text: 'Ves el stock real de la tienda.' },
  { title: 'Te lo apartamos 10 minutos', text: 'Recibes un código y nadie más se lleva esas unidades.' },
  { title: 'Pagas y retiras en caja', text: 'Muestra el código en la Sucursal Matriz.' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  products, categories, offers, state, refreshing, onRefresh, onNavigate, onSelectCategory,
  onReserveOffer, reservingOfferId, activePassCode, onOpenPass,
}) => {
  const featured = useMemo(() => offers.reduce<FlashOffer | undefined>((best, offer) =>
    !best || offer.originalPrice - offer.price > best.originalPrice - best.price ? offer : best, undefined), [offers]);

  const aisles = useMemo(() => categories
    .filter(name => name !== 'Todos')
    .map(name => {
      const inAisle = products.filter(product => product.category === name);
      return { name, count: inAisle.length, samples: inAisle.filter(product => product.stock > 0 && product.image).slice(0, 2) };
    })
    .filter(aisle => aisle.count > 0)
    .sort((a, b) => b.count - a.count), [categories, products]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.karen} colors={[colors.karen]} />}
    >
      <View style={styles.hero}>
        {activePassCode && (
          <TouchableOpacity style={styles.pass} onPress={onOpenPass} accessibilityRole="button">
            <Ionicons name="ticket" size={18} color={colors.sticker} />
            <Text style={styles.passText}>Reserva activa</Text>
            <Text style={styles.passCode}>{activePassCode}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        )}
        <Text style={styles.headline} accessibilityRole="header">Reserva en línea y retira en caja sin hacer fila</Text>
        <Text style={styles.lead}>Te apartamos los productos 10 minutos y pagas al retirarlos.</Text>
      </View>

      {featured && (
        <View style={styles.featured}>
          <View style={styles.featuredHead}>
            <Text style={styles.featuredTitle}>Oferta de hoy</Text>
            <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>{featured.discountBadge}</Text></View>
          </View>
          <View style={styles.featuredBody}>
            <ProductImage uri={featured.image} size={104} style={styles.featuredImage} />
            <View style={styles.flex}>
              <Text style={styles.featuredName} numberOfLines={3}>{featured.productName || featured.title}</Text>
              <View style={styles.featuredPrice}>
                <Price value={featured.price} size="lg" color={colors.karen} />
                <OldPrice value={featured.originalPrice} />
              </View>
            </View>
          </View>
          <View style={styles.featuredFoot}>
            <ExpiryStamp date={featured.expiresOn} />
            <Text style={styles.left}>Quedan {featured.stockAvailable}</Text>
          </View>
          <TouchableOpacity
            style={styles.featuredCta}
            onPress={() => onReserveOffer(featured)}
            disabled={reservingOfferId === featured.id}
            accessibilityRole="button"
          >
            <Text style={styles.featuredCtaText}>{reservingOfferId === featured.id ? 'Reservando…' : 'Reservar esta oferta'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {offers.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            title="Por vencer, con descuento"
            action={<TouchableOpacity onPress={() => onNavigate('ofertas')} style={styles.link}><Text style={styles.linkText}>Ver {offers.length}</Text></TouchableOpacity>}
          />
          <FlatList
            horizontal
            data={offers.slice(0, 6)}
            keyExtractor={offer => offer.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offerRow}
            renderItem={({ item }) => (
              <OfferTag offer={item} onReserve={onReserveOffer} busy={reservingOfferId === item.id} compact />
            )}
          />
        </View>
      )}

      <View style={styles.section}>
        <SectionTitle title="Pasillos" subtitle={state === 'ready' ? `${products.length} productos` : undefined} />
        {state === 'offline' || state === 'error' ? (
          <EmptyState icon="cloud-offline-outline" title="No pudimos cargar los pasillos" text="Desliza hacia abajo para intentar de nuevo." />
        ) : (
          <View style={styles.aisles}>
            {aisles.map(aisle => (
              <TouchableOpacity key={aisle.name} style={styles.aisle} onPress={() => onSelectCategory(aisle.name)} accessibilityRole="button" accessibilityLabel={`${aisle.name}, ${aisle.count} productos`}>
                <View style={styles.aisleSign}>
                  <Text style={styles.aisleName} numberOfLines={2}>{aisle.name}</Text>
                  <Text style={styles.aisleCount}>{aisle.count}</Text>
                </View>
                <View style={styles.aisleSamples}>
                  {aisle.samples.map(product => <ProductImage key={product.id} uri={product.image} style={styles.aisleImage} />)}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.steps}>
        <Text style={styles.stepsTitle}>Cómo funciona tu reserva</Text>
        {STEPS.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <View style={styles.flex}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.aisle },
  content: { paddingBottom: 24 },
  hero: { backgroundColor: colors.white, padding: 20, paddingTop: 22, borderBottomWidth: 1, borderBottomColor: colors.rule },
  pass: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ink, borderRadius: radius.tag, paddingHorizontal: 12, minHeight: 46, marginBottom: 16 },
  passText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  passCode: { fontFamily: fonts.tag, fontSize: 18, color: colors.sticker, letterSpacing: 1 },
  headline: { fontFamily: fonts.tag, fontSize: 40, lineHeight: 40, color: colors.ink },
  lead: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.inkSoft, marginTop: 12 },
  featured: { margin: 16, marginBottom: 0, backgroundColor: colors.sticker, borderRadius: radius.tag, overflow: 'hidden' },
  featuredHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 0 },
  featuredTitle: { fontFamily: fonts.tag, fontSize: 20, color: colors.ink },
  featuredBadge: { backgroundColor: colors.karen, borderRadius: radius.tag, paddingHorizontal: 8, paddingVertical: 3 },
  featuredBadgeText: { fontFamily: fonts.tag, fontSize: 20, color: colors.white },
  featuredBody: { flexDirection: 'row', gap: 14, padding: 14, alignItems: 'center' },
  featuredImage: { borderRadius: radius.tag },
  featuredName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  featuredPrice: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 },
  featuredFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 14, paddingVertical: 10 },
  left: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  featuredCta: { backgroundColor: colors.ink, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  featuredCtaText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  offerRow: { gap: 12, paddingRight: 16 },
  aisles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  aisle: { width: '48%', flexGrow: 1, backgroundColor: colors.white, borderRadius: radius.tag, borderWidth: 1, borderColor: colors.rule, overflow: 'hidden' },
  aisleSign: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, backgroundColor: colors.ink, paddingHorizontal: 10, paddingVertical: 8, minHeight: 56 },
  aisleName: { flex: 1, fontFamily: fonts.tag, fontSize: 16, lineHeight: 19, color: colors.white },
  aisleCount: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  aisleSamples: { flexDirection: 'row', height: 70, padding: 6, gap: 4 },
  aisleImage: { flex: 1, height: '100%' },
  steps: { margin: 16, marginTop: 24, backgroundColor: colors.ink, borderRadius: radius.tag, padding: 18, gap: 14 },
  stepsTitle: { fontFamily: fonts.tag, fontSize: 24, color: colors.white },
  step: { flexDirection: 'row', gap: 12, borderTopWidth: 2, borderTopColor: colors.sticker, paddingTop: 10 },
  stepNumber: { fontFamily: fonts.tag, fontSize: 30, lineHeight: 32, color: colors.sticker, minWidth: 22 },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  stepText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.75)' },
});
