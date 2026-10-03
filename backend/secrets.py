"""Secrets: one dict of credentials, from AWS Secrets Manager in Lambda or a local `.env`.

`get_secrets()` reads Secrets Manager when `CADENCE_SECRET_ID` is set (CAD-81 sets it on
the Lambda) and `.env` otherwise. Both give the same UPPER_SNAKE keys with string values.

Never log or print the returned dict. Error messages carry no secret values.
Nothing here writes to `os.environ`.
"""

import json
import os
from pathlib import Path

SECRET_ID_ENV = "CADENCE_SECRET_ID"

_cache: dict[str, str] | None = None


class SecretsError(Exception):
    """The secret couldn't be read or parsed. Messages are fixed and never contain values."""


def load_local_env(path: Path = Path(".env")) -> dict[str, str]:
    """Read `KEY=value` lines from `path`. A missing file gives `{}`.

    Blank lines and `#` comments are skipped; matching surrounding quotes are stripped.
    """
    try:
        text = Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        return {}

    values = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key.startswith("export "):
            key = key[len("export ") :].strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if key:
            values[key] = value
    return values


def _load_from_aws(secret_id: str) -> dict[str, str]:
    import boto3  # ships with the Lambda runtime; not needed locally

    try:
        response = boto3.client("secretsmanager").get_secret_value(SecretId=secret_id)
        secret_string = response["SecretString"]
    except Exception as error:  # the cause carries an error code, never the value
        raise SecretsError("could not read secret") from error

    try:
        data = json.loads(secret_string)
    except ValueError:
        raise SecretsError("secret is not valid JSON") from None  # drop the error: it holds the text
    if not isinstance(data, dict):
        raise SecretsError("secret must be a JSON object")
    return {str(k): "" if v is None else str(v) for k, v in data.items()}


def get_secrets(env_path: Path = Path(".env")) -> dict[str, str]:
    """Return the credentials dict (a fresh copy each call).

    In AWS mode the secret is read once and kept in memory for this process; call
    `clear_cache()` at the start of each run (a warm Lambda keeps memory between runs).
    Local mode re-reads `env_path` every call, since that costs nothing.
    """
    global _cache
    secret_id = os.environ.get(SECRET_ID_ENV)
    if not secret_id:
        return load_local_env(env_path)
    if _cache is None:
        _cache = _load_from_aws(secret_id)
    return dict(_cache)


def clear_cache() -> None:
    """Forget the saved secret so the next `get_secrets()` reads it again."""
    global _cache
    _cache = None
