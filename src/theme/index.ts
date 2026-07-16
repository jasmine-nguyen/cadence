export { colors, alpha } from './colors';
export type { ColorToken } from './colors';
export { type } from './typography';
export type { TypeRole } from './typography';
export { spacing, screenPadding, radius, homeIndicator, shadows } from './layout';

import { colors, alpha } from './colors';
import { type } from './typography';
import { spacing, screenPadding, radius, homeIndicator, shadows } from './layout';

/** Single theme object for convenience where a namespace is preferred. */
export const theme = {
  colors,
  alpha,
  type,
  spacing,
  screenPadding,
  radius,
  homeIndicator,
  shadows,
} as const;
