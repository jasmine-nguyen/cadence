"""Finer CAD-95 slice 1 tests: schema limits, .env loader, CLI output, plan checks, COROS reader."""

import json
import sys
import types
from datetime import date, datetime, timedelta
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

from backend import week_suggestion
from backend.workout_planner import PLAN_JSON_SCHEMA, parse_week
from backend.secrets import load_local_env

TODAY = date(2026, 10, 2)
DATES = ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]


def _week(**overrides):
    days = [
        {"date": d, "session_type": "rest", "duration_min": 0, "hr_target": "", "reason": "recover"} for d in DATES
    ]
    days[0] = {"date": DATES[0], "session_type": "walk_run", "duration_min": 25, "hr_target": "under 140", "reason": "r"}
    week = {"days": days, "rationale": "HRV steady"}
    week.update(overrides)
    return week


class Client:
    def __init__(self, text, stop_reason="end_turn"):
        self.calls = []
        response = SimpleNamespace(
            stop_reason=stop_reason,
            content=[SimpleNamespace(type="text", text=text)],
            usage=SimpleNamespace(input_tokens=10, output_tokens=20),
        )

        def create(**kwargs):
            self.calls.append(kwargs)
            return response

        self.beta = SimpleNamespace(messages=SimpleNamespace(create=create))


class Reader:
    def read(self, today):
        return {"activities": [], "daily": [], "planned": [], "sleep_available": False}


def _walk(node):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from _walk(value)
    elif isinstance(node, list):
        for value in node:
            yield from _walk(value)


def test_plan_schema_uses_only_structured_output_features():
    for node in _walk(PLAN_JSON_SCHEMA):
        assert "minimum" not in node and "maximum" not in node and "maxItems" not in node
        assert node.get("minItems", 0) <= 1
        if node.get("type") == "object":
            assert node.get("additionalProperties") is False


@pytest.mark.parametrize(
    "week",
    [
        _week(days=_week()["days"][:6] + [dict(_week()["days"][6], session_type="tempo")]),
        _week(days=_week()["days"][:6] + [dict(_week()["days"][6], duration_min=20)]),  # rest with minutes
        _week(days=_week()["days"][:6] + [dict(_week()["days"][6], duration_min=-1, session_type="easy_run")]),
        _week(days=_week()["days"][:6] + [dict(_week()["days"][6], date="2026-10-10")]),
        _week(rationale=""),
    ],
    ids=["unknown_type", "rest_with_minutes", "negative_minutes", "wrong_date", "no_rationale"],
)
def test_parse_week_rejects_bad_weeks(week):
    with pytest.raises(ValueError):
        parse_week(week, DATES)


def test_unknown_session_type_is_reported_as_malformed():
    week = _week()
    week["days"][2]["session_type"] = "intervals"
    result = week_suggestion.suggest_week({}, reader=Reader(), client=Client(json.dumps(week)), today=TODAY)
    assert (result["ok"], result["stage"], result["status"]) == (False, "plan", "malformed")


def test_cut_off_reply_is_reported_as_max_tokens():
    result = week_suggestion.suggest_week({}, reader=Reader(), client=Client("{", stop_reason="max_tokens"), today=TODAY)
    assert (result["ok"], result["status"]) == (False, "max_tokens")


def test_load_local_env_parses_keys_comments_and_quotes(tmp_path, monkeypatch):
    monkeypatch.delenv("COROS_EMAIL", raising=False)
    env = tmp_path / ".env"
    env.write_text('# comment\n\nCOROS_EMAIL="jas@example.com"\nCOROS_REGION=us\nCLAUDE_API_KEY=\'sk-x=y\'\n')

    assert load_local_env(env) == {"COROS_EMAIL": "jas@example.com", "COROS_REGION": "us", "CLAUDE_API_KEY": "sk-x=y"}
    assert "COROS_EMAIL" not in __import__("os").environ
    assert load_local_env(tmp_path / "missing") == {}


def test_main_prints_the_week_and_exits_zero(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    (tmp_path / ".env").write_text("COROS_EMAIL=a\nCOROS_PASSWORD=b\nCLAUDE_API_KEY=k\n")
    seen = {}
    real_suggest_week = week_suggestion.suggest_week

    def fake_suggest_week(creds):
        seen.update(creds)
        return real_suggest_week(creds, reader=Reader(), client=Client(json.dumps(_week())), today=TODAY)

    monkeypatch.setattr(week_suggestion, "suggest_week", fake_suggest_week)

    assert week_suggestion.main() == 0
    out = capsys.readouterr().out
    assert "Sat 10-03" in out and "walk_run" in out and "under 140" in out
    assert "HRV steady" in out
    assert seen["CLAUDE_API_KEY"] == "k"


def test_main_exits_one_when_there_is_no_suggestion(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(
        week_suggestion, "suggest_week", lambda creds: {"ok": False, "stage": "read", "status": "read_error", "error_type": "X"}
    )
    assert week_suggestion.main() == 1
    assert "stage=read" in capsys.readouterr().out


@pytest.fixture
def fake_coros(monkeypatch):
    """Pretend coros-mcp: records calls; mobile login, sleep and any write fail the test."""
    calls = []
    melbourne_morning = int(datetime(2026, 9, 29, 6, 30, tzinfo=ZoneInfo("Australia/Melbourne")).timestamp())

    async def login(email, password, region, *, skip_mobile=True):
        calls.append(("login", region, skip_mobile))
        return "auth"

    async def fetch_activities(auth, start, end, page=1, size=30):
        calls.append(("fetch_activities", start, end, page))
        if page > 1:
            return [], 1
        activity = SimpleNamespace(
            start_time=str(melbourne_morning), sport_name="Run", duration_seconds=1800, distance_meters=2400.0,
            avg_hr=140, max_hr=150, training_load=30, name="Morning run",
        )
        return [activity], 1

    async def fetch_daily_records(auth, start, end):
        calls.append(("fetch_daily_records", start, end))
        return [SimpleNamespace(date="20261001", avg_sleep_hrv=48.0, baseline=52.0, rhr=58, training_load=31,
                                training_load_ratio=0.9)]

    async def fetch_schedule_raw(auth, start, end):
        calls.append(("fetch_schedule_raw", start, end))
        return {
            "entities": [{"happenDay": 20261004, "idInPlan": 1}, {"happenDay": 20261020, "idInPlan": 2}],
            "programs": [{"idInPlan": 1, "name": "Easy 30", "duration": 1800}, {"idInPlan": 2, "name": "Later"}],
        }

    def forbidden(name):
        def fail(*args, **kwargs):
            raise AssertionError(f"reader called {name}")

        return fail

    api = types.ModuleType("coros_mcp.coros_api")
    for fn in (login, fetch_activities, fetch_daily_records, fetch_schedule_raw):
        setattr(api, fn.__name__, fn)
    for name in ("fetch_sleep", "login_mobile", "_mobile_login", "fetch_hrv", "add_workout", "schedule_workout"):
        setattr(api, name, forbidden(name))
    package = types.ModuleType("coros_mcp")
    package.coros_api = api
    monkeypatch.setitem(sys.modules, "coros_mcp", package)
    monkeypatch.setitem(sys.modules, "coros_mcp.coros_api", api)
    return calls


def test_coros_reader_reads_28_days_and_next_7_without_mobile_login(fake_coros):
    from backend.coros_client import CorosReader

    data = CorosReader("jas@example.com", "pw", "us").read(TODAY)

    assert fake_coros[0] == ("login", "us", True)
    assert ("fetch_activities", "20260904", "20261001", 1) in fake_coros
    assert ("fetch_daily_records", "20260904", "20261001") in fake_coros
    assert ("fetch_schedule_raw", "20261003", "20261009") in fake_coros
    assert data == {
        "activities": [
            {"date": "2026-09-29", "sport_name": "Run", "minutes": 30, "distance_km": 2.4, "avg_hr": 140,
             "max_hr": 150, "training_load": 30, "name": "Morning run"}
        ],
        "daily": [{"date": "2026-10-01", "sleep_hrv": 48.0, "hrv_baseline": 52.0, "rhr": 58, "training_load": 31,
                   "load_ratio": 0.9}],
        "planned": [{"date": "2026-10-04", "name": "Easy 30", "planned_min": 30}],
        "sleep_available": False,
    }
    json.dumps(data)  # JSON-safe


def test_default_reader_takes_region_from_creds_then_environment(fake_coros, monkeypatch):
    monkeypatch.setenv("COROS_REGION", "eu")
    creds = {"COROS_EMAIL": "a", "COROS_PASSWORD": "b"}
    week_suggestion.suggest_week(creds, client=Client(json.dumps(_week())), today=TODAY)
    week_suggestion.suggest_week(dict(creds, COROS_REGION="us"), client=Client(json.dumps(_week())), today=TODAY)

    assert [c[1] for c in fake_coros if c[0] == "login"] == ["eu", "us"]
