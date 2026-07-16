# Cadence

Operation Cadence — a personal running-coach app (Runna-style replacement) that
generates AI walk/run training plans, syncs them to a COROS watch, and adapts to
the runner's data. **React Native (Expo), iOS / iPhone only. Tokyo Night, dark.**

This repo implements the **full app** from
[`design_handoff_full_app/`](./design_handoff_full_app) — all 30 frames across
ten screen groups, built on a small reusable foundation (theme tokens + base
components) rather than one-off screens.

## Getting started

```bash
npm install
npx expo start        # then press `i` for the iOS simulator, or scan in Expo Go
```

Requires the iOS toolchain (Xcode / simulator) to run natively.

## Screens & states

| Group | States implemented |
| --- | --- |
| **Onboarding** | Step 1 (About you) · Step 2 (Background) · Step 3 (Goal) · Generating |
| **Login / Auth** | Login · Login error (inline invalid credentials) · 2-step verification |
| **Today** | Planned · Paused · Completed · Empty · Error |
| **Workout Detail** | Default · Skip bottom sheet · In-progress live session |
| **Plan / Calendar** | Week view · Multi-week · Reschedule (long-press drag) · Paused |
| **Insights** | Dashboard (5 metrics + shoe) · Building (locked/early) |
| **Activities** | List · Detail (stats + splits) · Empty |
| **Post-Workout Feedback** | Prompt (sheet) · Saved |
| **Missed-session check-in** | Prompt · Adjusted |
| **Settings** | Main (toggle/slider/rows) · Pause-plan sheet |

Most alternate states are reachable through the real flow; the rest via a small
`__DEV__` affordance so every design can be previewed on device:

- **Today**: a floating pill cycles planned → paused → completed → empty → error.
  "Resume plan" / "Retry sync" / the pause sheet drive the same transitions for real.
- **Plan**: week chips + "All weeks"; **long-press a session and drag** it to
  another day to reschedule; pause via the header pill → paused state.
- **Insights** / **Activities**: a `__DEV__` pill toggles dashboard⇄building and
  list⇄empty.
- **Feedback** opens from Today·Completed → "How did it feel?"; the **check-in**
  opens from the Today header bell (coach notification).

## Navigation

File-based routing with **Expo Router**:

```
app/
  _layout.tsx            Root stack + providers + Tokyo Night nav theme
  index.tsx              → redirects to /login
  login/                 Login + 2FA (verify)
  onboarding/            Steps 1–3 (stack)
  generating.tsx         Loading state → auto-advances to Today
  (tabs)/                Today · Plan · Activities · Insights · Settings
  workout/               Workout Detail (+ skip sheet) · live (in-progress)
  activity/[id].tsx      Activity detail (pushed)
  feedback.tsx           Post-workout feedback (transparent modal)
  checkin.tsx            Missed-session check-in (modal)
```

Flow: **Login → (2FA) → Today**, and **Create account / Create your plan →
Onboarding → Generating → Today**. From Today, the workout card opens **Workout
Detail**; "Start workout" opens the **live session**; the tab bar switches
between Today / Plan / Activities / Insights / Settings.

## Foundation

Everything references centralized tokens — no hardcoded hex/px in screens.

- **`src/theme/`** — Tokyo Night `colors`, `type` scale, `spacing` / `radius` /
  `shadows`. Accent rules baked in: cyan = primary actions, green = workouts &
  progress, gold = paused/achievements, red = destructive/errors.
- **`src/components/`** — base primitives: `Text`, `Screen`, `Button`, `Card`,
  `Chip`, `SegmentedControl`, `TextField` / `ValueField` / `SelectRow`,
  `CodeInput`, `ProgressRing`, `SegmentedProgress`, `BottomSheet`, `Toggle`,
  `Slider`, `StatTile`, `GradientTile`, plus a curated `icons` set
  (lucide-react-native + hand-drawn SVG glyphs: run/walk figures, brand mark,
  filled check disc, shoe, grip dots).
- **`src/features/`** — screen-specific composition: onboarding chrome; Today
  header/cards/blocks; workout steps/action row/skip sheet; plan day-row /
  multi-week; insights metric cards; activity row; the shared tab header and
  pause-plan sheet.
- **`src/state/`** — a lightweight React Context store modeling `onboarding`,
  `auth`, `plan`, `settings`, `insights`, `activities`, and the derived Today
  view, per the handoff's state spec.

## Implementation notes

- **Safe areas** via `react-native-safe-area-context` (status bar + home
  indicator). The Today screen paints its own elevated header into the notch.
- **Gradients & rings** use `expo-linear-gradient` and `react-native-svg`
  (progress ring, accent rails, repeat-block strip, brand mark).
- **Bottom sheet** is a self-contained `Modal` + `Animated` primitive (backdrop
  fade + slide-up). It's isolated behind `src/components/BottomSheet.tsx`, so it
  can be swapped for `@gorhom/bottom-sheet` without touching call sites. Skip,
  pause-plan, and feedback all reuse it.
- **Plan reschedule** is a long-press drag built on `PanResponder` + `Animated`
  (lift, drop-zone, snap-to-day). Swap for `react-native-reanimated` +
  `react-native-gesture-handler` if the app later standardizes on them.
- **Icons** are placeholders drawn to match the mocks; swap for the final icon
  set / brand mark when available.
- Data (today's Walk-Run session, week strip, results) is seeded in
  `src/state/data.ts` — wire to the plan-generation / weather / COROS sources in
  a real build; all of it is surfaced natively (never via redirect).
