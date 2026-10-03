"""CAD-44 QA: adversarial checks for `backend.secrets.get_secrets()` and `suggest.main()`."""

import json
import os
import sys
import traceback

import pytest

from backend import secrets, suggest

ARN = "arn:aws:secretsmanager:ap-southeast-2:123456789012:secret:cadence/prod-AbCdEf"
PASSWORD = "hunter2-coros-qa"
API_KEY = "sk-ant-qa-key"


@pytest.fixture(autouse=True)
def _fresh_cache(monkeypatch):
    monkeypatch.delenv("CADENCE_SECRET_ID", raising=False)
    secrets.clear_cache()
    yield
    secrets.clear_cache()


class _NoBoto3:
    def __getattr__(self, name):
        raise AssertionError("boto3 must not be used in local mode")


def _fake_aws(monkeypatch, response=None, error=None, secret_id=ARN):
    """Fake boto3. `response` is a dict, or a list of dicts returned one per call."""
    calls = []
    responses = response if isinstance(response, list) else None

    class FakeClient:
        def get_secret_value(self, SecretId):
            calls.append(SecretId)
            if error is not None:
                raise error
            if responses is not None:
                return responses[min(len(calls), len(responses)) - 1]
            return response

    fake_boto3 = type(sys)("boto3")
    fake_boto3.client = lambda service, *a, **kw: FakeClient()
    monkeypatch.setitem(sys.modules, "boto3", fake_boto3)
    monkeypatch.setenv("CADENCE_SECRET_ID", secret_id)
    return calls


def _formatted(err: BaseException) -> str:
    return "".join(traceback.format_exception(type(err), err, err.__traceback__))


# [A1] (P0) Local mode with no .env file gives {} and never touches boto3.
def test_local_mode_missing_env_file_gives_empty_dict(tmp_path, monkeypatch):
    monkeypatch.setitem(sys.modules, "boto3", _NoBoto3())
    assert secrets.get_secrets(tmp_path / "nope.env") == {}


# [A2] (P0) An empty CADENCE_SECRET_ID counts as unset: local mode, no AWS call.
def test_empty_secret_id_falls_back_to_local(tmp_path, monkeypatch):
    env = tmp_path / ".env"
    env.write_text("COROS_EMAIL=local@example.com\n", encoding="utf-8")
    monkeypatch.setitem(sys.modules, "boto3", _NoBoto3())
    monkeypatch.setenv("CADENCE_SECRET_ID", "")
    assert secrets.get_secrets(env) == {"COROS_EMAIL": "local@example.com"}


# [A3] (P0) AWS mode wins over a .env file sitting next to it.
def test_aws_mode_ignores_local_env_file(tmp_path, monkeypatch):
    env = tmp_path / ".env"
    env.write_text("COROS_EMAIL=local@example.com\n", encoding="utf-8")
    _fake_aws(monkeypatch, {"SecretString": json.dumps({"COROS_EMAIL": "aws@example.com"})})
    assert secrets.get_secrets(env) == {"COROS_EMAIL": "aws@example.com"}


# [A4] (P0) A failed read isn't cached: the next call (same run) tries again and succeeds.
def test_failed_read_is_not_cached(monkeypatch):
    calls = _fake_aws(
        monkeypatch,
        [{"SecretString": "not json"}, {"SecretString": json.dumps({"COROS_EMAIL": "a@b.c"})}],
    )
    with pytest.raises(secrets.SecretsError):
        secrets.get_secrets()
    assert secrets.get_secrets() == {"COROS_EMAIL": "a@b.c"}
    assert len(calls) == 2


# [A5] (P0) A response with no SecretString (e.g. a binary secret) raises SecretsError.
def test_missing_secret_string_raises_secrets_error(monkeypatch):
    _fake_aws(monkeypatch, {"SecretBinary": PASSWORD.encode()})
    with pytest.raises(secrets.SecretsError) as err:
        secrets.get_secrets()
    assert PASSWORD not in _formatted(err.value)


# [A6] (P0) The full printed traceback of a bad-JSON / non-object secret holds no secret values.
@pytest.mark.parametrize(
    "secret_string",
    [
        '{"COROS_PASSWORD": "%s", "CLAUDE_API_KEY": "%s"' % (PASSWORD, API_KEY),
        json.dumps([PASSWORD, API_KEY]),
        json.dumps(PASSWORD),
        "null",
        "42",
    ],
)
def test_error_tracebacks_never_show_values(monkeypatch, secret_string):
    _fake_aws(monkeypatch, {"SecretString": secret_string})
    with pytest.raises(secrets.SecretsError) as err:
        secrets.get_secrets()
    text = _formatted(err.value)
    assert PASSWORD not in text and API_KEY not in text


# [A7] (P1) The client error is chained (keeps the AWS error code for debugging).
def test_client_error_keeps_cause(monkeypatch):
    boom = RuntimeError("ResourceNotFoundException")
    _fake_aws(monkeypatch, error=boom)
    with pytest.raises(secrets.SecretsError) as err:
        secrets.get_secrets()
    assert err.value.__cause__ is boom


# [A8] (P1) Local mode doesn't serve a cached AWS secret once CADENCE_SECRET_ID is gone.
def test_local_mode_does_not_return_aws_cache(tmp_path, monkeypatch):
    _fake_aws(monkeypatch, {"SecretString": json.dumps({"COROS_EMAIL": "aws@example.com"})})
    assert secrets.get_secrets() == {"COROS_EMAIL": "aws@example.com"}
    monkeypatch.delenv("CADENCE_SECRET_ID")
    env = tmp_path / ".env"
    env.write_text("COROS_EMAIL=local@example.com\n", encoding="utf-8")
    assert secrets.get_secrets(env) == {"COROS_EMAIL": "local@example.com"}


# [A9] (P1) get_secrets never writes to os.environ in either mode.
def test_os_environ_untouched(tmp_path, monkeypatch):
    before = dict(os.environ)
    env = tmp_path / ".env"
    env.write_text(f"QA_ONLY_KEY_LOCAL={PASSWORD}\n", encoding="utf-8")
    secrets.get_secrets(env)
    _fake_aws(monkeypatch, {"SecretString": json.dumps({"QA_ONLY_KEY_AWS": API_KEY})})
    secrets.get_secrets()
    after = dict(os.environ)
    after.pop("CADENCE_SECRET_ID", None)
    before.pop("CADENCE_SECRET_ID", None)
    assert after == before


# [A10] (P1) Every key and value is a str in AWS mode (same shape as .env).
def test_aws_values_are_all_strings(monkeypatch):
    _fake_aws(
        monkeypatch,
        {"SecretString": json.dumps({"A": 1, "B": 1.5, "C": None, "D": "x", "E": ""})},
    )
    result = secrets.get_secrets()
    assert result == {"A": "1", "B": "1.5", "C": "", "D": "x", "E": ""}
    assert all(isinstance(k, str) and isinstance(v, str) for k, v in result.items())


# [A11] (P1) An empty JSON object is a valid (empty) secret, not an error.
def test_empty_json_object_gives_empty_dict(monkeypatch):
    _fake_aws(monkeypatch, {"SecretString": "{}"})
    assert secrets.get_secrets() == {}


# [A12] (P0) suggest.main() in local mode reads .env from cwd; env vars fill only missing keys.
def test_suggest_main_local_mode_env_fills_only_missing(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / ".env").write_text(
        "COROS_EMAIL=file@example.com\nCOROS_PASSWORD=\n", encoding="utf-8"
    )
    monkeypatch.setitem(sys.modules, "boto3", _NoBoto3())
    monkeypatch.setenv("COROS_EMAIL", "env@example.com")
    monkeypatch.setenv("COROS_PASSWORD", "env-pw")
    seen = {}

    def fake(creds):
        seen.update(creds)
        return {"ok": False, "stage": "read", "status": "read_error", "error_type": "X"}

    monkeypatch.setattr(suggest, "suggest_week", fake)
    suggest.main()
    assert seen["COROS_EMAIL"] == "file@example.com"
    assert seen["COROS_PASSWORD"] == "env-pw"


# [A13] (P1) suggest.main() filling env fallbacks doesn't mutate the cached AWS secret.
def test_suggest_main_does_not_poison_cache(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _fake_aws(monkeypatch, {"SecretString": json.dumps({"COROS_EMAIL": "aws@example.com"})})
    monkeypatch.setenv("COROS_PASSWORD", "env-pw")
    monkeypatch.setattr(
        suggest,
        "suggest_week",
        lambda creds: {"ok": False, "stage": "read", "status": "read_error", "error_type": "X"},
    )
    suggest.main()
    assert secrets.get_secrets() == {"COROS_EMAIL": "aws@example.com"}


# [A14] (P2) .env.example lists every key named in the plan's secret shape.
def test_env_example_lists_all_keys():
    text = open(".env.example", encoding="utf-8").read()
    for key in (
        "COROS_EMAIL", "COROS_PASSWORD", "COROS_REGION", "CLAUDE_API_KEY",
        "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN",
        "SPEEDIANCE_EMAIL", "SPEEDIANCE_PASSWORD", "SPEEDIANCE_REGION", "SPEEDIANCE_DEVICE_TYPE",
    ):
        assert f"{key}=" in text
    assert "chmod 600 .env" in text
