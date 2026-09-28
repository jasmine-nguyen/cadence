"""Acceptance test for CAD-38: .gitignore keeps secrets, state and build output out of git,
while still committing the Terraform lock file and the .env example."""

import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

MUST_BE_IGNORED = [
    # Secrets / env
    ".env",
    "backend/.env",
    # Python
    "backend/__pycache__/nightly.cpython-312.pyc",
    "backend/venv/bin/python",
    # Token caches (COROS / Speediance)
    ".cache/coros/token.json",
    # Speediance local data
    "backend/library.json",
    "backend/plans/week-1.json",
    "library.json",
    "plans/week-1.json",
    # Built Lambda artifacts
    "build.zip",
    "backend/lambda.zip",
    # Terraform
    "infra/main/.terraform/providers/x",
    "infra/bootstrap/.terraform/providers/x",
    "infra/main/terraform.tfstate",
    "infra/main/terraform.tfstate.backup",
    "infra/main/prod.tfvars",
]

MUST_BE_COMMITTABLE = [
    "infra/main/.terraform.lock.hcl",
    "infra/bootstrap/.terraform.lock.hcl",
    ".env.example",
    "backend/nightly.py",
    "backend/requirements.txt",
]


def _is_ignored(path: str) -> bool:
    # --no-index: judge by the ignore rules alone, whether or not the path is tracked.
    result = subprocess.run(
        ["git", "check-ignore", "--quiet", "--no-index", path],
        cwd=REPO_ROOT,
    )
    assert result.returncode in (0, 1), f"git check-ignore errored on {path}"
    return result.returncode == 0


def test_gitignore_keeps_secrets_state_and_build_output_out_but_commits_lock_file():
    not_ignored = [p for p in MUST_BE_IGNORED if not _is_ignored(p)]
    wrongly_ignored = [p for p in MUST_BE_COMMITTABLE if _is_ignored(p)]

    assert not_ignored == [], f"these should be ignored: {not_ignored}"
    assert wrongly_ignored == [], f"these should be committable: {wrongly_ignored}"
