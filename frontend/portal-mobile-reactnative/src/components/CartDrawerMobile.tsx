import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { CartItem } from '../types';

interface CartDrawerMobileProps {
  visible: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onConfirmReservation: () => void;
}

export const CartDrawerMobile: React.FC<CartDrawerMobileProps> = ({
  visible,
  onClose,
  items,
  onUpdateQuantity,
  onConfirmReservation,
}) => {
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Mi Lista de Compra</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.itemList}>
            {items.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Tu lista está vacía</Text>
                <Text style={styles.emptySub}>Añade productos para reservar stock.</Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.product.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    <Text style={styles.itemPrice}>${item.product.price.toFixed(2)} c/u</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onUpdateQuantity(item.product.id, -1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onUpdateQuantity(item.product.id, 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {items.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total en caja:</Text>
                <Text style={styles.totalVal}>${total.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={onConfirmReservation}
              >
                <Text style={styles.confirmBtnText}>
                  Confirmar Reserva con PIN →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D3557',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  itemList: {
    maxHeight: 280,
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1D3557',
  },
  qtyText: {
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D3557',
  },
  confirmBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
});
