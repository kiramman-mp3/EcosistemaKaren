import React, { useState } from 'react';
import {
  ActivityIndicator, Image, StyleProp, StyleSheet, Text, TextInput, TextInputProps,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { Tone, toneTint } from '../theme/categoryTone';
import { formatDate } from '../utils/dates';
import { Illustration, IllustrationName } from './Illustration';
import { PopPressable } from './motion';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type ButtonVariant = 'primary' | 'danger' | 'outline' | 'ghost' | 'sticker';

function buttonColors(variant: ButtonVariant): { bg: string; fg: string } {
  switch (variant) {
    case 'sticker': return { bg: colors.sticker, fg: colors.mora };
    case 'outline': return { bg: colors.card, fg: colors.ink };
    case 'ghost': return { bg: colors.aisle, fg: colors.ink };
    default: return { bg: colors.karen, fg: '#FFFFFF' };
  }
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Botón en píldora con sombra dura que se hunde al presionar. */
export const Button: React.FC<ButtonProps> = ({
  label, onPress, icon, variant = 'primary', loading = false, disabled = false, compact = false, style, accessibilityLabel,
}) => {
  const palette = buttonColors(variant);
  const inactive = disabled || loading;
  return (
    <PopPressable
      onPress={onPress}
      disabled={inactive}
      backgroundColor={inactive ? colors.rule : palette.bg}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={style}
      bodyStyle={[styles.button, compact && styles.buttonCompact]}
    >
      {loading
        ? <ActivityIndicator color={palette.fg} size="small" />
        : icon ? <Ionicons name={icon} size={compact ? 17 : 20} color={inactive ? colors.inkMuted : palette.fg} /> : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: inactive ? colors.inkMuted : palette.fg }]} numberOfLines={1}>{label}</Text>
    </PopPressable>
  );
};

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

export const Field = React.forwardRef<TextInput, FieldProps>(({ label, hint, style, ...input }, ref) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput ref={ref} placeholderTextColor={colors.inkFaint} style={[styles.input, style]} accessibilityLabel={label} {...input} />
    {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
  </View>
));
Field.displayName = 'Field';

export const Notice: React.FC<{ tone: 'error' | 'success' | 'info'; text: string }> = ({ tone, text }) => {
  const palette = tone === 'error'
    ? { bg: colors.karenTint, fg: colors.karenDeep, icon: 'alert-circle' as IconName }
    : tone === 'success'
      ? { bg: colors.freshTint, fg: colors.fresh, icon: 'checkmark-circle' as IconName }
      : { bg: colors.stickerTint, fg: colors.ink, icon: 'information-circle' as IconName };
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]} accessibilityRole="alert">
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.noticeText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
};

export const Chip: React.FC<{ label: string; active: boolean; onPress: () => void; count?: number }> = ({ label, active, onPress, count }) => (
  <TouchableOpacity onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    {count !== undefined ? <Text style={[styles.chipCount, active && styles.chipTextActive]}>{count}</Text> : null}
  </TouchableOpacity>
);

const PRICE_SIZES = { sm: [24, 12], md: [34, 14], lg: [58, 22] } as const;

/** Precio de etiqueta: entero grande en Bricolage y centavos volados. */
export const Price: React.FC<{ value: number; size?: keyof typeof PRICE_SIZES; color?: string }> = ({ value, size = 'md', color }) => {
  const [whole, cents] = value.toFixed(2).split('.');
  const [big, small] = PRICE_SIZES[size];
  const tone = color ?? colors.ink;
  return (
    <View style={styles.price} accessible accessibilityLabel={`$${value.toFixed(2)}`}>
      <Text style={[styles.priceSmall, { fontSize: small + 2, color: tone }]}>$</Text>
      <Text style={[styles.priceWhole, { fontSize: big, lineHeight: big * 1.05, color: tone }]}>{whole}</Text>
      <Text style={[styles.priceSmall, styles.cents, { fontSize: small, color: tone, textDecorationColor: tone }]}>{cents}</Text>
    </View>
  );
};

export const OldPrice: React.FC<{ value: number; color?: string }> = ({ value, color }) => (
  <Text style={[styles.oldPrice, color ? { color } : null]} accessibilityLabel={`Antes $${value.toFixed(2)}`}>${value.toFixed(2)}</Text>
);

/** Fecha de vencimiento con la estética del código impreso en el empaque. */
export const ExpiryStamp: React.FC<{ date?: string | null; label?: string; color?: string }> = ({ date, label = 'Vence', color }) => (
  <View style={styles.stampRow}>
    <Text style={[styles.stampLabel, color ? { color } : null]}>{label}</Text>
    <Text style={[styles.stamp, color ? { color } : null]}>{formatDate(date)}</Text>
  </View>
);

/** Foto del producto sobre una placa blanca apoyada en el color de su pasillo. */
export const ProductImage: React.FC<{ uri: string | null; size?: number; tone?: Tone; style?: StyleProp<ViewStyle> }> = ({ uri, size, tone, style }) => {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.imageBox, tone ? { backgroundColor: toneTint(tone) } : null, size ? { width: size, height: size } : null, style]}>
      <View style={styles.imagePlate}>
        {uri && !failed
          ? <Image source={{ uri }} style={styles.image} resizeMode="contain" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
          : <Ionicons name="image-outline" size={28} color={colors.inkFaint} />}
      </View>
    </View>
  );
};

export const EmptyState: React.FC<{ icon?: IconName; illustration?: IllustrationName; title: string; text?: string; action?: React.ReactNode }> = ({ icon, illustration, title, text, action }) => (
  <View style={styles.empty}>
    {illustration
      ? <Illustration name={illustration} size={120} />
      : icon ? <Ionicons name={icon} size={40} color={colors.inkFaint} /> : null}
    <Text style={styles.emptyTitle}>{title}</Text>
    {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    {action}
  </View>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <View style={styles.sectionRow}>
    <View style={styles.flex}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
    {action}
  </View>
);

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  button: {
    minHeight: 50, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  buttonCompact: { minHeight: 44, paddingHorizontal: 14 },
  buttonText: { fontFamily: fonts.tag, fontSize: 16 },
  buttonTextCompact: { fontSize: 14 },
  field: { marginBottom: 14 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  input: {
    minHeight: 50, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.ruleStrong, backgroundColor: colors.card,
    paddingHorizontal: 18, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, width: '100%',
  },
  fieldHint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 5 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.tag, padding: 12, marginBottom: 12 },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  chip: {
    minHeight: 42, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.rule,
    backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipActive: { backgroundColor: colors.sticker, borderColor: colors.mora },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  chipTextActive: { color: colors.mora },
  chipCount: { fontFamily: fonts.tag, fontSize: 15, color: colors.inkMuted },
  price: { flexDirection: 'row', alignItems: 'flex-start' },
  priceWhole: { fontFamily: fonts.tag },
  priceSmall: { fontFamily: fonts.tag, marginTop: 3 },
  cents: { textDecorationLine: 'underline', marginLeft: 1 },
  oldPrice: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecorationLine: 'line-through' },
  stampRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  stampLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  stamp: { fontFamily: fonts.stamp, fontSize: 14, color: colors.ink, letterSpacing: 0.4 },
  imageBox: { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.photo, padding: 8 },
  imagePlate: { flex: 1, width: '100%', backgroundColor: '#FFFFFF', borderRadius: radius.tag, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontFamily: fonts.tag, fontSize: 24, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.tag, fontSize: 28, lineHeight: 30, color: colors.ink },
  sectionSubtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft, marginTop: 3 },
}));
