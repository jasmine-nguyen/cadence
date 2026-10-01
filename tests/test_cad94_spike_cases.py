"""Finer CAD-94 cases at the `handler()` seam: duplicates, leftovers, cleanup after
failures, undated Speediance rows, unknown modes and secret scrubbing.

Reuses the boundary stand-ins from the acceptance test.
"""

import json
import subprocess

from tests.test_cad83_spike import SECRETS, SPEEDIANCE_BIN
from tests.test_cad83_spike import spike  # noqa: F401  (pytest fixture)
from tests.test_cad94_spike import TEST_NAME, _FakeCorosCalendar, _FakeSpeedianceCli, _log_lines


def _install(monkeypatch, coros):
    coros.install(monkeypatch)
    speediance = _FakeSpeedianceCli()
    monkeypatch.setattr(subprocess, "run", speediance)
    return speediance


def _patch_api(monkeypatch, name, replacement):
    import sys

    monkeypatch.setattr(sys.modules["coros_mcp.coros_api"], name, replacement)


def test_write_reports_a_duplicate_and_removes_every_copy(spike, monkeypatch):  # noqa: F811
    coros = _FakeCorosCalendar(copies=2)
    coros.add_existing(14, "Long run with strides", 3600)
    _install(monkeypatch, coros)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["copies_after_add"] == 2
    assert write["duplicate"] is True
    assert write["removed"] == 2
    assert write["copies_after_remove"] == 0
    assert write["ok"] is False
    assert coros.names() == ["Long run with strides"]


def test_write_removes_a_leftover_test_entry_first(spike, monkeypatch):  # noqa: F811
    coros = _FakeCorosCalendar(copies=1)
    coros.add_existing(14, TEST_NAME, 600)
    _install(monkeypatch, coros)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["leftovers_removed"] == 1
    assert write["copies_after_add"] == 1
    assert write["copies_after_remove"] == 0
    assert write["ok"] is True
    assert coros.names() == []


def test_write_never_removes_a_real_entry_whose_id_matches_the_returned_id(spike, monkeypatch):  # noqa: F811
    coros = _FakeCorosCalendar(copies=1)
    coros.add_existing(14, "Long run with strides", 3600)  # gets idInPlan "101"
    _install(monkeypatch, coros)

    async def schedule_workout(auth, name, steps, happen_day, sport_type=2, intensity_type=None, sort_no=1):
        coros.add_calls.append({"name": name})
        coros.next_id += 1
        coros.entries.append(
            {"happenDay": int(happen_day), "idInPlan": str(coros.next_id), "name": name, "duration": 600}
        )
        return {"plan_id": "987654", "id_in_plan": "101", "plan_program_id": "101"}

    _patch_api(monkeypatch, "schedule_workout", schedule_workout)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["returned_id_matched"] is False
    assert coros.names() == ["Long run with strides"]
    assert all(call["id_in_plan"] != "101" for call in coros.remove_calls)


def test_write_cleans_up_when_the_add_saves_then_raises(spike, monkeypatch):  # noqa: F811
    coros = _FakeCorosCalendar(copies=1)
    _install(monkeypatch, coros)

    async def schedule_workout(auth, name, steps, happen_day, sport_type=2, intensity_type=None, sort_no=1):
        coros.next_id += 1
        coros.entries.append(
            {"happenDay": int(happen_day), "idInPlan": str(coros.next_id), "name": name, "duration": 600}
        )
        raise RuntimeError("enrichment failed")

    _patch_api(monkeypatch, "schedule_workout", schedule_workout)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["stage"] == "add"
    assert write["error_type"] == "RuntimeError"
    assert write["copies_after_remove"] == 0
    assert write["ok"] is False
    assert coros.names() == []


def test_write_cleans_up_when_the_read_back_fails(spike, monkeypatch):  # noqa: F811
    coros = _FakeCorosCalendar(copies=1)
    _install(monkeypatch, coros)
    import sys

    real_raw = sys.modules["coros_mcp.coros_api"].fetch_schedule_raw
    calls = {"n": 0}

    async def flaky_raw(auth, start, end):
        calls["n"] += 1
        if calls["n"] == 2:  # the read-back right after the add
            raise TimeoutError("read timed out")
        return await real_raw(auth, start, end)

    _patch_api(monkeypatch, "fetch_schedule_raw", flaky_raw)

    write = spike.handler({"mode": "write"}, None)["coros"]

    assert write["stage"] == "read_back"
    assert write["error_type"] == "TimeoutError"
    assert write["copies_after_remove"] == 0
    assert coros.names() == []


def test_write_skips_cleanup_and_scrubs_the_error_when_login_fails(spike, monkeypatch, capsys):  # noqa: F811
    coros = _FakeCorosCalendar(copies=1)
    _install(monkeypatch, coros)

    async def login(email, password, region="eu", *, skip_mobile=True):
        raise RuntimeError(f"bad password {password} for {email}")

    _patch_api(monkeypatch, "login", login)

    result = spike.handler({"mode": "write"}, None)
    logged = "\n".join(_log_lines(capsys))

    assert result["coros"]["stage"] == "login"
    assert result["coros"]["ok"] is False
    assert coros.raw_calls == [] and coros.add_calls == []
    for value in SECRETS.values():
        assert value not in json.dumps(result)
        assert value not in logged


def test_contents_keeps_undated_speediance_rows_last_and_handles_null_output(spike, monkeypatch):  # noqa: F811
    coros = _FakeCorosCalendar()
    coros.install(monkeypatch)
    rows = [
        {"title": "Undated", "date": None, "duration_secs": 600},
        {"title": "Dated", "date": "2026-09-30", "duration_secs": 1800},
    ]
    outputs = iter([json.dumps(rows), "null"])

    def fake_run(args, *pos, **kwargs):
        return subprocess.CompletedProcess(args, 0, stdout=next(outputs), stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)

    first = spike.handler({"mode": "contents"}, None)["speediance"]
    second = spike.handler({"mode": "contents"}, None)["speediance"]

    assert first["last_7_days"] == [
        {"date": "2026-09-30", "name": "Dated", "duration_min": 30},
        {"date": None, "name": "Undated", "duration_min": 10},
    ]
    assert second["ok"] is True
    assert second["last_7_days"] == []


def test_nightly_logs_no_error_text_when_both_services_fail(spike, monkeypatch, capsys):  # noqa: F811
    coros = _FakeCorosCalendar()
    coros.install(monkeypatch)

    async def login(email, password, region="eu", *, skip_mobile=True):
        raise RuntimeError(f"denied for {password}")

    _patch_api(monkeypatch, "login", login)

    def failing_cli(args, *pos, **kwargs):
        return subprocess.CompletedProcess(args, 2, stdout="", stderr=f"auth failed {SECRETS['SPEEDIANCE_PASSWORD']}")

    monkeypatch.setattr(subprocess, "run", failing_cli)

    result = spike.handler({"mode": "nightly"}, None)
    lines = _log_lines(capsys)

    assert set(result["coros"]) == {"ok", "stage", "error_type", "duration_ms"}
    assert result["coros"]["stage"] == "login"
    assert result["coros"]["error_type"] == "RuntimeError"
    assert result["speediance"]["stage"] == "login"
    assert result["speediance"]["error_type"] == "exit_2"
    assert len(lines) == 1
    assert "denied" not in lines[0] and "auth failed" not in lines[0]
    for value in SECRETS.values():
        assert value not in lines[0]


def test_unknown_mode_calls_nothing(spike, monkeypatch):  # noqa: F811
    coros = _FakeCorosCalendar()
    speediance = _install(monkeypatch, coros)

    result = spike.handler({"mode": "push"}, None)

    assert result["ok"] is False
    assert result["error_type"] == "UnknownMode"
    assert coros.login_calls == [] and speediance.calls == []


def test_default_mode_still_honours_speediance_args(spike, monkeypatch):  # noqa: F811
    monkeypatch.setenv("SPEEDIANCE_ARGS", "login --non-interactive")
    coros = _FakeCorosCalendar()
    speediance = _install(monkeypatch, coros)

    spike.handler({"only": "speediance"}, None)

    assert speediance.calls == [[SPEEDIANCE_BIN, "login", "--non-interactive"]]
