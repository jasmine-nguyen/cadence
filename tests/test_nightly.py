"""Acceptance test for CAD-38: the empty nightly job runs locally, with no AWS involved."""

from backend.nightly import run_nightly


def test_run_nightly_runs_locally_and_returns_nothing():
    # The skeleton nightly job does nothing yet, but it must run cleanly on a Mac/CI box.
    assert run_nightly() is None
