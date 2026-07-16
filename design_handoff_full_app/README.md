# Handoff: Operation Cadence — Full App (all screens)

## Overview
Operation Cadence is a personal running-coach app (a Runna-style replacement) that generates AI walk/run training plans for a beginner returning to running, syncs them to a COROS watch, and adapts to the runner's data. Target platform: **React Native (Expo), iOS, iPhone only.**

This bundle is the **complete app** — the four core-flow screens plus the six that complete it:

**Core flow**
1. **Onboarding & Goal Setup** (3 steps + generating)
2. **Login / Sign-up** (+ 2FA + error)
3. **Today** (planned / paused / completed / empty / error)
4. **Workout Detail** (+ skip sheet + in-progress)

**Completes the app**
5. **Plan / Calendar** (week view / multi-week / reschedule / paused)
6. **Insights Dashboard** (5 metrics + shoe mileage / building)
7. **Activity History** (list / detail / empty)
8. **Post-Workout Feedback** (prompt / saved)
9. **Missed-session check-in** (prompt / adjusted)
10. **Settings** (main / pause-plan sheet)

**30 frames total** on one canvas (`Cadence Screens.dc.html`).

## Build Checklist (update as you go)
Claude Code: tick a box (`[x]`) when a screen is implemented and matches its screenshot; commit this file with each change so progress is tracked in git. A screen is "done" only when every listed state is built. Add a PR link or commit SHA in the Notes column if useful.

| # | Screen | States | Status | Notes |
|---|---|---|---|---|
| — | **Foundation** (theme tokens, Button, Card, Chip, SegmentedControl, TextField, Toggle, Slider, BottomSheet, TabBar) | — | [x] | `src/theme` + `src/components` |
| — | **Navigation** (onboarding stack → auth → tab navigator; modals) | — | [x] | Expo Router in `app/` |
| 1 | Onboarding & Goal Setup | step 1 · step 2 · step 3 · generating | [x] | PR #2 |
| 2 | Login / Sign-up | login · 2FA · error | [x] | PR #2 |
| 3 | Today | planned · paused · completed · empty · error | [x] | PR #2 |
| 4 | Workout Detail | default · skip sheet · in-progress | [x] | PR #2 |
| 5 | Plan / Calendar | week view · multi-week · reschedule · paused | [x] | PR #2 · long-press drag |
| 6 | Insights Dashboard | dashboard · building | [x] | PR #2 |
| 7 | Activity History | list · detail · empty | [x] | PR #2 |
| 8 | Post-Workout Feedback | prompt · saved | [x] | PR #2 · from Today·Completed |
| 9 | Missed-session check-in | prompt · adjusted | [x] | PR #2 · from Today bell |
| 10 | Settings | main · pause sheet | [x] | PR #2 |

## About the Design Files
`Cadence Screens.dc.html` is a **design reference authored in HTML** — a prototype showing intended look, layout, copy, and behavior. It is **not production code to copy directly.** HTML/CSS is only the rendering medium.

Recreate these as **React Native (Expo) components** using the project's patterns, component library, theme tokens, and navigation. Where the repo already defines a component, token, type scale, or spacing unit, **reuse it** rather than hardcoding the values below — the hex/px values here are the source of truth only where the repo has no equivalent yet.

> The linked repo (`jasmine-nguyen/cadence`) was empty at design time. If it still has no theme/components when you implement, build a small foundation first (theme tokens + base Button, Card, Chip, SegmentedControl, TextField, Toggle, Slider, BottomSheet, TabBar) from the Design Tokens section, then build the screens on top.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions. Recreate the UI pixel-faithfully using the codebase's libraries. The HTML file is the authoritative reference — open it (pan/zoom) to inspect exact values; use the PNGs in `screenshots/` as the visual target.

## Design Language
- **Theme:** Tokyo Night, dark only.
- **Accent usage (important):** **cyan `#2ac3de` is the primary action color** (primary buttons, active tab, selected states, progress ring, links). **green `#9ece6a` signals workouts & progress** (run segments, completion, progress bars, positive deltas). Purple is deliberately *not* used as an accent. Gold `#e0af68` is reserved for the paused state, goal week, and achievements/benchmarks. Red `#f7768e` is destructive only (skip, errors, sign out).
- **Tone:** calm, beginner-friendly. No walls of charts or jargon. Coach voice is warm and non-judgmental ("Life happens — let's regroup").
- **Never redirect the user out of the app** — Intervals.icu / COROS data is surfaced natively inside these screens.

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| `bg` | `#1a1b26` | screen background |
| `bgElevated` | `#1f2130` | header bar, bottom tab bar, bottom sheet |
| `card` | `#2b2c3f` | cards, list rows |
| `cardInset` | `#24263a` | inputs, inset panels, icon tiles |
| `cardInsetDeep` | `#191a26` | nested panels (e.g. "why today") |
| `stroke` | `#33354a` | borders, dividers, unfilled tracks |
| `text` | `#c0caf5` | primary text |
| `textSecondary` | `#a9b1d6` | secondary text |
| `textMuted` | `#565f89` | tertiary/labels, disabled, rest days |
| `accentCyan` | `#2ac3de` | **primary actions**, active tab, selection, ring, links |
| `accentGreen` | `#9ece6a` | workout/run segments, progress, completion, positive delta |
| `gold` | `#e0af68` | paused, goal week, achievements, pause CTA |
| `red` | `#f7768e` | destructive (skip), errors, sign out |
| `onAccent` | `#1a1b26` | text/icons on cyan/green/gold/red fills |

Tints in use: `rgba(42,195,222,.1)` cyan-selected fill, `.08`/`.3` borders; `rgba(158,206,106,.15)` green tile fill; `rgba(224,175,104,.12)` fill + `.35` border for paused banner; `rgba(247,118,142,.1)` fill + `.35` border for error banner.

### Typography
System font stack (`-apple-system, system-ui, "SF Pro Text"`) → on RN use **San Francisco (system default)**.
| Role | Size / Weight / Line-height |
|---|---|
| Screen title (H1) | 28–30 / 700 / 1.1–1.15 |
| Header/nav title | 20–24 / 700 |
| Section title (H2) | 22–23 / 700 |
| Card title | 26 / 700 (workout), 15–19 / 600–700 (list/card) |
| Big stat number | 18–30 / 700 |
| Body | 15 / 400 / 1.5 |
| Secondary/meta | 12–14 / 400 |
| Overline label | 11–12 / 600–700 / letter-spacing 0.4–1.2px / uppercase |
| Tab label | 11 / 600 (700 active) |
| Button label | 16–17 / 700 |

### Spacing / Radius / Shadow
- Screen horizontal padding: **20px** (Today/Plan/Insights/Activities/Detail), **26px** (form/onboarding/check-in).
- Card radius: **16–22px**; inputs/list rows **13–14px**; chips **20px pill**; primary CTA pill **38px** (in-flow) or **15–16px** (bottom-pinned/sheet); icon circles **50%**; icon tiles **9–14px**.
- Vertical rhythm between blocks: **12–20px**.
- Header bar: `bgElevated`, bottom corners radius **24**.
- Bottom tab bar: `bgElevated`, top border `stroke`, padding `11px 14px 28px` (last 28 = home-indicator safe area), 5 tabs.
- Primary CTA glow: `0 10px 28px rgba(42,195,222,.32)`.
- Bottom sheet: top radius **26**, grab handle 40×5 radius 3, shadow `0 -20px 60px rgba(0,0,0,.5)`, backdrop = screen dimmed to ~0.5 + 1px blur.
- Device: designed at **390 × 844** (iPhone 14/15 logical points). Home indicator 135×5, radius 3.

### Bottom tab bar (shared)
5 tabs, left→right: **Today** (sun/target glyph), **Plan** (clipboard), **Activities** (bar chart), **Insights** (lines), **Settings** (gear). Active = `accentCyan` icon + label weight 700; inactive = `textMuted` weight 600. Each screen shows its own tab active. Onboarding, Login, Workout Detail, and modal/sheet screens have **no** tab bar.

## Screens / Views

### 1 · Onboarding & Goal Setup
Capture profile → running background → goal, then generate the plan.
**Shared chrome:** back chevron + 3-segment progress bar (filled = `accentCyan`, unfilled = `stroke`); overline "STEP n OF 3" (`textMuted`); H1; subtitle; fixed full-width **Continue** cyan CTA at bottom; home indicator.
- **Step 1 — About you.** Age (value row + unit suffix), Weight + Height (two-up), Sex as **segmented control** (Female / Male / Rather not) in a `cardInsetDeep` container, selected pill cyan. All optional.
- **Step 2 — Running background.** (a) "Where are you right now?" single-select list of 3 (selected = 1.5px cyan border + cyan tint + cyan check disc). (b) "Runs per week recently" — 4 chips (0/1/2/3+), selected cyan. (c) "Injuries" — wrapping multi-select pills; selected "None" filled **green**.
- **Step 3 — Your goal.** Single-select goal cards ("Run 5K continuously" selected, "Build a running habit", "Run 10K"). Two-up "Target date · optional" + "Days / week". CTA → **"Build my plan"**.
- **Generating (loading).** 120px spinning cyan ring on `cardInset` track (`spin 2.2s linear infinite`) + static green lightning glyph. H1 "Building your plan". Vertical checklist filling top-to-bottom: done = green check; active = cyan ring + `cadpulse 1.4s`; pending = muted ring @0.4. → navigates to **Today**.

### 2 · Login / Sign-up
- **Login.** App mark: 66px rounded-square (radius 19) `linear-gradient(150deg,#2ac3de,#9ece6a)` + dark mountain glyph. Wordmark "Cadence" + tagline. Email + Password (eye toggle). "Forgot password?" cyan link. **Continue** cyan CTA. Divider "or". Two **low-emphasis** outline buttons (Apple, Google — `stroke` border, `textSecondary`). Footer "New here? **Create account**".
- **2FA.** Back chevron; 60px lock tile; H1 "Verify it's you"; email in weight 600. **6 code boxes** (46×56, radius 12) — filled show value, active = `cardInsetDeep` + 2px cyan border, empty = `cardInset` + stroke. "Resend code in 0:24". Fixed **Verify** CTA.
- **Error.** Password field gets `#f7768e` border + inline "Incorrect email or password. Try again."; layout otherwise identical.

### 3 · Today
Daily home — today's workout, the *why*, weather, quick progress. **"Why today" briefing is new.**
**Header** (`bgElevated`, rounded bottom 24): profile + bell icons; centered progress ring (cyan arc) + "Week 1/4 ▾"; calendar-grid icon. Below: **7-day week strip** (Mon–Sun) with status dots (green done/scheduled, cyan today); today = filled `text` disc.
**Body:** "Today's workout" + weather (cloud + "13°"); **workout card** (`card`, radius 20) with **green left accent rail** (7px, gradient fading down), title "Walk-Run", meta, top-right empty checkbox, **"WHY TODAY"** panel (`cardInsetDeep`, cyan bulb + cyan overline + purpose copy), "View full workout" row → Detail. **Week overview card** (4-segment bar + "Workouts 1/4 · Distance 3/11 km"). **Start workout** floating cyan CTA (radius 38, glow). Tab bar (Today active).
- **Paused.** Header gold ⏸ + "Paused"; week strip dimmed ~0.45; gold paused banner (`rgba(224,175,104,.12)` / `.35` border) with "Your plan is paused" + copy + **Resume plan** cyan CTA; dimmed "Where you left off" (Week 1 of 4 · Workouts 1/4 · Streak 2 days) + calm note. No Start CTA.
- **Completed.** Card → green rail + filled green check + "COMPLETED" chip + stats (distance/time/avg pace). Cyan "NICE WORK" card with **How did it feel?** (→ Feedback) + **Summary**. Week overview → 2/4.
- **Empty.** Simplified header (no week strip), centered calendar-plus glyph, "No plan yet", **Create your plan** CTA (→ Onboarding).
- **Error.** Red-tinted COROS sync banner with **Retry sync**; workout card visible but dimmed, "Briefing unavailable offline". Never blocks.

### 4 · Workout Detail
Structured session — warm-up, run/walk repeats, cool-down — with skip.
- **Header:** top gradient band `linear-gradient(160deg,#1e3a44,#22402f,#1a1b26)` (~210px). Back chevron + "Week 1"; share icon. Overline "15 JUL 2026 · WED" (date muted, weekday cyan), H1 "Walk-Run", meta "Walk-Run · 2km · ~24 min".
- **Weather/readiness card:** cyan cloud tile + "13° & cloudy at 6pm · good to go" + "0% rain".
- **Action row:** 4 circular actions — WARM-UP STRETCHES, ADD ROUTE, LINK ACTIVITY, **SKIP WORKOUT** (red icon + `rgba(247,118,142,.4)` ring + red label).
- **Description:** step blocks (`card`, radius 14) — **Warm-Up** (`stroke` header strip), **Repeat ×2** (`linear-gradient(90deg,#9ece6a,#2ac3de)` header + repeat icon; RUN rows green, WALK rows muted), **Cool-down** (dimmed).
- **Footer:** **Start workout** cyan CTA + circular music button.
- **Skip sheet.** Screen dims/blurs; sheet rises — red arrow tile, H2 "Skip this workout?", copy, single-select reason list (selected "Too busy today" cyan), destructive **Skip workout** red CTA, "Keep it" dismiss.
- **In-progress.** Status row ("Interval 3 / 7"), phase label ("RUN · CONVERSATIONAL"), large green interval ring + countdown, live Distance / Pace / Heart rate, "Next: …" strip, control cluster (music · gold **pause** · red **stop**).

### 5 · Plan / Calendar
Weekly primary view; scroll multiple weeks; drag to reschedule; progress; pause + paused state. Tab: **Plan**.
- **Week view (default).** Header (`bgElevated`): overline "YOUR PLAN" + goal title "Run 5K continuously" + a **Pause** control (gold outline pill, top-right). **Three progress stat tiles** (`cardInset`): Weeks 1/4 · Sessions 3/16 · Distance 5/42 km. **Week tab chips** (Week 1 active cyan, 2–4 outline). **Per-day session list** for the selected week — each row = day column (weekday overline + date) + a session card:
  - **Done** — green icon tile + check, "2.0 km · done", row dimmed ~0.75.
  - **Rest day** — dashed row + moon glyph, muted.
  - **Today** — 1.5px cyan-bordered card, cyan run-figure tile, "TODAY" chip, + **grip handle** (6-dot) at right.
  - **Upcoming** — normal card + grip handle. Sunday's is the "Long walk-run" (gold icon).
- **Multi-week.** Header "Your plan · 4 weeks · 16 sessions". One **card per week** (Week 1 "In progress" green chip; Week 4 "Goal week" gold chip + trophy) with a title ("Ease back in", "Build the base", "Longer runs", "Run 5K") and a **row of day pips** (green = done, cyan-outline = today, gold-outline+trophy = goal, `cardInset` = upcoming, dashed = rest). Vertically scrollable.
- **Reschedule (drag).** A session card is **lifted** (cyan border, rotated −2°, heavy shadow, "dragging…" + grip). The source day shows a dashed "Moving from here…" ghost; the **target day** (Tue) shows a cyan dashed **drop zone** "Drop here — move to Tue". Other rows dim to ~0.4. Bottom hint bar: "Release to reschedule · the rest of the week adapts."
- **Paused.** Header gold "Paused" pill; gold paused banner "Plan paused" + copy ("Paused on 15 Jul… remaining weeks shift forward…") + **Resume plan** cyan CTA; week tabs + day rows dimmed (~0.35, sessions read "on hold"). No active session.

### 6 · Insights Dashboard
Five calm beginner metrics + shoe mileage. Tab: **Insights**. Scrollable body (header pinned).
- **Consistency** (full-width): sessions done vs planned ("3 / 4 sessions this week") + 4-segment week bar (3 green, 1 stroke) + **streak** pill (gold flame + "2-day streak").
- **Weekly volume** + **Easy effort** (two-up): volume "5.0 km" + green "▲ +38% vs last wk" + 3 mini bars (latest green); easy "92 %" + "Kept easy — nice" + a green→cyan gradient meter.
- **Recovery** (full-width): green "Good to go" pill + three stats divided by hairlines — Rest HR 52 · HRV 68 · Sleep 7h20 (COROS/Intervals data, surfaced natively).
- **5-min benchmark** (full-width): "780 m" + green "▲ +40 m" + "every 2 wks".
- **Shoe mileage** (full-width): cyan shoe tile + "Cloudsurfer" + green progress bar (82/500) + "82 / 500 km · plenty of life left". When near threshold this flips to a gold "time to replace" nudge (threshold set in Settings).
- **Building (early state).** Cyan info banner "Your insights are warming up". Consistency shows "1 / 4 · first session logged". Locked metric cards (lock glyph, ~0.6 opacity): "Weekly volume trend · Unlocks after next run", "Recovery readiness · Needs 3 nights of COROS data".

### 7 · Activity History
Completed runs list → tappable detail. Tab: **Activities**.
- **List.** Header with filter icon + **summary stats** (runs · total km · moving time). Month group label ("JULY 2026"). Rows (`card`): icon tile (green run-figure for run, cyan walk-figure for walk), title + "Wed 15 Jul · 6:12pm", right-aligned distance + "24:12 · 11:52/km".
- **Detail.** Top gradient band (same as Workout Detail). Back + share. Overline date, H1 "Walk-Run", green **"Felt just right"** tag (from feedback). **2×2 stat grid** (`card`): Distance / Moving time / Avg pace / Avg heart rate. **Splits card**: per-km rows with a bar (green) + time; the partial final split uses cyan. (Extend with the repo's map component if available — no map is drawn in the mock.)
- **Empty.** Green run-figure glyph tile, "No runs yet", copy, **Go to today's workout** cyan CTA.

### 8 · Post-Workout Feedback
Quick effort check reached from Today·Completed (and end of a live workout).
- **Prompt (bottom sheet over completed workout).** Backdrop dim+blur. Grab handle. H2 "How did it feel?" + copy. **Three big options**: **Easy** (green smile), **Just right** (cyan neutral, selected = cyan border+tint), **Hard** (gold frown). Optional **note field** ("Add a note (optional)…"). **Save feedback** cyan CTA + "Skip" text button. This is the beginner-friendly RPE — maps to Runna's thumbs but softer.
- **Saved.** Green success disc + check, "Logged — nice work", "You marked this one **just right**. Your coach will keep Friday at a similar effort." **Next up** card (cyan clock tile + "Friday · Walk-Run · 2.5 km"). **Back to today** cyan CTA.

### 9 · Missed-session check-in
Ambient — surfaces after 2–3 missed sessions; the AI coach adjusts the plan. (Presented as a full-screen takeover; could also be a sheet.)
- **Prompt.** Dismiss ✕ top-right. Cyan→green gradient **coach avatar** (chat-bubble glyph). H1 "Life happens — let's regroup", warm copy ("You've missed the last 3 sessions. No guilt here…"). Single-select reasons ("Just been busy", "Feeling low on energy" [selected cyan], "A niggle or minor injury"). **Adjust my plan** cyan CTA + "I'm fine — keep it as is".
- **Adjusted.** Green success disc + check, "Plan reshaped for you", copy. **Before/after card**: struck-through "This week · 4 runs" (before) → green-checked "This week · 2 easy runs · lighter restart" (now). **Goal-shift card**: gold trophy + "5K goal → 20 Aug · moved 11 days later". **See my updated week** cyan CTA (→ Plan).

### 10 · Settings
Daily reminder, shoe threshold, pause, connections. Tab: **Settings**. Scrollable, grouped list with section overlines.
- **Account row**: gradient avatar "J" + name + email + chevron.
- **REMINDERS**: "Daily reminder" **toggle** (ON = cyan track, white knob); "Reminder time" → "6:00 PM".
- **TRAINING**: "Shoe replacement" with a **slider** (cyan fill, `text` knob) + value "500 km" (cyan); "Units" → "Kilometres".
- **PLAN**: "Pause plan" (gold pause icon) → opens pause sheet; "COROS · connected" (green sync icon + green status dot).
- **Sign out** (red text).
- **Pause-plan sheet.** Backdrop dim+blur. Gold pause tile, H2 "Pause your plan?", copy ("We'll hold your schedule and stop reminders. Resume any time — the remaining weeks shift forward…"). **"FOR HOW LONG?"** segmented chips (1 week / **2 weeks** selected gold / Until I resume). **Pause plan** gold CTA + "Never mind". Confirm → app enters the paused state seen on Today·Paused and Plan·Paused.

## Interactions & Behavior
- **Onboarding:** Continue advances 1→2→3; back returns. Tap-to-select (single for ability/goal/frequency, multi for injuries). "Build my plan" → Generating → auto-advances to Today.
- **Login:** Continue validates → Today (trusted) or 2FA. Social = native Apple/Google. 2FA auto-advances focus; Verify enabled at 6 digits; resend disabled until countdown 0.
- **Today:** workout card / "View full workout" → Workout Detail. Start → live session. Completed → How did it feel? → Feedback. Tabs switch roots. Resume plan restores schedule.
- **Workout Detail:** Skip → sheet (slide-up + backdrop fade); confirm marks skipped + returns to Today; "Keep it" dismisses. Start → in-progress; pause/stop control the live session.
- **Plan:** week chips switch the visible week; vertical scroll pages weeks. **Long-press a session card → drag to another day → release to reschedule**; the coach re-balances the rest of the week (use the repo's draggable/reorderable list or a gesture-handler pan). Pause control → pause sheet.
- **Insights:** read-only; cards populate as data arrives (COROS/Intervals + logged runs). Shoe card nudges to replace once mileage nears the Settings threshold. Building state upgrades to full dashboard automatically.
- **Activities:** tap a row → Detail. Filter icon opens type/date filters (not drawn — use the repo's filter pattern).
- **Feedback:** Easy/Just right/Hard single-select; optional note; Save → Saved confirmation → Back to today. Skip dismisses with no rating.
- **Check-in:** triggered by ≥2–3 consecutive missed sessions. Reason single-select; "Adjust my plan" runs the AI re-plan → Adjusted summary → Plan. "Keep it as is" / ✕ dismisses without change.
- **Settings:** toggles persist immediately; reminder time + units + shoe threshold open pickers/steppers; Pause plan → sheet → paused state; Sign out confirms then returns to Login.

## States (all designed & included)
- **Onboarding:** step 1/2/3 defaults; **loading** (Generating). Validation soft (all optional).
- **Login:** default; **error** (invalid creds, inline red); **2FA**.
- **Today:** **planned · paused · completed · empty · error.**
- **Workout Detail:** default · **skip sheet** · **in-progress.**
- **Plan:** **week view · multi-week · reschedule (dragging) · paused.**
- **Insights:** **dashboard (populated) · building (early/locked).**
- **Activities:** **list · detail · empty.**
- **Feedback:** **prompt · saved.**
- **Check-in:** **prompt · adjusted.**
- **Settings:** **main · pause-plan sheet.**
- Standard button-spinner (Continue/Save/Adjust) follows the repo's loading-button pattern; network errors follow the Today·Error banner pattern.

## State Management (suggested shape)
- `onboarding`: `{ step, profile{age,weight,height,sex}, background{ability,frequency,longestRun,injuries[]}, goal{type,targetDate,daysPerWeek}, generating }`
- `auth`: `{ email, session, needs2fa, code[6], resendCountdown, error }`
- `plan`: `{ weeks[], currentWeek, status:'active'|'paused', pausedAt, pauseDuration, progress{workoutsDone,workoutsTotal,distanceDone,distanceTotal,streak} }` — `weeks[].days[]` = `{ date, type:'run'|'walk'|'long'|'rest', title, distance, duration, status:'done'|'today'|'upcoming'|'skipped'|'onhold' }`
- `today`: derived → today's `workout` + `briefing(why)` + `weather`
- `workoutDetail`: `{ steps[], skipSheetOpen, skipReason }`, `liveSession`: `{ interval, totalIntervals, phase, elapsed, distance, pace, hr, paused }`
- `activities`: `[{ id, date, type, distance, movingTime, avgPace, avgHr, felt, splits[] }]`
- `insights`: `{ consistency, weeklyVolume{km,deltaPct,bars[]}, easyPct, recovery{restHr,hrv,sleep,readiness}, benchmark{value,delta}, shoe{name,km,threshold} }` — `dataReady` flags drive the building state
- `feedback`: `{ workoutId, felt:'easy'|'just_right'|'hard', note }`
- `checkin`: `{ missedCount, reason, adjusted{beforeRuns,afterRuns,goalDateBefore,goalDateAfter} }`
- `settings`: `{ dailyReminder, reminderTime, units:'km'|'mi', shoeThresholdKm, corosConnected }`
- Data sources: plan generation (AI), weather (for planned time), COROS/Intervals.icu metrics — all surfaced in-app, never via redirect.

## Assets
- **Icons:** all inline SVG line/solid glyphs drawn to match layout — replace with the repo's icon set (`lucide-react-native` / SF Symbols). Glyphs used: profile, bell, calendar-grid, cloud, bulb, run-figure, walk-figure, moon (rest), repeat, lightning, lock, pause, play, stop, share, music, skip-arrow, gear, grip (6-dot drag handle), shoe, flame (streak), trophy (goal), chat-bubble (coach), smile/neutral/frown (feedback), toggle, slider knob, chevrons, checks.
- **App mark / coach avatar:** cyan→green gradient rounded square/circle with a glyph (placeholder — swap for final brand mark).
- **No external image or photo assets** are required. Activity Detail leaves room for the repo's map component but the mock draws none.

## Files
- `Cadence Screens.dc.html` — **all 30 frames** on one canvas. **Authoritative visual reference.** Each frame is a `.phone` element (390×844) tagged with `data-screen-label`. Order: Onboarding Step 1–3, Generating, Login, Login·2FA, Login·Error, Today·Planned/Paused/Completed/Empty/Error, Workout Detail / ·Skip / ·In-progress, Plan·Week/Multi-week/Reschedule/Paused, Insights·Dashboard/Building, Activities·List/Detail/Empty, Feedback·Prompt/Saved, Check-in·Prompt/Adjusted, Settings / ·Pause plan.
- `support.js` — runtime for the HTML prototype only; **not needed** for the RN implementation.
- `screenshots/` — rendered PNG targets:
  - `01-onboarding-steps-1-2.png`
  - `02-onboarding-step3-and-generating.png`
  - `03-login-2fa-error.png`
  - `04-today-planned-and-paused.png`
  - `05-today-completed-empty-error.png`
  - `06-workout-detail-and-skip.png`
  - `07-workout-in-progress.png`
  - `08-plan-week-multiweek-reschedule-paused.png`
  - `09-insights-dashboard-building.png`
  - `10-activities-list-detail-empty.png`
  - `11-post-workout-feedback.png`
  - `12-missed-session-checkin.png`
  - `13-settings-pause.png`

## Implementation Notes
- Build as **React Native (Expo), iPhone only** — no web/tablet layouts.
- Navigation: onboarding stack → auth → **main tab navigator** (Today / Plan / Activities / Insights / Settings). Workout Detail, Feedback, Check-in, and the pause sheet are modals/pushed screens over the tabs.
- Centralize the color/type/spacing tokens above into the repo's theme module; reference tokens, don't hardcode.
- Bottom sheets (Skip, Feedback, Pause) → the repo's bottom-sheet primitive (e.g. `@gorhom/bottom-sheet`) with a backdrop.
- Plan drag-to-reschedule → a reorderable/draggable list or `react-native-gesture-handler` + `reanimated`; snap to day slots and re-balance the week on drop.
- Settings slider/toggle → the repo's control primitives; persist immediately.
- Respect safe areas (status bar, home indicator) with `react-native-safe-area-context`.
