import React from 'react';
import {
  ActivityIndicator, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme/tokens';
import { formatDate } from '../utils/dates';

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

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.ink, fg: colors.white, border: colors.ink },
  danger: { bg: colors.karen, fg: colors.white, border: colors.karen },
  outline: { bg: colors.white, fg: colors.ink, border: colors.ink },
  ghost: { bg: colors.aisle, fg: colors.ink, border: colors.aisle },
  sticker: { bg: colors.sticker, fg: colors.ink, border: colors.sticker },
};

export const Button: React.FC<ButtonProps> = ({
  label, onPress, icon, variant = 'primary', loading = false, disabled = false, compact = false, style, accessibilityLabel,
}) => {
  const palette = BUTTON_COLORS[variant];
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border },
        inactive && styles.buttonDisabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={palette.fg} size="small" />
        : icon ? <Ionicons name={icon} size={compact ? 17 : 20} color={palette.fg} /> : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
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
    {hint ? <Text style={[styles.fieldHint, invalid && { color: colors.karenDeep }]}>{hint}</Text> : null}
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
    {`${label} `}
    <Text style={[styles.stamp, style]}>{formatDate(date)}</Text>
  </Text>
);

/** Días restantes en tipografía de fleje: el dato que decide qué se mueve primero. */
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

export const EmptyState: React.FC<{ icon: IconName; title: string; text?: string; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <View style={styles.empty}>
    <Ionicons name={icon} size={40} color={colors.inkFaint} />
    <Text style={styles.emptyTitle}>{title}</Text>
    {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    {action}
  </View>
);

export const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  titleText: { flex: 1 },
  title: { fontFamily: fonts.tag, fontSize: 30, lineHeight: 32, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 4 },

  button: {
    minHeight: 52, borderRadius: radius.tag, borderWidth: 2, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  buttonCompact: { minHeight: 44, paddingHorizontal: 12 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 16 },
  buttonTextCompact: { fontSize: 14 },

  field: { marginBottom: 14, minWidth: 0 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, minWidth: 0, width: '100%', minHeight: 50, borderRadius: radius.tag, borderWidth: 1.5, borderColor: colors.ruleStrong,
    backgroundColor: colors.white, paddingHorizontal: 12, fontFamily: fonts.medium, fontSize: 16, color: colors.ink,
  },
  inputInvalid: { borderColor: colors.karen },
  fieldHint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 5 },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.tag, padding: 12, marginBottom: 12 },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },

  chip: {
    minHeight: 40, paddingHorizontal: 12, borderRadius: radius.tag, borderWidth: 1.5, borderColor: colors.rule,
    backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  chipTextActive: { color: colors.white },
  chipCount: { fontFamily: fonts.tag, fontSize: 15, color: colors.inkMuted },

  stampLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  stamp: { fontFamily: fonts.stamp, fontSize: 15, color: colors.ink, letterSpacing: 0.5 },

  days: { alignItems: 'center', minWidth: 64 },
  daysNumber: { fontFamily: fonts.tag, fontSize: 44, lineHeight: 46 },
  daysToday: { fontFamily: fonts.tag, fontSize: 30, lineHeight: 46 },
  daysCaption: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted, marginTop: -4 },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontFamily: fonts.tag, fontSize: 22, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft, textAlign: 'center' },
});
