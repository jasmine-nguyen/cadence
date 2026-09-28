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
