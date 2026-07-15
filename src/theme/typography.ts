import { Platform, TextStyle } from 'react-native';

/**
 * System font stack → San Francisco on iOS (RN default when fontFamily is
 * undefined). We keep fontFamily undefined so the platform default is used.
 */
const systemFont = Platform.select({ ios: undefined, default: undefined });

type TypeToken = TextStyle;

/**
 * Named type roles from the handoff's type scale. Reference these instead of
 * hardcoding size/weight/line-height at call sites.
 */
export const type = {
  /** Screen title */
  h1: {
    fontFamily: systemFont,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  /** Slightly larger H1 used on auth + workout detail */
  h1Large: {
    fontFamily: systemFont,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 33,
    letterSpacing: -0.5,
  },
  /** Section title */
  h2: {
    fontFamily: systemFont,
    fontSize: 22,
    fontWeight: '700',
  },
  /** Workout card title */
  cardTitleLarge: {
    fontFamily: systemFont,
    fontSize: 26,
    fontWeight: '700',
  },
  /** List / small card title */
  cardTitle: {
    fontFamily: systemFont,
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    fontFamily: systemFont,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: systemFont,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
  meta: {
    fontFamily: systemFont,
    fontSize: 13,
    fontWeight: '400',
  },
  /** Uppercase overline label */
  overline: {
    fontFamily: systemFont,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tabLabel: {
    fontFamily: systemFont,
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    fontFamily: systemFont,
    fontSize: 17,
    fontWeight: '700',
  },
} as const satisfies Record<string, TypeToken>;

export type TypeRole = keyof typeof type;
