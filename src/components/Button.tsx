import React from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Text } from './Text';
import { colors, radius as radii, shadows, type as typeScale } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'destructive';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Left-hand icon element (already colored/sized by the caller). */
  icon?: React.ReactNode;
  /** Floating CTA — pill radius 38 + cyan glow. */
  floating?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

const fills: Record<Variant, { bg?: string; border?: string; label: string }> = {
  primary: { bg: colors.accentCyan, label: colors.onAccent },
  secondary: { bg: colors.cardInset, label: colors.text },
  outline: { border: colors.stroke, label: colors.textSecondary },
  destructive: { bg: colors.red, label: colors.onAccent },
};

/** Primary CTA + its quieter siblings. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  floating = false,
  full = true,
  style,
}: ButtonProps) {
  const scheme = fills[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: scheme.bg ?? 'transparent',
          borderColor: scheme.border ?? 'transparent',
          borderWidth: scheme.border ? 1 : 0,
          borderRadius: floating ? radii.ctaFloating : radii.cta,
        },
        full && styles.full,
        floating && variant === 'primary' && shadows.ctaGlow,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={scheme.label} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[typeScale.button, { color: scheme.label }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 17,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
