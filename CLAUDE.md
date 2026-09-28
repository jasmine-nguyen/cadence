# Setup

Run `pip install -r requirements.txt` before using the build graph. If in a worktree, create a venv first: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`, then use `.venv/bin/python` to run the script.

# Architecture

- **Expo app** in `app/` (screens; Expo Router owns this folder) and `src/` (components, state, theme).
- **Python nightly job** in `backend/`. `run_nightly()` in `backend/nightly.py` runs locally with no AWS; `handler.py` is the only Lambda-aware file. `backend/requirements.txt` is separate from the root `requirements.txt` (build-graph tooling).
- **Terraform** in `infra/bootstrap/` (S3 state bucket, run once) and `infra/main/` (Lambda, Scheduler, IAM, secret, logs).
- **Data and secrets:** Turso (SQLite locally); AWS Secrets Manager (`.env` locally).

Full decisions, gotchas and layout: see `project-context.md`.

# Pull requests

Write every PR description with `.github/pull_request_template.md`: Problem, Task,
Solution, Evidence and Merge danger, plus Manual checks and Follow-ups when there
are any. This applies to every agent, including when using the `pr` skill.
