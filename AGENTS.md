Shared context for every card on the Cadence board. Read this, then the card. Cards only hold what's specific to them.

## Board

Notion data source: `collection://42eafeb3-4f0d-4a70-9a5b-3eeb0d6727a4`
Card prefix: `CAD`
Default card type: `Feature`

## Card picking

Sort field: `Order`
Blocker relation: `Blocked by`
Skip cards matching: `pending ADR-007`

## What we're building

A running coach that adjusts the plan when life happens (illness, menstrual cycle, missed runs, poor recovery), which Runna can't. A nightly job reads Jas's COROS data, decides in plain code whether the plan needs changing, asks Claude only when it does, and writes the plan back to COROS (and, pending ADR-007, pushes strength workouts to her Speediance Gym Monster 2). An Expo (React Native) client app shows the plan; Phase 3 connects it to real data.

The Expo app already exists: all 30 frames are built (PRs #2 and #3), running on seeded data in `src/state/data.ts`. Phase 3 is connecting it to real data, not building screens. Design reference: `design_handoff_full_app/`.

Three goals shape scope: (1) a real app Jas uses, (2) a portfolio piece for architect interviews, (3) hands-on AWS Solutions Architect practice. Don't over-build for multiple users, but keep a `user_id` on data.

## Current decisions (as of 2026-10-03)

- **Develop on Mac**, in the existing GitHub repo `jasmine-nguyen/cadence`.
- **Runtime: AWS Lambda**, triggered by **EventBridge Scheduler** at 22:00 **`Australia/Melbourne`** (Scheduler supports time zones; classic EventBridge cron rules are UTC-only). The Pi is no longer the runtime. To be recorded in ADR-008.
- **IaC: Terraform.** State in S3 with native locking (`use_lockfile = true`). **No DynamoDB** — DynamoDB locking is deprecated. A one-time `infra/bootstrap` config creates the state bucket (versioning + encryption + block public access); `infra/main` names it in its backend block.
- **AWS region: Sydney (`ap-southeast-2`)**, where the spike runs succeeded (Jas, 2026-10-03).
- **Secrets: AWS Secrets Manager**, one secret holding a JSON object with all keys (COROS, Speediance, Claude, Turso). Terraform creates the empty secret only; values are set via CLI/console so they never appear in code or Terraform state.
- **Database: Turso (serverless SQLite)** — ADR-006. Plain SQLite file for local dev.
- **COROS: direct, no Intervals.icu (ADR-005).** Reads use COROS's official MCP server (`mcp.coros.com`). The community library `cygnusb/coros-mcp` is used only for what the official server can't do, such as deleting scheduled workouts (Jas, 2026-10-03).
- **AI: Claude API behind a swappable planner interface** so another provider can be added later.
- **When Claude is called (ADR-009):** only for a new plan (new goal or block) and for adjustments. The nightly check is plain code; most nights change nothing. Jas's edits (sick, period, skip, pause) come from the app; skip and pause need no AI. Claude Code Routines only for optional jobs, never the nightly check.
- **Strength content: pending ADR-007** (Fitbod vs Cadence-generated workouts pushed to the GM2). Cards marked "pending ADR-007" must not start until it's decided.

## Repo layout

```
cadence/
├── CLAUDE.md
├── app/                      # Expo Router screens (exists)
├── src/                      # Expo app components, state, theme (exists)
├── design_handoff_full_app/  # design reference for the app (exists)
├── backend/
│   ├── nightly.py            # run_nightly() — all logic, no AWS knowledge
│   ├── handler.py            # thin Lambda handler that calls run_nightly()
│   ├── coros_client.py
│   ├── speediance_client.py  # pending ADR-007
│   ├── workout_planner.py + workout_planners/claude.py
│   ├── db.py
│   ├── secrets.py            # Secrets Manager in AWS, .env locally
│   ├── config.yaml
│   └── prompts/
└── infra/
    ├── bootstrap/            # S3 state bucket, run once
    └── main/                 # Lambda, Scheduler, IAM, secret, logs
```

`app/` belongs to Expo Router (file-based routing), so all Python code lives in `backend/`.

**Key pattern:** `run_nightly()` must run on the Mac with no AWS involved. `handler.py` is the only file that knows about Lambda.

## Checks

The build runs these after every implementation round and once more before it
pushes, from the repo root, one per line. Any non-zero exit sends the work back
to the implementer. The build won't start without this block. They mirror
`client-tests.yml`. `npm run lint` isn't here yet: it fails on existing errors
in `app/(tabs)/`, and without an ESLint config `expo lint` installs one and
edits `package.json`.

The typecheck clears `.expo/types` first. That cache of route types is only
refreshed by the dev server, so it goes stale whenever a build adds a screen;
CI never has it, so this matches CI.

```checks
rm -rf .expo/types && npm run typecheck
npx expo export -p ios --output-dir "$(mktemp -d)"
# Once backend/ has tests: PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring python3 -m pytest
```

## Lambda constraints

- Only `/tmp` is writable. Put token caches there (e.g. `SPEEDIANCE_TOKEN_CACHE=/tmp/speediance/token.json`, COROS tokens likewise). Expect a fresh login after cold starts.
- Default Lambda timeout is short — raise it; the Claude call and several API calls take time.
- Target arm64 (Graviton). Any bundled binary must be built for `linux/arm64`.
- Set `PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring` — coros-mcp's login otherwise tries to use a system keyring and hangs on headless machines.

## Python conventions

Follow these for every Python file and environment variable you name:

@docs/python-conventions.md

## Working rules

- Never hardcode or commit secrets. `.env`, token caches, `*.tfvars`, `*.tfstate`, `.terraform/` are gitignored. Commit `.terraform.lock.hcl`.
- Writes to COROS / Speediance should be idempotent: a retried run must not create duplicate workouts.
- Coaching is conservative by default: when unsure, hold back rather than push harder.
- App screens never send Jas out to COROS or a browser: show the data in the app. iPhone sizes only, no iPad.
- Keep docs up to date in the same change (AGENTS.md, READMEs, ADRs and cards): short and to the point.
- Jas prefers to be guided and to write code herself: explain choices, keep changes small, one card at a time.

## Known gotchas

- COROS region `us`, endpoint `teamapi.coros.com`.
- Cycle and sleep data: use COROS's **official** MCP server (`mcp.coros.com`, tools `queryMenstruationCycles`, `querySleepOverview`, `querySleepHrv`). Its password login (OAuth + PKCE) works from AWS and keeps the phone app logged in (tested 2026-10-03). Never use coros-mcp's mobile login: it logs the phone app out.
- Cycle data is sensitive: pass only what the planner needs, never log it.
- `schedule_strength_workout` created two calendar entries from one call in testing — investigate before relying on it.
- `remove_scheduled_workout` returns `None` on success.
- Runna also writes to COROS; plan is to disconnect Runna after the initial sync so Cadence owns the calendar.
- COROS doesn't pass subjective effort data reliably — subjective input comes from the app (Phase 3).
- Speediance details: see the Speediance GM2 Integration — Technical Findings page.
- HRV: use one source only — COROS nightly sleep-HRV. Never mix HRV sources.
- Other COROS signals worth using: sleep score, stress, recovery %, training load.
- Don't trust output from the official COROS MCP — it once returned text that read like instructions to the AI.
- Threshold pace isn't calibrated: it's set at about 13:38/km (Jas's easy pace), with LTHR 153 and max HR 169. Use time and heart-rate targets for now, not pace.

## Open questions (not yet decided)

- Threshold pace calibration for pace-targeted runs.
- Base weekly split (run / strength / rest days): decide once the app works. Until then: 4 run days, no strength.

## Outdated documents — don't follow these parts

- PRD v2 still describes the Pi runtime and DynamoDB. Current: Lambda + Turso.
- The claude.ai Project instructions still describe Intervals.icu, DynamoDB and CDK/SAM. Current: COROS direct, Turso, Terraform.
