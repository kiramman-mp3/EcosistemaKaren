import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DaysCounter, ExpiryStamp } from './ui';
import { colors, fonts, levelColors, radius } from '../theme/tokens';

interface LotLabelProps {
  productName: string;
  lotNumber: string;
  expiresOn: string;
  days: number;
  level: string;
  location: 'BODEGA' | 'PERCHA';
  available: number;
  reserved?: number;
  received?: number;
  children?: React.ReactNode;
}

/** Etiqueta de lote: banda del nivel FEFO, días restantes y fecha impresa. */
export const LotLabel: React.FC<LotLabelProps> = ({
  productName, lotNumber, expiresOn, days, level, location, available, reserved = 0, received, children,
}) => {
  const palette = levelColors(level);
  const counterColor = level === 'AMARILLO' ? colors.ink : palette.band;
  return (
    <View style={styles.card} accessible={false}>
      <View style={[styles.band, { backgroundColor: palette.band }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <DaysCounter days={days} color={counterColor} />
          <View style={styles.info}>
            <Text style={styles.product} numberOfLines={2}>{productName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.lot} numberOfLines={1}>Lote {lotNumber}</Text>
              <View style={[styles.location, location === 'PERCHA' ? styles.locationShelf : styles.locationStore]}>
                <Ionicons name={location === 'PERCHA' ? 'storefront-outline' : 'cube-outline'} size={13} color={colors.ink} />
                <Text style={styles.locationText}>{location === 'PERCHA' ? 'Percha' : 'Bodega'}</Text>
              </View>
            </View>
            <ExpiryStamp date={expiresOn} />
          </View>
        </View>

        <View style={styles.stock}>
          <Stock label="Libre" value={available} strong />
          <Stock label="Apartado web" value={reserved} />
          {received !== undefined && <Stock label="Ingresó" value={received} />}
          <View style={[styles.levelTag, { backgroundColor: palette.tint }]}>
            <Text style={[styles.levelText, { color: palette.text }]}>{palette.label}</Text>
          </View>
        </View>

        {children ? <View style={styles.actions}>{children}</View> : null}
      </View>
    </View>
  );
};

const Stock: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.stockItem}>
    <Text style={[styles.stockValue, strong && styles.stockValueStrong]}>{value}</Text>
    <Text style={styles.stockLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.tag,
    borderWidth: 1, borderColor: colors.rule, overflow: 'hidden', marginBottom: 10,
  },
  band: { width: 8 },
  body: { flex: 1, padding: 12 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  info: { flex: 1, gap: 4, minWidth: 0 },
  product: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  lot: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkMuted, flexShrink: 1 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.tag, paddingHorizontal: 6, paddingVertical: 2 },
  locationStore: { backgroundColor: colors.aisle },
  locationShelf: { backgroundColor: colors.freshTint },
  locationText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  stock: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.rule,
  },
  stockItem: { alignItems: 'flex-start' },
  stockValue: { fontFamily: fonts.tag, fontSize: 20, lineHeight: 22, color: colors.inkSoft },
  stockValueStrong: { color: colors.ink },
  stockLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted },
  levelTag: { marginLeft: 'auto', borderRadius: radius.tag, paddingHorizontal: 8, paddingVertical: 4 },
  levelText: { fontFamily: fonts.bold, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
