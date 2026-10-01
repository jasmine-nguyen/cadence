"""CAD-83 / CAD-94 spike: can AWS Lambda use the unofficial COROS and Speediance APIs?

Throwaway. Not part of the nightly job; delete with the rest of this folder once
the results are recorded on CAD-83 and CAD-94.

Modes, picked by `event["mode"]`:

- none (CAD-83): log in to both services and read today. Returns and logs, per
  service, whether it worked and where it failed. No credentials, tokens or
  schedule contents.
- `write` (CAD-94, manual): add one COROS test run named TEST_WORKOUT_NAME
  TEST_DAYS_AHEAD days ahead, read it back, remove every copy, read back again.
  Returns and logs counts only. Only ever removes entries with the exact test
  name on the test day.
- `contents` (CAD-94, manual): the next 7 days of the COROS calendar and the last
  7 days of Speediance workouts, in the invoke response only. The log line keeps
  just ok/stage/error_type/duration_ms per service.
- `nightly` (CAD-94, scheduled): login + read only, no writes. Returns and logs
  only ok/stage/error_type/duration_ms per service, never error text or contents.

Speediance is only ever asked to `login` or list `workouts`; nothing is pushed.
"""

import asyncio
import json
import os
import shlex
import subprocess
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

MELBOURNE = ZoneInfo("Australia/Melbourne")
DEFAULT_TOKEN_CACHE = "/tmp/speediance/token.json"
STDERR_TAIL_CHARS = 500

TEST_WORKOUT_NAME = "CADENCE TEST – delete me"  # en dash, exactly as on CAD-94
TEST_DAYS_AHEAD = 14
# 10 min easy run with a heart-rate target kept below LTHR (153): conservative.
TEST_WORKOUT_STEPS = [{"name": "Easy run", "duration_minutes": 10, "intensity_low": 100, "intensity_high": 135}]
COROS_RUN_SPORT_TYPE = 100  # coros-mcp rejects wire id 1 for runs
COROS_HEART_RATE_TARGET = 2
NIGHTLY_FIELDS = ("ok", "stage", "error_type", "duration_ms")
MODES = (None, "write", "contents", "nightly")


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


def _melbourne_today():
    return datetime.now(MELBOURNE).date()


# --- COROS and Speediance access ---------------------------------------------


def _coros_api():
    # coros-mcp picks its token folder from HOME when first imported; only /tmp is
    # writable on Lambda.
    os.environ["HOME"] = "/tmp"
    from coros_mcp import coros_api

    return coros_api


def _coros_login(coros_api, creds):
    return asyncio.run(
        coros_api.login(
            creds["COROS_EMAIL"],
            creds["COROS_PASSWORD"],
            os.environ.get("COROS_REGION", "us"),
            skip_mobile=True,  # the mobile login would log Jas's phone app out
        )
    )


def _run_speediance(creds, args):
    """Run speediance-cli with exactly `args`. Returns the CompletedProcess or raises."""
    token_cache = os.environ.get("SPEEDIANCE_TOKEN_CACHE", DEFAULT_TOKEN_CACHE)
    Path(token_cache).parent.mkdir(parents=True, exist_ok=True)
    env = {
        **os.environ,
        "SPEEDIANCE_TOKEN_CACHE": token_cache,
        "SPEEDIANCE_EMAIL": creds["SPEEDIANCE_EMAIL"],
        "SPEEDIANCE_PASSWORD": creds["SPEEDIANCE_PASSWORD"],
    }
    command = [os.environ.get("SPEEDIANCE_BIN", "/var/task/speediance-cli"), *args]
    return subprocess.run(command, env=env, capture_output=True, text=True, timeout=90)


def _stderr_tail(completed, secrets):
    # Scrub before cutting, or a secret straddling the cut would slip through.
    return _scrub(completed.stderr or "", secrets)[-STDERR_TAIL_CHARS:]


# --- CAD-83: reachability (no mode) ------------------------------------------


def _check_coros(creds):
    started = time.monotonic()
    stage = "import"
    try:
        coros_api = _coros_api()

        stage = "login"
        auth = _coros_login(coros_api, creds)

        stage = "schedule"
        today = _melbourne_today().strftime("%Y%m%d")
        schedule = asyncio.run(coros_api.fetch_schedule(auth, today, today))
    except Exception as error:
        return {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {
        "ok": True,
        "stage": "schedule",
        "duration_ms": _elapsed_ms(started),
        "schedule_keys_count": len(schedule) if isinstance(schedule, dict) else None,
    }


def _check_speediance(creds, secrets):
    started = time.monotonic()
    try:
        # Only this CAD-83 check honours SPEEDIANCE_ARGS; the CAD-94 modes never do.
        completed = _run_speediance(creds, shlex.split(os.environ.get("SPEEDIANCE_ARGS") or "login"))
    except Exception as error:
        return {"ok": False, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {
        "ok": completed.returncode == 0,
        "returncode": completed.returncode,
        "stderr_tail": _stderr_tail(completed, secrets),
        "duration_ms": _elapsed_ms(started),
    }


def _reachability(event, creds, secrets):
    """`{"only": "coros"|"speediance"}` runs just one check."""
    only = (event or {}).get("only")
    result = {"egress_ip": _egress_ip()}
    if only in (None, "coros"):
        result["coros"] = _check_coros(creds)
    if only in (None, "speediance"):
        result["speediance"] = _check_speediance(creds, secrets)
    return result


# --- CAD-94: write test ------------------------------------------------------


def _entities_with_programs(data, day=None):
    """Pair each calendar entity with its program (joined on idInPlan)."""
    data = data or {}
    programs = {str(program.get("idInPlan")): program for program in data.get("programs") or []}
    pairs = []
    for entity in data.get("entities") or []:
        # coros-mcp may give happenDay as an int; compare as YYYYMMDD text.
        if day is not None and str(entity.get("happenDay")) != day:
            continue
        pairs.append((entity, programs.get(str(entity.get("idInPlan"))) or {}))
    return pairs


def _test_entries(data, day):
    """Entities on `day` whose program name is exactly the test name. Nothing else."""
    return [
        entity for entity, program in _entities_with_programs(data, day) if program.get("name") == TEST_WORKOUT_NAME
    ]


def _other_count(data, day):
    return sum(1 for _, program in _entities_with_programs(data, day) if program.get("name") != TEST_WORKOUT_NAME)


def _remove_entries(coros_api, auth, data, entries):
    """Remove each given test entity. Returns how many removals returned None (success)."""
    returned_none = 0
    for entity in entries:
        outcome = asyncio.run(
            coros_api.remove_scheduled_workout(
                auth,
                str(entity.get("planId") or data["id"]),
                str(entity["idInPlan"]),
                str(entity.get("planProgramId") or ""),
            )
        )
        returned_none += outcome is None
    return returned_none


def _coros_write_test(creds):
    started = time.monotonic()
    day = (_melbourne_today() + timedelta(days=TEST_DAYS_AHEAD)).strftime("%Y%m%d")
    result = {"day": day}
    stage = "import"
    coros_api = auth = None

    def read():
        return asyncio.run(coros_api.fetch_schedule_raw(auth, day, day))

    try:
        coros_api = _coros_api()

        stage = "login"
        auth = _coros_login(coros_api, creds)

        stage = "pre_read"
        data = read()
        result["other_entries_before"] = _other_count(data, day)
        leftovers = _test_entries(data, day)  # from an earlier attempt that crashed
        _remove_entries(coros_api, auth, data, leftovers)
        result["leftovers_removed"] = len(leftovers)

        stage = "add"
        added = asyncio.run(
            coros_api.schedule_workout(
                auth,
                TEST_WORKOUT_NAME,
                TEST_WORKOUT_STEPS,
                day,
                sport_type=COROS_RUN_SPORT_TYPE,
                intensity_type=COROS_HEART_RATE_TARGET,
            )
        )

        stage = "read_back"
        copies = _test_entries(read(), day)
        result["copies_after_add"] = len(copies)
        result["duplicate"] = len(copies) > 1
        # Diagnostic only: removal goes by name, never by this id.
        returned_id = str((added or {}).get("id_in_plan"))
        result["returned_id_matched"] = any(str(entity.get("idInPlan")) == returned_id for entity in copies)
    except Exception as error:
        result["failed_stage"] = stage
        result.update(_error_fields(error))

    # Always clean up from a fresh read, whatever happened above. Without a login
    # there is nothing to clean up and nothing could have been added.
    if auth is not None:
        cleanup_stage = "remove"
        try:
            data = read()
            copies = _test_entries(data, day)
            result["removed"] = len(copies)
            result["remove_returned_none"] = _remove_entries(coros_api, auth, data, copies) == len(copies)

            cleanup_stage = "verify_removed"
            data = read()
            result["copies_after_remove"] = len(_test_entries(data, day))
            result["other_entries_after"] = _other_count(data, day)
        except Exception as error:
            result["cleanup_failed_stage"] = cleanup_stage
            result["cleanup_error_type"] = type(error).__name__
            result["cleanup_error"] = str(error)
        if "failed_stage" not in result:
            stage = result.get("cleanup_failed_stage", "verify_removed")

    result["stage"] = stage
    result["ok"] = (
        "failed_stage" not in result
        and "cleanup_failed_stage" not in result
        and result.get("copies_after_add") == 1
        and result.get("copies_after_remove") == 0
        and result.get("other_entries_before") == result.get("other_entries_after")
    )
    result["duration_ms"] = _elapsed_ms(started)
    return result


# --- CAD-94: contents check --------------------------------------------------


def _seconds_to_minutes(seconds):
    try:
        return round(float(seconds) / 60) if seconds is not None else None
    except (TypeError, ValueError):
        return None


def _iso_from_ymd(value):
    text = str(value)
    return f"{text[:4]}-{text[4:6]}-{text[6:8]}" if len(text) == 8 and text.isdigit() else None


def _coros_contents(creds):
    started = time.monotonic()
    stage = "import"
    try:
        coros_api = _coros_api()

        stage = "login"
        auth = _coros_login(coros_api, creds)

        stage = "read"
        today = _melbourne_today()
        first, last = today.strftime("%Y%m%d"), (today + timedelta(days=6)).strftime("%Y%m%d")
        data = asyncio.run(coros_api.fetch_schedule_raw(auth, first, last))

        stage = "summarise"
        entries = []
        for entity, program in _entities_with_programs(data):
            happen_day = str(entity.get("happenDay"))
            if not first <= happen_day <= last:
                continue
            entries.append(
                {
                    "date": _iso_from_ymd(happen_day),
                    "name": program.get("name"),
                    "planned_min": _seconds_to_minutes(program.get("duration") or program.get("estimatedTime")),
                }
            )
        entries.sort(key=lambda entry: entry["date"] or "")
    except Exception as error:
        return {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started), "next_7_days": entries}


def _speediance_contents(creds, secrets):
    started = time.monotonic()
    stage = "workouts"
    try:
        completed = _run_speediance(creds, ["workouts", "--days", "7", "--json"])
        if completed.returncode != 0:
            return {
                "ok": False,
                "stage": stage,
                "error_type": f"exit_{completed.returncode}",
                "stderr_tail": _stderr_tail(completed, secrets),
                "duration_ms": _elapsed_ms(started),
            }

        stage = "parse"
        workouts = json.loads(completed.stdout or "null") or []
        entries = [
            {
                "date": workout.get("date"),
                "name": workout.get("title"),
                "duration_min": _seconds_to_minutes(workout.get("duration_secs")),
            }
            for workout in workouts
        ]
        entries.sort(key=lambda entry: (entry["date"] is None, entry["date"] or ""))  # undated last
    except Exception as error:
        return {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started), "last_7_days": entries}


def _status_only(service):
    return {key: service[key] for key in NIGHTLY_FIELDS if key in service}


def _contents(creds, secrets):
    """Returns (response, log line). Contents go in the response only."""
    result = {
        "mode": "contents",
        "coros": _coros_contents(creds),
        "speediance": _speediance_contents(creds, secrets),
    }
    log_line = {
        "mode": "contents",
        "coros": _status_only(result["coros"]),
        "speediance": _status_only(result["speediance"]),
    }
    return result, log_line


# --- CAD-94: nightly ---------------------------------------------------------


def _nightly_coros(creds):
    started = time.monotonic()
    stage = "import"
    try:
        coros_api = _coros_api()

        stage = "login"
        auth = _coros_login(coros_api, creds)

        stage = "read"
        today = _melbourne_today().strftime("%Y%m%d")
        asyncio.run(coros_api.fetch_schedule(auth, today, today))
    except Exception as error:
        return {"ok": False, "stage": stage, "error_type": type(error).__name__, "duration_ms": _elapsed_ms(started)}
    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started)}


def _nightly_speediance(creds):
    started = time.monotonic()
    stage = "login"
    try:
        for stage, args in (("login", ["login"]), ("read", ["workouts", "--days", "1", "--json"])):
            completed = _run_speediance(creds, args)
            if completed.returncode != 0:
                return {
                    "ok": False,
                    "stage": stage,
                    "error_type": f"exit_{completed.returncode}",  # exit_2 = auth failure
                    "duration_ms": _elapsed_ms(started),
                }
        json.loads(completed.stdout or "null")
    except Exception as error:
        return {"ok": False, "stage": stage, "error_type": type(error).__name__, "duration_ms": _elapsed_ms(started)}
    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started)}


def _nightly(creds):
    return {
        "mode": "nightly",
        "date": _melbourne_today().isoformat(),
        "coros": _nightly_coros(creds),
        "speediance": _nightly_speediance(creds),
    }


# --- Entry point -------------------------------------------------------------


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
    """Dispatch on `event["mode"]`; no mode runs the CAD-83 reachability checks."""
    mode = (event or {}).get("mode")
    if mode not in MODES:
        result = {"mode": str(mode), "ok": False, "error_type": "UnknownMode"}
        print(json.dumps(result))
        return result

    creds = _load_secret()
    secrets = sorted((v for v in creds.values() if isinstance(v, str) and v), key=len, reverse=True)

    if mode is None:
        result = log_line = _reachability(event, creds, secrets)
    elif mode == "write":
        result = log_line = {"mode": "write", "coros": _coros_write_test(creds)}
    elif mode == "contents":
        result, log_line = _contents(creds, secrets)
    else:
        result = log_line = _nightly(creds)

    print(json.dumps(_scrub(log_line, secrets)))
    return _scrub(result, secrets)
