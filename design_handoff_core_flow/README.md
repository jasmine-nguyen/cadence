# Handoff: Operation Cadence — Core Flow (4 screens)

## Overview
Operation Cadence is a personal running-coach app (a Runna-style replacement) that generates AI walk/run training plans for a beginner returning to running, syncs them to a COROS watch, and adapts to the runner's data. Target platform: **React Native (Expo), iOS, iPhone only.**

This bundle covers the first four screens of the connected flow:
1. **Onboarding & Goal Setup** (3 steps + generating state)
2. **Login / Sign-up** (+ 2-step verification)
3. **Today** (planned state + paused state)
4. **Workout Detail** (+ skip bottom sheet)

## About the Design Files
The files in this bundle (`Cadence Screens.dc.html`) are **design references authored in HTML** — prototypes that show the intended look, layout, copy, and behavior. They are **not production code to copy directly.** HTML/CSS is only the medium used to render the mockups.

Your task is to **recreate these designs as React Native (Expo) components** using the project's established patterns, component library, theme tokens, and navigation. Where the target repo already defines a component, color token, type scale, or spacing unit, **reuse it** rather than hardcoding the values below — the hex/px values here are the source of truth only where the repo has no equivalent yet.

> The linked repo (`jasmine-nguyen/cadence`) was empty at design time. If it still has no theme/components when you implement, create a small foundation first (theme tokens + base Button, Card, Chip, SegmentedControl, TextField, BottomSheet) from the Design Tokens section, then build the screens on top.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions. Recreate the UI pixel-faithfully using the codebase's libraries. The HTML files are the authoritative reference — open them alongside this README to inspect exact values, and use the PNGs in `screenshots/` as the visual target.

## Design Language
- **Theme:** Tokyo Night, dark only.
- **Accent usage (important):** **cyan `#2ac3de` is the primary action color** (primary buttons, active tab, selected states, progress ring, links). **green `#9ece6a` signals workouts & progress** (run segments, completion dots, progress bars). Purple is deliberately *not* used as an accent. Gold `#e0af68` is reserved for the paused state and achievement/benchmark accents. Red `#f7768e` is destructive only (skip, errors).
- **Tone:** calm, beginner-friendly. No walls of charts or jargon.
- **Never redirect the user out of the app** — Intervals.icu / COROS data is surfaced natively inside these screens.

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| `bg` | `#1a1b26` | screen background |
| `bgElevated` | `#1f2130` | header bar, bottom tab bar, bottom sheet |
| `card` | `#2b2c3f` | cards, list rows |
| `cardInset` | `#24263a` | inputs, inset panels |
| `cardInsetDeep` | `#191a26` | nested panels (e.g. "why today" box) |
| `stroke` | `#33354a` | borders, dividers, unfilled progress track |
| `text` | `#c0caf5` | primary text |
| `textSecondary` | `#a9b1d6` | secondary text |
| `textMuted` | `#565f89` | tertiary/labels, disabled |
| `accentCyan` | `#2ac3de` | **primary actions**, active tab, selection, ring, links |
| `accentGreen` | `#9ece6a` | workout/run segments, progress, completion |
| `gold` | `#e0af68` | paused state, achievements |
| `red` | `#f7768e` | destructive (skip), errors |
| `onAccent` | `#1a1b26` | text/icons on cyan/green/gold/red fills |

### Typography
System font stack (`-apple-system, system-ui, "SF Pro Text"`) → on RN use **San Francisco (system default)**.
| Role | Size / Weight / Line-height |
|---|---|
| Screen title (H1) | 28–30 / 700 / 1.1–1.15 |
| Section title (H2) | 22–24 / 700 |
| Card title | 26 / 700 (workout), 16–20 / 600–700 (list) |
| Body | 15 / 400 / 1.5 |
| Secondary/meta | 13–14 / 400 |
| Overline label | 12 / 600 / letter-spacing 0.4–1.2px / uppercase |
| Tab label | 11 / 600 (700 active) |
| Button label | 16–17 / 700 |

### Spacing / Radius / Shadow
- Screen horizontal padding: **20–26px** (26 for form screens, 20 for Today/Detail).
- Card radius: **16–22px**; inputs/list rows **13–14px**; chips **20px (pill)**; primary CTA pill **38px**; icon circles **50%**.
- Vertical rhythm between blocks: **14–16px**; between form fields **14–20px**.
- Primary CTA glow: `0 10px 28px rgba(42,195,222,.32)`.
- Bottom sheet shadow: `0 -20px 60px rgba(0,0,0,.5)`.
- Device: designed at **390 × 844** (iPhone 14/15 logical points). Home-indicator bar 135×5, radius 3.

## Screens / Views

### 1 · Onboarding & Goal Setup
Purpose: capture profile → running background → goal, then generate the plan. Beyond the Runna baseline — your design judgment applied.

**Shared chrome:** back chevron (top-left) + a **3-segment progress bar** (filled segments = `accentCyan`, unfilled = `stroke`); overline "STEP n OF 3" in `textMuted`; H1 title; body subtitle; a fixed **Continue** primary CTA pinned to the bottom (full-width, cyan pill radius 16, label `onAccent`), home indicator beneath.

- **Step 1 — About you.** Fields: Age (single value row, unit suffix in muted), Weight + Height (two-up row), Sex as a **segmented control** (Female / Male / Rather not) — container `cardInsetDeep` with `stroke`, selected pill filled `accentCyan` with `onAccent` label. Copy subtitle: "This helps tune your paces. Everything here is optional." All fields optional.
- **Step 2 — Your running background.** (a) "Where are you right now?" single-select list of 3 rows; selected row = `1.5px accentCyan` border + `rgba(42,195,222,.1)` fill + filled cyan check disc. (b) "Runs per week recently" — 4 equal chips (0 / 1 / 2 / 3+), selected filled cyan. (c) "Any injuries to work around?" — wrapping multi-select pill chips (None / Knee / Shin / Ankle / Hip); selected "None" filled **green** `#9ece6a`.
- **Step 3 — Your goal.** Single-select **goal cards** (icon tile + title + subtitle): "Run 5K continuously" (selected: cyan border+fill, icon tile filled cyan), "Build a running habit", "Run 10K". Below: two-up row — "Target date · optional" and "Days / week" as tappable value fields. CTA label becomes **"Build my plan"**.
- **Generating (loading state).** Full-screen centered: 120px spinning ring (`accentCyan` arc on `cardInset` track, `animation: spin 2.2s linear infinite`) with a static green lightning glyph centered. H1 "Building your plan", subtitle. Then a vertical checklist that fills top-to-bottom: completed items = green filled check + full-color label; the in-progress item = cyan ring outline + `cadpulse` opacity animation (1.4s); pending items = muted ring at 0.4 opacity. Items: "Analysing your running background" ✓, "Setting easy paces for you" ✓, "Scheduling around your 4 days" (active), "Syncing to your COROS watch" (pending). On completion, navigate to **Today**.

### 2 · Login / Sign-up
Purpose: simple email auth; social + 2FA exist but stay low-emphasis.

- **Login.** Centered app mark: 66px rounded-square (radius 19) with a `linear-gradient(150deg, #2ac3de, #9ece6a)` fill and a dark line-chart/mountain glyph. Wordmark "Cadence" (30/700, -0.5px tracking) + tagline. Fields: Email, Password (with eye toggle). "Forgot password?" right-aligned link in cyan. Primary **Continue** (cyan pill). Divider "or". Two **low-emphasis** outline buttons side by side: Apple, Google (`stroke` border, `textSecondary` label — intentionally quiet). Footer: "New here? **Create account**" (cyan) pinned near bottom.
- **2-step verification.** Back chevron; 60px rounded lock tile (`cardInset`, cyan icon); H1 "Verify it's you"; subtitle with the email in `text` weight 600. **6 code boxes** (46×56, radius 12): filled digits show value; the active box = `cardInsetDeep` + `2px accentCyan` border; empty = `cardInset` + `stroke`. "Resend code in 0:24" (countdown, muted). Fixed **Verify** CTA at bottom.

### 3 · Today
Purpose: the daily home — today's workout, the *why*, weather, quick progress. Maps to the Runna baseline; the **"why today" briefing is new**.

**Header (`bgElevated`, rounded bottom corners 24):** left icons profile + bell; centered a small progress ring (cyan arc) + "Week 1/4 ▾"; right a calendar-grid icon (colored dots use cyan/green/gold). Below: a **7-day week strip** (Mon–Sun) — weekday overline, date number, and a status dot under scheduled days (green = done/scheduled, cyan = today). Today (Wed 15) = filled `text` disc with `bg` number.

**Body:**
- Section header "Today's workout" + weather (cloud glyph + "13°").
- **Workout card** (`card`, radius 20) with a **left accent rail** — a vertical gradient from `accentGreen` fading down (7px wide). Title "Walk-Run" (26/700), meta "Wednesday 15 Jul · 2km", a top-right empty completion checkbox (30px, `stroke` border, radius 8). Inside, the **"WHY TODAY"** panel (`cardInsetDeep`, radius 14): cyan bulb icon + cyan overline + body copy explaining the session's purpose (e.g. "Second session back — short and easy on purpose. Keep the runs conversational so your legs adapt before we add distance."). Below it a "View full workout" row → navigates to Workout Detail.
- **Week overview card** (`card`): title + chevron, a 4-segment progress bar (first segment green, rest `stroke`), and "Workouts 1/4 · Distance 3/11 km".
- **Start workout** — floating cyan CTA pill (radius 38, glow) above the tab bar.
- **Bottom tab bar** (`bgElevated`, top border `stroke`, 5 tabs): **Today** (active, cyan), Plan, Activities, Insights, Settings.

- **Paused state.** Header shows a gold ⏸ + "Paused"; week strip dimmed (opacity ~0.45), today ring becomes a muted outline. Body leads with a **paused banner**: `rgba(224,175,104,.12)` fill, `rgba(224,175,104,.35)` border, gold pause icon, "Your plan is paused", explanatory copy ("No workouts scheduled while you're paused… resume any time and we'll pick up where you left off, shifting the remaining weeks forward."), and a **Resume plan** CTA (cyan). Below: a dimmed "Where you left off" summary (Week 1 of 4 · Workouts 1/4 · Streak 2 days) and a calm empty-illustration note ("Rest is part of training. We'll be here when you're ready."). No "Start workout" CTA in this state.

### 4 · Workout Detail
Purpose: the structured session — warm-up, run/walk repeats, cool-down — with a skip action. Maps to the Runna baseline.

- **Header:** a subtle top gradient band (`linear-gradient(160deg,#1e3a44,#22402f,#1a1b26)` — muted cyan→green→bg, ~210px). Back chevron + "Week 1"; share icon top-right. Below: overline "15 JUL 2026 · WED" (date muted, weekday cyan), H1 "Walk-Run" (30/700), meta "Walk-Run · 2km · ~24 min".
- **Weather/readiness card** (`card`): cyan cloud tile + "13° & cloudy at 6pm · good to go" + "0% rain — no need to reschedule". (This replaces Runna's "Checking the weather forecast" placeholder with resolved, native weather.)
- **Action row:** 4 circular icon actions — WARM-UP STRETCHES, ADD ROUTE, LINK ACTIVITY, and **SKIP WORKOUT** (this one uses `red` icon + `rgba(247,118,142,.4)` ring and red label). Labels 10/600 uppercase, two lines.
- **Description** (section title with doc icon), then structured step blocks (`card`, radius 14):
  - **Warm-Up** block (header strip `stroke`): step "1 · 5 min walking warm-up · WALK".
  - **Repeat ×2** block (header strip `linear-gradient(90deg,#9ece6a,#2ac3de)` with dark text + repeat icon): step 2 contains the repeated intervals — "250m conversational · RUN" (green), "60s walking · WALK" (muted), "750m conversational · RUN" (green), "90s walking · WALK" (muted). RUN rows use green run-figure icon + green label; WALK rows use muted walk-figure icon + muted label.
  - **Cool-down** row (slightly dimmed): "3 · 5 min walking cool-down · WALK".
- **Footer:** **Start workout** cyan CTA pill + a circular music button (`card`).
- **Skip bottom sheet.** Screen dims/blurs behind. Sheet (`bgElevated`, top radius 26, grab handle) rises from bottom: red arrow tile, H2 "Skip this workout?", copy ("It'll be marked as skipped. Your coach adapts the rest of the week — no need to make it up."), a single-select **reason list** (Not feeling up to it / Too busy today [selected: cyan border+fill+check] / Injury / not recovered), a destructive **Skip workout** CTA (`red` fill, `onAccent` text), and a "Keep it" text button to dismiss. The selected reason feeds the plan-adjustment logic.

## Interactions & Behavior
- **Onboarding:** Continue advances step 1→2→3; back chevron returns. Selections are tap-to-select (single-select for ability/goal/frequency; multi-select for injuries). "Build my plan" → Generating screen → auto-advances to Today when the (simulated/real) plan generation resolves.
- **Generating:** purely a loading state; ring spins continuously, checklist items advance as each backend step resolves. No user input.
- **Login:** Continue validates email/password → either Today (trusted device) or 2FA. Social buttons trigger native Apple/Google auth. 2FA: auto-advance focus across the 6 boxes; Verify enabled once 6 digits entered; resend disabled until countdown hits 0.
- **Today:** tapping the workout card or "View full workout" → Workout Detail. Start workout → live workout session (out of scope here). Tab bar switches root tabs. Paused: "Resume plan" restores the active plan and re-populates the schedule.
- **Workout Detail:** Skip action opens the bottom sheet (slide-up + backdrop fade). Confirm → marks skipped, dismisses, returns to Today with the session shown as skipped. "Keep it" dismisses with no change. Start workout → live session.

## States (build all of these)
All states below are **designed and included** in this bundle.
- **Onboarding:** default per step 1/2/3; **loading** (Generating). (Validation is soft — all fields optional.)
- **Login:** default; **error** (invalid credentials — inline field error in `red`, shown); 2FA verify (shown). *Loading (Continue → spinner) follows the standard button-spinner pattern.*
- **Today:** **planned**, **paused**, **completed** (results + feedback prompt), **empty** (no active plan), **error** (COROS sync failed, cached workout kept) — all shown.
- **Workout Detail:** default, **skip sheet**, **in-progress** (live run/walk session with interval ring, live metrics, pause/stop) — all shown.

### New-state notes
- **Today · Completed:** workout card flips to a green rail + filled green check, "COMPLETED" chip, and result stats (distance / time / avg pace). A cyan "NICE WORK" briefing card offers **How did it feel?** (→ Post-Workout Feedback) and **Summary**. Week overview advances to 2/4.
- **Today · Empty:** simplified header (no week strip), centered calendar-plus glyph, "No plan yet", **Create your plan** CTA (→ Onboarding).
- **Today · Error:** red-tinted sync banner with **Retry sync**; the workout card stays visible but dimmed with "Briefing unavailable offline" — never blocks the user.
- **Login · Error:** password field gets a `#f7768e` border + inline "Incorrect email or password. Try again." message; layout otherwise identical to default login.
- **Workout · In-progress:** live session — status row ("Interval 3 / 7"), current-phase label ("RUN · CONVERSATIONAL"), large green interval-progress ring with countdown, live Distance / Pace / Heart rate, a "Next: …" strip, and a control cluster (music · gold **pause** · red **stop**).

## State Management
- `onboarding`: `{ step, profile{age,weight,height,sex}, background{ability,frequency,longestRun,injuries[]}, goal{type,targetDate,daysPerWeek}, generating:boolean }`
- `auth`: `{ email, session, needs2fa:boolean, code[6], resendCountdown, error }`
- `plan`: `{ weeks[], currentWeek, status:'active'|'paused', pausedAt, progress{workoutsDone,workoutsTotal,distanceDone,distanceTotal,streak} }`
- `today`: derived from `plan` → today's `workout` + `briefing(why)` + `weather`
- `workoutDetail`: `{ steps[], skipSheetOpen:boolean, skipReason }`
- Data sources: plan generation (AI), weather (for planned time), COROS/Intervals.icu metrics — all surfaced in-app, never via redirect.

## Assets
- **Icons:** all icons in the mocks are inline SVG line/solid glyphs drawn to match the layout — replace with the repo's icon set (e.g. `lucide-react-native` / SF Symbols). Notable glyphs: profile, bell, calendar-grid, cloud (weather), bulb (why), run-figure, walk-figure, repeat, lightning (goal/brand), lock (2FA), pause, share, music, skip-arrow, gear.
- **App mark:** cyan→green gradient rounded square with a mountain/line glyph (placeholder — swap for final brand mark).
- **No external image assets** are required; there are no photographs in these screens.

## Files
- `Cadence Screens.dc.html` — all four screens (**15 frames**) on one canvas. **This is the authoritative visual reference.** Open in a browser to inspect exact values; each frame is a `.phone` element (390×844) tagged with `data-screen-label`. Frame order: Onboarding Step 1, Step 2, Step 3, Generating, Login, Login·2FA, Login·Error, Today·Planned, Today·Paused, Today·Completed, Today·Empty, Today·Error, Workout Detail, Workout Detail·Skip, Workout Detail·In-progress.
- `support.js` — runtime for the HTML prototype only; **not needed** for the RN implementation.
- `screenshots/` — rendered PNG targets:
  - `01-onboarding-steps-1-2.png`
  - `02-onboarding-step3-and-generating.png`
  - `03-login-2fa-error.png`
  - `04-today-planned-and-paused.png`
  - `05-today-completed-empty-error.png`
  - `06-workout-detail-and-skip.png`
  - `07-workout-in-progress.png`

## Implementation Notes
- Build as **React Native (Expo), iPhone only** — no web/tablet layouts.
- Use the repo's navigation (e.g. Expo Router / React Navigation): onboarding stack → auth → main tab navigator (Today / Plan / Activities / Insights / Settings).
- Centralize the color/type/spacing tokens above into the repo's theme module; reference tokens, don't hardcode.
- The skip sheet should use the repo's bottom-sheet primitive (e.g. `@gorhom/bottom-sheet`) with a backdrop.
- Respect safe areas (status bar, home indicator) with `react-native-safe-area-context`.
