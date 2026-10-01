import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { Product, ProductCategory } from '../types';
import { PRODUCTS_CATALOG } from '../data/mockData';

interface ProductCatalogMobileProps {
  selectedCategory: ProductCategory;
  onSelectCategory: (cat: ProductCategory) => void;
  onAddToCart: (prod: Product) => void;
  onOpenCart: () => void;
  cartCount: number;
  products?: Product[];
  categories?: ProductCategory[];
  loading?: boolean;
}

const DEFAULT_CATEGORY_PILLS: ProductCategory[] = [
  'Todos',
  'Carnes',
  'Lácteos',
  'Frutas',
  'Panadería',
  'Verduras',
  'Conservas',
];

export const ProductCatalogMobile: React.FC<ProductCatalogMobileProps> = ({
  selectedCategory,
  onSelectCategory,
  onAddToCart,
  onOpenCart,
  cartCount,
  products = PRODUCTS_CATALOG,
  categories = DEFAULT_CATEGORY_PILLS,
  loading = false,
}) => {
  const [search, setSearch] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORY_PILLS;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);


  const handleAdd = (prod: Product) => {
    onAddToCart(prod);
    setJustAddedId(prod.id);
    setTimeout(() => setJustAddedId(null), 1200);
  };

  return (
    <View style={styles.container}>
      {/* Header: 'Catálogo de Productos' (9 disp.) + input búsqueda + botón carrito azul */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Catálogo de Productos</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filtered.length} disp.</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar productos..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <TouchableOpacity style={styles.cartBlueBtn} onPress={onOpenCart}>
            <Text style={styles.cartBlueBtnIcon}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.cartBlueBadge}>
                <Text style={styles.cartBlueBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros Píldora Horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        {activeCategories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onSelectCategory(cat)}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid de Productos */}
      <View style={styles.grid}>
        {filtered.map((item) => {
          const isAdded = justAddedId === item.id;
          return (
            <View key={item.id} style={styles.productCard}>
              {/* Imagen con categoría gris */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.grayBadge}>
                  <Text style={styles.grayBadgeText}>
                    {item.badge || item.category}
                  </Text>
                </View>
              </View>

              {/* Título de producto */}
              <Text style={styles.productTitle} numberOfLines={2}>
                {item.name}
              </Text>

              {/* Precio en azul bold ($X.XX) y stock con punto verde */}
              <View style={styles.priceStockRow}>
                <Text style={styles.priceBold}>${item.price.toFixed(2)}</Text>
                <View style={styles.stockGreen}>
                  <View style={styles.greenDot} />
                  <Text style={styles.stockText}>{item.stock} un.</Text>
                </View>
              </View>

              {/* Botón CTA Full-width '+ Añadir a lista' */}
              <TouchableOpacity
                style={[styles.ctaBtn, isAdded && styles.ctaBtnAdded]}
                onPress={() => handleAdd(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.ctaBtnText, isAdded && styles.ctaBtnTextAdded]}>
                  {isAdded ? '✓ ¡Añadido!' : '+ Añadir a lista'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D3557',
  },
  countBadge: {
    backgroundColor: 'rgba(29, 53, 87, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#1D3557',
    fontSize: 11,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  cartBlueBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1D3557',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBlueBtnIcon: {
    fontSize: 16,
  },
  cartBlueBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBlueBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  pillsScroll: {
    paddingHorizontal: 16,
    gap: 6,
    paddingVertical: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#1D3557',
    borderColor: '#1D3557',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrapper: {
    position: 'relative',
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  grayBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  grayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceBold: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D3557',
  },
  stockGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  stockText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  ctaBtn: {
    backgroundColor: 'rgba(29, 53, 87, 0.08)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaBtnAdded: {
    backgroundColor: '#059669',
  },
  ctaBtnText: {
    color: '#1D3557',
    fontWeight: '800',
    fontSize: 13,
  },
  ctaBtnTextAdded: {
    color: '#FFFFFF',
  },
});
