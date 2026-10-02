"""Secrets: a local `.env` file on the Mac (AWS Secrets Manager comes later).

Stdlib only. Nothing here writes to `os.environ`.
"""

from pathlib import Path


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
