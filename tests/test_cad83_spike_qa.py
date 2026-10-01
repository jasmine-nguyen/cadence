"""QA tests for CAD-83: adversarial checks on the throwaway reachability Lambda.

Complements tests/test_cad83_spike.py (happy path, login failure, scrubbing).
Reuses its stand-ins so both files exercise the handler the same way.
"""

import importlib
import json
import os
import shutil
import stat
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pytest

from tests.test_cad83_spike import SECRETS, SPEEDIANCE_BIN, _FakeCoros, _FakeSpeediance

REPO_ROOT = Path(__file__).resolve().parent.parent
SPIKE_DIR = REPO_ROOT / "spikes" / "cad83_lambda_reachability"


@pytest.fixture
def spike(monkeypatch, tmp_path):
    """Import the spike handler with every system boundary replaced."""
    monkeypatch.setenv("HOME", "/home/not-writable-on-lambda")
    monkeypatch.setenv("SPEEDIANCE_BIN", SPEEDIANCE_BIN)
    monkeypatch.setenv("COROS_REGION", "us")
    monkeypatch.setenv("SPIKE_SECRET_ID", "arn:aws:secretsmanager:ap-southeast-2:000000000000:secret:test")
    monkeypatch.setenv("SPEEDIANCE_TOKEN_CACHE", str(tmp_path / "speediance" / "token.json"))
    monkeypatch.delenv("SPEEDIANCE_ARGS", raising=False)

    def no_network(*args, **kwargs):
        raise OSError("network disabled in tests")

    monkeypatch.setattr(urllib.request, "urlopen", no_network)

    module = importlib.import_module("spikes.cad83_lambda_reachability.handler")
    monkeypatch.setattr(module, "_load_secret", lambda: dict(SECRETS))
    return module


# --- COROS -----------------------------------------------------------------------


def test_schedule_date_is_melbourne_not_utc(spike, monkeypatch):
    # [A1] 15:00 UTC on 29 Sep is 01:00 on 30 Sep in Melbourne (AEST, +10).
    instant = datetime(2026, 9, 29, 15, 0, tzinfo=timezone.utc)

    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

    monkeypatch.setattr(spike, "datetime", FrozenDatetime)
    coros = _FakeCoros()
    coros.install(monkeypatch)
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance())

    result = spike.handler({"only": "coros"}, None)

    assert result["coros"]["ok"] is True
    assert coros.schedule_calls == [("20260930", "20260930")]


def test_schedule_failure_reports_schedule_stage_and_http_status(spike, monkeypatch):
    # [A2] A blocked schedule read (e.g. 403) is distinguishable from a login failure.
    coros = _FakeCoros()
    coros.install(monkeypatch)

    class FakeResponse:
        status_code = 403

    class FakeHTTPStatusError(Exception):
        def __init__(self, message):
            super().__init__(message)
            self.response = FakeResponse()

    async def failing_schedule(auth, start_day, end_day):
        raise FakeHTTPStatusError("Client error '403 Forbidden'")

    sys.modules["coros_mcp.coros_api"].fetch_schedule = failing_schedule
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance())

    result = spike.handler({}, None)

    assert result["coros"]["ok"] is False
    assert result["coros"]["stage"] == "schedule"
    assert result["coros"]["http_status"] == 403
    assert result["coros"]["error_type"] == "FakeHTTPStatusError"
    assert result["speediance"]["ok"] is True


def test_missing_coros_library_reports_import_stage_and_speediance_still_runs(spike, monkeypatch):
    # [A3] A package missing from the zip shows up as stage "import", not a crash.
    for name in list(sys.modules):
        if name == "coros_mcp" or name.startswith("coros_mcp."):
            monkeypatch.delitem(sys.modules, name, raising=False)
    monkeypatch.setitem(sys.modules, "coros_mcp", None)  # makes the import fail
    speediance = _FakeSpeediance()
    monkeypatch.setattr(subprocess, "run", speediance)

    result = spike.handler({}, None)

    assert result["coros"]["ok"] is False
    assert result["coros"]["stage"] == "import"
    assert "Error" in result["coros"]["error_type"]
    assert len(speediance.calls) == 1
    assert result["speediance"]["ok"] is True


def test_success_reports_key_count_but_not_schedule_contents(spike, monkeypatch, capsys):
    # [A4] Only the number of top-level keys is reported.
    coros = _FakeCoros()
    coros.install(monkeypatch)
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance())

    result = spike.handler({"only": "coros"}, None)

    assert result["coros"]["schedule_keys_count"] == 2
    assert isinstance(result["coros"]["duration_ms"], int)
    assert "entities" not in json.dumps(result)
    assert "entities" not in capsys.readouterr().out


# --- Speediance ------------------------------------------------------------------


def test_missing_binary_is_reported_and_coros_unaffected(spike, monkeypatch, tmp_path):
    # [A5] Real subprocess.run against a path that doesn't exist.
    monkeypatch.setenv("SPEEDIANCE_BIN", str(tmp_path / "no-such-speediance-cli"))
    coros = _FakeCoros()
    coros.install(monkeypatch)

    result = spike.handler({}, None)

    assert result["speediance"]["ok"] is False
    assert result["speediance"]["error_type"] == "FileNotFoundError"
    assert result["coros"]["ok"] is True


def test_non_executable_binary_is_reported(spike, monkeypatch, tmp_path):
    # [A6] Binary bundled without the executable bit -> PermissionError, not a crash.
    binary = tmp_path / "speediance-cli"
    binary.write_text("#!/bin/sh\nexit 0\n")
    binary.chmod(stat.S_IRUSR | stat.S_IWUSR)
    monkeypatch.setenv("SPEEDIANCE_BIN", str(binary))

    result = spike.handler({"only": "speediance"}, None)

    assert result["speediance"]["ok"] is False
    assert result["speediance"]["error_type"] == "PermissionError"


def test_hanging_binary_is_reported_as_timeout(spike, monkeypatch):
    # [A7] A binary waiting for interactive input is killed and reported.
    def hang(args, *pos, **kwargs):
        assert kwargs.get("timeout") is not None and kwargs["timeout"] <= 170
        raise subprocess.TimeoutExpired(args, kwargs["timeout"])

    monkeypatch.setattr(subprocess, "run", hang)

    result = spike.handler({"only": "speediance"}, None)

    assert result["speediance"]["ok"] is False
    assert result["speediance"]["error_type"] == "TimeoutExpired"


def test_real_binary_exit_code_and_stderr_are_reported(spike, monkeypatch, tmp_path):
    # [A8] End to end through the real subprocess: credentials arrive via env,
    # the token cache folder exists, exit code and stderr are captured.
    record = tmp_path / "seen.txt"
    binary = tmp_path / "speediance-cli"
    binary.write_text(
        "#!/bin/sh\n"
        f'echo "$@|$SPEEDIANCE_EMAIL|$SPEEDIANCE_PASSWORD|$SPEEDIANCE_TOKEN_CACHE" > "{record}"\n'
        '[ -d "$(dirname "$SPEEDIANCE_TOKEN_CACHE")" ] || exit 9\n'
        'echo "captcha required" >&2\n'
        "exit 3\n"
    )
    binary.chmod(0o755)
    monkeypatch.setenv("SPEEDIANCE_BIN", str(binary))

    result = spike.handler({"only": "speediance"}, None)

    args, email, password, cache = record.read_text().strip().split("|")
    assert args == "login"
    assert email == SECRETS["SPEEDIANCE_EMAIL"]
    assert password == SECRETS["SPEEDIANCE_PASSWORD"]
    assert cache == os.environ["SPEEDIANCE_TOKEN_CACHE"]
    assert result["speediance"]["returncode"] == 3
    assert result["speediance"]["ok"] is False
    assert "captcha required" in result["speediance"]["stderr_tail"]


def test_speediance_args_override_is_split_like_a_shell(spike, monkeypatch):
    # [A9] SPEEDIANCE_ARGS lets Jas change the command without a rebuild.
    monkeypatch.setenv("SPEEDIANCE_ARGS", "login --non-interactive --profile 'my gym'")
    speediance = _FakeSpeediance()
    monkeypatch.setattr(subprocess, "run", speediance)

    spike.handler({"only": "speediance"}, None)

    assert speediance.calls[0]["args"] == [
        SPEEDIANCE_BIN,
        "login",
        "--non-interactive",
        "--profile",
        "my gym",
    ]


def test_credentials_are_passed_by_env_not_argv(spike, monkeypatch):
    # [A10] argv shows up in process listings and error messages; env doesn't.
    speediance = _FakeSpeediance()
    monkeypatch.setattr(subprocess, "run", speediance)

    spike.handler({"only": "speediance"}, None)

    call = speediance.calls[0]
    for value in SECRETS.values():
        assert value not in " ".join(call["args"])
    # The rest of the Lambda environment (PATH etc.) is kept.
    assert call["env"].get("PATH") == os.environ.get("PATH")


def test_stderr_tail_is_limited_to_500_chars(spike, monkeypatch):
    # [A11]
    speediance = _FakeSpeediance(returncode=1, stderr="x" * 2000 + "END")
    monkeypatch.setattr(subprocess, "run", speediance)

    result = spike.handler({"only": "speediance"}, None)

    tail = result["speediance"]["stderr_tail"]
    assert len(tail) <= 500
    assert tail.endswith("END")


def test_truncated_stderr_never_leaks_part_of_a_password(spike, monkeypatch, capsys):
    # [A12] REAL BUG: the tail is cut before scrubbing, so a password straddling
    # the 500-char cut isn't recognised and its second half is logged.
    password = SECRETS["SPEEDIANCE_PASSWORD"]
    stderr = "A" * 600 + password + "B" * (500 - len(password) + 5)
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance(returncode=1, stderr=stderr))

    result = spike.handler({"only": "speediance"}, None)

    leaked_half = password[5:]
    assert leaked_half not in json.dumps(result)
    assert leaked_half not in capsys.readouterr().out


def test_missing_speediance_credentials_do_not_lose_the_coros_result(spike, monkeypatch, capsys):
    # [A13] REAL BUG: Jas may fill only the COROS half of the secret first. The
    # plan says each check runs independently; a KeyError in the Speediance check
    # must not crash the handler and throw away the COROS result.
    monkeypatch.setattr(
        spike,
        "_load_secret",
        lambda: {"COROS_EMAIL": SECRETS["COROS_EMAIL"], "COROS_PASSWORD": SECRETS["COROS_PASSWORD"]},
    )
    coros = _FakeCoros()
    coros.install(monkeypatch)
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance())

    result = spike.handler({}, None)

    assert result["coros"]["ok"] is True
    assert result["speediance"]["ok"] is False
    assert json.loads(capsys.readouterr().out.strip()) == result


# --- Handler routing / egress ----------------------------------------------------


def test_only_coros_skips_speediance(spike, monkeypatch):
    # [A14]
    coros = _FakeCoros()
    coros.install(monkeypatch)
    speediance = _FakeSpeediance()
    monkeypatch.setattr(subprocess, "run", speediance)

    result = spike.handler({"only": "coros"}, None)

    assert "coros" in result
    assert "speediance" not in result
    assert speediance.calls == []


def test_only_speediance_skips_coros(spike, monkeypatch):
    # [A15]
    coros = _FakeCoros()
    coros.install(monkeypatch)
    speediance = _FakeSpeediance()
    monkeypatch.setattr(subprocess, "run", speediance)

    result = spike.handler({"only": "speediance"}, None)

    assert "speediance" in result
    assert "coros" not in result
    assert coros.login_calls == []


@pytest.mark.parametrize("event", [None, {}])
def test_empty_or_null_event_runs_both(spike, monkeypatch, event):
    # [A16] `aws lambda invoke` with no payload sends {}; a test console may send null.
    coros = _FakeCoros()
    coros.install(monkeypatch)
    speediance = _FakeSpeediance()
    monkeypatch.setattr(subprocess, "run", speediance)

    result = spike.handler(event, None)

    assert result["coros"]["ok"] is True
    assert result["speediance"]["ok"] is True


def test_egress_ip_is_recorded(spike, monkeypatch):
    # [A17]
    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def read(self):
            return b"13.54.1.2\n"

    seen = {}

    def fake_urlopen(url, timeout=None):
        seen["url"] = url
        seen["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance())

    result = spike.handler({"only": "speediance"}, None)

    assert result["egress_ip"] == "13.54.1.2"
    assert seen["url"] == "https://checkip.amazonaws.com"
    assert seen["timeout"] is not None


def test_egress_ip_failure_is_unknown_not_a_crash(spike, monkeypatch):
    # [A18] fixture's urlopen raises OSError
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance())

    result = spike.handler({"only": "speediance"}, None)

    assert result["egress_ip"] == "unknown"


def test_load_secret_reads_the_secret_named_in_env(spike, monkeypatch):
    # [A19] The real loader (not the fixture stand-in) asks Secrets Manager for SPIKE_SECRET_ID.
    module = importlib.reload(spike)
    calls = []

    class FakeClient:
        def get_secret_value(self, SecretId):
            calls.append(SecretId)
            return {"SecretString": json.dumps(SECRETS)}

    fake_boto3 = type(sys)("boto3")
    fake_boto3.client = lambda service: calls.append(service) or FakeClient()
    monkeypatch.setitem(sys.modules, "boto3", fake_boto3)

    assert module._load_secret() == SECRETS
    assert calls == ["secretsmanager", os.environ["SPIKE_SECRET_ID"]]


# --- Repo hygiene: gitignore, Terraform, build script -----------------------------


SPIKE_MUST_BE_IGNORED = [
    "spikes/cad83_lambda_reachability/package/handler.py",
    "spikes/cad83_lambda_reachability/build/spike.zip",
    "spikes/cad83_lambda_reachability/bin/speediance-cli",
    "spikes/cad83_lambda_reachability/wheels/coros_mcp-0.1-py3-none-any.whl",
    "spikes/cad83_lambda_reachability/creds.json",
    "spikes/cad83_lambda_reachability/out.json",
    "spikes/cad83_lambda_reachability/.terraform/providers/x",
    "spikes/cad83_lambda_reachability/terraform.tfstate",
    "spikes/cad83_lambda_reachability/terraform.tfstate.d/ap-southeast-2/terraform.tfstate",
]

SPIKE_MUST_BE_COMMITTABLE = [
    "spikes/cad83_lambda_reachability/handler.py",
    "spikes/cad83_lambda_reachability/main.tf",
    "spikes/cad83_lambda_reachability/build.sh",
    "spikes/cad83_lambda_reachability/requirements.txt",
    "spikes/cad83_lambda_reachability/README.md",
]


def _is_ignored(path):
    return (
        subprocess.run(
            ["git", "check-ignore", "-q", "--no-index", path], cwd=REPO_ROOT
        ).returncode
        == 0
    )


@pytest.mark.parametrize("path", SPIKE_MUST_BE_IGNORED)
def test_spike_artifacts_and_credentials_are_gitignored(path):
    # [A20]
    assert _is_ignored(path), f"{path} should be gitignored"


@pytest.mark.parametrize("path", SPIKE_MUST_BE_COMMITTABLE)
def test_spike_sources_are_committable(path):
    # [A21]
    assert not _is_ignored(path), f"{path} should be committable"


def test_terraform_function_matches_lambda_constraints():
    # [A22] project-context "Lambda constraints": arm64, raised timeout, keyring
    # backend, token caches in /tmp; plan: no credentials in function settings.
    tf = (SPIKE_DIR / "main.tf").read_text()
    assert 'architectures    = ["arm64"]' in tf or 'architectures = ["arm64"]' in tf
    assert '"python3.12"' in tf
    assert 'handler          = "handler.handler"' in tf
    import re

    timeout = int(re.search(r"timeout\s*=\s*(\d+)", tf).group(1))
    assert timeout >= 120
    assert 'PYTHON_KEYRING_BACKEND = "keyring.backends.null.Keyring"' in tf
    assert 'HOME                   = "/tmp"' in tf
    assert re.search(r'SPEEDIANCE_TOKEN_CACHE\s*=\s*"/tmp/', tf)
    assert "recovery_window_in_days = 0" in tf
    assert "aws_secretsmanager_secret_version" not in tf
    for key in SECRETS:
        assert key not in tf
    assert 'purpose = "cad-83-spike"' in tf
    # CAD-94 adds a nightly schedule, but only when explicitly enabled.
    schedule = re.search(r'resource "aws_scheduler_schedule" "nightly" \{\n\s*count = var\.nightly_enabled \? 1 : 0', tf)
    assert tf.count("aws_scheduler_schedule\"") == 1 and schedule
    assert "backend \"s3\"" not in tf


def _copy_build_script(tmp_path):
    work = tmp_path / "spike"
    work.mkdir()
    shutil.copy(SPIKE_DIR / "build.sh", work / "build.sh")
    (work / "build.sh").chmod(0o755)
    return work


@pytest.mark.skipif(shutil.which("bash") is None, reason="needs bash")
def test_build_fails_clearly_when_binary_missing(tmp_path):
    # [A23]
    work = _copy_build_script(tmp_path)
    run = subprocess.run(["bash", str(work / "build.sh")], capture_output=True, text=True)
    assert run.returncode != 0
    assert "speediance-cli is missing" in run.stderr
    assert not (work / "package").exists()


@pytest.mark.skipif(
    shutil.which("bash") is None or shutil.which("file") is None, reason="needs bash + file"
)
def test_build_rejects_a_non_arm64_binary(tmp_path):
    # [A24] A macOS/x86 build of speediance-cli would fail at invoke; catch it at build.
    work = _copy_build_script(tmp_path)
    (work / "bin").mkdir()
    (work / "bin" / "speediance-cli").write_text("#!/bin/sh\nexit 0\n")
    run = subprocess.run(["bash", str(work / "build.sh")], capture_output=True, text=True)
    assert run.returncode != 0
    assert "not a linux/arm64" in run.stderr
    assert not (work / "package").exists()


def test_build_installs_arm64_wheels_without_coros_mcp_deps():
    # [A25] Critic tweak: coros-mcp --no-deps; its runtime deps as aarch64 wheels.
    script = (SPIKE_DIR / "build.sh").read_text()
    assert "set -euo pipefail" in script
    coros_install = [line for line in script.splitlines() if "pip install" in line and "coros-mcp" in line]
    assert coros_install and all("--no-deps" in line for line in coros_install)
    assert "2964e23be7425e7d8092271c677b09f2ccc530cd" in script
    assert "--platform manylinux2014_aarch64" in script
    assert "--only-binary=:all:" in script
    assert "--python-version 3.12" in script
    assert "50 * 1024 * 1024" in script
    reqs = {
        line.split(">")[0].split("=")[0].strip()
        for line in (SPIKE_DIR / "requirements.txt").read_text().splitlines()
        if line.strip() and not line.startswith("#")
    }
    assert {"httpx", "cryptography", "keyring", "pydantic", "tzdata"} <= reqs
    assert "coros-mcp" not in reqs and "fastmcp" not in reqs
