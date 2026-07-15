# Cadence

Operation Cadence — a personal running-coach app (Runna-style replacement) that
generates AI walk/run training plans, syncs them to a COROS watch, and adapts to
the runner's data. **React Native (Expo), iOS / iPhone only. Tokyo Night, dark.**

This repo implements the **core connected flow** from
[`design_handoff_core_flow/`](./design_handoff_core_flow) — 15 frames across four
screen groups, built on a small reusable foundation (theme tokens + base
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

The five **Today** states and the workout states are all reachable in-app:

- **Paused** ⇄ **Planned** via the "Resume plan" / pause flow.
- **Error** → **Planned** via "Retry sync".
- In development, a small floating pill on the Today screen (behind `__DEV__`)
  cycles through all five Today states so every design can be previewed on device.

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
```

Flow: **Login → (2FA) → Today**, and **Create account / Create your plan →
Onboarding → Generating → Today**. From Today, the workout card opens **Workout
Detail**; "Start workout" opens the **live session**.

## Foundation

Everything references centralized tokens — no hardcoded hex/px in screens.

- **`src/theme/`** — Tokyo Night `colors`, `type` scale, `spacing` / `radius` /
  `shadows`. Accent rules baked in: cyan = primary actions, green = workouts &
  progress, gold = paused/achievements, red = destructive/errors.
- **`src/components/`** — base primitives: `Text`, `Screen`, `Button`, `Card`,
  `Chip`, `SegmentedControl`, `TextField` / `ValueField` / `SelectRow`,
  `CodeInput`, `ProgressRing`, `SegmentedProgress`, `BottomSheet`, plus a curated
  `icons` set (lucide-react-native + a few hand-drawn SVG glyphs: run/walk
  figures, brand mark, filled check disc).
- **`src/features/`** — screen-specific composition (onboarding chrome, Today
  header/cards/blocks, workout steps/action row/skip sheet).
- **`src/state/`** — a lightweight React Context store modeling `onboarding`,
  `auth`, `plan`, and the derived Today view, per the handoff's state spec.

## Implementation notes

- **Safe areas** via `react-native-safe-area-context` (status bar + home
  indicator). The Today screen paints its own elevated header into the notch.
- **Gradients & rings** use `expo-linear-gradient` and `react-native-svg`
  (progress ring, accent rails, repeat-block strip, brand mark).
- **Bottom sheet** is a self-contained `Modal` + `Animated` primitive (backdrop
  fade + slide-up). It's isolated behind `src/components/BottomSheet.tsx`, so it
  can be swapped for `@gorhom/bottom-sheet` without touching call sites.
- **Icons** are placeholders drawn to match the mocks; swap for the final icon
  set / brand mark when available.
- Data (today's Walk-Run session, week strip, results) is seeded in
  `src/state/data.ts` — wire to the plan-generation / weather / COROS sources in
  a real build; all of it is surfaced natively (never via redirect).
