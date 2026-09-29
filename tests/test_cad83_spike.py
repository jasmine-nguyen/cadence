"""Acceptance tests for CAD-83: the throwaway Lambda that checks whether COROS and
Speediance accept calls from AWS.

The seam is `handler(event, context)`. Stand-ins replace only the system
boundaries: the coros-mcp library (injected via sys.modules, so CI doesn't need it
installed), the speediance-cli subprocess, the Secrets Manager loader and the
egress-IP HTTP call.
"""

import importlib
import json
import subprocess
import sys
import types
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

SECRETS = {
    "COROS_EMAIL": "jas.coros@example.com",
    "COROS_PASSWORD": "c0r0s-Sup3rS3cret!",
    "SPEEDIANCE_EMAIL": "jas.gm2@example.com",
    "SPEEDIANCE_PASSWORD": "Sp33d-Hush-Hush#9",
}

SPEEDIANCE_BIN = "/var/task/speediance-cli"


def _melbourne_today():
    return datetime.now(ZoneInfo("Australia/Melbourne")).strftime("%Y%m%d")


class _FakeCoros:
    """Stand-in for coros_mcp.coros_api that records how it was called."""

    def __init__(self, login_error=None):
        self.login_error = login_error
        self.login_calls = []
        self.schedule_calls = []
        self.home_at_login = None

    def install(self, monkeypatch):
        for name in list(sys.modules):
            if name == "coros_mcp" or name.startswith("coros_mcp."):
                monkeypatch.delitem(sys.modules, name, raising=False)

        fake = self

        class CorosAPIError(Exception):
            pass

        async def login(email, password, region="eu", *, skip_mobile=True):
            import os

            fake.home_at_login = os.environ.get("HOME")
            fake.login_calls.append(
                {"email": email, "password": password, "region": region, "skip_mobile": skip_mobile}
            )
            if fake.login_error is not None:
                raise fake.login_error
            return object()

        async def fetch_schedule(auth, start_day, end_day):
            fake.schedule_calls.append((start_day, end_day))
            return {"entities": [{"secret_plan": "tempo"}], "programs": []}

        pkg = types.ModuleType("coros_mcp")
        pkg.__path__ = []
        api = types.ModuleType("coros_mcp.coros_api")
        api.login = login
        api.fetch_schedule = fetch_schedule
        api.CorosAPIError = CorosAPIError
        pkg.coros_api = api
        monkeypatch.setitem(sys.modules, "coros_mcp", pkg)
        monkeypatch.setitem(sys.modules, "coros_mcp.coros_api", api)


class _FakeSpeediance:
    """Stand-in for subprocess.run running speediance-cli."""

    def __init__(self, returncode=0, stderr=""):
        self.returncode = returncode
        self.stderr = stderr
        self.calls = []

    def __call__(self, args, *pos, **kwargs):
        self.calls.append({"args": list(args), "env": kwargs.get("env")})
        text = kwargs.get("text") or kwargs.get("universal_newlines") or kwargs.get("encoding")
        out, err = ("", self.stderr) if text else (b"", self.stderr.encode())
        return subprocess.CompletedProcess(args, self.returncode, stdout=out, stderr=err)


@pytest.fixture
def spike(monkeypatch):
    """Import the spike handler with every system boundary replaced."""
    monkeypatch.setenv("HOME", "/home/not-writable-on-lambda")
    monkeypatch.setenv("SPEEDIANCE_BIN", SPEEDIANCE_BIN)
    monkeypatch.setenv("COROS_REGION", "us")
    monkeypatch.setenv("SPIKE_SECRET_ID", "arn:aws:secretsmanager:ap-southeast-2:000000000000:secret:test")
    monkeypatch.delenv("SPEEDIANCE_TOKEN_CACHE", raising=False)
    monkeypatch.delenv("SPEEDIANCE_ARGS", raising=False)

    def no_network(*args, **kwargs):
        raise OSError("network disabled in tests")

    monkeypatch.setattr(urllib.request, "urlopen", no_network)

    module = importlib.import_module("spikes.cad83_lambda_reachability.handler")
    monkeypatch.setattr(module, "_load_secret", lambda: dict(SECRETS))
    return module


def test_lambda_logs_in_to_coros_reads_todays_schedule_and_runs_speediance_login(
    spike, monkeypatch, capsys
):
    coros = _FakeCoros()
    coros.install(monkeypatch)
    speediance = _FakeSpeediance(returncode=0)
    monkeypatch.setattr(subprocess, "run", speediance)

    before = _melbourne_today()
    result = spike.handler({}, None)
    after = _melbourne_today()

    # COROS: web-only login in region "us", with HOME pointed at writable /tmp.
    assert result["coros"]["ok"] is True
    assert len(coros.login_calls) == 1
    call = coros.login_calls[0]
    assert call["email"] == SECRETS["COROS_EMAIL"]
    assert call["password"] == SECRETS["COROS_PASSWORD"]
    assert call["region"] == "us"
    assert call["skip_mobile"] is True
    assert coros.home_at_login == "/tmp"

    # Today's schedule, using the Melbourne date.
    assert len(coros.schedule_calls) == 1
    start_day, end_day = coros.schedule_calls[0]
    assert start_day == end_day
    assert start_day in {before, after}

    # Speediance: the binary runs `login` with its token cache under /tmp.
    assert result["speediance"]["ok"] is True
    assert len(speediance.calls) == 1
    run = speediance.calls[0]
    assert run["args"][0] == SPEEDIANCE_BIN
    assert "login" in run["args"]
    assert run["env"] is not None
    assert run["env"]["SPEEDIANCE_TOKEN_CACHE"].startswith("/tmp/")

    # One JSON log line matching the returned summary, with no schedule contents.
    lines = [line for line in capsys.readouterr().out.splitlines() if line.strip()]
    assert len(lines) == 1
    assert json.loads(lines[0]) == result
    assert "secret_plan" not in json.dumps(result)
    assert "tempo" not in json.dumps(result)


def test_each_service_is_reported_independently_and_secrets_never_leak(
    spike, monkeypatch, capsys
):
    coros = _FakeCoros(
        login_error=RuntimeError(
            f"login rejected for {SECRETS['COROS_EMAIL']} with password {SECRETS['COROS_PASSWORD']}"
        )
    )
    coros.install(monkeypatch)
    speediance = _FakeSpeediance(
        returncode=1,
        stderr=(
            f"error: auth failed for {SECRETS['SPEEDIANCE_EMAIL']} "
            f"password={SECRETS['SPEEDIANCE_PASSWORD']}\n"
        ),
    )
    monkeypatch.setattr(subprocess, "run", speediance)

    result = spike.handler({}, None)

    # COROS failed at login, so the schedule was never read.
    assert result["coros"]["ok"] is False
    assert result["coros"]["stage"] == "login"
    assert coros.schedule_calls == []

    # Speediance still ran despite the COROS failure, and its failure is reported.
    assert len(speediance.calls) == 1
    assert result["speediance"]["ok"] is False
    assert result["speediance"]["returncode"] == 1

    # No secret value appears in the returned summary or the log output.
    returned = json.dumps(result)
    logged = capsys.readouterr().out
    for value in SECRETS.values():
        assert value not in returned
        assert value not in logged
