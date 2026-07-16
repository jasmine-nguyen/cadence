/** Spacing scale (4px base) + screen padding + radii from the handoff. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

/** Screen horizontal padding: 26 for form screens, 20 for Today / Detail. */
export const screenPadding = {
  form: 26,
  content: 20,
} as const;

export const radius = {
  input: 14,
  listRow: 13,
  card: 16,
  cardLarge: 20,
  cardXL: 22,
  pill: 20,
  cta: 16,
  ctaFloating: 38,
  sheet: 26,
  chip: 20,
  full: 999,
} as const;

/** Home-indicator bar (135×5, radius 3). */
export const homeIndicator = {
  width: 135,
  height: 5,
  radius: 3,
} as const;

export const shadows = {
  /** Primary cyan CTA glow. */
  ctaGlow: {
    shadowColor: '#2ac3de',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: '#e0af68',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
} as const;
