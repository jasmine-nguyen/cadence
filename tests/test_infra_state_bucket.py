"""Acceptance tests: Terraform state lives in an S3 bucket made by infra/bootstrap,
and infra/main keeps its state there with S3 native locking (no DynamoDB).

Seams: `terraform fmt -check`, `terraform init -backend=false` + `terraform validate`
on each folder, and the declared configuration itself. No AWS credentials are
needed; `init -backend=false` only downloads the provider from the registry.

Each config is copied to a temp folder before init, so the test never writes
`.terraform/` or a lock file into the repo.
"""

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
BOOTSTRAP = REPO_ROOT / "infra" / "bootstrap"
MAIN = REPO_ROOT / "infra" / "main"
REGION = "ap-southeast-2"

pytestmark = pytest.mark.skipif(
    shutil.which("terraform") is None, reason="terraform CLI not installed"
)


def _tf_sources(folder: Path) -> str:
    """All .tf files in the folder joined, with comments removed."""
    files = sorted(folder.glob("*.tf"))
    assert files, f"no .tf files in {folder.relative_to(REPO_ROOT)}"
    text = "\n".join(f.read_text() for f in files)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*(#|//).*$", "", text)
    text = re.sub(r"(?m)\s(#|//)[^\"\n]*$", "", text)
    return text


def _run(args, cwd: Path, env=None):
    return subprocess.run(
        ["terraform", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=600,
        env=env,
    )


def _init_and_validate(folder: Path, tmp_path: Path):
    """Copy the config to tmp, `init -backend=false`, then `validate -json`."""
    work = tmp_path / folder.name
    work.mkdir()
    for f in folder.glob("*.tf"):
        shutil.copy(f, work / f.name)
    lock = folder / ".terraform.lock.hcl"
    if lock.exists():
        shutil.copy(lock, work / lock.name)

    env = dict(os.environ)
    env["TF_IN_AUTOMATION"] = "1"
    env["TF_INPUT"] = "0"

    init = _run(["init", "-backend=false", "-input=false", "-no-color"], work, env)
    assert init.returncode == 0, f"terraform init failed:\n{init.stdout}\n{init.stderr}"

    validate = _run(["validate", "-json", "-no-color"], work, env)
    result = json.loads(validate.stdout)
    assert result["valid"], f"terraform validate failed: {result['diagnostics']}"


def _assert_required_version_supports_native_locking(src: str):
    m = re.search(r'required_version\s*=\s*"([^"]+)"', src)
    assert m, "terraform block must set required_version"
    floor = re.search(r">=\s*(\d+)\.(\d+)", m.group(1))
    assert floor, f"required_version needs a >= floor, got {m.group(1)!r}"
    assert (int(floor.group(1)), int(floor.group(2))) >= (1, 11), (
        "S3 native locking (use_lockfile) needs Terraform >= 1.11"
    )


def _assert_no_dynamodb(src: str):
    assert not re.search(r"aws_dynamodb_table", src), "no DynamoDB lock table"
    assert not re.search(r"dynamodb_table\s*=", src), "no DynamoDB locking in backend"


def _assert_lock_file_committable(folder: Path):
    lock = folder / ".terraform.lock.hcl"
    assert lock.exists(), f"{lock.relative_to(REPO_ROOT)} must be committed"
    assert 'provider "registry.terraform.io/hashicorp/aws"' in lock.read_text()
    ignored = subprocess.run(
        ["git", "check-ignore", "-q", str(lock.relative_to(REPO_ROOT))],
        cwd=REPO_ROOT,
    )
    assert ignored.returncode == 1, f"{lock.name} must not be gitignored"


def test_bootstrap_creates_a_private_versioned_encrypted_state_bucket_in_sydney(tmp_path):
    src = _tf_sources(BOOTSTRAP)

    # Valid, formatted config whose providers resolve.
    fmt = _run(["fmt", "-check", "-recursive", "-no-color", str(REPO_ROOT / "infra")], REPO_ROOT)
    assert fmt.returncode == 0, f"terraform fmt -check failed on:\n{fmt.stdout}"
    _init_and_validate(BOOTSTRAP, tmp_path)

    # Sydney.
    assert re.search(r'region\s*=\s*"ap-southeast-2"', src), "bootstrap must use Sydney"

    # Local state on purpose: bootstrap creates the bucket, so it can't live in it.
    assert not re.search(r'backend\s+"', src), "bootstrap keeps local state (no backend block)"

    # The bucket and its hardening.
    assert re.search(r'resource\s+"aws_s3_bucket"\s+"', src), "state bucket resource"
    versioning = re.search(
        r'resource\s+"aws_s3_bucket_versioning".*?status\s*=\s*"Enabled"', src, re.S
    )
    assert versioning, "versioning must be Enabled"
    sse = re.search(
        r'resource\s+"aws_s3_bucket_server_side_encryption_configuration"'
        r'.*?sse_algorithm\s*=\s*"AES256"',
        src,
        re.S,
    )
    assert sse, "Amazon-managed (SSE-S3, AES256) encryption"
    pab = re.search(r'resource\s+"aws_s3_bucket_public_access_block"\s+"\w+"\s*\{(.*?)\n\}', src, re.S)
    assert pab, "public access block resource"
    for flag in (
        "block_public_acls",
        "block_public_policy",
        "ignore_public_acls",
        "restrict_public_buckets",
    ):
        assert re.search(rf"{flag}\s*=\s*true", pab.group(1)), f"{flag} must be true"

    _assert_no_dynamodb(src)
    _assert_required_version_supports_native_locking(src)
    _assert_lock_file_committable(BOOTSTRAP)


def test_main_keeps_state_in_the_bootstrap_bucket_with_native_s3_locking(tmp_path):
    src = _tf_sources(MAIN)

    _init_and_validate(MAIN, tmp_path)

    backend = re.search(r'backend\s+"s3"\s*\{(.*?)\}', src, re.S)
    assert backend, "infra/main must declare an S3 backend"
    body = backend.group(1)
    assert re.search(r"use_lockfile\s*=\s*true", body), "S3 native locking (use_lockfile = true)"
    assert re.search(r'region\s*=\s*"ap-southeast-2"', body), "backend region is Sydney"
    assert re.search(r'key\s*=\s*"main/terraform\.tfstate"', body), "state key main/terraform.tfstate"
    bucket = re.search(r'bucket\s*=\s*"([^"]+)"', body)
    assert bucket, "backend bucket is written into the code"
    assert re.fullmatch(
        r"cadence-tfstate-(\d{12}|REPLACE_WITH_ACCOUNT_ID)-ap-southeast-2", bucket.group(1)
    ), f"bucket must match bootstrap's naming, got {bucket.group(1)!r}"

    _assert_no_dynamodb(src)
    _assert_required_version_supports_native_locking(src)
    _assert_lock_file_committable(MAIN)
