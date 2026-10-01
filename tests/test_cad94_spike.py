"""Acceptance test for CAD-94: the CAD-83 spike Lambda gains three event modes.

- `write`: add one COROS test run ~14 days ahead, read back, remove, read back.
- `contents`: next 7 days of COROS + last 7 days of Speediance, in the invoke
  response only (never printed to the logs).
- `nightly`: login + read only, logging just pass/fail, stage, error type, timings.

The seam is `handler(event, context)`. Stand-ins replace only the system
boundaries: coros-mcp (via sys.modules, with an in-memory calendar), the
speediance-cli subprocess and the Secrets Manager loader, as in the CAD-83 tests.
"""

import json
import subprocess
import sys
import types
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from tests.test_cad83_spike import SECRETS, SPEEDIANCE_BIN
from tests.test_cad83_spike import spike  # noqa: F401  (pytest fixture)

MELBOURNE = ZoneInfo("Australia/Melbourne")
TEST_NAME = "CADENCE TEST – delete me"  # en dash, exactly as on the card
NIGHTLY_ALLOWED = {"ok", "stage", "error_type", "duration_ms"}


def _day(offset):
    return datetime.now(MELBOURNE).date() + timedelta(days=offset)


def _ymd(offset):
    return _day(offset).strftime("%Y%m%d")


class _FakeCorosCalendar:
    """Stand-in for coros_mcp.coros_api with an in-memory calendar.

    Raw schedule shape follows coros-mcp's fetch_schedule_raw: top-level `id`
    (plan id), `entities[]` (happenDay, idInPlan, planProgramId, planId) and
    `programs[]` (idInPlan, name, duration in seconds).
    """

    PLAN_ID = 987654

    def __init__(self, copies=1):
        self.copies = copies
        self.entries = []  # dicts: happenDay(int), idInPlan(str), name, duration
        self.next_id = 100
        self.login_calls = []
        self.schedule_calls = []
        self.raw_calls = []
        self.add_calls = []
        self.remove_calls = []

    def add_existing(self, offset, name, duration_secs):
        self.next_id += 1
        self.entries.append(
            {"happenDay": int(_ymd(offset)), "idInPlan": str(self.next_id), "name": name, "duration": duration_secs}
        )

    def names(self):
        return [entry["name"] for entry in self.entries]

    def install(self, monkeypatch):
        for name in list(sys.modules):
            if name == "coros_mcp" or name.startswith("coros_mcp."):
                monkeypatch.delitem(sys.modules, name, raising=False)

        fake = self

        async def login(email, password, region="eu", *, skip_mobile=True):
            fake.login_calls.append({"email": email, "region": region, "skip_mobile": skip_mobile})
            return object()

        def _raw(start_day, end_day):
            low, high = int(start_day), int(end_day)
            chosen = [e for e in fake.entries if low <= e["happenDay"] <= high]
            return {
                "id": fake.PLAN_ID,
                "entities": [
                    {
                        "happenDay": e["happenDay"],
                        "idInPlan": e["idInPlan"],
                        "planProgramId": e["idInPlan"],
                        "planId": fake.PLAN_ID,
                    }
                    for e in chosen
                ],
                "programs": [
                    {"idInPlan": e["idInPlan"], "name": e["name"], "duration": e["duration"]} for e in chosen
                ],
            }

        async def fetch_schedule(auth, start_day, end_day):
            fake.schedule_calls.append((start_day, end_day))
            return _raw(start_day, end_day)

        async def fetch_schedule_raw(auth, start_day, end_day):
            fake.raw_calls.append((start_day, end_day))
            return _raw(start_day, end_day)

        async def schedule_workout(auth, name, steps, happen_day, sport_type=2, intensity_type=None, sort_no=1):
            fake.add_calls.append({"name": name, "steps": steps, "happen_day": happen_day, "sport_type": sport_type})
            first_id = None
            for _ in range(fake.copies):
                fake.next_id += 1
                first_id = first_id or str(fake.next_id)
                minutes = sum(step.get("duration_minutes", 0) for step in steps)
                fake.entries.append(
                    {"happenDay": int(happen_day), "idInPlan": str(fake.next_id), "name": name, "duration": minutes * 60}
                )
            return {
                "plan_id": str(fake.PLAN_ID),
                "id_in_plan": first_id,
                "plan_program_id": first_id,
                "entity_id": first_id,
                "enrichment_ok": True,
            }

        async def remove_scheduled_workout(auth, plan_id, id_in_plan, plan_program_id):
            fake.remove_calls.append({"plan_id": plan_id, "id_in_plan": str(id_in_plan)})
            fake.entries = [e for e in fake.entries if e["idInPlan"] != str(id_in_plan)]
            return None

        pkg = types.ModuleType("coros_mcp")
        pkg.__path__ = []
        api = types.ModuleType("coros_mcp.coros_api")
        api.login = login
        api.fetch_schedule = fetch_schedule
        api.fetch_schedule_raw = fetch_schedule_raw
        api.schedule_workout = schedule_workout
        api.remove_scheduled_workout = remove_scheduled_workout
        api.CorosAPIError = type("CorosAPIError", (Exception,), {})
        pkg.coros_api = api
        monkeypatch.setitem(sys.modules, "coros_mcp", pkg)
        monkeypatch.setitem(sys.modules, "coros_mcp.coros_api", api)


SPEEDIANCE_WORKOUTS = [
    {
        "training_id": 501,
        "title": "Glute Builder Session",
        "date": _day(-2).isoformat(),
        "duration_secs": 2400,
        "calories": 310,
        "kind": "course",
    },
]


class _FakeSpeedianceCli:
    """Stand-in for subprocess.run running speediance-cli; `workouts` prints JSON."""

    def __init__(self):
        self.calls = []

    def __call__(self, args, *pos, **kwargs):
        args = list(args)
        self.calls.append(args)
        stdout = json.dumps(SPEEDIANCE_WORKOUTS) if "workouts" in args else ""
        return subprocess.CompletedProcess(args, 0, stdout=stdout, stderr="logged in\n")


def _log_lines(capsys):
    return [line for line in capsys.readouterr().out.splitlines() if line.strip()]


def test_jas_can_run_the_write_test_contents_check_and_nightly_run_safely(spike, monkeypatch, capsys):  # noqa: F811
    # A stale SPEEDIANCE_ARGS must never steer the new modes into a push.
    monkeypatch.setenv("SPEEDIANCE_ARGS", "push x")

    coros = _FakeCorosCalendar(copies=1)
    coros.add_existing(14, "Long run with strides", 3600)  # real entry on the test day
    coros.add_existing(3, "Tempo intervals", 2700)  # real entry inside the next 7 days
    coros.add_existing(9, "Hill repeats", 1800)  # real entry outside the next 7 days
    coros.install(monkeypatch)
    speediance = _FakeSpeedianceCli()
    monkeypatch.setattr(subprocess, "run", speediance)

    # --- write: one test run ~14 days ahead, exactly once, then removed ----------
    result = spike.handler({"mode": "write"}, None)
    write = result.get("coros", result)

    assert len(coros.login_calls) == 1
    assert coros.login_calls[0]["skip_mobile"] is True
    assert coros.login_calls[0]["region"] == "us"

    assert len(coros.add_calls) == 1
    add = coros.add_calls[0]
    assert add["name"] == TEST_NAME
    assert add["sport_type"] == 100
    assert str(add["happen_day"]) == _ymd(14)

    assert write["copies_after_add"] == 1
    assert write["copies_after_remove"] == 0
    assert write["duplicate"] is False
    assert write["ok"] is True

    # The test entry is gone; every other calendar entry is untouched.
    assert TEST_NAME not in coros.names()
    assert sorted(coros.names()) == sorted(["Long run with strides", "Tempo intervals", "Hill repeats"])
    assert all(call["id_in_plan"] not in {"101", "102", "103"} for call in coros.remove_calls)
    assert speediance.calls == []  # write mode is COROS only
    _log_lines(capsys)

    # --- contents: returned in the response, never printed --------------------
    result = spike.handler({"mode": "contents"}, None)

    assert (_ymd(0), _ymd(6)) in coros.raw_calls
    assert result["mode"] == "contents"
    assert result["coros"]["next_7_days"] == [
        {"date": _day(3).isoformat(), "name": "Tempo intervals", "planned_min": 45},
    ]
    assert result["speediance"]["last_7_days"] == [
        {"date": _day(-2).isoformat(), "name": "Glute Builder Session", "duration_min": 40},
    ]
    assert speediance.calls[-1] == [SPEEDIANCE_BIN, "workouts", "--days", "7", "--json"]

    logged = "\n".join(_log_lines(capsys))
    for name in ("Tempo intervals", "Glute Builder Session", "Long run with strides", "Hill repeats"):
        assert name not in logged

    # --- nightly: login + read only, minimal log line --------------------------
    speediance.calls.clear()
    adds_before = len(coros.add_calls)
    removes_before = len(coros.remove_calls)

    result = spike.handler({"mode": "nightly"}, None)

    assert len(coros.add_calls) == adds_before
    assert len(coros.remove_calls) == removes_before
    assert speediance.calls == [
        [SPEEDIANCE_BIN, "login"],
        [SPEEDIANCE_BIN, "workouts", "--days", "1", "--json"],
    ]
    assert result["coros"]["ok"] is True
    assert result["speediance"]["ok"] is True

    lines = _log_lines(capsys)
    assert len(lines) == 1
    line = json.loads(lines[0])
    assert set(line) == {"mode", "date", "coros", "speediance"}
    assert line["mode"] == "nightly"
    assert set(line["coros"]) <= NIGHTLY_ALLOWED
    assert set(line["speediance"]) <= NIGHTLY_ALLOWED
    for name in ("Tempo intervals", "Glute Builder Session", "logged in"):
        assert name not in lines[0]

    # Nothing in any mode ever pushed to Speediance.
    assert not any("push" in call for call in speediance.calls)

    # No secret value in the nightly response or log.
    for value in SECRETS.values():
        assert value not in json.dumps(result)
        assert value not in lines[0]
