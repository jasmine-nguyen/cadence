"""QA tests for CAD-38: backend skeleton runs from the CLI, the Python pin matches CI,
and the new .gitignore rules cover the edge cases without hiding tracked files."""

import re
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

# Python versions AWS Lambda currently offers as managed runtimes.
LAMBDA_PYTHON_RUNTIMES = {"3.9", "3.10", "3.11", "3.12", "3.13"}


def _is_ignored(path: str) -> bool:
    result = subprocess.run(
        ["git", "check-ignore", "--quiet", "--no-index", path],
        cwd=REPO_ROOT,
    )
    assert result.returncode in (0, 1), f"git check-ignore errored on {path}"
    return result.returncode == 0


# [A1] (P0) `python -m backend.nightly` from the repo root → exit 0, prints the placeholder line.
def test_nightly_module_runs_from_cli():
    result = subprocess.run(
        [sys.executable, "-m", "backend.nightly"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert "run_nightly" in result.stdout


# [A2] (P0) No file already tracked in git is matched by the ignore rules
# (e.g. `**/token*.json` or `*.zip` must not swallow an existing design/app file).
def test_no_tracked_file_is_ignored():
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--ignored", "--exclude-standard"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stdout.strip() == "", f"tracked files now ignored:\n{result.stdout}"


# [A3] (P1) Edge cases the acceptance test doesn't list: env variants, nested token
# caches, tfvars.json, build dirs, pytest/coverage output.
@pytest.mark.parametrize(
    "path",
    [
        ".env.local",
        ".env.production",
        "backend/.env.dev",
        "backend/.tokens/coros.json",
        "backend/cache/token_coros.json",
        "infra/main/terraform.tfvars.json",
        "infra/main/nested/terraform.tfstate",
        "backend/build/nightly.py",
        "backend/package/lib/x.py",
        ".pytest_cache/v/cache",
        ".coverage",
        "backend/.venv/bin/python",
    ],
)
def test_extra_paths_are_ignored(path):
    assert _is_ignored(path), f"{path} should be gitignored"


# [A4] (P1) Pinned backend Python is a Lambda runtime and matches the CI pin.
def test_python_pin_is_lambda_runtime_and_matches_ci():
    pin = (REPO_ROOT / "backend" / ".python-version").read_text().strip()
    assert pin in LAMBDA_PYTHON_RUNTIMES, f"{pin!r} is not a Lambda Python runtime"
    workflow = (REPO_ROOT / ".github" / "workflows" / "python-tests.yml").read_text()
    ci = re.search(r'python-version:\s*"([\d.]+)"', workflow)
    assert ci and ci.group(1) == pin, f"CI pins {ci and ci.group(1)}, backend pins {pin}"


# [A5] (P1) backend/requirements.txt is its own file, not a copy of the root build-graph deps.
def test_backend_requirements_separate_from_root():
    backend_reqs = REPO_ROOT / "backend" / "requirements.txt"
    assert backend_reqs.is_file()

    def pkgs(p: Path) -> set[str]:
        return {
            re.split(r"[=<>~!\[; ]", line.strip(), maxsplit=1)[0].lower()
            for line in p.read_text().splitlines()
            if line.strip() and not line.strip().startswith(("#", "-"))
        }

    root = pkgs(REPO_ROOT / "requirements.txt")
    assert root, "root requirements.txt should still list build-graph deps"
    assert not (pkgs(backend_reqs) & root), "backend requirements leaked build-graph deps"
