import React from 'react';
import {
  ActivityIndicator, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, themed } from '../theme/tokens';
import { formatDate } from '../utils/dates';
import { Illustration, IllustrationName } from './Illustration';
import { PopIn, PopPressable, tap } from './motion';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const ScreenTitle: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <View style={styles.titleRow}>
    <View style={styles.titleText}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>
);

type ButtonVariant = 'primary' | 'danger' | 'outline' | 'ghost' | 'sticker';

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

function buttonColors(variant: ButtonVariant): { bg: string; fg: string } {
  switch (variant) {
    case 'sticker': return { bg: colors.sticker, fg: colors.mora };
    case 'outline': return { bg: colors.card, fg: colors.ink };
    case 'ghost': return { bg: colors.aisle, fg: colors.ink };
    default: return { bg: colors.karen, fg: '#FFFFFF' };
  }
}

/** Botón en píldora con sombra dura; mantiene 52 px de alto para usarlo con guantes. */
export const Button: React.FC<ButtonProps> = ({
  label, onPress, icon, variant = 'primary', loading = false, disabled = false, compact = false, style, accessibilityLabel,
}) => {
  const palette = buttonColors(variant);
  const inactive = disabled || loading;
  const fg = inactive ? colors.inkMuted : palette.fg;
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
        ? <ActivityIndicator color={fg} size="small" />
        : icon ? <Ionicons name={icon} size={compact ? 17 : 20} color={fg} /> : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </PopPressable>
  );
};

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  right?: React.ReactNode;
  invalid?: boolean;
}

export const Field = React.forwardRef<TextInput, FieldProps>(({ label, hint, right, invalid, style, ...input }, ref) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.inkFaint}
        style={[styles.input, invalid && styles.inputInvalid, style]}
        accessibilityLabel={label}
        {...input}
      />
      {right}
    </View>
    {hint ? <Text style={[styles.fieldHint, invalid && { color: colors.karenText }]}>{hint}</Text> : null}
  </View>
));
Field.displayName = 'Field';

export const Notice: React.FC<{ tone: 'error' | 'success' | 'info'; text: string }> = ({ tone, text }) => {
  React.useEffect(() => { if (tone === 'success') tap('success'); }, [tone, text]);
  const palette = tone === 'error'
    ? { bg: colors.karenTint, fg: colors.karenDeep, icon: 'alert-circle' as IconName }
    : tone === 'success'
      ? { bg: colors.freshTint, fg: colors.fresh, icon: 'checkmark-circle' as IconName }
      : { bg: colors.stickerTint, fg: colors.ink, icon: 'information-circle' as IconName };
  const body = (
    <View style={[styles.notice, { backgroundColor: palette.bg }]} accessibilityRole="alert">
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.noticeText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
  return tone === 'success' ? <PopIn>{body}</PopIn> : body;
};

export const Chip: React.FC<{ label: string; active: boolean; onPress: () => void; count?: number; accent?: string }> = ({
  label, active, onPress, count, accent,
}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    style={[styles.chip, active && styles.chipActive]}
  >
    {accent ? <View style={[styles.chipDot, { backgroundColor: accent }]} /> : null}
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    {count !== undefined ? <Text style={[styles.chipCount, active && styles.chipTextActive]}>{count}</Text> : null}
  </TouchableOpacity>
);

/** Fecha de vencimiento con la estética del código impreso en el empaque. */
export const ExpiryStamp: React.FC<{ date?: string | null; label?: string; style?: StyleProp<TextStyle> }> = ({ date, label = 'Vence', style }) => (
  <Text style={styles.stampLabel}>
    {`${label} `}
    <Text style={[styles.stamp, style]}>{formatDate(date)}</Text>
  </Text>
);

/** Días restantes en tipografía de etiqueta: el dato que decide qué se mueve primero. */
export const DaysCounter: React.FC<{ days: number; color: string }> = ({ days, color }) => {
  const text = days < 0 ? `${Math.abs(days)}` : `${days}`;
  const caption = days < 0 ? (Math.abs(days) === 1 ? 'día vencido' : 'días vencido') : days === 0 ? 'vence hoy' : days === 1 ? 'día' : 'días';
  return (
    <View style={styles.days} accessibilityLabel={days === 0 ? 'Vence hoy' : `${text} ${caption}`}>
      {days === 0
        ? <Text style={[styles.daysToday, { color }]}>Hoy</Text>
        : <Text style={[styles.daysNumber, { color }]}>{text}</Text>}
      {days !== 0 && <Text style={styles.daysCaption}>{caption}</Text>}
    </View>
  );
};

export const EmptyState: React.FC<{ icon?: IconName; illustration?: IllustrationName; title: string; text?: string; action?: React.ReactNode }> = ({ icon, illustration, title, text, action }) => (
  <View style={styles.empty}>
    {illustration
      ? <Illustration name={illustration} size={110} />
      : icon ? <Ionicons name={icon} size={40} color={colors.inkFaint} /> : null}
    <Text style={styles.emptyTitle}>{title}</Text>
    {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    {action}
  </View>
);

export const styles = themed(() => StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  titleText: { flex: 1 },
  title: { fontFamily: fonts.tag, fontSize: 32, lineHeight: 34, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft, marginTop: 4 },

  button: {
    minHeight: 52, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  buttonCompact: { minHeight: 46, paddingHorizontal: 14 },
  buttonText: { fontFamily: fonts.tag, fontSize: 16 },
  buttonTextCompact: { fontSize: 14 },

  field: { marginBottom: 14, minWidth: 0 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, minWidth: 0, width: '100%', minHeight: 52, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.ruleStrong,
    backgroundColor: colors.card, paddingHorizontal: 18, fontFamily: fonts.medium, fontSize: 16, color: colors.ink,
  },
  inputInvalid: { borderColor: colors.karen },
  fieldHint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 5 },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.tag, padding: 12, marginBottom: 12 },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },

  chip: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.rule,
    backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipActive: { backgroundColor: colors.sticker, borderColor: colors.mora },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  chipTextActive: { color: colors.mora },
  chipCount: { fontFamily: fonts.tag, fontSize: 15, color: colors.inkMuted },

  stampLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  stamp: { fontFamily: fonts.stamp, fontSize: 15, color: colors.ink, letterSpacing: 0.5 },

  days: { alignItems: 'center', minWidth: 64 },
  daysNumber: { fontFamily: fonts.tag, fontSize: 44, lineHeight: 46 },
  daysToday: { fontFamily: fonts.tag, fontSize: 30, lineHeight: 46 },
  daysCaption: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted, marginTop: -4 },

  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontFamily: fonts.tag, fontSize: 24, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft, textAlign: 'center' },
}));
