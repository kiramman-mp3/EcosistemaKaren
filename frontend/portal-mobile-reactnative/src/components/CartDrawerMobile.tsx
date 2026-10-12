import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem } from '../types';
import { Button, EmptyState, Price, ProductImage } from './ui';
import { colors, fonts, radius } from '../theme/tokens';

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Mi lista <Text style={styles.count}>({units})</Text></Text>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Cerrar mi lista">
              <Ionicons name="close" size={26} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <EmptyState
              icon="basket-outline"
              title="Tu lista está vacía"
              text="Agrega productos desde los pasillos y reserva todo de una vez."
              action={<Button label="Seguir comprando" onPress={onClose} compact style={styles.emptyAction} />}
            />
          ) : (
            <>
              <ScrollView style={styles.list}>
                {items.map(({ product, quantity }) => (
                  <View key={product.id} style={styles.row}>
                    <ProductImage uri={product.image} size={56} style={styles.thumb} />
                    <View style={styles.info}>
                      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
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
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total a pagar en caja</Text>
                  <Price value={total} />
                </View>
                <Text style={styles.note}>
                  {isOnline
                    ? 'Al reservar te apartamos estas unidades por 10 minutos. Pagas al retirar en la Sucursal Matriz.'
                    : 'La tienda no responde: las reservas están en pausa por ahora.'}
                </Text>
                <Button
                  label={isLoggedIn ? 'Reservar y obtener código' : 'Ingresa para reservar'}
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(19,40,75,0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.aisle, borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, paddingLeft: 20, paddingRight: 8, paddingVertical: 8 },
  title: { fontFamily: fonts.tag, fontSize: 26, color: colors.ink },
  count: { fontFamily: fonts.tagSemibold, fontSize: 20, color: colors.inkMuted },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyAction: { marginTop: 8 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: radius.tag, borderWidth: 1, borderColor: colors.rule, padding: 10, marginBottom: 8 },
  thumb: { borderRadius: radius.tag },
  info: { flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.ink },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.ruleStrong, borderRadius: radius.tag },
  step: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, minWidth: 24, textAlign: 'center' },
  lineTotal: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  footer: { backgroundColor: colors.white, padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.rule },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkSoft },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
});
