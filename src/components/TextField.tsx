import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Text } from './Text';
import { Eye, EyeOff, CheckDisc, AlertTriangle } from './icons';
import { colors, radius as radii } from '@/theme';

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <View style={styles.labelRow}>
      <Text variant="meta" weight="500" color="textSecondary">
        {label}
      </Text>
      {optional ? (
        <Text variant="meta" weight="500" color="textMuted">
          {'  ·  optional'}
        </Text>
      ) : null}
    </View>
  );
}

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  optional?: boolean;
  error?: string;
  /** Enables password entry + an eye toggle. */
  secure?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Editable input field with label, error, and optional password eye toggle. */
export function TextField({
  label,
  optional,
  error,
  secure = false,
  style,
  ...inputProps
}: TextFieldProps) {
  const [hidden, setHidden] = useState(secure);
  const hasError = !!error;

  return (
    <View style={style}>
      {label ? <FieldLabel label={label} optional={optional} /> : null}
      <View style={[styles.inputBox, hasError && styles.inputBoxError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            {hidden ? (
              <Eye size={20} color={colors.textMuted} strokeWidth={1.8} />
            ) : (
              <EyeOff size={20} color={colors.textMuted} strokeWidth={1.8} />
            )}
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <View style={styles.errorRow}>
          <AlertTriangle size={15} color={colors.red} strokeWidth={2} />
          <Text variant="meta" weight="500" color="red">
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface ValueFieldProps {
  label?: string;
  optional?: boolean;
  value: string;
  /** Trailing muted unit (e.g. "years", "kg"). */
  suffix?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Read-only value row (Age, Target date, Days/week). Displays a value with an
 * optional muted unit suffix; tappable to open a picker in a real build.
 */
export function ValueField({ label, optional, value, suffix, onPress, style }: ValueFieldProps) {
  return (
    <View style={style}>
      {label ? <FieldLabel label={label} optional={optional} /> : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.inputBox, pressed && onPress ? styles.pressed : null]}
      >
        <Text variant="cardTitle" weight="600">
          {value}
        </Text>
        {suffix ? (
          <Text variant="bodySmall" color="textMuted">
            {suffix}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

/**
 * Single-select list row (onboarding "where are you right now?", skip reasons).
 * Selected → cyan border + translucent cyan fill + filled check disc.
 */
export function SelectRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectRow,
        selected ? styles.selectRowSelected : styles.selectRowIdle,
        pressed && styles.pressed,
      ]}
    >
      <Text variant="body" weight={selected ? '600' : '500'} color={selected ? 'text' : 'textSecondary'}>
        {label}
      </Text>
      {selected ? (
        <CheckDisc size={20} color={colors.accentCyan} />
      ) : (
        <View style={styles.emptyDisc} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputBox: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.input,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputBoxError: {
    borderColor: colors.red,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    padding: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
  },
  selectRow: {
    borderRadius: radii.input,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectRowIdle: {
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  selectRowSelected: {
    borderWidth: 1.5,
    borderColor: colors.accentCyan,
    backgroundColor: 'rgba(42,195,222,0.1)',
  },
  emptyDisc: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  pressed: { opacity: 0.85 },
});
