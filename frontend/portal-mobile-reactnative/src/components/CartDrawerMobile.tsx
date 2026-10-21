import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem } from '../types';
import { Button, EmptyState, Price, ProductImage } from './ui';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { categoryTone } from '../theme/categoryTone';

interface CartDrawerMobileProps {
  visible: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onConfirmReservation: () => void;
  isSubmitting: boolean;
  isLoggedIn: boolean;
  isOnline: boolean;
}

export const CartDrawerMobile: React.FC<CartDrawerMobileProps> = ({
  visible, onClose, items, onUpdateQuantity, onConfirmReservation, isSubmitting, isLoggedIn, isOnline,
}) => {
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const savings = items.reduce((sum, item) => {
    const original = item.product.originalPrice;
    return original && original > item.product.price ? sum + (original - item.product.price) * item.quantity : sum;
  }, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Mi lista <Text style={styles.count}>({units})</Text></Text>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Cerrar mi lista">
              <Ionicons name="close" size={26} color={colors.mora} />
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <EmptyState
              illustration="basket"
              title="Tu lista está vacía"
              text="Mira qué se va hoy y agrega lo que necesites."
              action={<Button label="Seguir comprando" onPress={onClose} compact style={styles.emptyAction} />}
            />
          ) : (
            <>
              <ScrollView style={styles.list}>
                {items.map(({ product, quantity }) => (
                  <View key={product.id} style={styles.row}>
                    <ProductImage uri={product.image} size={64} tone={categoryTone(product.category)} />
                    <View style={styles.info}>
                      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
                      {product.originalPrice !== undefined && product.originalPrice > product.price ? <Text style={styles.offerNote}>Precio de oferta</Text> : null}
                      <View style={styles.rowBottom}>
                        <View style={styles.stepper}>
                          <TouchableOpacity style={styles.step} onPress={() => onUpdateQuantity(product.id, -1)} accessibilityLabel={`Quitar una unidad de ${product.name}`}>
                            <Ionicons name={quantity === 1 ? 'trash-outline' : 'remove'} size={18} color={colors.ink} />
                          </TouchableOpacity>
                          <Text style={styles.qty}>{quantity}</Text>
                          <TouchableOpacity
                            style={styles.step}
                            onPress={() => onUpdateQuantity(product.id, 1)}
                            disabled={quantity >= product.stock}
                            accessibilityLabel={`Agregar una unidad de ${product.name}`}
                          >
                            <Ionicons name="add" size={18} color={quantity >= product.stock ? colors.inkFaint : colors.ink} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.lineTotal}>${(product.price * quantity).toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footer}>
                {savings > 0 && (
                  <View style={styles.savings}>
                    <Text style={styles.savingsLabel}>Con las ofertas ahorras</Text>
                    <Text style={styles.savingsValue}>${savings.toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total a pagar en caja</Text>
                  <Price value={total} />
                </View>
                <Text style={styles.note}>
                  {isOnline
                    ? 'Al apartar, te guardamos estas unidades 10 minutos. Pagas al retirar en la Sucursal Matriz.'
                    : 'Por ahora no podemos apartar productos porque la tienda no responde.'}
                </Text>
                <Button
                  label={isLoggedIn ? 'Apartar y obtener mi código' : 'Ingresa para apartar'}
                  variant="danger"
                  loading={isSubmitting}
                  disabled={!isOnline && isLoggedIn}
                  onPress={onConfirmReservation}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42,17,72,0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.aisle, borderTopLeftRadius: radius.block, borderTopRightRadius: radius.block, borderWidth: 2, borderBottomWidth: 0, borderColor: colors.mora, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.sticker, borderBottomWidth: 2, borderBottomColor: colors.mora, paddingLeft: 20, paddingRight: 8, paddingVertical: 10 },
  title: { fontFamily: fonts.tag, fontSize: 28, color: colors.mora },
  count: { fontFamily: fonts.tagSemibold, fontSize: 20, color: colors.mora },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyAction: { marginTop: 8 },
  list: { paddingHorizontal: 16, paddingTop: 14 },
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: radius.block, borderWidth: 2, borderColor: colors.rule, padding: 10, marginBottom: 10 },
  info: { flex: 1 },
  name: { fontFamily: fonts.tag, fontSize: 15, lineHeight: 19, color: colors.ink },
  offerNote: { fontFamily: fonts.bold, fontSize: 12, color: colors.karenText },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.mora, borderRadius: radius.pill },
  step: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: fonts.tag, fontSize: 16, color: colors.ink, minWidth: 24, textAlign: 'center' },
  lineTotal: { fontFamily: fonts.tag, fontSize: 16, color: colors.ink },
  footer: { backgroundColor: colors.card, padding: 16, gap: 10, borderTopWidth: 2, borderTopColor: colors.mora },
  savings: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.freshTint, borderRadius: radius.tag, paddingHorizontal: 14, paddingVertical: 10 },
  savingsLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.fresh },
  savingsValue: { fontFamily: fonts.tag, fontSize: 20, color: colors.fresh },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.inkSoft },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
}));
