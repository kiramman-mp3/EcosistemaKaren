import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem, DataLoadState, Product } from '../types';
import { Button, Chip, EmptyState } from '../components/ui';
import { Skeleton } from '../components/motion';
import { ProductTag } from '../components/ProductTag';
import { colors, fonts, radius, themed } from '../theme/tokens';

interface CatalogScreenProps {
  products: Product[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  state: DataLoadState;
  error?: string;
  refreshing: boolean;
  onRefresh: () => void;
}

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  products, categories, selectedCategory, onSelectCategory, cart, onAddToCart, state, error, refreshing, onRefresh,
}) => {
  const [query, setQuery] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) map.set(product.category, (map.get(product.category) || 0) + 1);
    return map;
  }, [products]);
  const aisles = categories.filter(name => name === 'Todos' || counts.has(name));

  const inCart = useMemo(() => new Map(cart.map(item => [item.product.id, item.quantity])), [cart]);

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return products
      .filter(product => (selectedCategory === 'Todos' || product.category === selectedCategory)
        && (!onlyInStock || product.stock > 0)
        && (!q || fold(product.name).includes(q) || (product.barcode || '').includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [products, selectedCategory, onlyInStock, query]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={state === 'ready' || state === 'empty' ? visible : []}
      numColumns={2}
      columnWrapperStyle={styles.columns}
      keyExtractor={product => product.id}
      initialNumToRender={8}
      windowSize={7}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} />}
      ListHeaderComponent={
        <View>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={20} color={colors.inkMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="¿Qué buscas hoy? Leche, atún, pan…"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="Buscar productos"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clear} accessibilityLabel="Borrar búsqueda">
                <Ionicons name="close" size={20} color={colors.inkMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {aisles.map(name => (
              <Chip
                key={name}
                label={name}
                count={name === 'Todos' ? products.length : counts.get(name)}
                active={selectedCategory === name}
                onPress={() => onSelectCategory(name)}
              />
            ))}
          </ScrollView>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{selectedCategory === 'Todos' ? 'Todos los productos' : selectedCategory}</Text>
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => setOnlyInStock(!onlyInStock)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: onlyInStock }}
            >
              <Ionicons name={onlyInStock ? 'checkbox' : 'square-outline'} size={20} color={colors.ink} />
              <Text style={styles.toggleText}>Con stock</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.count}>{visible.length} productos</Text>
        </View>
      }
      ListEmptyComponent={
        state === 'loading' ? <View style={styles.skeletons}>{[0, 1, 2, 3].map(i => <Skeleton key={i} style={styles.skeleton} />)}</View>
          : state === 'offline' || state === 'error'
            ? <EmptyState illustration="offline" title="No pudimos cargar los productos" text={error || 'La tienda no respondió.'} action={<Button label="Intentar de nuevo" compact onPress={onRefresh} />} />
            : <EmptyState illustration="search" title="No encontramos ese producto" text="Prueba con otra palabra o date una vuelta por todos los pasillos."
                action={<Button label="Ver todos" variant="outline" compact onPress={() => { setQuery(''); setOnlyInStock(false); onSelectCategory('Todos'); }} />} />
      }
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <ProductTag product={item} inCart={inCart.get(item.id) || 0} onAdd={onAddToCart} />
        </View>
      )}
    />
  );
};

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.aisle },
  content: { padding: 16, paddingBottom: 24 },
  columns: { gap: 10 },
  cell: { flex: 1, maxWidth: '50%', marginBottom: 10 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingLeft: 16,
    backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.mora,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8, paddingVertical: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontFamily: fonts.tag, fontSize: 30, lineHeight: 32, color: colors.ink },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  toggleText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  count: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 10 },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skeleton: { width: '48%', aspectRatio: 0.72 },
}));
