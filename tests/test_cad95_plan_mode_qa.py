"""QA for CAD-95 slice 2: the spike Lambda's `plan` mode, its packaging and Terraform.

Adversarial companion to tests/test_cad95_plan_mode.py: failure paths through the
real handler, the Melbourne date boundary, log hygiene on failure, and a real run
of build.sh (with pip/file stubbed) to prove the
bundled `backend/` package imports on its own.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import types
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

from tests.test_cad83_spike import SECRETS, _FakeSpeediance
from tests.test_cad83_spike import spike  # noqa: F401  (pytest fixture)
from tests.test_cad95_plan_mode import _install_fake_coros, _last_log_line

REPO = Path(__file__).resolve().parent.parent
SPIKE_DIR = REPO / "spikes" / "cad83_lambda_reachability"
CLAUDE_KEY = "sk-claude-qa-K3y-n0t-real"
SECRET_TEXT = "SECRET-TEXT-SENTINEL calendar note"
LOG_FIELDS = {"mode", "ok", "stage", "status", "error_type", "duration_ms", "coros_ms", "claude_ms", "usage"}


def _install_anthropic(monkeypatch, seen, *, stop_reason="end_turn", text="{}", raises=None):
    def create(**kwargs):
        seen["request"] = kwargs
        if raises is not None:
            raise raises
        return SimpleNamespace(
            stop_reason=stop_reason,
            content=[SimpleNamespace(type="text", text=text)],
            usage=SimpleNamespace(input_tokens=11, output_tokens=22),
        )

    class Anthropic:
        def __init__(self, api_key=None, **kwargs):
            seen["api_key"] = api_key
            seen["client_kwargs"] = kwargs
            self.beta = SimpleNamespace(messages=SimpleNamespace(create=create))
            self.messages = SimpleNamespace(create=create)

    module = types.ModuleType("anthropic")
    module.Anthropic = Anthropic
    monkeypatch.setitem(sys.modules, "anthropic", module)


def _week(dates, reason="easy"):
    return {
        "days": [
            {"date": d, "session_type": "rest", "duration_min": 0, "hr_target": "", "reason": reason}
            for d in dates
        ],
        "rationale": "HRV near baseline",
    }


def _setup(spike, monkeypatch, secret=None):  # noqa: F811
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(spike, "_load_secret", lambda: dict(secret or {**SECRETS, "CLAUDE_API_KEY": CLAUDE_KEY}))
    speediance = _FakeSpeediance(returncode=0)
    monkeypatch.setattr(subprocess, "run", speediance)
    calls = []
    _install_fake_coros(monkeypatch, calls)
    return calls, speediance


def _assert_log_is_status_only(log, *forbidden):
    assert log["mode"] == "plan"
    assert set(log) <= LOG_FIELDS
    text = json.dumps(log)
    for leaked in (CLAUDE_KEY, *SECRETS.values(), *forbidden):
        assert leaked not in text


# --- Failure paths through the real handler ---------------------------------


def test_refusal_is_reported_in_reply_and_log_without_text(spike, monkeypatch, capsys):  # noqa: F811
    # [A1]
    _setup(spike, monkeypatch)
    seen = {}
    _install_anthropic(monkeypatch, seen, stop_reason="refusal", text=SECRET_TEXT)

    result = spike.handler({"mode": "plan"}, None)
    log = _last_log_line(capsys.readouterr().out)

    assert result["ok"] is False
    assert result["stage"] == "plan"
    assert result["status"] == "refusal"
    assert "plan" not in result
    assert SECRET_TEXT not in json.dumps(result)
    assert log["status"] == "refusal" and log["ok"] is False
    assert log["usage"] == {"input_tokens": 11, "output_tokens": 22}
    _assert_log_is_status_only(log, SECRET_TEXT)


def test_api_exception_is_reported_with_type_only(spike, monkeypatch, capsys):  # noqa: F811
    # [A2] The exception message must not reach the reply or the log.
    _setup(spike, monkeypatch)

    class APIConnectionError(Exception):
        pass

    _install_anthropic(monkeypatch, {}, raises=APIConnectionError(SECRET_TEXT))

    result = spike.handler({"mode": "plan"}, None)
    log = _last_log_line(capsys.readouterr().out)

    assert result["ok"] is False and result["stage"] == "plan"
    assert result["status"] == "api_error"
    assert result["error_type"] == "APIConnectionError"
    assert SECRET_TEXT not in json.dumps(result)
    assert log["error_type"] == "APIConnectionError"
    _assert_log_is_status_only(log, SECRET_TEXT)


def test_malformed_week_is_reported_and_its_text_never_logged(spike, monkeypatch, capsys):  # noqa: F811
    # [A3] Six days instead of seven.
    _setup(spike, monkeypatch)
    today = datetime.now(spike.MELBOURNE).date()
    from backend.week_suggestion import plan_dates

    _install_anthropic(monkeypatch, {}, text=json.dumps(_week(plan_dates(today)[:6], reason=SECRET_TEXT)))

    result = spike.handler({"mode": "plan"}, None)
    log = _last_log_line(capsys.readouterr().out)

    assert result["ok"] is False and result["status"] == "malformed"
    assert "plan" not in result
    _assert_log_is_status_only(log, SECRET_TEXT)


def test_coros_read_failure_is_stage_read_and_claude_never_called(spike, monkeypatch, capsys):  # noqa: F811
    # [A4]
    calls, _ = _setup(spike, monkeypatch)
    seen = {}
    _install_anthropic(monkeypatch, seen)

    async def broken(*args, **kwargs):
        raise RuntimeError(SECRET_TEXT)

    sys.modules["coros_mcp.coros_api"].fetch_activities = broken

    result = spike.handler({"mode": "plan"}, None)
    log = _last_log_line(capsys.readouterr().out)

    assert result["ok"] is False
    assert result["stage"] == "read"
    assert result["error_type"] == "RuntimeError"
    assert "request" not in seen
    assert SECRET_TEXT not in json.dumps(result)
    assert log["stage"] == "read"
    _assert_log_is_status_only(log, SECRET_TEXT)


def test_missing_claude_key_in_secret_is_reported_not_raised(spike, monkeypatch, capsys):  # noqa: F811
    # [A5] The secret was put without CLAUDE_API_KEY (README step 1 skipped).
    _setup(spike, monkeypatch, secret=dict(SECRETS))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "must-not-be-used")
    seen = {}
    _install_anthropic(monkeypatch, seen)

    result = spike.handler({"mode": "plan"}, None)
    log = _last_log_line(capsys.readouterr().out)

    assert result["ok"] is False and result["stage"] == "plan"
    assert result["status"] == "api_error"
    assert result["error_type"] == "KeyError"
    assert "api_key" not in seen  # never fell back to ANTHROPIC_API_KEY
    _assert_log_is_status_only(log)


def test_missing_backend_module_is_stage_import(spike, monkeypatch, capsys):  # noqa: F811
    # [A6] A package built without backend/ reports import, not a crash.
    _setup(spike, monkeypatch)
    _install_anthropic(monkeypatch, {})
    monkeypatch.setitem(sys.modules, "backend.week_suggestion", None)  # import raises ImportError

    result = spike.handler({"mode": "plan"}, None)
    log = _last_log_line(capsys.readouterr().out)

    assert result == {"mode": "plan", "ok": False, "stage": "import", "error_type": "ModuleNotFoundError",
                      "duration_ms": result["duration_ms"]}
    assert log["stage"] == "import"
    _assert_log_is_status_only(log)


def test_plan_mode_points_home_at_tmp_before_coros_login(spike, monkeypatch):  # noqa: F811
    # [A7] coros-mcp's token folder comes from HOME; only /tmp is writable on Lambda.
    _setup(spike, monkeypatch)
    _install_anthropic(monkeypatch, {}, stop_reason="refusal")
    api = sys.modules["coros_mcp.coros_api"]
    original = api.login
    homes = []

    async def login(*args, **kwargs):
        homes.append(os.environ.get("HOME"))
        return await original(*args, **kwargs)

    api.login = login
    spike.handler({"mode": "plan"}, None)
    assert homes == ["/tmp"]


# --- Dates, reply shape and secrets ----------------------------------------


def test_plan_dates_follow_melbourne_not_utc_across_midnight(spike, monkeypatch):  # noqa: F811
    # [A8] 14:30 UTC on 2 Oct is 00:30 on 3 Oct in Melbourne: tomorrow is 4 Oct.
    _setup(spike, monkeypatch)
    import backend.week_suggestion as suggest

    fixed = datetime(2026, 10, 2, 14, 30, tzinfo=timezone.utc)

    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed.astimezone(tz) if tz else fixed.replace(tzinfo=None)

    monkeypatch.setattr(suggest, "datetime", FrozenDatetime)
    expected = [f"2026-10-{day:02d}" for day in range(4, 11)]
    seen = {}
    _install_anthropic(monkeypatch, seen, text=json.dumps(_week(expected)))

    result = spike.handler({"mode": "plan"}, None)

    assert result["ok"] is True
    assert [day["date"] for day in result["plan"]["days"]] == expected
    assert expected[0] in json.dumps(seen["request"]["messages"])


def test_plan_reply_is_json_serialisable_and_scrubs_echoed_secrets(spike, monkeypatch, capsys):  # noqa: F811
    # [A9] Lambda must serialise the reply; a reason echoing a credential is masked.
    _setup(spike, monkeypatch)
    today = datetime.now(spike.MELBOURNE).date()
    from backend.week_suggestion import plan_dates

    echoed = f"Email {SECRETS['COROS_EMAIL']} key {CLAUDE_KEY}"
    _install_anthropic(monkeypatch, {}, text=json.dumps(_week(plan_dates(today), reason=echoed)))

    result = spike.handler({"mode": "plan"}, None)
    log = _last_log_line(capsys.readouterr().out)

    _assert_log_is_status_only(log, "Email", "HRV near baseline", *plan_dates(today))
    text = json.dumps(result)
    assert result["ok"] is True
    assert SECRETS["COROS_EMAIL"] not in text and CLAUDE_KEY not in text
    assert "***" in result["plan"]["days"][0]["reason"]


# --- Terraform --------------------------------------------------------------


def test_terraform_timeout_covers_the_claude_client_timeout(spike, monkeypatch):  # noqa: F811
    # [A11] Lambda timeout >= 600 and above the SDK client timeout, so an
    # api_error can still be reported before Lambda kills the run.
    tf = (SPIKE_DIR / "main.tf").read_text()
    lambda_timeout = int(re.search(r'resource "aws_lambda_function" "spike" \{.*?timeout\s*=\s*(\d+)', tf, re.S).group(1))
    assert lambda_timeout >= 600

    seen = {}
    _install_anthropic(monkeypatch, seen)
    from backend.workout_planners.claude import make_client

    make_client("k")
    assert seen["client_kwargs"]["timeout"] < lambda_timeout


def test_scheduler_still_invokes_only_nightly():
    # [A12] Plan mode is manual only; the schedule input is unchanged.
    tf = (SPIKE_DIR / "main.tf").read_text()
    inputs = re.findall(r"input\s*=\s*(.+)", tf)
    assert inputs == ['jsonencode({ mode = "nightly" })']
    assert '"plan"' not in tf and "mode = \"plan\"" not in tf


# --- build.sh, run for real with pip/file stubbed ---------------------------


def _stub(path, body):
    path.write_text("#!/usr/bin/env bash\n" + body)
    path.chmod(0o755)


@pytest.mark.skipif(shutil.which("bash") is None or shutil.which("zip") is None, reason="needs bash + zip")
def test_build_bundles_backend_sources_only_and_backend_wheels_for_arm64(tmp_path):
    # [A13] Copy a repo-shaped tree, stub pip and `file`, run build.sh for real.
    root = tmp_path / "repo"
    spike_dir = root / "spikes" / "cad83_lambda_reachability"
    spike_dir.mkdir(parents=True)
    for name in ("build.sh", "handler.py", "__init__.py", "requirements.txt"):
        shutil.copy(SPIKE_DIR / name, spike_dir / name)
    (spike_dir / "bin").mkdir()
    (spike_dir / "bin" / "speediance-cli").write_text("binary")
    shutil.copytree(REPO / "backend", root / "backend", ignore=shutil.ignore_patterns("__pycache__"))
    # Things that must never be bundled.
    (root / "backend" / ".env").write_text("CLAUDE_API_KEY=leak\n")
    (root / "backend" / ".venv").mkdir()
    (root / "backend" / ".venv" / "x.py").write_text("")
    (root / "backend" / "__pycache__").mkdir()
    (root / "backend" / "__pycache__" / "week_suggestion.cpython-311.pyc").write_bytes(b"")

    stubs = tmp_path / "stubs"
    stubs.mkdir()
    log = tmp_path / "pip.log"
    _stub(stubs / "python3", f'echo "$*" >> "{log}"\n')
    _stub(stubs / "file", 'echo "$1: ELF 64-bit LSB executable, ARM aarch64"\n')
    env = {**os.environ, "PATH": f"{stubs}:{os.environ['PATH']}"}

    run = subprocess.run(["bash", str(spike_dir / "build.sh")], capture_output=True, text=True, env=env)
    assert run.returncode == 0, run.stderr

    # The backend pins (anthropic) go through the arm64 install; coros-mcp doesn't.
    backend_reqs = (spike_dir / "build" / "backend-requirements.txt").read_text()
    assert "anthropic==" in backend_reqs
    assert "coros-mcp" not in backend_reqs
    installs = [line for line in log.read_text().splitlines() if "build/backend-requirements.txt" in line]
    assert len(installs) == 1
    for flag in ("--platform manylinux2014_aarch64", "--only-binary=:all:", "--python-version 3.12",
                 "-r requirements.txt", "-t package/"):
        assert flag in installs[0]

    package = spike_dir / "package"
    bundled = {str(p.relative_to(package)) for p in (package / "backend").rglob("*") if p.is_file()}
    for needed in ("backend/__init__.py", "backend/week_suggestion.py", "backend/coros_client.py",
                   "backend/workout_planner.py", "backend/secrets.py", "backend/workout_planners/__init__.py",
                   "backend/workout_planners/claude.py", "backend/prompts/coach_system.md"):
        assert needed in bundled
    for name in bundled:
        assert ".env" not in name and ".venv" not in name and "__pycache__" not in name
    assert (spike_dir / "build" / "spike.zip").exists()

    # The bundle imports on its own (no repo checkout on sys.path), prompt included.
    probe = (
        "import sys; sys.path.insert(0, sys.argv[1]);"
        "import backend.week_suggestion as s, backend.workout_planners.claude as c;"
        "assert s.__file__.startswith(sys.argv[1]), s.__file__;"
        "assert c.PROMPT_PATH.is_file();"
        "print(c.PROMPT_PATH.read_text()[:20])"
    )
    check = subprocess.run([sys.executable, "-I", "-c", probe, str(package)], capture_output=True, text=True,
                           cwd=tmp_path)
    assert check.returncode == 0, check.stderr
