# Python conventions

How Python in `backend/`, `tests/` and `spikes/` is named. Code outlives its card, so every name describes behaviour a reader can see without the board.

## Modules

Name a module with a noun phrase for what it owns, so the name alone says what's inside:

- `week_suggestion.py` (the suggested week), `coros_client.py` (talks to COROS), `secrets.py` (loads credentials).
- A bare verb (`suggest.py`, `run.py`) or a catch-all (`utils.py`, `helpers.py`) names no owner: pick the thing it produces or wraps instead.

Functions are verb phrases (`get_secrets`, `plan_dates`), constants are `UPPER_SNAKE`, module-private names start with `_`.

## Card IDs

Card IDs (`CAD-44`) belong in branch names, commit messages and PR titles. File names, module names, test names, docstrings and doc headings describe behaviour. `git log` and `git blame` link code back to its card.

One exception: a comment may name the card that will finish pending work, e.g. `# CAD-81 sets this on the Lambda`.

## Tests

- One file per module under test: `tests/test_<module>.py`, e.g. `tests/test_secrets.py` for `backend/secrets.py`.
- Extra files for the same module take a suffix saying what kind of tests they hold: `test_secrets_edge_cases.py`, `test_secrets_adversarial.py`.
- Test names say what happens and when: `test_local_mode_returns_env_file_credentials_without_aws`.

## Environment variables and secret keys

`UPPER_SNAKE`, service first, so related keys sort together and anyone can tell which service a key is for:

- **An outside service's credentials:** `<SERVICE>_<THING>`, e.g. `COROS_EMAIL`, `CLAUDE_API_KEY`, `TURSO_AUTH_TOKEN`, `SPEEDIANCE_REGION`.
- **Cadence's own settings:** `CADENCE_<SERVICE>_<THING>`, e.g. `CADENCE_AWS_SECRET_ID` (which AWS secret holds the credentials). `CADENCE_` marks it as ours. Leave bare `AWS_` names to AWS: its SDK reads them and Lambda reserves some.
- Claude's key is `CLAUDE_API_KEY`. `ANTHROPIC_API_KEY` in the environment switches the build's agents to per-token billing.

Every key is listed in `.env.example` with an empty value. The AWS secret uses the same key names.
