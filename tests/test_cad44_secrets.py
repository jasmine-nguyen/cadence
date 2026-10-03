"""CAD-44 acceptance: one way to get credentials — Secrets Manager in Lambda, `.env` on the Mac."""

import json
import os
import sys

import pytest

from backend import secrets

CREDS = {
    "COROS_EMAIL": "jas@example.com",
    "COROS_PASSWORD": "hunter2-coros",
    "COROS_REGION": "us",
    "CLAUDE_API_KEY": "sk-ant-test-key",
    "TURSO_DATABASE_URL": "libsql://cadence-test.turso.io",
    "TURSO_AUTH_TOKEN": "turso-token-xyz",
}


@pytest.fixture(autouse=True)
def _fresh_cache(monkeypatch):
    monkeypatch.delenv("CADENCE_SECRET_ID", raising=False)
    secrets.clear_cache()
    yield
    secrets.clear_cache()


class _NoBoto3:
    def __getattr__(self, name):
        raise AssertionError("boto3 must not be used in local mode")


def test_local_mode_returns_env_file_credentials_without_aws(tmp_path, monkeypatch, capsys):
    env = tmp_path / ".env"
    env.write_text("".join(f"{k}={v}\n" for k, v in CREDS.items()), encoding="utf-8")
    os.chmod(env, 0o600)
    monkeypatch.setitem(sys.modules, "boto3", _NoBoto3())

    assert secrets.get_secrets(env) == CREDS

    out = capsys.readouterr()
    assert out.out == "" and out.err == ""


def test_lambda_mode_reads_secret_once_per_run_with_same_shape_and_clean_errors(monkeypatch, capsys):
    secret_arn = "arn:aws:secretsmanager:ap-southeast-2:123456789012:secret:cadence/prod-AbCdEf"
    monkeypatch.setenv("CADENCE_SECRET_ID", secret_arn)

    calls = []
    payload = {"SecretString": json.dumps(CREDS)}

    class FakeClient:
        def get_secret_value(self, SecretId):
            calls.append(("get_secret_value", SecretId))
            return payload

    fake_boto3 = type(sys)("boto3")
    fake_boto3.client = lambda service, *a, **kw: calls.append(("client", service)) or FakeClient()
    monkeypatch.setitem(sys.modules, "boto3", fake_boto3)

    # Same dict shape as local mode, from the named secret.
    first = secrets.get_secrets()
    assert first == CREDS
    assert ("client", "secretsmanager") in calls
    assert ("get_secret_value", secret_arn) in calls

    # Read once per run: a second call doesn't hit Secrets Manager, and caller edits don't leak back.
    first["COROS_PASSWORD"] = "tampered"
    assert secrets.get_secrets() == CREDS
    assert sum(1 for c in calls if c[0] == "get_secret_value") == 1

    # A new run (clear_cache) reads again.
    secrets.clear_cache()
    assert secrets.get_secrets() == CREDS
    assert sum(1 for c in calls if c[0] == "get_secret_value") == 2

    # A malformed secret raises SecretsError whose message carries none of the values.
    secrets.clear_cache()
    payload["SecretString"] = '{"COROS_PASSWORD": "hunter2-coros", "CLAUDE_API_KEY": "sk-ant-test-key"'
    with pytest.raises(secrets.SecretsError) as err:
        secrets.get_secrets()
    for value in ("hunter2-coros", "sk-ant-test-key"):
        assert value not in str(err.value)
        assert value not in repr(err.value)

    out = capsys.readouterr()
    assert out.out == "" and out.err == ""
