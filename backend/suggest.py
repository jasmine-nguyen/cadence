"""Suggest the next 7 days (tomorrow plus 6) from COROS data. Read-only: nothing is written.

Run from the repo root:  python -m backend.suggest
"""

import dataclasses
import os
import sys
import time
from datetime import date, datetime, timedelta

from backend.coros_client import MELBOURNE, CorosReader
from backend.planners.claude import ClaudePlanner, make_client
from backend.secrets import load_local_env

KEYS = ("COROS_EMAIL", "COROS_PASSWORD", "COROS_REGION", "CLAUDE_API_KEY")


def plan_dates(today: date) -> list[str]:
    return [(today + timedelta(days=offset)).isoformat() for offset in range(1, 8)]


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)


def suggest_week(creds: dict, reader=None, client=None, today: date | None = None) -> dict:
    """Read COROS, ask the planner, and report. Never raises for a failed read or plan.

    Returns {ok, stage, status, error_type?, duration_ms, coros_ms, claude_ms, usage, plan?}.
    """
    started = time.monotonic()
    today = today or datetime.now(MELBOURNE).date()
    dates = plan_dates(today)
    result = {"ok": False, "stage": "read", "status": None, "coros_ms": None, "claude_ms": None, "usage": {}}

    read_started = time.monotonic()
    try:
        if reader is None:
            region = creds.get("COROS_REGION") or os.environ.get("COROS_REGION", "us")
            reader = CorosReader(creds["COROS_EMAIL"], creds["COROS_PASSWORD"], region)
        data = reader.read(today)
    except Exception as error:
        result.update(coros_ms=_ms(read_started), status="read_error", error_type=type(error).__name__)
        result["duration_ms"] = _ms(started)
        return result
    result["coros_ms"] = _ms(read_started)

    result["stage"] = "plan"
    plan_started = time.monotonic()
    try:
        planner = ClaudePlanner(client if client is not None else make_client(creds["CLAUDE_API_KEY"]))
        outcome = planner.suggest_week(data, dates)
    except Exception as error:  # e.g. a missing key or SDK
        result.update(claude_ms=_ms(plan_started), status="api_error", error_type=type(error).__name__)
        result["duration_ms"] = _ms(started)
        return result

    result.update(ok=outcome.ok, status=outcome.status, usage=outcome.usage, claude_ms=_ms(plan_started))
    if outcome.ok:
        result["plan"] = dataclasses.asdict(outcome.plan)
    else:
        result["error_type"] = outcome.error_type
    result["duration_ms"] = _ms(started)
    return result


def format_week(result: dict) -> str:
    if not result.get("ok"):
        return (
            f"No suggestion: stage={result.get('stage')} status={result.get('status')} "
            f"error_type={result.get('error_type')}"
        )
    plan = result["plan"]
    lines = [f"{'Date':<12}{'Session':<16}{'Min':>5}  {'HR target':<22}Reason"]
    for day in plan["days"]:
        weekday = date.fromisoformat(day["date"]).strftime("%a")
        lines.append(
            f"{weekday} {day['date'][5:]:<8}{day['session_type']:<16}{day['duration_min']:>5}  "
            f"{day['hr_target'] or '-':<22}{day['reason']}"
        )
    lines += ["", f"Why: {plan['rationale']}"]
    usage = result.get("usage") or {}
    lines.append(
        f"(tokens in/out: {usage.get('input_tokens')}/{usage.get('output_tokens')}; "
        f"took {result.get('duration_ms')} ms. Nothing was written to COROS.)"
    )
    return "\n".join(lines)


def main() -> int:
    creds = load_local_env()
    for key in KEYS:
        if not creds.get(key) and os.environ.get(key):
            creds[key] = os.environ[key]
    result = suggest_week(creds)
    print(format_week(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
