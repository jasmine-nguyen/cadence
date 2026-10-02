"""CAD-95: the spike Lambda's one-off, by-hand `sleep` mode.

Jas runs it once to find out whether coros-mcp's mobile (phone-app style) login
logs her COROS phone app out. It must use the mobile login only, never the web
login or any stored-auth write, read the last 3 Melbourne nights, return
per-night stage minutes in the reply only, and log just ok/stage/error_type/
duration_ms. Nightly and plan modes must still never touch the mobile login.
"""

import json
import subprocess
import sys
import types
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from tests.test_cad83_spike import SECRETS, _FakeSpeediance
from tests.test_cad83_spike import spike  # noqa: F401  (pytest fixture)

# 2026-10-02 15:00Z is already 3 October (01:00) in Melbourne.
FROZEN_UTC = datetime(2026, 10, 2, 15, 0, tzinfo=timezone.utc)
STATUS_FIELDS = {"ok", "stage", "error_type", "duration_ms"}


class _FrozenDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return FROZEN_UTC.astimezone(tz) if tz else FROZEN_UTC.replace(tzinfo=None)


def _install(monkeypatch, *, records=None, mobile_error=None, read_error=None):
    """Fake coros_mcp: records every call; the web login and auth saving must never run."""
    calls = []

    for name in list(sys.modules):
        if name == "coros_mcp" or name.startswith("coros_mcp."):
            monkeypatch.delitem(sys.modules, name, raising=False)

    async def _mobile_login(email, password, region="eu"):
        calls.append(("_mobile_login", email, region))
        if mobile_error:
            raise mobile_error
        return "mobile-token-123", {"encrypted": "payload"}

    async def fetch_sleep(auth, start_day, end_day):
        calls.append(("fetch_sleep", start_day, end_day, auth.mobile_access_token, auth.access_token))
        if read_error:
            raise read_error
        return records if records is not None else []

    def forbidden(name):
        async def _call(*args, **kwargs):
            calls.append((name,))
            raise AssertionError(f"sleep mode must not call {name}")

        return _call

    class StoredAuth(SimpleNamespace):
        pass

    pkg = types.ModuleType("coros_mcp")
    pkg.__path__ = []
    api = types.ModuleType("coros_mcp.coros_api")
    api._mobile_login = _mobile_login
    api.fetch_sleep = fetch_sleep
    for name in ("login", "login_mobile", "_save_auth", "fetch_schedule", "fetch_schedule_raw",
                 "schedule_workout", "remove_scheduled_workout"):
        setattr(api, name, forbidden(name))
    models = types.ModuleType("coros_mcp.models")
    models.StoredAuth = StoredAuth
    pkg.coros_api = api
    pkg.models = models
    monkeypatch.setitem(sys.modules, "coros_mcp", pkg)
    monkeypatch.setitem(sys.modules, "coros_mcp.coros_api", api)
    monkeypatch.setitem(sys.modules, "coros_mcp.models", models)
    return calls


def _night(date, deep, light, rem, awake):
    phases = SimpleNamespace(deep_minutes=deep, light_minutes=light, rem_minutes=rem, awake_minutes=awake)
    return SimpleNamespace(date=date, phases=phases, avg_hr=52, total_duration_minutes=deep + light + rem)


def _run(spike, monkeypatch, capsys, **kwargs):  # noqa: F811
    monkeypatch.setattr(spike, "datetime", _FrozenDatetime)
    calls = _install(monkeypatch, **kwargs)
    speediance = _FakeSpeediance(returncode=0)
    monkeypatch.setattr(subprocess, "run", speediance)
    result = spike.handler({"mode": "sleep"}, None)
    lines = [line for line in capsys.readouterr().out.splitlines() if line.strip()]
    return result, lines, calls, speediance


def test_sleep_mode_uses_the_mobile_login_only_and_returns_three_nights(spike, monkeypatch, capsys):  # noqa: F811
    records = [
        _night("20261003", 70, 200, 90, 15),
        _night("20261001", 60, 210, 80, 20),
        SimpleNamespace(date="20261002", phases=None),  # a night with no stage data
    ]
    result, lines, calls, speediance = _run(spike, monkeypatch, capsys, records=records)

    names = [call[0] for call in calls]
    assert names == ["_mobile_login", "fetch_sleep"]
    assert calls[0][1:] == (SECRETS["COROS_EMAIL"], "us")
    # Last 3 Melbourne nights, using only the in-memory mobile token.
    assert calls[1][1:] == ("20261001", "20261003", "mobile-token-123", "")
    assert speediance.calls == []

    coros = result["coros"]
    assert result["mode"] == "sleep"
    assert coros["ok"] is True and coros["stage"] == "summarise"
    assert coros["nights"] == [
        {"date": "2026-10-01", "deep_min": 60, "light_min": 210, "rem_min": 80, "awake_min": 20},
        {"date": "2026-10-02", "deep_min": None, "light_min": None, "rem_min": None, "awake_min": None},
        {"date": "2026-10-03", "deep_min": 70, "light_min": 200, "rem_min": 90, "awake_min": 15},
    ]

    logged = json.loads(lines[-1])
    assert logged["mode"] == "sleep"
    assert set(logged["coros"]) <= STATUS_FIELDS
    assert "nights" not in lines[-1] and "2026-10-0" not in lines[-1]
    for value in SECRETS.values():
        assert value not in json.dumps(result) and value not in "\n".join(lines)


@pytest.mark.parametrize(
    "kwargs, stage",
    [
        ({"mobile_error": RuntimeError("login refused for jas@example.com: captcha")}, "mobile_login"),
        ({"read_error": RuntimeError("server said: Sunday Long Run")}, "read"),
    ],
)
def test_sleep_mode_reports_failures_by_type_only(spike, monkeypatch, capsys, kwargs, stage):  # noqa: F811
    result, lines, calls, _ = _run(spike, monkeypatch, capsys, **kwargs)

    coros = result["coros"]
    assert coros["ok"] is False and coros["stage"] == stage
    assert coros["error_type"] == "RuntimeError"
    assert "error" not in coros  # no error text: it could echo server data
    assert "captcha" not in "\n".join(lines) and "Long Run" not in "\n".join(lines)
    assert set(json.loads(lines[-1])["coros"]) <= STATUS_FIELDS


def test_sleep_is_a_known_mode_but_never_scheduled(spike):  # noqa: F811
    from pathlib import Path

    assert "sleep" in spike.MODES
    tf = (Path(spike.__file__).parent / "main.tf").read_text()
    assert '"sleep"' not in tf and "mode=\"sleep\"" not in tf.replace(" ", "")
