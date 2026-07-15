import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius as radii } from '@/theme';

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * 6-box verification code entry. A single hidden TextInput captures input and
 * auto-advances; the active box (next empty slot) shows the cyan focus ring.
 */
export function CodeInput({ length = 6, value, onChange, autoFocus = true }: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const focus = () => inputRef.current?.focus();
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={focus} style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i] ?? '';
        const isActive = focused && i === activeIndex && value.length < length;
        return (
          <View
            key={i}
            style={[styles.box, isActive ? styles.boxActive : styles.boxIdle]}
          >
            <Text variant="h2" weight="700">
              {char}
            </Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxIdle: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  boxActive: {
    backgroundColor: colors.cardInsetDeep,
    borderWidth: 2,
    borderColor: colors.accentCyan,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
