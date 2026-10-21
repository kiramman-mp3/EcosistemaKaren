import React, { useMemo } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DataLoadState, FlashOffer, NavTab, Product } from '../types';
import { Button, EmptyState, ExpiryStamp, OldPrice, Price, ProductImage, SectionTitle } from '../components/ui';
import { OfferTag } from '../components/ProductTag';
import { PopPressable, Slap } from '../components/motion';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { categoryTone, toneSolid } from '../theme/categoryTone';
import { greetingFor } from '../utils/greeting';

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
  userName?: string;
  onOpenPrivacy: () => void;
}

const STEPS = [
  { title: 'Elige en línea', text: 'Ves el stock real de la tienda.' },
  { title: 'Te lo apartamos 30 minutos', text: 'Recibes un código y nadie más se lleva esas unidades.' },
  { title: 'Pagas y retiras en caja', text: 'Muestra el código en la Sucursal Matriz.' },
];

// Inclinaciones y tiempos fijos: parecen pegadas a mano, pero son iguales en cada carga.
const STICKERS = [
  { tilt: -2.5, delay: 250 },
  { tilt: 2, delay: 420 },
  { tilt: -1.5, delay: 590 },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  products, categories, offers, state, refreshing, onRefresh, onNavigate, onSelectCategory,
  onReserveOffer, reservingOfferId, activePassCode, onOpenPass, userName, onOpenPrivacy,
}) => {
  const stickers = useMemo(() => offers.slice(0, 3), [offers]);

  const aisles = useMemo(() => categories
    .filter(name => name !== 'Todos')
    .map(name => {
      const inAisle = products.filter(product => product.category === name);
      return { name, count: inAisle.length, samples: inAisle.filter(product => product.stock > 0 && product.image).slice(0, 3) };
    })
    .filter(aisle => aisle.count > 0)
    .sort((a, b) => b.count - a.count), [categories, products]);

  const greeting = userName ? `${greetingFor()}, ${userName}.` : `${greetingFor()}.`;

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
            <Text style={styles.passText}>Tienes un pedido apartado</Text>
            <Text style={styles.passCode}>{activePassCode}</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.headline} accessibilityRole="header">Apártalo desde tu casa. Lo pagas cuando llegues.</Text>
        <Text style={styles.lead}>Armas tu lista, te guardamos todo 30 minutos y pagas en caja al retirar. Sin fila.</Text>
        <View style={styles.cta}>
          <Button label="Armar mi lista" icon="basket-outline" onPress={() => onNavigate('productos')} style={styles.ctaButton} />
          <Button label="Ofertas por vencer" variant="outline" onPress={() => onNavigate('ofertas')} style={styles.ctaButton} />
        </View>

        {stickers.length > 0 && (
          <View style={styles.stickers}>
            <Text style={styles.handNote} aria-hidden>¡se va hoy!</Text>
            {stickers.map((offer, index) => {
              const style = STICKERS[index];
              const busy = reservingOfferId === offer.id;
              return (
                <Slap key={offer.id} tilt={style.tilt} delay={style.delay} style={styles.sticker}>
                  <PopPressable
                    onPress={() => onReserveOffer(offer)}
                    disabled={busy}
                    backgroundColor={colors.card}
                    borderRadius={radius.tag}
                    accessibilityLabel={`Apartar ${offer.productName || offer.title} a ${offer.price.toFixed(2)} dólares, ${offer.discountBadge}`}
                    bodyStyle={styles.stickerBody}
                  >
                    <ProductImage uri={offer.image} size={84} tone={categoryTone(offer.category)} />
                    <View style={styles.flex}>
                      <Text style={styles.stickerName} numberOfLines={2}>{offer.productName || offer.title}</Text>
                      <View style={styles.stickerPrice}>
                        <Price value={offer.price} color={colors.karenText} />
                        <OldPrice value={offer.originalPrice} />
                      </View>
                      <View style={styles.stickerFoot}>
                        <ExpiryStamp date={offer.expiresOn} />
                        <View style={styles.apartar}><Text style={styles.apartarText}>{busy ? 'Apartando…' : 'Apartar'}</Text></View>
                      </View>
                    </View>
                    <View style={styles.discount}><Text style={styles.discountText}>{offer.discountBadge}</Text></View>
                  </PopPressable>
                </Slap>
              );
            })}
          </View>
        )}
      </View>

      {offers.length > 3 && (
        <View style={styles.section}>
          <SectionTitle
            title="También se acaban pronto"
            subtitle="Lo que vence primero, primero."
            action={<TouchableOpacity onPress={() => onNavigate('ofertas')} style={styles.link}><Text style={styles.linkText}>Ver {offers.length}</Text></TouchableOpacity>}
          />
          <FlatList
            horizontal
            data={offers.slice(3, 9)}
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
        <SectionTitle title="Date una vuelta por los pasillos" subtitle={state === 'ready' ? `${products.length} productos` : undefined} />
        {state === 'offline' || state === 'error' ? (
          <EmptyState illustration="offline" title="No pudimos cargar los pasillos" text="Desliza hacia abajo para intentar de nuevo." />
        ) : (
          <View style={styles.aisles}>
            {aisles.map(aisle => {
              const solid = toneSolid(categoryTone(aisle.name));
              return (
                <PopPressable
                  key={aisle.name}
                  onPress={() => onSelectCategory(aisle.name)}
                  backgroundColor={solid.bg}
                  borderRadius={radius.block}
                  accessibilityLabel={`${aisle.name}, ${aisle.count} productos`}
                  style={styles.aisle}
                  bodyStyle={styles.aisleBody}
                >
                  <View style={styles.aisleHead}>
                    <Text style={[styles.aisleName, { color: solid.fg }]} numberOfLines={2}>{aisle.name}</Text>
                    <View style={styles.aisleCount}><Text style={styles.aisleCountText}>{aisle.count}</Text></View>
                  </View>
                  <View style={styles.aisleSamples}>
                    {aisle.samples.map(product => <ProductImage key={product.id} uri={product.image} style={styles.aisleImage} />)}
                  </View>
                </PopPressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.steps}>
        <Text style={styles.stepsTitle}>Apartar es así de fácil</Text>
        {STEPS.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
            <View style={styles.flex}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.privacyLink} onPress={onOpenPrivacy} accessibilityRole="link">
        <Text style={styles.privacyLinkText}>Política de privacidad</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.aisle },
  // El espacio inferior deja libre el botón flotante del chat.
  content: { paddingBottom: 84 },
  hero: { backgroundColor: colors.sticker, padding: 20, paddingTop: 22, borderBottomWidth: 2, borderBottomColor: colors.mora },
  pass: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.mora, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 46, marginBottom: 16 },
  passText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: '#FFFFFF' },
  passCode: { fontFamily: fonts.stamp, fontSize: 18, color: colors.sticker, letterSpacing: 1 },
  greeting: { fontFamily: fonts.tag, fontSize: 22, color: colors.mora },
  headline: { fontFamily: fonts.tag, fontSize: 40, lineHeight: 41, color: colors.mora, marginTop: 6 },
  lead: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, color: colors.mora, marginTop: 12 },
  cta: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ctaButton: { flexGrow: 1 },
  stickers: { marginTop: 22, gap: 12 },
  handNote: { fontFamily: fonts.hand, fontSize: 30, color: colors.mora, transform: [{ rotate: '-5deg' }], marginLeft: 4 },
  sticker: {},
  stickerBody: { flexDirection: 'row', gap: 12, padding: 10, alignItems: 'center', paddingRight: 14 },
  stickerName: { fontFamily: fonts.tag, fontSize: 16, lineHeight: 19, color: colors.ink, paddingRight: 52 },
  stickerPrice: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 2 },
  stickerFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  apartar: { backgroundColor: colors.mora, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  apartarText: { fontFamily: fonts.tag, fontSize: 12, color: '#FFFFFF' },
  discount: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.karen, borderRadius: radius.tag, borderWidth: 2, borderColor: colors.mora, paddingHorizontal: 8, paddingVertical: 2, transform: [{ rotate: '3deg' }] },
  discountText: { fontFamily: fonts.tag, fontSize: 16, color: '#FFFFFF' },
  section: { paddingHorizontal: 16, paddingTop: 28 },
  link: { minHeight: 44, justifyContent: 'center' },
  privacyLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  privacyLinkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft, textDecorationLine: 'underline' },
  linkText: { fontFamily: fonts.tag, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  offerRow: { gap: 14, paddingRight: 16, paddingBottom: 4 },
  aisles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  aisle: { width: '47%', flexGrow: 1 },
  aisleBody: { padding: 10, minHeight: 130 },
  aisleHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, minHeight: 40 },
  aisleName: { flex: 1, fontFamily: fonts.tag, fontSize: 16, lineHeight: 19 },
  aisleCount: { backgroundColor: colors.mora, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  aisleCountText: { fontFamily: fonts.bold, fontSize: 11, color: '#FFFFFF' },
  aisleSamples: { flexDirection: 'row', height: 54, gap: 4, marginTop: 8 },
  aisleImage: { flex: 1, height: '100%', padding: 3, borderRadius: radius.tag },
  steps: { margin: 16, marginTop: 28, backgroundColor: '#0E7A43', borderRadius: radius.block, borderWidth: 2, borderColor: colors.mora, padding: 18, gap: 16 },
  stepsTitle: { fontFamily: fonts.tag, fontSize: 26, color: '#FFFFFF' },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sticker, borderWidth: 2, borderColor: colors.mora, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: fonts.tag, fontSize: 20, color: colors.mora },
  stepTitle: { fontFamily: fonts.tag, fontSize: 17, color: '#FFFFFF' },
  stepText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
}));
