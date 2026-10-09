import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DataLoadState, Product, ProductCategory } from '../types';

interface CategoriesGridMobileProps {
  onSelectCategory: (category: ProductCategory) => void;
  categories: ProductCategory[];
  products: Product[];
  state: DataLoadState;
}

export const CategoriesGridMobile: React.FC<CategoriesGridMobileProps> = ({
  onSelectCategory,
  categories,
  products,
  state,
}) => {
  const visibleCategories = categories.filter((category) => category !== 'Todos');
  const icons = ['🥩', '🥦', '🥖', '🥛', '🥤', '🛒'];
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.tag}>FRESCURA DIARIA</Text>
        <Text style={styles.title}>Explora por categoría</Text>
      </View>

      {/* Grid 6 categorías */}
      {state === 'loading' && <Text style={styles.message}>Cargando categorías...</Text>}
      {state === 'offline' && <Text style={styles.message}>Sin conexión. Las categorías no están disponibles.</Text>}
      {state === 'error' && <Text style={styles.message}>No fue posible cargar las categorías.</Text>}
      {state === 'empty' && <Text style={styles.message}>Aún no hay categorías ni productos publicados.</Text>}
      <View style={styles.grid}>
        {state === 'ready' && visibleCategories.map((category, index) => (
          <TouchableOpacity
            key={category}
            style={styles.card}
            onPress={() => onSelectCategory(category)}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{icons[index % icons.length]}</Text>
            </View>
            <Text style={styles.name}>{category}</Text>
            <Text style={styles.count}>{products.filter((product) => product.category === category).length} prods.</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  message: {
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 18,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    marginBottom: 12,
  },
  tag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D3557',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D3557',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 22,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D3557',
    textAlign: 'center',
  },
  count: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
});
