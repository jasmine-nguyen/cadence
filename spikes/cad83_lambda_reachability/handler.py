"""CAD-83 / CAD-94 spike: can AWS Lambda use the unofficial COROS and Speediance APIs?

Throwaway. Not part of the nightly job; delete with the rest of this folder once
the results are recorded on CAD-83 and CAD-94.

Modes, picked by `event["mode"]`:

- none (CAD-83): log in to both services and read today. Returns and logs, per
  service, whether it worked and where it failed. No credentials, tokens or
  schedule contents.
- `write` (CAD-94, manual): add one COROS test run named TEST_WORKOUT_NAME
  TEST_DAYS_AHEAD days ahead, read it back, remove every copy, read back again.
  Returns and logs counts only. Only ever removes entries with the exact test
  name on the test day.
- `contents` (CAD-94, manual): the next 7 days of the COROS calendar and the last
  7 days of Speediance workouts, in the invoke response only. The log line keeps
  just ok/stage/error_type/duration_ms per service.
- `nightly` (CAD-94, scheduled): login + read only, no writes. Returns and logs
  only ok/stage/error_type/duration_ms per service, never error text or contents.
- `plan` (CAD-95, manual): runs the real backend code (`backend.week_suggestion`) to read
  COROS and ask Claude for a suggested next 7 days. The plan goes in the invoke
  response only; the log line keeps status, timings and token usage. Read-only:
  nothing is written to COROS, Speediance isn't called, and the COROS mobile login
  is never used.
- `sleep` (CAD-95, manual, run once): finds out whether coros-mcp's mobile
  (phone-app style) login logs Jas's COROS phone app out. Mobile login only, then
  the last SLEEP_NIGHTS nights of sleep-stage minutes in the invoke response only;
  the log line keeps just ok/stage/error_type/duration_ms. Never scheduled.
- `corosmcp` (manual, run once): can AWS use COROS's official MCP server
  (mcp.coros.com) on its own? Logs in with the official helper's password flow
  (OAuth + PKCE, no phone-app login), reads cycle phases, sleep and sleep-HRV,
  then refreshes the token once to see how renewal behaves. Tool output goes in
  the invoke response only; tokens are never returned or logged, and the log
  line keeps just ok/stage/error_type/duration_ms. Never scheduled.

Speediance is only ever asked to `login` or list `workouts`; nothing is pushed.
"""

import asyncio
import json
import os
import shlex
import subprocess
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

MELBOURNE = ZoneInfo("Australia/Melbourne")
DEFAULT_TOKEN_CACHE = "/tmp/speediance/token.json"
STDERR_TAIL_CHARS = 500

TEST_WORKOUT_NAME = "CADENCE TEST – delete me"  # en dash, exactly as on CAD-94
TEST_DAYS_AHEAD = 14
# 10 min easy run with a heart-rate target kept below LTHR (153): conservative.
TEST_WORKOUT_STEPS = [{"name": "Easy run", "duration_minutes": 10, "intensity_low": 100, "intensity_high": 135}]
COROS_RUN_SPORT_TYPE = 100  # coros-mcp rejects wire id 1 for runs
COROS_HEART_RATE_TARGET = 2
NIGHTLY_FIELDS = ("ok", "stage", "error_type", "duration_ms")
WRITE_ERROR_TEXT = ("error", "cleanup_error")  # kept in the write response, never logged
MODES = (None, "write", "contents", "nightly", "plan", "sleep", "corosmcp")
SLEEP_NIGHTS = 3
# Plan mode logs only these; the plan itself (dates, sessions, reasons) stays in the reply.
PLAN_LOG_FIELDS = ("ok", "stage", "status", "error_type", "duration_ms", "coros_ms", "claude_ms", "usage")


def _load_secret():
    """Read the spike's credentials from Secrets Manager (boto3 ships with Lambda)."""
    import boto3

    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=os.environ["SPIKE_SECRET_ID"])
    return json.loads(response["SecretString"])


def _egress_ip():
    """The public IP AWS used for outbound calls, so the results say what was tested."""
    try:
        with urllib.request.urlopen("https://checkip.amazonaws.com", timeout=5) as response:
            return response.read().decode().strip()
    except Exception:
        return "unknown"


def _elapsed_ms(started):
    return int((time.monotonic() - started) * 1000)


def _error_fields(error):
    fields = {"error_type": type(error).__name__, "error": str(error)}
    response = getattr(error, "response", None)
    status = getattr(response, "status_code", None)
    if status is not None:
        fields["http_status"] = status
    return fields


def _melbourne_today():
    return datetime.now(MELBOURNE).date()


# --- COROS and Speediance access ---------------------------------------------


def _coros_api():
    # coros-mcp picks its token folder from HOME when first imported; only /tmp is
    # writable on Lambda.
    os.environ["HOME"] = "/tmp"
    from coros_mcp import coros_api

    return coros_api


def _coros_login(coros_api, creds):
    return asyncio.run(
        coros_api.login(
            creds["COROS_EMAIL"],
            creds["COROS_PASSWORD"],
            os.environ.get("COROS_REGION", "us"),
            skip_mobile=True,  # the mobile login would log Jas's phone app out
        )
    )


def _run_speediance(creds, args):
    """Run speediance-cli with exactly `args`. Returns the CompletedProcess or raises."""
    token_cache = os.environ.get("SPEEDIANCE_TOKEN_CACHE", DEFAULT_TOKEN_CACHE)
    Path(token_cache).parent.mkdir(parents=True, exist_ok=True)
    env = {
        **os.environ,
        "SPEEDIANCE_TOKEN_CACHE": token_cache,
        "SPEEDIANCE_EMAIL": creds["SPEEDIANCE_EMAIL"],
        "SPEEDIANCE_PASSWORD": creds["SPEEDIANCE_PASSWORD"],
    }
    command = [os.environ.get("SPEEDIANCE_BIN", "/var/task/speediance-cli"), *args]
    return subprocess.run(command, env=env, capture_output=True, text=True, timeout=90)


def _stderr_tail(completed, secrets):
    # Scrub before cutting, or a secret straddling the cut would slip through.
    return _scrub(completed.stderr or "", secrets)[-STDERR_TAIL_CHARS:]


# --- CAD-83: reachability (no mode) ------------------------------------------


def _check_coros(creds):
    started = time.monotonic()
    stage = "import"
    try:
        coros_api = _coros_api()

        stage = "login"
        auth = _coros_login(coros_api, creds)

        stage = "schedule"
        today = _melbourne_today().strftime("%Y%m%d")
        schedule = asyncio.run(coros_api.fetch_schedule(auth, today, today))
    except Exception as error:
        return {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {
        "ok": True,
        "stage": "schedule",
        "duration_ms": _elapsed_ms(started),
        "schedule_keys_count": len(schedule) if isinstance(schedule, dict) else None,
    }


def _check_speediance(creds, secrets):
    started = time.monotonic()
    try:
        # Only this CAD-83 check honours SPEEDIANCE_ARGS; the CAD-94 modes never do.
        completed = _run_speediance(creds, shlex.split(os.environ.get("SPEEDIANCE_ARGS") or "login"))
    except Exception as error:
        return {"ok": False, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {
        "ok": completed.returncode == 0,
        "returncode": completed.returncode,
        "stderr_tail": _stderr_tail(completed, secrets),
        "duration_ms": _elapsed_ms(started),
    }


def _reachability(event, creds, secrets):
    """`{"only": "coros"|"speediance"}` runs just one check."""
    only = (event or {}).get("only")
    result = {"egress_ip": _egress_ip()}
    if only in (None, "coros"):
        result["coros"] = _check_coros(creds)
    if only in (None, "speediance"):
        result["speediance"] = _check_speediance(creds, secrets)
    return result


# --- CAD-94: write test ------------------------------------------------------


def _entities_with_programs(data, day=None):
    """Pair each calendar entity with its program (joined on idInPlan)."""
    data = data or {}
    programs = {str(program.get("idInPlan")): program for program in data.get("programs") or []}
    pairs = []
    for entity in data.get("entities") or []:
        # coros-mcp may give happenDay as an int; compare as YYYYMMDD text.
        if day is not None and str(entity.get("happenDay")) != day:
            continue
        pairs.append((entity, programs.get(str(entity.get("idInPlan"))) or {}))
    return pairs


def _test_entries(data, day):
    """Entities on `day` whose program name is exactly the test name. Nothing else."""
    return [
        entity for entity, program in _entities_with_programs(data, day) if program.get("name") == TEST_WORKOUT_NAME
    ]


def _other_count(data, day):
    return sum(1 for _, program in _entities_with_programs(data, day) if program.get("name") != TEST_WORKOUT_NAME)


def _remove_entries(coros_api, auth, data, entries):
    """Remove each given test entity. Returns how many removals returned None (success)."""
    returned_none = 0
    for entity in entries:
        outcome = asyncio.run(
            coros_api.remove_scheduled_workout(
                auth,
                str(entity.get("planId") or data["id"]),
                str(entity["idInPlan"]),
                str(entity.get("planProgramId") or ""),
            )
        )
        returned_none += outcome is None
    return returned_none


def _coros_write_test(creds):
    started = time.monotonic()
    day = (_melbourne_today() + timedelta(days=TEST_DAYS_AHEAD)).strftime("%Y%m%d")
    result = {"day": day}
    stage = "import"
    coros_api = auth = None

    def read():
        return asyncio.run(coros_api.fetch_schedule_raw(auth, day, day))

    try:
        coros_api = _coros_api()

        stage = "login"
        auth = _coros_login(coros_api, creds)

        stage = "pre_read"
        data = read()
        result["other_entries_before"] = _other_count(data, day)
        leftovers = _test_entries(data, day)  # from an earlier attempt that crashed
        _remove_entries(coros_api, auth, data, leftovers)
        result["leftovers_removed"] = len(leftovers)

        stage = "add"
        added = asyncio.run(
            coros_api.schedule_workout(
                auth,
                TEST_WORKOUT_NAME,
                TEST_WORKOUT_STEPS,
                day,
                sport_type=COROS_RUN_SPORT_TYPE,
                intensity_type=COROS_HEART_RATE_TARGET,
            )
        )

        stage = "read_back"
        copies = _test_entries(read(), day)
        result["copies_after_add"] = len(copies)
        result["duplicate"] = len(copies) > 1
        # Diagnostic only: removal goes by name, never by this id.
        returned_id = str((added or {}).get("id_in_plan"))
        result["returned_id_matched"] = any(str(entity.get("idInPlan")) == returned_id for entity in copies)
    except Exception as error:
        result["failed_stage"] = stage
        result.update(_error_fields(error))

    # Always clean up from a fresh read, whatever happened above. Without a login
    # there is nothing to clean up and nothing could have been added.
    if auth is not None:
        cleanup_stage = "remove"
        try:
            data = read()
            copies = _test_entries(data, day)
            result["removed"] = len(copies)
            result["remove_returned_none"] = _remove_entries(coros_api, auth, data, copies) == len(copies)

            cleanup_stage = "verify_removed"
            data = read()
            result["copies_after_remove"] = len(_test_entries(data, day))
            result["other_entries_after"] = _other_count(data, day)
        except Exception as error:
            result["cleanup_failed_stage"] = cleanup_stage
            result["cleanup_error_type"] = type(error).__name__
            result["cleanup_error"] = str(error)
        if "failed_stage" not in result:
            stage = result.get("cleanup_failed_stage", "verify_removed")

    result["stage"] = stage
    result["ok"] = (
        "failed_stage" not in result
        and "cleanup_failed_stage" not in result
        and result.get("copies_after_add") == 1
        and result.get("copies_after_remove") == 0
        and result.get("other_entries_before") == result.get("other_entries_after")
    )
    result["duration_ms"] = _elapsed_ms(started)
    return result


# --- CAD-94: contents check --------------------------------------------------


def _seconds_to_minutes(seconds):
    try:
        return round(float(seconds) / 60) if seconds is not None else None
    except (TypeError, ValueError):
        return None


def _iso_from_ymd(value):
    text = str(value)
    return f"{text[:4]}-{text[4:6]}-{text[6:8]}" if len(text) == 8 and text.isdigit() else None


def _coros_contents(creds):
    started = time.monotonic()
    stage = "import"
    try:
        coros_api = _coros_api()

        stage = "login"
        auth = _coros_login(coros_api, creds)

        stage = "read"
        today = _melbourne_today()
        first, last = today.strftime("%Y%m%d"), (today + timedelta(days=6)).strftime("%Y%m%d")
        data = asyncio.run(coros_api.fetch_schedule_raw(auth, first, last))

        stage = "summarise"
        entries = []
        for entity, program in _entities_with_programs(data):
            happen_day = str(entity.get("happenDay"))
            if not first <= happen_day <= last:
                continue
            entries.append(
                {
                    "date": _iso_from_ymd(happen_day),
                    "name": program.get("name"),
                    "planned_min": _seconds_to_minutes(program.get("duration") or program.get("estimatedTime")),
                }
            )
        entries.sort(key=lambda entry: entry["date"] or "")
    except Exception as error:
        return {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started), "next_7_days": entries}


def _speediance_contents(creds, secrets):
    started = time.monotonic()
    stage = "workouts"
    try:
        completed = _run_speediance(creds, ["workouts", "--days", "7", "--json"])
        if completed.returncode != 0:
            return {
                "ok": False,
                "stage": stage,
                "error_type": f"exit_{completed.returncode}",
                "stderr_tail": _stderr_tail(completed, secrets),
                "duration_ms": _elapsed_ms(started),
            }

        stage = "parse"
        workouts = json.loads(completed.stdout or "null") or []
        entries = [
            {
                "date": workout.get("date"),
                "name": workout.get("title"),
                "duration_min": _seconds_to_minutes(workout.get("duration_secs")),
            }
            for workout in workouts
        ]
        entries.sort(key=lambda entry: (entry["date"] is None, entry["date"] or ""))  # undated last
    except Exception as error:
        return {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), **_error_fields(error)}

    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started), "last_7_days": entries}


def _status_only(service):
    return {key: service[key] for key in NIGHTLY_FIELDS if key in service}


def _contents(creds, secrets):
    """Returns (response, log line). Contents go in the response only."""
    result = {
        "mode": "contents",
        "coros": _coros_contents(creds),
        "speediance": _speediance_contents(creds, secrets),
    }
    log_line = {
        "mode": "contents",
        "coros": _status_only(result["coros"]),
        "speediance": _status_only(result["speediance"]),
    }
    return result, log_line


# --- CAD-94: nightly ---------------------------------------------------------


def _nightly_coros(creds):
    started = time.monotonic()
    stage = "import"
    try:
        coros_api = _coros_api()

        stage = "login"
        auth = _coros_login(coros_api, creds)

        stage = "read"
        today = _melbourne_today().strftime("%Y%m%d")
        asyncio.run(coros_api.fetch_schedule(auth, today, today))
    except Exception as error:
        return {"ok": False, "stage": stage, "error_type": type(error).__name__, "duration_ms": _elapsed_ms(started)}
    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started)}


def _nightly_speediance(creds):
    started = time.monotonic()
    stage = "login"
    try:
        for stage, args in (("login", ["login"]), ("read", ["workouts", "--days", "1", "--json"])):
            completed = _run_speediance(creds, args)
            if completed.returncode != 0:
                return {
                    "ok": False,
                    "stage": stage,
                    "error_type": f"exit_{completed.returncode}",  # exit_2 = auth failure
                    "duration_ms": _elapsed_ms(started),
                }
        json.loads(completed.stdout or "null")
    except Exception as error:
        return {"ok": False, "stage": stage, "error_type": type(error).__name__, "duration_ms": _elapsed_ms(started)}
    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started)}


def _nightly(creds):
    return {
        "mode": "nightly",
        "date": _melbourne_today().isoformat(),
        "coros": _nightly_coros(creds),
        "speediance": _nightly_speediance(creds),
    }


# --- CAD-95: suggested week ------------------------------------------------


def _plan(creds):
    """Returns (response, log line). The suggested week goes in the response only."""
    started = time.monotonic()
    try:
        _coros_api()  # points HOME at /tmp before coros-mcp is first imported
        from backend.week_suggestion import suggest_week
    except Exception as error:
        result = {"ok": False, "stage": "import", "error_type": type(error).__name__, "duration_ms": _elapsed_ms(started)}
    else:
        result = suggest_week(creds)
    result = {"mode": "plan", **result}
    log_line = {"mode": "plan", **{key: result[key] for key in PLAN_LOG_FIELDS if key in result}}
    return result, log_line


# --- CAD-95: one-off sleep login test ---------------------------------------
# By hand only: it may log the COROS phone app out, which is exactly what it
# tests. The web login (_coros_login) and coros-mcp's stored-auth writes are never
# used; the mobile token lives in memory for this run. The rare token refresh
# inside fetch_sleep may write the /tmp token store, which is harmless because
# every other mode does a fresh web login().


def _coros_sleep(creds):
    started = time.monotonic()
    stage = "import"
    try:
        coros_api = _coros_api()
        from coros_mcp.models import StoredAuth

        stage = "mobile_login"
        region = os.environ.get("COROS_REGION", "us")
        token, payload = asyncio.run(
            coros_api._mobile_login(creds["COROS_EMAIL"], creds["COROS_PASSWORD"], region)
        )
        auth = StoredAuth(
            access_token="",
            user_id="",
            region=region,
            timestamp=int(time.time() * 1000),
            mobile_access_token=token,
            mobile_login_payload=payload,
        )

        stage = "read"
        today = _melbourne_today()
        first = today - timedelta(days=SLEEP_NIGHTS - 1)
        records = asyncio.run(coros_api.fetch_sleep(auth, first.strftime("%Y%m%d"), today.strftime("%Y%m%d")))

        stage = "summarise"
        nights = []
        for record in records:
            phases = getattr(record, "phases", None)
            nights.append(
                {
                    "date": _iso_from_ymd(record.date),
                    "deep_min": getattr(phases, "deep_minutes", None),
                    "light_min": getattr(phases, "light_minutes", None),
                    "rem_min": getattr(phases, "rem_minutes", None),
                    "awake_min": getattr(phases, "awake_minutes", None),
                }
            )
        nights.sort(key=lambda night: night["date"] or "")
    except Exception as error:
        # Type only: error text could echo the server's reply.
        return {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), "error_type": type(error).__name__}
    return {"ok": True, "stage": stage, "duration_ms": _elapsed_ms(started), "nights": nights}


# --- COROS official MCP (manual, run once) -----------------------------------
# Same protocol as COROS's own helper (coroslab/COROS-MCP,
# skill/coros_mcp_login_gateway/scripts/coros_mcp_login.py, legacy password login).

COROS_MCP_GATEWAY = "https://mcp.coros.com"
COROS_MCP_SCOPES = "openid offline_access mcp.tools"
COROS_MCP_REDIRECT = "http://127.0.0.1:43123/callback"  # never opened: the code is read from the redirect
COROS_MCP_NIGHTS = 3


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class _McpHttp:
    """Cookie-keeping HTTP client that hands redirects back instead of following them."""

    def __init__(self):
        import http.cookiejar

        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()), _NoRedirect()
        )

    def request(self, method, url, *, form=None, body=None, headers=None):
        import urllib.error
        import urllib.parse

        headers = dict(headers or {})
        data = None
        if form is not None:
            data = urllib.parse.urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            response = self.opener.open(req, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        return response.status, response.headers, response.read().decode("utf-8", "replace")


class CorosMcpError(RuntimeError):
    """Carries an HTTP status only, never the server's reply text."""


def _mcp_json(headers, raw):
    if "text/event-stream" in (headers.get("Content-Type") or ""):
        events = [line[5:].strip() for line in raw.splitlines() if line.startswith("data:")]
        raw = events[-1] if events else "{}"
    return json.loads(raw) if raw else {}


def _expect(status, headers, wanted, step):
    if status not in wanted:
        raise CorosMcpError(f"{step}: HTTP {status}")


def _query(url):
    import urllib.parse

    return {k: v[0] for k, v in urllib.parse.parse_qs(urllib.parse.urlparse(url).query).items()}


def _token_facts(payload):
    """Lifetimes and field names only, never token values."""
    return {
        "expires_in": payload.get("expires_in"),
        "has_refresh_token": bool(payload.get("refresh_token")),
        "fields": sorted(payload),
        **{k: payload[k] for k in payload if k.startswith("refresh") and k.endswith("expires_in")},
    }


def _coros_mcp_login(http, issuer, creds):
    import base64
    import hashlib
    import secrets as pysecrets
    import urllib.parse

    status, headers, raw = http.request("POST", f"{issuer}/connect/register", body={
        "client_name": "Cadence spike", "redirect_uris": [COROS_MCP_REDIRECT],
        "grant_types": ["authorization_code", "refresh_token"], "response_types": ["code"],
        "scope": COROS_MCP_SCOPES, "token_endpoint_auth_method": "none",
    })
    _expect(status, headers, (200, 201), "register")
    client_id = _mcp_json(headers, raw)["client_id"]

    verifier = pysecrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    state = pysecrets.token_urlsafe(24)
    authorize = f"{issuer}/oauth2/authorize?" + urllib.parse.urlencode({
        "response_type": "code", "client_id": client_id, "redirect_uri": COROS_MCP_REDIRECT,
        "scope": COROS_MCP_SCOPES, "code_challenge": challenge, "code_challenge_method": "S256",
        "resource": f"{issuer}/mcp", "state": state,
    })
    status, headers, _ = http.request("GET", authorize)
    _expect(status, headers, (302, 303), "authorize")
    coros_url = headers["Location"]
    q = _query(coros_url)
    status, headers, _ = http.request("POST", coros_url, form={
        "client_id": q.get("client_id", ""), "redirect_uri": q.get("redirect_uri", ""),
        "state": q.get("state", ""), "scope": q.get("scope", ""), "response_type": q.get("response_type", "code"),
        "activityType": "", "language": "zh", "country": "CN",
        "userName": creds["COROS_EMAIL"], "password": creds["COROS_PASSWORD"],
        "checkStatus": "1", "getAllHistoryIn24Hours": "0",
    })
    _expect(status, headers, (302, 303), "coros_login")
    for step in ("callback", "resume"):
        status, headers, _ = http.request("GET", headers["Location"])
        _expect(status, headers, (302, 303), step)
    returned = _query(headers["Location"])
    if returned.get("state") != state or not returned.get("code"):
        raise CorosMcpError("state mismatch or missing code")

    status, headers, raw = http.request("POST", f"{issuer}/oauth2/token", form={
        "grant_type": "authorization_code", "client_id": client_id, "code": returned["code"],
        "redirect_uri": COROS_MCP_REDIRECT, "code_verifier": verifier,
    })
    _expect(status, headers, (200,), "token")
    return client_id, _mcp_json(headers, raw)


def _coros_mcp_call(http, issuer, access_token, name, arguments):
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json, text/event-stream"}
    for request_id, method, params in (
        (1, "initialize", {"protocolVersion": "2025-06-18", "capabilities": {},
                           "clientInfo": {"name": "Cadence spike", "version": "0.1"}}),
        (2, "tools/call", {"name": name, "arguments": arguments}),
    ):
        status, reply_headers, raw = http.request(
            "POST", f"{issuer}/mcp", headers=headers,
            body={"jsonrpc": "2.0", "id": request_id, "method": method, "params": params},
        )
        _expect(status, reply_headers, (200,), method)
        payload = _mcp_json(reply_headers, raw)
        if "error" in payload:
            raise CorosMcpError(f"{method}: rpc error {payload['error'].get('code')}")
    result = payload["result"]
    text = "\n".join(part.get("text", "") for part in result.get("content", []) if part.get("type") == "text")
    return {"is_error": bool(result.get("isError")), "text": text}


def _coros_mcp(creds, http=None):
    started = time.monotonic()
    stage = "discover"
    http = http or _McpHttp()
    try:
        status, headers, raw = http.request("GET", f"{COROS_MCP_GATEWAY}/.well-known/openid-configuration")
        _expect(status, headers, (200,), "discover")
        issuer = _mcp_json(headers, raw).get("issuer", COROS_MCP_GATEWAY).rstrip("/")

        stage = "login"
        client_id, tokens = _coros_mcp_login(http, issuer, creds)
        first = _token_facts(tokens)

        today = _melbourne_today()
        start = (today - timedelta(days=COROS_MCP_NIGHTS - 1)).strftime("%Y%m%d")
        end = today.strftime("%Y%m%d")
        tools = {}
        for name, arguments in (
            ("queryMenstruationCycles", {}),
            ("querySleepOverview", {"startDate": start, "endDate": end}),
            ("querySleepHrv", {"startDate": start, "endDate": end, "days": COROS_MCP_NIGHTS}),
        ):
            stage = f"call:{name}"
            tools[name] = _coros_mcp_call(http, issuer, tokens["access_token"], name, arguments)

        stage = "refresh"
        status, headers, raw = http.request("POST", f"{issuer}/oauth2/token", form={
            "grant_type": "refresh_token", "client_id": client_id, "refresh_token": tokens["refresh_token"],
        })
        _expect(status, headers, (200,), "refresh")
        renewed = _mcp_json(headers, raw)
        refresh = {
            **_token_facts(renewed),
            "refresh_token_rotated": renewed.get("refresh_token") not in (None, tokens["refresh_token"]),
        }
        stage = "call_after_refresh"
        check = _coros_mcp_call(http, issuer, renewed["access_token"], "queryMenstruationCycles", {})
        refresh["works_after_refresh"] = not check["is_error"]
    except Exception as error:
        # Type and our own short message only: never the server's reply text.
        failure = {"ok": False, "stage": stage, "duration_ms": _elapsed_ms(started), "error_type": type(error).__name__}
        if isinstance(error, CorosMcpError):
            failure["detail"] = str(error)
        return failure
    return {
        "ok": True, "stage": "done", "duration_ms": _elapsed_ms(started), "issuer": issuer,
        "first_token": first, "refresh": refresh, "tools": tools,
    }


# --- Entry point -------------------------------------------------------------


def _scrub(value, secrets):
    """Replace every secret value in every string of the result with ***."""
    if isinstance(value, dict):
        return {key: _scrub(item, secrets) for key, item in value.items()}
    if isinstance(value, list):
        return [_scrub(item, secrets) for item in value]
    if isinstance(value, str):
        for secret in secrets:
            value = value.replace(secret, "***")
    return value


def handler(event, context):
    """Dispatch on `event["mode"]`; no mode runs the CAD-83 reachability checks."""
    mode = (event or {}).get("mode")
    if mode not in MODES:
        result = {"mode": str(mode), "ok": False, "error_type": "UnknownMode"}
        print(json.dumps(result))
        return result

    creds = _load_secret()
    secrets = sorted((v for v in creds.values() if isinstance(v, str) and v), key=len, reverse=True)

    if mode is None:
        result = log_line = _reachability(event, creds, secrets)
    elif mode == "write":
        write = _coros_write_test(creds)
        result = {"mode": "write", "coros": write}
        # Error text can echo the COROS server's reply (calendar text): log the types only.
        log_line = {"mode": "write", "coros": {k: v for k, v in write.items() if k not in WRITE_ERROR_TEXT}}
    elif mode == "contents":
        result, log_line = _contents(creds, secrets)
    elif mode == "plan":
        result, log_line = _plan(creds)
    elif mode == "sleep":
        sleep = _coros_sleep(creds)
        result = {"mode": "sleep", "coros": sleep}
        log_line = {"mode": "sleep", "coros": _status_only(sleep)}
    elif mode == "corosmcp":
        official = _coros_mcp(creds)
        result = {"mode": "corosmcp", "coros": official}
        log_line = {"mode": "corosmcp", "coros": _status_only(official)}
    else:
        result = log_line = _nightly(creds)

    print(json.dumps(_scrub(log_line, secrets)))
    return _scrub(result, secrets)
