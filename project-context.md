Shared context for every card on the Cadence board. Claude Code: read this page first, then the card. Cards only hold what's specific to them.

## Board

Notion data source: `collection://42eafeb3-4f0d-4a70-9a5b-3eeb0d6727a4`
Card prefix: `CAD`
Default card type: `Feature`
Skip cards matching: `pending ADR-007`

## What we're building

A nightly job that reads Jas's COROS health and training data, asks Claude to adjust her weekly running + strength plan, and writes the plan back to COROS (and, pending ADR-007, pushes strength workouts to her Speediance Gym Monster 2). A React Native client app comes later (Phase 3).

The Expo app already exists: all 30 frames are built (PRs #2 and #3), running on seeded data in `src/state/data.ts`. Phase 3 is connecting it to real data, not building screens. Design reference: `design_handoff_full_app/`.

Three goals shape scope: (1) a real app Jas uses, (2) a portfolio piece for architect interviews, (3) hands-on AWS Solutions Architect practice. Don't over-build for multiple users, but keep a `user_id` on data.

## Current decisions (as of 2026-09-27)

- **Develop on Mac**, in the existing GitHub repo `jasmine-nguyen/cadence`.
- **Runtime: AWS Lambda**, triggered by **EventBridge Scheduler** at 22:00 **`Australia/Melbourne`** (Scheduler supports time zones; classic EventBridge cron rules are UTC-only). The Pi is no longer the runtime. To be recorded in ADR-008.
- **IaC: Terraform.** State in S3 with native locking (`use_lockfile = true`). **No DynamoDB** — DynamoDB locking is deprecated. A one-time `infra/bootstrap` config creates the state bucket (versioning + encryption + block public access).
- **Secrets: AWS Secrets Manager**, one secret holding a JSON object with all keys (COROS, Speediance, Claude, Turso). Terraform creates the empty secret only; values are set via CLI/console so they never appear in code or Terraform state.
- **Database: Turso (serverless SQLite)** — ADR-006. Plain SQLite file for local dev.
- **COROS: direct, via the community library `cygnusb/coros-mcp` used as a Python library** (not as an MCP server) — ADR-005. No Intervals.icu.
- **AI: Claude API behind a swappable planner interface** so another provider can be added later.
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
│   ├── planner.py + planners/claude.py
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

## Lambda constraints

- Only `/tmp` is writable. Put token caches there (e.g. `SPEEDIANCE_TOKEN_CACHE=/tmp/speediance/token.json`, COROS tokens likewise). Expect a fresh login after cold starts.
- Default Lambda timeout is short — raise it; the Claude call and several API calls take time.
- Target arm64 (Graviton). Any bundled binary must be built for `linux/arm64`.
- Set `PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring` — coros-mcp's login otherwise tries to use a system keyring and hangs on headless machines.

## Working rules

- Never hardcode or commit secrets. `.env`, token caches, `*.tfvars`, `*.tfstate`, `.terraform/` are gitignored. Commit `.terraform.lock.hcl`.
- Writes to COROS / Speediance should be idempotent: a retried run must not create duplicate workouts.
- Coaching is conservative by default: when unsure, hold back rather than push harder.
- Jas prefers to be guided and to write code herself: explain choices, keep changes small, one card at a time.

## Known gotchas

- COROS region `us`, endpoint `teamapi.coros.com`.
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

- AWS region: Sydney (`ap-southeast-2`) or Melbourne (`ap-southeast-4`).
- Whether COROS and Speediance unofficial APIs accept calls from AWS IPs (spike card).
- Threshold pace calibration for pace-targeted runs.
- Base weekly split (run / strength / rest days).

## Outdated documents — don't follow these parts

- PRD v2 still describes the Pi runtime and DynamoDB. Current: Lambda + Turso.
- The claude.ai Project instructions still describe Intervals.icu, DynamoDB and CDK/SAM. Current: COROS direct, Turso, Terraform.
