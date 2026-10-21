import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashOffer, Product } from '../types';
import { ExpiryStamp, OldPrice, Price, ProductImage } from './ui';
import { Bump, PopPressable } from './motion';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { categoryTone } from '../theme/categoryTone';

const LOW_STOCK = 5;

interface ProductTagProps {
  product: Product;
  inCart: number;
  onAdd: (product: Product) => void;
}

/** Producto en percha: foto sobre el color de su pasillo y el precio en una etiqueta. */
export const ProductTag: React.FC<ProductTagProps> = ({ product, inCart, onAdd }) => {
  const soldOut = product.stock <= 0;
  const maxed = inCart >= product.stock;
  const disabled = soldOut || maxed;
  return (
    <View style={styles.card}>
      <ProductImage uri={product.image} tone={categoryTone(product.category)} style={[styles.image, soldOut && styles.faded]} />
      <View style={styles.label}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {product.description ? <Text style={styles.desc} numberOfLines={1}>{product.description}</Text> : <View style={styles.descSpacer} />}
        <View style={styles.priceRow}>
          <Price value={product.price} size="sm" />
          <Text style={[styles.stock, (soldOut || product.stock <= LOW_STOCK) && styles.stockLow]}>
            {soldOut ? 'Agotado' : product.stock <= LOW_STOCK ? `Quedan ${product.stock}` : `${product.stock} disp.`}
          </Text>
        </View>
        <Bump trigger={inCart}>
          <PopPressable
            onPress={() => onAdd(product)}
            disabled={disabled}
            backgroundColor={disabled ? colors.rule : inCart > 0 ? colors.sticker : colors.card}
            accessibilityLabel={soldOut ? `${product.name}, agotado` : `Agregar ${product.name} a mi lista`}
            style={styles.addWrap}
            bodyStyle={styles.add}
          >
            <Ionicons name={inCart > 0 ? 'checkmark' : 'add'} size={18} color={disabled ? colors.inkMuted : inCart > 0 ? colors.mora : colors.ink} />
            <Text style={[styles.addText, disabled && styles.addTextDisabled, inCart > 0 && !disabled && { color: colors.mora }]}>
              {soldOut ? 'Agotado' : inCart > 0 ? `En tu lista (${inCart})` : 'Agregar'}
            </Text>
          </PopPressable>
        </Bump>
      </View>
    </View>
  );
};

interface OfferTagProps {
  offer: FlashOffer;
  onReserve: (offer: FlashOffer) => void;
  busy?: boolean;
  compact?: boolean;
}

/** Oferta por vencer: pegatina limón con el precio rebajado y la fecha impresa. */
export const OfferTag: React.FC<OfferTagProps> = ({ offer, onReserve, busy = false, compact = false }) => (
  <View style={[styles.offer, compact && styles.offerCompact]}>
    <View>
      <ProductImage uri={offer.image} tone={categoryTone(offer.category)} style={styles.offerImage} />
      <View style={styles.discount}><Text style={styles.discountText}>{offer.discountBadge}</Text></View>
    </View>
    <View style={styles.offerBody}>
      <Text style={styles.offerName} numberOfLines={2}>{offer.productName || offer.title}</Text>
      <Text style={styles.note} numberOfLines={2}>{offer.title}</Text>
      <View style={styles.offerPrice}>
        <Price value={offer.price} color={colors.mora} />
        <OldPrice value={offer.originalPrice} color={colors.mora} />
      </View>
      <View style={styles.offerMeta}>
        <ExpiryStamp date={offer.expiresOn} color={colors.mora} />
        <Text style={styles.left}>Quedan {offer.stockAvailable}</Text>
      </View>
      <PopPressable
        onPress={() => onReserve(offer)}
        disabled={busy}
        backgroundColor={busy ? colors.rule : colors.karen}
        accessibilityLabel={`Apartar ${offer.productName || 'oferta'} a ${offer.price.toFixed(2)} dólares`}
        bodyStyle={styles.reserve}
      >
        <Text style={[styles.reserveText, busy && { color: colors.inkMuted }]}>{busy ? 'Apartando…' : `Apartar por $${offer.price.toFixed(2)}`}</Text>
      </PopPressable>
    </View>
  </View>
);

const styles = themed(() => StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.block, borderWidth: 2, borderColor: colors.mora, padding: 8 },
  image: { aspectRatio: 1 },
  faded: { opacity: 0.4 },
  label: { padding: 6, paddingTop: 10, flex: 1 },
  name: { fontFamily: fonts.tag, fontSize: 15, lineHeight: 19, color: colors.ink, minHeight: 38 },
  desc: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 1 },
  descSpacer: { height: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6, gap: 4 },
  stock: { fontFamily: fonts.medium, fontSize: 12, color: colors.fresh, marginBottom: 3 },
  stockLow: { color: colors.karenText, fontFamily: fonts.semibold },
  addWrap: { marginTop: 10 },
  add: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  addText: { fontFamily: fonts.tag, fontSize: 14, color: colors.ink },
  addTextDisabled: { color: colors.inkMuted },
  offer: { backgroundColor: colors.sticker, borderRadius: radius.block, borderWidth: 2, borderColor: colors.mora, padding: 8, overflow: 'hidden' },
  offerCompact: { width: 268 },
  offerImage: { height: 150 },
  discount: { position: 'absolute', left: -2, top: 10, backgroundColor: colors.karen, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.tag, borderWidth: 2, borderColor: colors.mora, transform: [{ rotate: '-3deg' }] },
  discountText: { fontFamily: fonts.tag, fontSize: 20, color: '#FFFFFF' },
  offerBody: { padding: 6, paddingTop: 10, gap: 6 },
  offerName: { fontFamily: fonts.tag, fontSize: 17, lineHeight: 21, color: colors.mora },
  note: { fontFamily: fonts.hand, fontSize: 20, lineHeight: 22, color: colors.mora, transform: [{ rotate: '-1deg' }] },
  offerPrice: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  offerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  left: { fontFamily: fonts.semibold, fontSize: 13, color: colors.mora },
  reserve: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  reserveText: { fontFamily: fonts.tag, fontSize: 15, color: '#FFFFFF' },
}));
