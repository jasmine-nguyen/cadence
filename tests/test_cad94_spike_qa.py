"""QA (adversarial) tests for CAD-94 at the `handler()` seam, plus static checks on
the Terraform and README. They cover what the acceptance and case tests don't:
near-miss test names, entries outside the asked-for day, plan ids, cleanup
failures, Melbourne dates, Speediance failure paths and the schedule config.
"""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from tests.test_cad83_spike import SECRETS, SPEEDIANCE_BIN
from tests.test_cad83_spike import spike  # noqa: F401  (pytest fixture)
from tests.test_cad94_spike import TEST_NAME, _FakeCorosCalendar, _FakeSpeedianceCli, _log_lines

SPIKE_DIR = Path(__file__).resolve().parent.parent / "spikes" / "cad83_lambda_reachability"
STATUS_FIELDS = {"ok", "stage", "error_type", "duration_ms"}

# 2026-10-02 15:00Z is already 3 October (01:00) in Melbourne.
FROZEN_UTC = datetime(2026, 10, 2, 15, 0, tzinfo=timezone.utc)
MELB_TODAY = "20261003"
MELB_TEST_DAY = "20261017"  # Melbourne today + 14


class _FrozenDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return FROZEN_UTC.astimezone(tz) if tz else FROZEN_UTC.replace(tzinfo=None)


def _freeze(spike, monkeypatch):  # noqa: F811
    monkeypatch.setattr(spike, "datetime", _FrozenDatetime)


def _api():
    return sys.modules["coros_mcp.coros_api"]


def _entry(coros, day, name, duration=1800, **extra):
    coros.next_id += 1
    coros.entries.append({"happenDay": int(day), "idInPlan": str(coros.next_id), "name": name, "duration": duration})
    coros.entries[-1].update(extra)
    return str(coros.next_id)


def _install(monkeypatch, coros, cli=None):
    coros.install(monkeypatch)
    cli = cli or _FakeSpeedianceCli()
    monkeypatch.setattr(subprocess, "run", cli)
    return cli


def _wide_raw(coros, extra_entity_fields=None):
    """A fetch_schedule_raw that ignores the date range and returns everything."""

    async def fetch_schedule_raw(auth, start_day, end_day):
        coros.raw_calls.append((start_day, end_day))
        return {
            "id": coros.PLAN_ID,
            "entities": [
                {
                    "happenDay": e["happenDay"],
                    "idInPlan": e["idInPlan"],
                    "planProgramId": e.get("planProgramId", e["idInPlan"]),
                    "planId": e.get("planId"),
                    **(extra_entity_fields or {}),
                }
                for e in coros.entries
            ],
            "programs": [
                {k: v for k, v in {"idInPlan": e["idInPlan"], "name": e["name"], **e}.items() if k != "happenDay"}
                for e in coros.entries
            ],
        }

    return fetch_schedule_raw


# --- write mode --------------------------------------------------------------


def test_write_uses_the_melbourne_date_for_the_test_day(spike, monkeypatch):  # noqa: F811
    # [A1] (P0) the test day is Melbourne today + 14, even when UTC is a day behind
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["day"] == MELB_TEST_DAY
    assert coros.add_calls[0]["happen_day"] == MELB_TEST_DAY
    assert set(coros.raw_calls) == {(MELB_TEST_DAY, MELB_TEST_DAY)}


def test_write_never_removes_near_miss_names_on_the_test_day(spike, monkeypatch):  # noqa: F811
    # [A2] (P0) only the exact name counts; hyphen, case, spacing variants stay
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    near_misses = [
        "CADENCE TEST - delete me",  # hyphen instead of en dash
        "cadence test – delete me",
        "CADENCE TEST – delete me ",
        "CADENCE TEST – delete me (2)",
        "Easy run",
    ]
    for name in near_misses:
        _entry(coros, MELB_TEST_DAY, name)
    _install(monkeypatch, coros)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert sorted(coros.names()) == sorted(near_misses)
    assert write["other_entries_before"] == len(near_misses)
    assert write["other_entries_after"] == len(near_misses)
    assert write["leftovers_removed"] == 0
    assert write["removed"] == 1
    assert write["ok"] is True


def test_write_ignores_test_named_entries_on_other_days_even_if_returned(spike, monkeypatch):  # noqa: F811
    # [A3] (P0) a test-named entry on another day is never touched, even when the
    # API returns more than the single day asked for
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _entry(coros, "20261016", TEST_NAME)
    _entry(coros, "20261018", TEST_NAME)
    _entry(coros, "20261016", "Long run")
    _install(monkeypatch, coros)
    monkeypatch.setattr(_api(), "fetch_schedule_raw", _wide_raw(coros))

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["leftovers_removed"] == 0
    assert write["copies_after_add"] == 1
    assert write["removed"] == 1
    assert write["copies_after_remove"] == 0
    assert write["other_entries_before"] == 0 == write["other_entries_after"]
    assert write["ok"] is True
    remaining = sorted((e["happenDay"], e["name"]) for e in coros.entries)
    assert remaining == [(20261016, TEST_NAME), (20261016, "Long run"), (20261018, TEST_NAME)]


def test_write_matches_happen_day_given_as_text(spike, monkeypatch):  # noqa: F811
    # [A4] (P1) happenDay may come back as "YYYYMMDD" text instead of an int
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)
    wide = _wide_raw(coros)

    async def text_days(auth, start_day, end_day):
        data = await wide(auth, start_day, end_day)
        for entity in data["entities"]:
            entity["happenDay"] = str(entity["happenDay"])
        return data

    monkeypatch.setattr(_api(), "fetch_schedule_raw", text_days)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["copies_after_add"] == 1
    assert write["copies_after_remove"] == 0
    assert coros.names() == []


def test_write_removes_with_the_entitys_own_plan_id_and_plan_program_id(spike, monkeypatch):  # noqa: F811
    # [A5] (P0) remove uses entity planId (not the top-level id) and planProgramId
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _entry(coros, MELB_TEST_DAY, TEST_NAME, planId=555, planProgramId="77")  # leftover
    _install(monkeypatch, coros)
    monkeypatch.setattr(_api(), "fetch_schedule_raw", _wide_raw(coros))
    seen = []

    async def remove(auth, plan_id, id_in_plan, plan_program_id):
        seen.append((plan_id, id_in_plan, plan_program_id))
        coros.entries = [e for e in coros.entries if e["idInPlan"] != str(id_in_plan)]

    monkeypatch.setattr(_api(), "remove_scheduled_workout", remove)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert seen[0] == ("555", "101", "77")
    # The entry added by the test has no explicit planId: falls back to the top-level id.
    assert seen[1][0] == str(coros.PLAN_ID)
    assert all(isinstance(arg, str) for call in seen for arg in call)
    assert write["leftovers_removed"] == 1
    assert write["remove_returned_none"] is True


def test_write_is_not_ok_when_another_entry_on_the_day_disappears(spike, monkeypatch):  # noqa: F811
    # [A6] (P0) if any other entry on the test day vanishes, the run must fail
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _entry(coros, MELB_TEST_DAY, "Long run")
    _install(monkeypatch, coros)

    async def greedy_remove(auth, plan_id, id_in_plan, plan_program_id):
        # Simulates a server-side bug that wipes the whole day.
        coros.entries = [e for e in coros.entries if e["happenDay"] != int(MELB_TEST_DAY)]

    monkeypatch.setattr(_api(), "remove_scheduled_workout", greedy_remove)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["copies_after_add"] == 1
    assert write["copies_after_remove"] == 0
    assert write["other_entries_before"] == 1
    assert write["other_entries_after"] == 0
    assert write["ok"] is False


def test_write_reports_a_cleanup_failure_and_scrubs_it(spike, monkeypatch, capsys):  # noqa: F811
    # [A7] (P0) a failing remove is reported (stage + cleanup error), ok is false,
    # and the secret in the error text is scrubbed from both response and log
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)

    async def broken_remove(auth, plan_id, id_in_plan, plan_program_id):
        raise RuntimeError(f"remove rejected for {SECRETS['COROS_PASSWORD']}")

    monkeypatch.setattr(_api(), "remove_scheduled_workout", broken_remove)

    result = spike.handler({"mode": "write"}, None)
    write = result["coros"]
    logged = "\n".join(_log_lines(capsys))

    assert write["copies_after_add"] == 1
    assert write["cleanup_failed_stage"] == "remove"
    assert write["cleanup_error_type"] == "RuntimeError"
    assert write["stage"] == "remove"
    assert write["ok"] is False
    assert "copies_after_remove" not in write
    for value in SECRETS.values():
        assert value not in json.dumps(result)
        assert value not in logged
    assert "***" in write["cleanup_error"]


def test_write_error_text_reaches_the_response_but_never_the_log(spike, monkeypatch, capsys):  # noqa: F811
    # Error text can echo the COROS server's reply (calendar text), so the log keeps
    # only the error types; the full text goes back to the invoker alone.
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)
    leak = "server said: 'Sunday Long Run 18k' clashes"

    async def broken_add(*args, **kwargs):
        raise RuntimeError(f"add rejected, {leak}")

    async def broken_remove(auth, plan_id, id_in_plan, plan_program_id):
        raise RuntimeError(f"remove rejected, {leak}")

    monkeypatch.setattr(_api(), "schedule_workout", broken_add)
    monkeypatch.setattr(_api(), "remove_scheduled_workout", broken_remove)
    _entry(coros, MELB_TEST_DAY, TEST_NAME)  # a leftover forces a remove call

    write = spike.handler({"mode": "write"}, None)["coros"]
    lines = _log_lines(capsys)

    assert leak in write["error"]
    assert leak in write["cleanup_error"]
    assert leak not in "\n".join(lines)
    logged_write = json.loads(lines[-1])["coros"]
    assert logged_write["error_type"] == "RuntimeError"
    assert logged_write["cleanup_error_type"] == "RuntimeError"
    assert "error" not in logged_write
    assert "cleanup_error" not in logged_write


def test_write_reports_remove_not_returning_none(spike, monkeypatch):  # noqa: F811
    # [A8] (P1) remove_scheduled_workout returns None on success; anything else is flagged
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)

    async def chatty_remove(auth, plan_id, id_in_plan, plan_program_id):
        coros.entries = [e for e in coros.entries if e["idInPlan"] != str(id_in_plan)]
        return {"result": "0000"}

    monkeypatch.setattr(_api(), "remove_scheduled_workout", chatty_remove)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["removed"] == 1
    assert write["remove_returned_none"] is False


def test_write_adds_a_short_conservative_heart_rate_run(spike, monkeypatch):  # noqa: F811
    # [A9] (P1) the test run is short, HR-targeted and below LTHR 153
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)
    calls = []
    real = _api().schedule_workout

    async def spy(auth, name, steps, happen_day, sport_type=2, intensity_type=None, sort_no=1):
        calls.append({"intensity_type": intensity_type, "steps": steps, "sport_type": sport_type})
        return await real(auth, name, steps, happen_day, sport_type, intensity_type, sort_no)

    monkeypatch.setattr(_api(), "schedule_workout", spy)

    spike.handler({"mode": "write"}, None)

    assert len(calls) == 1
    assert calls[0]["sport_type"] == 100
    assert calls[0]["intensity_type"] == 2
    assert sum(step["duration_minutes"] for step in calls[0]["steps"]) <= 15
    assert all(step["intensity_high"] < 153 for step in calls[0]["steps"])


def test_write_never_calls_speediance_and_logs_no_other_workout_names(spike, monkeypatch, capsys):  # noqa: F811
    # [A10] (P1) write mode: counts only in the log, no other workout names
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _entry(coros, MELB_TEST_DAY, "Secret tempo session")
    cli = _install(monkeypatch, coros)

    spike.handler({"mode": "write"}, None)
    logged = "\n".join(_log_lines(capsys))

    assert cli.calls == []
    assert "Secret tempo session" not in logged


# --- contents mode -----------------------------------------------------------


def test_contents_window_durations_and_order(spike, monkeypatch):  # noqa: F811
    # [A11] (P0) next 7 days only (Melbourne today..+6), sorted, duration from
    # `duration` or `estimatedTime`, None when neither is known
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _entry(coros, "20261009", "Last day", duration=1500)  # +6, inside
    _entry(coros, "20261003", "Today run", duration=None, estimatedTime=2700)
    _entry(coros, "20261005", "No duration", duration=None)
    _entry(coros, "20261002", "Yesterday", duration=600)  # outside (UTC today!)
    _entry(coros, "20261010", "Day seven", duration=600)  # +7, outside
    _install(monkeypatch, coros)
    monkeypatch.setattr(_api(), "fetch_schedule_raw", _wide_raw(coros))

    result = spike.handler({"mode": "contents"}, None)

    assert (MELB_TODAY, "20261009") in coros.raw_calls
    assert result["coros"]["ok"] is True
    assert result["coros"]["next_7_days"] == [
        {"date": "2026-10-03", "name": "Today run", "planned_min": 45},
        {"date": "2026-10-05", "name": "No duration", "planned_min": None},
        {"date": "2026-10-09", "name": "Last day", "planned_min": 25},
    ]


def test_contents_speediance_failure_is_reported_but_not_logged(spike, monkeypatch, capsys):  # noqa: F811
    # [A12] (P0) a Speediance auth failure: ok false + exit_2 in the response,
    # stderr only in the response (scrubbed), and the log line is status only
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _entry(coros, "20261004", "Tempo intervals")
    coros.install(monkeypatch)

    def failing(args, *pos, **kwargs):
        stderr = f"auth failed for {SECRETS['SPEEDIANCE_PASSWORD']}: Glute Builder Session"
        return subprocess.CompletedProcess(args, 2, stdout="", stderr=stderr)

    monkeypatch.setattr(subprocess, "run", failing)

    result = spike.handler({"mode": "contents"}, None)
    lines = _log_lines(capsys)

    assert result["speediance"]["ok"] is False
    assert result["speediance"]["error_type"] == "exit_2"
    assert SECRETS["SPEEDIANCE_PASSWORD"] not in json.dumps(result)
    assert "***" in result["speediance"]["stderr_tail"]
    assert result["coros"]["next_7_days"][0]["name"] == "Tempo intervals"

    assert len(lines) == 1
    line = json.loads(lines[0])
    assert set(line) == {"mode", "coros", "speediance"}
    assert set(line["coros"]) <= STATUS_FIELDS
    assert set(line["speediance"]) <= STATUS_FIELDS
    for text in ("Tempo intervals", "Glute Builder", "auth failed"):
        assert text not in lines[0]


def test_contents_coros_failure_logs_no_error_text(spike, monkeypatch, capsys):  # noqa: F811
    # [A13] (P0) a COROS error whose text quotes calendar content stays out of the log
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)

    async def bad_raw(auth, start_day, end_day):
        raise ValueError("unexpected program 'Secret hill reps'")

    monkeypatch.setattr(_api(), "fetch_schedule_raw", bad_raw)

    result = spike.handler({"mode": "contents"}, None)
    lines = _log_lines(capsys)

    assert result["coros"]["ok"] is False
    assert result["coros"]["stage"] == "read"
    assert result["coros"]["error_type"] == "ValueError"
    assert "Secret hill reps" not in lines[0]
    assert result["speediance"]["ok"] is True


def test_contents_speediance_bad_json_fails_at_parse(spike, monkeypatch, capsys):  # noqa: F811
    # [A14] (P1) unparsable Speediance output fails cleanly at stage "parse"
    coros = _FakeCorosCalendar()
    coros.install(monkeypatch)

    def garbage(args, *pos, **kwargs):
        return subprocess.CompletedProcess(args, 0, stdout="not json Glute", stderr="")

    monkeypatch.setattr(subprocess, "run", garbage)

    result = spike.handler({"mode": "contents"}, None)
    lines = _log_lines(capsys)

    assert result["speediance"]["ok"] is False
    assert result["speediance"]["stage"] == "parse"
    assert result["speediance"]["error_type"] == "JSONDecodeError"
    assert "Glute" not in lines[0]


def test_contents_never_writes_to_coros(spike, monkeypatch):  # noqa: F811
    # [A15] (P0) contents is read-only
    coros = _FakeCorosCalendar()
    _entry(coros, "20261004", TEST_NAME)
    _install(monkeypatch, coros)

    spike.handler({"mode": "contents"}, None)

    assert coros.add_calls == [] and coros.remove_calls == []
    assert coros.names() == [TEST_NAME]


# --- nightly mode ------------------------------------------------------------


def test_nightly_date_is_melbourne_and_reads_today_only(spike, monkeypatch, capsys):  # noqa: F811
    # [A16] (P0) the logged date and the COROS read use the Melbourne date
    _freeze(spike, monkeypatch)
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)

    result = spike.handler({"mode": "nightly"}, None)
    line = json.loads(_log_lines(capsys)[0])

    assert result["date"] == line["date"] == "2026-10-03"
    assert coros.schedule_calls == [(MELB_TODAY, MELB_TODAY)]
    assert coros.raw_calls == [] and coros.add_calls == [] and coros.remove_calls == []
    assert line == result


def test_nightly_speediance_login_failure_skips_the_read(spike, monkeypatch, capsys):  # noqa: F811
    # [A17] (P0) Speediance login exit 2 → stage login, exit_2, no workouts call
    coros = _FakeCorosCalendar()
    coros.install(monkeypatch)
    calls = []

    def cli(args, *pos, **kwargs):
        calls.append(list(args))
        return subprocess.CompletedProcess(args, 2, stdout="", stderr="bad creds")

    monkeypatch.setattr(subprocess, "run", cli)

    result = spike.handler({"mode": "nightly"}, None)

    assert calls == [[SPEEDIANCE_BIN, "login"]]
    assert result["speediance"] == {
        "ok": False,
        "stage": "login",
        "error_type": "exit_2",
        "duration_ms": result["speediance"]["duration_ms"],
    }
    assert result["coros"]["ok"] is True


def test_nightly_speediance_read_failures(spike, monkeypatch):  # noqa: F811
    # [A18] (P1) a failing or unparsable `workouts` read fails at stage "read"
    coros = _FakeCorosCalendar()
    coros.install(monkeypatch)
    outcomes = iter([(0, ""), (1, ""), (0, ""), (0, "oops not json")])

    def cli(args, *pos, **kwargs):
        code, out = next(outcomes)
        return subprocess.CompletedProcess(args, code, stdout=out, stderr="")

    monkeypatch.setattr(subprocess, "run", cli)

    first = spike.handler({"mode": "nightly"}, None)["speediance"]
    second = spike.handler({"mode": "nightly"}, None)["speediance"]

    assert (first["ok"], first["stage"], first["error_type"]) == (False, "read", "exit_1")
    assert (second["ok"], second["stage"], second["error_type"]) == (False, "read", "JSONDecodeError")
    assert set(second) <= STATUS_FIELDS


def test_nightly_coros_read_failure_is_stage_read(spike, monkeypatch, capsys):  # noqa: F811
    # [A19] (P1) COROS read error → stage read, error type only, no text
    coros = _FakeCorosCalendar()
    _install(monkeypatch, coros)

    async def boom(auth, start_day, end_day):
        raise ConnectionError(f"reset by peer {SECRETS['COROS_EMAIL']}")

    monkeypatch.setattr(_api(), "fetch_schedule", boom)

    result = spike.handler({"mode": "nightly"}, None)
    line = _log_lines(capsys)[0]

    assert result["coros"]["stage"] == "read"
    assert result["coros"]["error_type"] == "ConnectionError"
    assert set(result["coros"]) == STATUS_FIELDS
    assert "reset by peer" not in line


# --- dispatch ----------------------------------------------------------------


def test_unknown_or_odd_modes_do_not_load_secrets_or_call_anything(spike, monkeypatch):  # noqa: F811
    # [A20] (P1) unknown modes never touch Secrets Manager, COROS or Speediance
    coros = _FakeCorosCalendar()
    cli = _install(monkeypatch, coros)
    loads = []
    monkeypatch.setattr(spike, "_load_secret", lambda: loads.append(1) or dict(SECRETS))

    for mode in ("", "WRITE", "push", 0, ["write"]):
        result = spike.handler({"mode": mode}, None)
        assert result["ok"] is False and result["error_type"] == "UnknownMode"

    assert loads == [] and coros.login_calls == [] and cli.calls == []


def test_no_event_and_null_mode_run_the_cad83_check(spike, monkeypatch):  # noqa: F811
    # [A21] (P0) regression: None event / explicit null mode keep CAD-83 behaviour
    coros = _FakeCorosCalendar()
    cli = _install(monkeypatch, coros)

    for event in (None, {}, {"mode": None}):
        result = spike.handler(event, None)
        assert set(result) == {"egress_ip", "coros", "speediance"}
        assert "mode" not in result

    assert coros.add_calls == [] and coros.remove_calls == [] and coros.raw_calls == []
    assert all(call == [SPEEDIANCE_BIN, "login"] for call in cli.calls)


# --- Terraform and README (static) -------------------------------------------


def _tf():
    return (SPIKE_DIR / "main.tf").read_text()


def _block(tf, header):
    start = tf.index(header)
    depth = 0
    for i in range(tf.index("{", start), len(tf)):
        depth += {"{": 1, "}": -1}.get(tf[i], 0)
        if depth == 0:
            return tf[start : i + 1]
    raise AssertionError(f"unterminated block {header}")


def test_terraform_nightly_schedule(spike):  # noqa: F811
    # [A22] (P0) 22:00 Australia/Melbourne, bounded by dates, nightly payload, no retries
    block = _block(_tf(), 'resource "aws_scheduler_schedule" "nightly"')

    assert re.search(r'schedule_expression\s*=\s*"cron\(0 22 \* \* \? \*\)"', block)
    assert re.search(r'schedule_expression_timezone\s*=\s*"Australia/Melbourne"', block)
    assert re.search(r"start_date\s*=\s*var\.nightly_start_date", block)
    assert re.search(r"end_date\s*=\s*var\.nightly_end_date", block)
    assert re.search(r'input\s*=\s*jsonencode\(\{\s*mode\s*=\s*"nightly"\s*\}\)', block)
    assert re.search(r"retry_policy\s*\{\s*maximum_retry_attempts\s*=\s*0\s*\}", block)
    assert re.search(r'mode\s*=\s*"OFF"', block)
    assert re.search(r"count\s*=\s*var\.nightly_enabled \? 1 : 0", block)
    assert "aws_lambda_function.spike.arn" in block


def test_terraform_no_async_retries_logs_14_days_and_scheduler_role(spike):  # noqa: F811
    # [A23] (P0) no Lambda async retries, 14-day logs, a least-privilege scheduler role
    tf = _tf()
    invoke = _block(tf, 'resource "aws_lambda_function_event_invoke_config" "spike"')
    logs = _block(tf, 'resource "aws_cloudwatch_log_group" "spike"')
    assume = _block(tf, 'data "aws_iam_policy_document" "scheduler_assume"')
    policy = _block(tf, 'data "aws_iam_policy_document" "scheduler"')
    role = _block(tf, 'resource "aws_iam_role" "scheduler"')

    assert re.search(r"maximum_retry_attempts\s*=\s*0", invoke)
    assert re.search(r"retention_in_days\s*=\s*14\b", logs)
    assert '"scheduler.amazonaws.com"' in assume
    assert re.search(r'actions\s*=\s*\["lambda:InvokeFunction"\]', policy)
    assert re.search(r"resources\s*=\s*\[aws_lambda_function\.spike\.arn\]", policy)
    assert re.search(r"count\s*=\s*var\.nightly_enabled \? 1 : 0", role)
    assert re.search(r'variable "nightly_enabled" \{[^}]*default\s*=\s*false', tf)


def test_readme_covers_run_collect_and_teardown(spike):  # noqa: F811
    # [A24] (P1) README: write/contents runs, collecting nightly logs, teardown
    readme = (SPIKE_DIR / "README.md").read_text()

    assert '{"mode":"write"}' in readme
    assert '{"mode":"contents"}' in readme
    assert "nightly_enabled=true" in readme
    assert "filter-log-events" in readme and '$.mode = "nightly"' in readme
    assert "terraform destroy" in readme
    assert "aws scheduler list-schedules" in readme
    assert TEST_NAME in readme
    assert "rm out.json" in readme
