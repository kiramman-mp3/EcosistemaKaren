import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashOffer, Product } from '../types';
import { ExpiryStamp, OldPrice, Price, ProductImage } from './ui';
import { colors, fonts, radius } from '../theme/tokens';

const LOW_STOCK = 5;

interface ProductTagProps {
  product: Product;
  inCart: number;
  onAdd: (product: Product) => void;
}

/** Producto en percha: foto arriba y fleje de precio en el borde. */
export const ProductTag: React.FC<ProductTagProps> = ({ product, inCart, onAdd }) => {
  const soldOut = product.stock <= 0;
  const maxed = inCart >= product.stock;
  return (
    <View style={styles.card}>
      <ProductImage uri={product.image} style={[styles.image, soldOut && styles.faded]} />
      <View style={styles.label}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {product.description ? <Text style={styles.desc} numberOfLines={1}>{product.description}</Text> : <View style={styles.descSpacer} />}
        <View style={styles.priceRow}>
          <Price value={product.price} size="sm" />
          <Text style={[styles.stock, (soldOut || product.stock <= LOW_STOCK) && styles.stockLow]}>
            {soldOut ? 'Agotado' : product.stock <= LOW_STOCK ? `Quedan ${product.stock}` : `${product.stock} disp.`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.add, inCart > 0 && styles.addActive, (soldOut || maxed) && styles.addDisabled]}
          onPress={() => onAdd(product)}
          disabled={soldOut || maxed}
          accessibilityRole="button"
          accessibilityLabel={soldOut ? `${product.name}, agotado` : `Agregar ${product.name} a mi lista`}
        >
          <Ionicons name={inCart > 0 ? 'checkmark' : 'add'} size={18} color={soldOut || maxed ? colors.inkFaint : colors.white} />
          <Text style={[styles.addText, (soldOut || maxed) && styles.addTextDisabled]}>
            {soldOut ? 'Agotado' : inCart > 0 ? `En tu lista (${inCart})` : 'Agregar'}
          </Text>
        </TouchableOpacity>
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

/** Oferta por vencer: etiqueta amarilla, precio rebajado y la fecha impresa. */
export const OfferTag: React.FC<OfferTagProps> = ({ offer, onReserve, busy = false, compact = false }) => (
  <View style={[styles.offer, compact && styles.offerCompact]}>
    <View>
      <ProductImage uri={offer.image} style={styles.offerImage} />
      <View style={styles.discount}><Text style={styles.discountText}>{offer.discountBadge}</Text></View>
    </View>
    <View style={styles.offerBody}>
      <Text style={styles.name} numberOfLines={2}>{offer.productName || offer.title}</Text>
      <View style={styles.offerPrice}>
        <Price value={offer.price} color={colors.karen} />
        <OldPrice value={offer.originalPrice} />
      </View>
      <View style={styles.offerMeta}>
        <ExpiryStamp date={offer.expiresOn} />
        <Text style={styles.left}>Quedan {offer.stockAvailable}</Text>
      </View>
      <TouchableOpacity
        style={[styles.reserve, busy && styles.addDisabled]}
        onPress={() => onReserve(offer)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`Reservar ${offer.productName || 'oferta'} a ${offer.price.toFixed(2)} dólares`}
      >
        <Text style={styles.reserveText}>{busy ? 'Reservando…' : 'Reservar esta oferta'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.white, borderRadius: radius.tag, borderWidth: 1, borderColor: colors.rule, overflow: 'hidden' },
  image: { aspectRatio: 1, padding: 10 },
  faded: { opacity: 0.4 },
  label: { borderTopWidth: 4, borderTopColor: colors.ink, padding: 10, flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.ink, minHeight: 38 },
  desc: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 1 },
  descSpacer: { height: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6, gap: 4 },
  stock: { fontFamily: fonts.medium, fontSize: 12, color: colors.fresh, marginBottom: 3 },
  stockLow: { color: colors.karen, fontFamily: fonts.semibold },
  add: {
    marginTop: 10, minHeight: 44, borderRadius: radius.tag, backgroundColor: colors.ink,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  addActive: { backgroundColor: colors.fresh },
  addDisabled: { backgroundColor: colors.aisle },
  addText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  addTextDisabled: { color: colors.inkFaint },
  offer: { backgroundColor: colors.white, borderRadius: radius.tag, borderWidth: 1, borderColor: colors.stickerDeep, overflow: 'hidden' },
  offerCompact: { width: 260 },
  offerImage: { height: 150, padding: 12 },
  discount: { position: 'absolute', left: 0, top: 10, backgroundColor: colors.karen, paddingHorizontal: 10, paddingVertical: 5, borderTopRightRadius: radius.tag, borderBottomRightRadius: radius.tag },
  discountText: { fontFamily: fonts.tag, fontSize: 20, color: colors.white },
  offerBody: { backgroundColor: colors.sticker, padding: 12, gap: 6 },
  offerPrice: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  offerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  left: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  reserve: { marginTop: 4, minHeight: 46, borderRadius: radius.tag, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  reserveText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
});
