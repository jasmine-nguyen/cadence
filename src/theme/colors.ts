/**
 * Tokyo Night palette — dark only.
 *
 * Accent usage (from the design handoff):
 *  - cyan   → primary actions, active tab, selection, progress ring, links
 *  - green  → workouts & progress (run segments, completion, progress bars)
 *  - gold   → paused state, achievements / benchmarks
 *  - red    → destructive (skip) + errors
 * Purple is deliberately NOT used as an accent.
 */
export const colors = {
  bg: '#1a1b26',
  bgElevated: '#1f2130',
  card: '#2b2c3f',
  cardInset: '#24263a',
  cardInsetDeep: '#191a26',
  stroke: '#33354a',

  text: '#c0caf5',
  textSecondary: '#a9b1d6',
  textMuted: '#565f89',

  accentCyan: '#2ac3de',
  accentGreen: '#9ece6a',
  gold: '#e0af68',
  red: '#f7768e',

  /** text/icon color on top of cyan/green/gold/red fills */
  onAccent: '#1a1b26',
} as const;

/** Translucent accent fills used for selected states, tinted banners, glows. */
export const alpha = {
  cyanFill: 'rgba(42,195,222,0.1)',
  cyanTile: 'rgba(42,195,222,0.15)',
  greenFill: 'rgba(158,206,106,0.15)',
  goldBanner: 'rgba(224,175,104,0.12)',
  goldBorder: 'rgba(224,175,104,0.35)',
  redBanner: 'rgba(247,118,142,0.1)',
  redBorder: 'rgba(247,118,142,0.35)',
  redTile: 'rgba(247,118,142,0.15)',
  redRing: 'rgba(247,118,142,0.4)',
  greenGlow: 'rgba(158,206,106,0.2)',
} as const;

export type ColorToken = keyof typeof colors;
