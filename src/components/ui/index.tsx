import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type TextProps as RNTextProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { radius, space, type, type TypeKey } from '@/theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeKey;
  color?: 'text' | 'secondary' | 'tertiary' | 'primary' | 'accent' | 'danger' | 'onEmphasis';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  font?: 'ui' | 'uiBold' | 'arabic' | 'arabicBold' | 'arabicAlt' | 'arabicAltBold' | 'quran' | 'quranBold';
}

export const Text = forwardRef<RNText, TextProps>(function Text(
  { variant = 'body', color = 'text', align, font, style, ...props },
  ref,
) {
  const { colors } = useTheme();
  const colorMap = {
    text: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    primary: colors.primary,
    accent: colors.accent,
    danger: colors.danger,
    onEmphasis: colors.textOnEmphasis,
  };
  const FONTS: Record<NonNullable<TextProps['font']>, string> = {
    ui: 'Inter',
    uiBold: 'Inter_700Bold',
    arabic: 'ScheherazadeNew_400Regular',
    arabicBold: 'ScheherazadeNew_700Bold',
    arabicAlt: 'ScheherazadeNew_400Regular',
    arabicAltBold: 'ScheherazadeNew_700Bold',
    quran: 'Amiri_400Regular',
    quranBold: 'Amiri_700Bold',
  };
  const fontFamily = font ? FONTS[font] : variant.startsWith('quran') ? FONTS.quran : undefined;
  return (
    <RNText
      ref={ref}
      {...props}
      style={[
        type[variant],
        { color: colorMap[color] },
        fontFamily && { fontFamily },
        align != null && { textAlign: align },
        style,
      ]}
    />
  );
});

export interface SurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'card' | 'elevated' | 'sunken' | 'primarySoft';
  onPress?: () => void;
  hairline?: boolean;
}

export function Surface({ children, style, variant = 'card', onPress, hairline = true }: SurfaceProps) {
  const { colors } = useTheme();
  const bg =
    variant === 'elevated'
      ? colors.bgElevated
      : variant === 'sunken'
        ? colors.bgSunken
        : variant === 'primarySoft'
          ? colors.primarySoft
          : colors.card;
  const content = (
    <>
      {hairline && <View style={[styles.hairline, { borderColor: colors.hairline }]} />}
      {children}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.surface,
          { backgroundColor: bg, borderRadius: radius.md },
          pressed && { opacity: 0.7 },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={[styles.surface, { backgroundColor: bg, borderRadius: radius.md }, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden', padding: space[4] },
  hairline: { position: 'absolute', top: 0, left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, icon }: ButtonProps) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles2.button,
        {
          backgroundColor: isPrimary
            ? colors.primary
            : isDanger
              ? colors.danger
              : variant === 'secondary'
                ? colors.primarySoft
                : 'transparent',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.hairlineStrong,
          borderRadius: radius.md,
        },
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? colors.textOnEmphasis : colors.primary} size="small" />
      ) : (
        <>
          {icon}
          <Text
            variant="bodySmall"
            font="uiBold"
            color={isPrimary || isDanger ? 'onEmphasis' : isDanger ? 'onEmphasis' : 'primary'}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles2 = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[5],
  },
});

export function Toggle({ value, onValueChange, disabled }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      style={[
        styles3.track,
        {
          backgroundColor: value ? colors.primary : colors.bgSunken,
          borderWidth: 1,
          borderColor: value ? colors.primary : colors.hairline,
        },
        disabled && { opacity: 0.4 },
      ]}
    >
      <View
        style={[
          styles3.thumb,
          { backgroundColor: value ? colors.textOnEmphasis : colors.textTertiary, transform: [{ translateX: value ? 20 : 0 }] },
        ]}
      />
    </Pressable>
  );
}

const styles3 = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles4.container,
        { backgroundColor: colors.bgSunken, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.md },
      ]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles4.item,
              {
                backgroundColor: active ? colors.bgElevated : 'transparent',
                borderRadius: radius.sm,
              },
              active && { borderWidth: 1, borderColor: colors.hairline },
            ]}
          >
            <Text variant="bodySmall" font={active ? 'uiBold' : 'ui'} color={active ? 'text' : 'secondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles4 = StyleSheet.create({
  container: { flexDirection: 'row', padding: 3, gap: 3 },
  item: { flex: 1, alignItems: 'center', paddingVertical: space[2], paddingHorizontal: space[2] },
});

export function ListRow({
  title,
  subtitle,
  icon,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles5.row,
        { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth * 2, borderBottomColor: colors.hairline },
        pressed && onPress && { backgroundColor: colors.bgSunken },
      ]}
    >
      {icon && <View style={styles5.icon}>{icon}</View>}
      <View style={styles5.mid}>
        <Text variant="body" font="ui">
          {title}
        </Text>
        {subtitle != null && (
          <Text variant="bodySmall" color="secondary" style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}

const styles5 = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4] },
  icon: { width: 28, alignItems: 'center' },
  mid: { flex: 1 },
});

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text variant="caption" font="uiBold" color="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 1, marginTop: space[6], marginBottom: space[2], marginHorizontal: space[4] }}>
      {children}
    </Text>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space[10], paddingHorizontal: space[7] }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.bgSunken,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space[4],
        }}
      >
        <Text variant="heading" color="tertiary">
          ◌
        </Text>
      </View>
      <Text variant="subheading" align="center">
        {title}
      </Text>
      {hint != null && (
        <Text variant="bodySmall" color="secondary" align="center" style={{ marginTop: space[1] }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space[10], gap: space[3] }}>
      <ActivityIndicator color={colors.primary} />
      {label != null && (
        <Text variant="bodySmall" color="secondary">
          {label}
        </Text>
      )}
    </View>
  );
}
