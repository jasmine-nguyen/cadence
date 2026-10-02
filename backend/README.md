# backend

The Python nightly job. It runs on AWS Lambda, but all the logic lives in
`run_nightly()` (`nightly.py`), which runs on a Mac with no AWS involved.
`handler.py` (added later) is the only file that knows about Lambda.

## Setup

`backend/.python-version` pins Python 3.12 (a Lambda-supported runtime), but
tools like pyenv only pick it up when your shell is inside `backend/`. So create
the venv with `python3.12` explicitly, from the repo root:

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

`backend/requirements.txt` holds the backend's dependencies only. The root
`requirements.txt` is for the build-graph tooling; don't mix them.

## Run

From the repo root, with the venv's interpreter:

```sh
backend/.venv/bin/python -m backend.nightly
```

## Import gotcha

Always import modules as `backend.x` and run from the repo root. Never put
`backend/` itself on `sys.path`: the planned `backend/secrets.py` would then
shadow the standard library's `secrets` module.

## Suggest a week (CAD-95)

Reads your COROS data (last 28 days of activities, nightly sleep-HRV, resting
HR, training load, and what's already on the calendar for the next 7 days),
asks Claude for a suggested week (tomorrow plus 6 days) and prints it.
**Nothing is written to COROS.** Sleep isn't used yet.

1. Copy `.env.example` (repo root) to `.env` and fill in `COROS_EMAIL`,
   `COROS_PASSWORD`, `COROS_REGION` (`us`) and `CLAUDE_API_KEY`. Name the
   Claude key `CLAUDE_API_KEY`, never `ANTHROPIC_API_KEY`. `.env` is gitignored.
2. From the repo root:

```sh
PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring backend/.venv/bin/python -m backend.suggest
```

The keyring setting stops the COROS login trying to use the system keyring.
It exits 0 with the week, or 1 with the stage (`read` or `plan`) and status
(`refusal`, `api_error`, `malformed`, `max_tokens`) if something failed.

**Cost:** roughly US$0.13 per suggested week on Claude Opus 5.5 (an estimate).
