"""CAD-83 spike: can AWS Lambda reach the unofficial COROS and Speediance APIs?

Throwaway. Not part of the nightly job; delete with the rest of this folder once
the results are recorded on CAD-83.

The result reports, per service, whether it worked and where it failed. It never
contains credentials, tokens or schedule contents.
"""

import asyncio
import json
import os
import shlex
import subprocess
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

MELBOURNE = ZoneInfo("Australia/Melbourne")
DEFAULT_TOKEN_CACHE = "/tmp/speediance/token.json"
STDERR_TAIL_CHARS = 500


def _load_secret():
    """Read the spike's credentials from Secrets Manager (boto3 ships with Lambda)."""
    import boto3

    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=os.environ["SPIKE_SECRET_ID"])
    return json.loads(response["SecretString"])


def _egress_ip():
    """The public IP AWS used for outbound calls, so the results say what was tested."""
    try:
        with urllib.request.urlopen("https://checkip.amazonaws.com", timeout=5) as response:
            return response.read().decode().strip()
    except Exception:
        return "unknown"


def _elapsed_ms(started):
    return int((time.monotonic() - started) * 1000)


def _error_fields(error):
    fields = {"error_type": type(error).__name__, "error": str(error)}
    response = getattr(error, "response", None)
    status = getattr(response, "status_code", None)
    if status is not None:
        fields["http_status"] = status
    return fields


def _check_coros(creds):
    # coros-mcp picks its token folder from HOME when first imported; only /tmp is
    # writable on Lambda.
    os.environ["HOME"] = "/tmp"
    started = time.monotonic()
    stage = "import"
    try:
        from coros_mcp import coros_api

        stage = "login"
        auth = asyncio.run(
            coros_api.login(
                creds["COROS_EMAIL"],
                creds["COROS_PASSWORD"],
                os.environ.get("COROS_REGION", "us"),
                skip_mobile=True,  # the mobile login would log Jas's phone app out
            )
        )

        stage = "schedule"
        today = datetime.now(MELBOURNE).strftime("%Y%m%d")
        schedule = asyncio.run(coros_api.fetch_schedule(auth, today, today))
    except Exception as error:
        return {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {
        "ok": True,
        "stage": "schedule",
        "duration_ms": _elapsed_ms(started),
        "schedule_keys_count": len(schedule) if isinstance(schedule, dict) else None,
    }


def _check_speediance(creds):
    token_cache = os.environ.get("SPEEDIANCE_TOKEN_CACHE", DEFAULT_TOKEN_CACHE)
    Path(token_cache).parent.mkdir(parents=True, exist_ok=True)
    env = {
        **os.environ,
        "SPEEDIANCE_TOKEN_CACHE": token_cache,
        "SPEEDIANCE_EMAIL": creds["SPEEDIANCE_EMAIL"],
        "SPEEDIANCE_PASSWORD": creds["SPEEDIANCE_PASSWORD"],
    }
    args = [
        os.environ.get("SPEEDIANCE_BIN", "/var/task/speediance-cli"),
        *shlex.split(os.environ.get("SPEEDIANCE_ARGS") or "login"),
    ]

    started = time.monotonic()
    try:
        completed = subprocess.run(args, env=env, capture_output=True, text=True, timeout=90)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"ok": False, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {
        "ok": completed.returncode == 0,
        "returncode": completed.returncode,
        "stderr_tail": (completed.stderr or "")[-STDERR_TAIL_CHARS:],
        "duration_ms": _elapsed_ms(started),
    }


def _scrub(value, secrets):
    """Replace every secret value in every string of the result with ***."""
    if isinstance(value, dict):
        return {key: _scrub(item, secrets) for key, item in value.items()}
    if isinstance(value, list):
        return [_scrub(item, secrets) for item in value]
    if isinstance(value, str):
        for secret in secrets:
            value = value.replace(secret, "***")
    return value


def handler(event, context):
    """Run each check independently. `{"only": "coros"|"speediance"}` runs just one."""
    only = (event or {}).get("only")
    creds = _load_secret()
    secrets = sorted((v for v in creds.values() if isinstance(v, str) and v), key=len, reverse=True)

    result = {"egress_ip": _egress_ip()}
    if only in (None, "coros"):
        result["coros"] = _check_coros(creds)
    if only in (None, "speediance"):
        result["speediance"] = _check_speediance(creds)

    result = _scrub(result, secrets)
    print(json.dumps(result))
    return result
