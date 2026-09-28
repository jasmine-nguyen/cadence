import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { colors, type as typeScale, TypeRole } from '@/theme';

type ColorName = keyof typeof colors;

/**
 * Smallest line height (as a multiple of font size) that fits a glyph's full
 * ascent + descent. San Francisco's natural line height is ~1.19×; anything
 * tighter clips the tops of digits and capitals on iOS.
 */
const MIN_LINE_HEIGHT_RATIO = 1.2;

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
 *
 * A variant's lineHeight is tuned for its own fontSize, so when a caller
 * overrides fontSize (e.g. a 30pt stat on the default `body` role) the line
 * height is raised to fit — otherwise the glyphs get cut off.
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
  const base = typeScale[variant] as TextStyle;
  const { fontSize, lineHeight } = StyleSheet.flatten([base, style]) ?? {};
  const fitLineHeight =
    fontSize != null && lineHeight != null && lineHeight < fontSize * MIN_LINE_HEIGHT_RATIO
      ? { lineHeight: Math.ceil(fontSize * MIN_LINE_HEIGHT_RATIO) }
      : null;
  return (
    <RNText
      style={[
        base,
        { color: resolvedColor },
        weight ? { fontWeight: weight } : null,
        center ? styles.center : null,
        style,
        fitLineHeight,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
