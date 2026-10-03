"""CAD-44 edge cases for `get_secrets()`: value types, bad secrets, and `suggest.main()` in AWS mode."""

import json
import sys

import pytest

from backend import secrets, suggest

ARN = "arn:aws:secretsmanager:ap-southeast-2:123456789012:secret:cadence/prod-AbCdEf"


@pytest.fixture(autouse=True)
def _fresh_cache(monkeypatch):
    monkeypatch.delenv("CADENCE_SECRET_ID", raising=False)
    secrets.clear_cache()
    yield
    secrets.clear_cache()


def _fake_aws(monkeypatch, secret_string=None, error=None):
    class FakeClient:
        def get_secret_value(self, SecretId):
            if error is not None:
                raise error
            return {"SecretString": secret_string}

    fake_boto3 = type(sys)("boto3")
    fake_boto3.client = lambda service, *a, **kw: FakeClient()
    monkeypatch.setitem(sys.modules, "boto3", fake_boto3)
    monkeypatch.setenv("CADENCE_SECRET_ID", ARN)


def test_numbers_become_strings_and_null_becomes_empty(monkeypatch):
    _fake_aws(monkeypatch, json.dumps({"COROS_REGION": "us", "PORT": 443, "CLAUDE_API_KEY": None}))
    assert secrets.get_secrets() == {"COROS_REGION": "us", "PORT": "443", "CLAUDE_API_KEY": ""}


def test_json_list_is_rejected(monkeypatch):
    _fake_aws(monkeypatch, json.dumps(["hunter2-coros"]))
    with pytest.raises(secrets.SecretsError) as err:
        secrets.get_secrets()
    assert "hunter2-coros" not in str(err.value) and "hunter2-coros" not in repr(err.value)


def test_invalid_json_drops_the_parser_error_that_holds_the_text(monkeypatch):
    _fake_aws(monkeypatch, '{"COROS_PASSWORD": "hunter2-coros"')
    with pytest.raises(secrets.SecretsError) as err:
        secrets.get_secrets()
    assert err.value.__cause__ is None
    assert err.value.__suppress_context__ is True


def test_client_failure_raises_secrets_error(monkeypatch, capsys):
    _fake_aws(monkeypatch, error=RuntimeError("AccessDeniedException"))
    with pytest.raises(secrets.SecretsError) as err:
        secrets.get_secrets()
    assert str(err.value) == "could not read secret"
    assert capsys.readouterr().out == ""


def test_local_mode_rereads_the_file(tmp_path):
    env = tmp_path / ".env"
    env.write_text("COROS_EMAIL=first@example.com\n", encoding="utf-8")
    assert secrets.get_secrets(env) == {"COROS_EMAIL": "first@example.com"}
    env.write_text("COROS_EMAIL=second@example.com\n", encoding="utf-8")
    assert secrets.get_secrets(env) == {"COROS_EMAIL": "second@example.com"}


def test_suggest_main_uses_the_aws_secret_and_environment_fills_empty_keys(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)  # no .env here
    _fake_aws(monkeypatch, json.dumps({"COROS_EMAIL": "jas@example.com", "COROS_PASSWORD": None}))
    monkeypatch.setenv("COROS_PASSWORD", "env-pw")
    seen = {}

    def fake(creds):
        seen.update(creds)
        return {"ok": False, "stage": "read", "status": "read_error", "error_type": "X"}

    monkeypatch.setattr(suggest, "suggest_week", fake)
    assert suggest.main() == 1
    assert seen["COROS_EMAIL"] == "jas@example.com"
    assert seen["COROS_PASSWORD"] == "env-pw"
