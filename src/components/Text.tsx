import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, type as typeScale, TypeRole } from '@/theme';

type ColorName = keyof typeof colors;

export interface TextProps extends RNTextProps {
  /** Named role from the type scale (defaults to `body`). */
  variant?: TypeRole;
  /** Named color token (defaults to `text`). */
  color?: ColorName | (string & {});
  weight?: '400' | '500' | '600' | '700';
  center?: boolean;
}

/**
 * Theme-aware Text. Screens reference type roles + color tokens rather than
 * hardcoding font/size/color, keeping the Tokyo Night scale in one place.
 */
export function Text({
  variant = 'body',
  color = 'text',
  weight,
  center,
  style,
  ...rest
}: TextProps) {
  const resolvedColor = (colors as Record<string, string>)[color] ?? color;
  return (
    <RNText
      style={[
        typeScale[variant] as object,
        { color: resolvedColor },
        weight ? { fontWeight: weight } : null,
        center ? styles.center : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
