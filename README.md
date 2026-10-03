# Cadence

A personal running coach that adjusts the plan when life happens. Runna can't do this.

- **Makes a plan** when you set a goal, such as building up to a 5k.
- **Checks every night** whether yesterday went to plan, and how you've recovered (sleep, HRV, resting heart rate).
- **Adjusts the next few days** only when something calls for it: a missed run, poor recovery, being sick, or your period coming up.
- **Sends workouts to your COROS watch**, so you just press start.

## How it works

```
COROS watch data ──▶ nightly check (AWS) ──▶ needs a change? ──no──▶ nothing
                                                   │
                                                  yes
                                                   ▼
                                          Claude adjusts the plan ──▶ COROS calendar
```

## Tech stack

| Part | Built with |
| --- | --- |
| Phone app | React Native (Expo), iOS |
| Nightly job | Python on AWS Lambda, run by EventBridge Scheduler |
| Coaching | Claude API, called only for new plans and adjustments |
| Watch data | COROS: official MCP server for cycle and sleep data, `coros-mcp` for training |
| Data | Turso (SQLite) |
| Infrastructure | Terraform; secrets in AWS Secrets Manager |

## Repo layout

```
app/, src/   phone app (screens, components, state, theme)
backend/     nightly job and planner (runs locally without AWS)
infra/       Terraform
spikes/      throwaway experiments
tests/       Python tests
```

## Getting started

```bash
npm install && npx expo start        # phone app (press i for the iOS simulator)
python3 -m pytest                    # backend tests
```

Decisions, architecture records and the backlog live in Notion. Agent and contributor notes are in [`AGENTS.md`](./AGENTS.md).
