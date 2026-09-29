"""QA fix-round tests for CAD-83: the Speediance check now reports every failure
(not just OSError/TimeoutExpired) and scrubs stderr before truncating it."""

import json
import subprocess

from tests.test_cad83_spike import SECRETS, _FakeCoros, _FakeSpeediance
from tests.test_cad83_spike_qa import spike  # noqa: F401  (pytest fixture)


def test_token_cache_folder_failure_is_reported_and_coros_result_kept(spike, monkeypatch, tmp_path, capsys):
    # [A26] mkdir under a regular file fails (NotADirectoryError / FileExistsError).
    blocker = tmp_path / "blocker"
    blocker.write_text("not a folder")
    monkeypatch.setenv("SPEEDIANCE_TOKEN_CACHE", str(blocker / "speediance" / "token.json"))
    coros = _FakeCoros()
    coros.install(monkeypatch)
    speediance = _FakeSpeediance()
    monkeypatch.setattr(subprocess, "run", speediance)

    result = spike.handler({}, None)

    assert result["coros"]["ok"] is True
    assert result["speediance"]["ok"] is False
    assert result["speediance"]["error_type"] in {"NotADirectoryError", "FileExistsError"}
    assert speediance.calls == []
    assert json.loads(capsys.readouterr().out.strip()) == result


def test_non_string_credential_is_reported_not_a_crash(spike, monkeypatch):
    # [A27] A JSON secret with a numeric password makes the env invalid.
    creds = dict(SECRETS, SPEEDIANCE_PASSWORD=12345678)
    monkeypatch.setattr(spike, "_load_secret", lambda: creds)

    def real_like_run(args, env=None, **kwargs):
        for value in env.values():
            if not isinstance(value, str):
                raise TypeError("expected str, bytes or os.PathLike object, not int")
        return subprocess.CompletedProcess(args, 0, "", "")

    monkeypatch.setattr(subprocess, "run", real_like_run)

    result = spike.handler({"only": "speediance"}, None)

    assert result["speediance"]["ok"] is False
    assert result["speediance"]["error_type"] == "TypeError"


def test_missing_speediance_error_names_the_key_but_no_secret(spike, monkeypatch):
    # [A28] Jas can tell from the result which secret key is missing.
    monkeypatch.setattr(
        spike,
        "_load_secret",
        lambda: {"COROS_EMAIL": SECRETS["COROS_EMAIL"], "COROS_PASSWORD": SECRETS["COROS_PASSWORD"]},
    )
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance())

    result = spike.handler({"only": "speediance"}, None)

    assert result["speediance"]["error_type"] == "KeyError"
    assert "SPEEDIANCE_EMAIL" in result["speediance"]["error"]
    dumped = json.dumps(result)
    for value in SECRETS.values():
        assert value not in dumped


def test_check_speediance_scrubs_its_own_stderr(spike, monkeypatch):
    # [A29] The per-check scrub is what protects the cut, so test it directly,
    # without the handler's final scrub masking a regression.
    password = SECRETS["SPEEDIANCE_PASSWORD"]
    stderr = "A" * 600 + password + "B" * (500 - len(password) + 5)
    monkeypatch.setattr(subprocess, "run", _FakeSpeediance(returncode=1, stderr=stderr))
    secrets = sorted(SECRETS.values(), key=len, reverse=True)

    out = spike._check_speediance(dict(SECRETS), secrets)

    assert password[5:] not in out["stderr_tail"]
    assert out["stderr_tail"].endswith("B")
    assert len(out["stderr_tail"]) <= 500
