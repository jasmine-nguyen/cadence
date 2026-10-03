"""Spike: the one-off `corosmcp` mode (COROS official MCP server from AWS).

Fake HTTP only. Checks the OAuth + MCP sequence, that tool output stays in the
reply, and that no token, password or tool text ever reaches the log line.
"""

import json
from email.message import Message

from tests.test_cad83_spike import SECRETS
from tests.test_cad83_spike import spike  # noqa: F401  (pytest fixture)

ISSUER = "https://mcpus.coros.com"
STATUS_FIELDS = {"ok", "stage", "error_type", "duration_ms"}


def _headers(**values):
    message = Message()
    for key, value in values.items():
        message[key.replace("_", "-")] = value
    return message


class _FakeHttp:
    def __init__(self, fail_at=None):
        self.calls = []
        self.fail_at = fail_at

    def request(self, method, url, *, form=None, body=None, headers=None):
        self.calls.append((method, url, form, body, headers))
        path = url.split("?")[0]
        if self.fail_at and self.fail_at in path:
            return 401, _headers(), "secret server text: Sunday Long Run"
        if path.endswith("/.well-known/openid-configuration"):
            return 200, _headers(), json.dumps({"issuer": ISSUER})
        if path.endswith("/connect/register"):
            return 201, _headers(), json.dumps({"client_id": "client-1"})
        if path.endswith("/oauth2/authorize"):
            state = url.split("state=")[1].split("&")[0]
            self.state = state
            return 302, _headers(Location=f"https://accounts.coros.com/login?client_id=c&state={state}"), ""
        if path == "https://accounts.coros.com/login":
            return 302, _headers(Location=f"{ISSUER}/callback-1"), ""
        if path.endswith("/callback-1"):
            return 302, _headers(Location=f"{ISSUER}/resume-1"), ""
        if path.endswith("/resume-1"):
            return 302, _headers(Location=f"http://127.0.0.1:43123/callback?code=abc&state={self.state}"), ""
        if path.endswith("/oauth2/token"):
            if form["grant_type"] == "authorization_code":
                return 200, _headers(), json.dumps(
                    {"access_token": "AT-1", "refresh_token": "RT-1", "expires_in": 3600, "token_type": "Bearer"}
                )
            return 200, _headers(), json.dumps(
                {"access_token": "AT-2", "refresh_token": "RT-2", "expires_in": 3600, "refresh_expires_in": 2592000}
            )
        if path.endswith("/mcp"):
            if body["method"] == "initialize":
                return 200, _headers(Content_Type="application/json"), json.dumps({"jsonrpc": "2.0", "id": 1, "result": {}})
            reply = {"jsonrpc": "2.0", "id": 2, "result": {"content": [{"type": "text", "text": f"data for {body['params']['name']}"}]}}
            return 200, _headers(Content_Type="text/event-stream"), "event: message\ndata: " + json.dumps(reply) + "\n\n"
        raise AssertionError(f"unexpected call {method} {url}")


def test_corosmcp_reads_tools_and_reports_token_renewal_without_tokens(spike):  # noqa: F811
    http = _FakeHttp()
    result = spike._coros_mcp(SECRETS, http=http)

    assert result["ok"] is True, result
    assert result["issuer"] == ISSUER
    assert set(result["tools"]) == {"queryMenstruationCycles", "querySleepOverview", "querySleepHrv"}
    assert result["tools"]["querySleepHrv"]["text"] == "data for querySleepHrv"
    assert result["refresh"]["refresh_token_rotated"] is True
    assert result["refresh"]["refresh_expires_in"] == 2592000
    assert result["refresh"]["works_after_refresh"] is True
    for token in ("AT-1", "AT-2", "RT-1", "RT-2", "abc"):
        assert token not in json.dumps(result)

    login_form = next(c[2] for c in http.calls if c[1].startswith("https://accounts.coros.com/login"))
    assert login_form["userName"] == SECRETS["COROS_EMAIL"]
    # Read-only: only the read tools are ever called.
    called = [c[3]["params"]["name"] for c in http.calls if c[3] and c[3].get("method") == "tools/call"]
    assert set(called) == {"queryMenstruationCycles", "querySleepOverview", "querySleepHrv"}


def test_corosmcp_failure_reports_stage_and_status_only(spike):  # noqa: F811
    result = spike._coros_mcp(SECRETS, http=_FakeHttp(fail_at="/oauth2/token"))
    assert result["ok"] is False and result["stage"] == "login"
    assert result["detail"] == "token: HTTP 401"
    assert "Long Run" not in json.dumps(result)


def test_corosmcp_mode_logs_status_only(spike, monkeypatch, capsys):  # noqa: F811
    monkeypatch.setattr(spike, "_coros_mcp", lambda creds: {
        "ok": True, "stage": "done", "duration_ms": 5, "tools": {"queryMenstruationCycles": {"text": "Luteal phase"}},
    })
    result = spike.handler({"mode": "corosmcp"}, None)
    logged = capsys.readouterr().out.strip().splitlines()[-1]
    assert result["coros"]["tools"]
    assert set(json.loads(logged)["coros"]) <= STATUS_FIELDS
    assert "Luteal" not in logged


def test_corosmcp_is_never_scheduled(spike):  # noqa: F811
    from pathlib import Path

    tf = (Path(spike.__file__).parent / "main.tf").read_text()
    assert "corosmcp" not in tf
