/**
 * Icon set for Cadence.
 *
 * Most glyphs come from `lucide-react-native` (re-exported below so screens
 * import a single, curated set). A few figures in the mocks — the run/walk
 * runners, the brand mark — don't have a faithful lucide equivalent, so they
 * are hand-drawn with `react-native-svg` to match the handoff paths.
 */
import React from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '@/theme';

// --- Curated lucide re-exports -------------------------------------------------
export {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Bell,
  Cloud,
  Lightbulb,
  Zap,
  Lock,
  Pause,
  Play,
  Share,
  Check,
  Circle,
  CircleCheck,
  RefreshCw,
  Repeat,
  Eye,
  EyeOff,
  Sun,
  ClipboardList,
  BarChart3,
  Settings,
  AlignLeft,
  FileText,
  Square,
  CalendarPlus2 as CalendarPlus,
  CalendarRange,
  AlertTriangle,
  ArrowRight,
  Music2,
  MapPin,
  Map,
  Link2,
  PersonStanding,
  Clock,
  Activity,
  Moon,
  Flame,
  Trophy,
  MessageCircle,
  Smile,
  Meh,
  Frown,
  X,
  Plus,
  ListFilter,
  Ruler,
} from 'lucide-react-native';

type GlyphProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** Running shoe glyph (shoe mileage, settings). */
export function Shoe({ size = 22, color = colors.accentCyan, strokeWidth = 1.7 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 16l1-3 6-2 3-3 3 1 1 3 5 1v3H2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path d="M9 11l2 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** 6-dot drag handle. */
export function GripDots({ size = 16, color = colors.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={9} cy={6} r={1.4} />
      <Circle cx={15} cy={6} r={1.4} />
      <Circle cx={9} cy={12} r={1.4} />
      <Circle cx={15} cy={12} r={1.4} />
      <Circle cx={9} cy={18} r={1.4} />
      <Circle cx={15} cy={18} r={1.4} />
    </Svg>
  );
}

/** Filled completion disc — solid circle with a dark check (matches mocks). */
export function CheckDisc({ size = 22, color = colors.accentGreen }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={color} />
      <Path
        d="M8 12l3 3 5-6"
        fill="none"
        stroke={colors.onAccent}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Running figure — green run segments. */
export function RunFigure({ size = 20, color = colors.accentGreen, strokeWidth = 1.8 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={13} cy={4} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M11 8l-2 4 3 2-2 6M11 8l4 2 3-1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Walking figure — muted walk segments. */
export function WalkFigure({ size = 20, color = colors.textSecondary, strokeWidth = 1.8 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={13} cy={4.5} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M11 9l-3 3 2 3-1 5M11 9l4 1 2 3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Warm-up stretch figure. */
export function StretchFigure({ size = 20, color = colors.textSecondary, strokeWidth = 1.7 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={13} cy={4.5} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M11 9l-3 3 2 3-1 5M11 9l4 1 2 3M8 12l-3 1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Monochrome Apple mark (kept quiet — social auth is low-emphasis). */
export function AppleGlyph({ size = 17, color = colors.textSecondary }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.2 5.7c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.7-1.3z" />
    </Svg>
  );
}

/** Monochrome Google mark (kept quiet). */
export function GoogleGlyph({ size = 17, color = colors.textSecondary }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
        fill={color}
      />
      <Path
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6C4.7 19.8 8.1 22 12 22z"
        fill={color}
        opacity={0.75}
      />
    </Svg>
  );
}

/**
 * Cadence brand mark — cyan→green gradient rounded square with a line-chart /
 * mountain glyph. Placeholder until a final brand asset lands.
 */
export function BrandMark({ size = 66 }: { size?: number }) {
  // Draw in a 66×66 canvas; the 24-space glyph is scaled to ~38px and centered.
  const scale = 38 / 24;
  const offset = (66 - 38) / 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 66 66">
      <Defs>
        <LinearGradient id="brand" x1="0.1" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor={colors.accentCyan} />
          <Stop offset="1" stopColor={colors.accentGreen} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={66} height={66} rx={19} fill="url(#brand)" />
      <Path
        d="M4 17l4-8 3 5 3-7 3 6h3"
        transform={`translate(${offset}, ${offset}) scale(${scale})`}
        stroke={colors.onAccent}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
