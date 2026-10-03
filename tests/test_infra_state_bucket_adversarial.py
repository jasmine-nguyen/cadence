"""Adversarial tests for the Terraform state bucket (infra/bootstrap) and the
S3 backend that uses it (infra/main).

The bootstrap checks run a real `terraform test` apply against a mocked AWS
provider: no credentials, no AWS calls, no cost. That checks the values the
config actually produces (bucket name, hardening attached to the right bucket)
rather than matching its text.

Every config is copied to a temp folder first, so nothing is written to the repo.
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

pytestmark = pytest.mark.skipif(
    shutil.which("terraform") is None, reason="terraform CLI not installed"
)


def _strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*(#|//).*$", "", text)
    return re.sub(r"(?m)\s(#|//)[^\"\n]*$", "", text)


def _tf_sources(folder: Path) -> str:
    return _strip_comments("\n".join(f.read_text() for f in sorted(folder.glob("*.tf"))))


_PLUGIN_CACHE = None


@pytest.fixture(scope="module", autouse=True)
def _shared_plugin_cache(tmp_path_factory):
    """Download the aws provider once for the whole module, not once per test."""
    global _PLUGIN_CACHE
    _PLUGIN_CACHE = tmp_path_factory.mktemp("tf-plugin-cache")
    yield
    _PLUGIN_CACHE = None


def _env():
    env = dict(os.environ)
    if _PLUGIN_CACHE is not None:
        env["TF_PLUGIN_CACHE_DIR"] = str(_PLUGIN_CACHE)
    env["TF_IN_AUTOMATION"] = "1"
    env["TF_INPUT"] = "0"
    # Make sure no real AWS profile is picked up by accident.
    env.pop("AWS_PROFILE", None)
    return env


def _run(args, cwd: Path):
    return subprocess.run(
        ["terraform", *args], cwd=cwd, capture_output=True, text=True, timeout=600, env=_env()
    )


def _copy_config(folder: Path, tmp_path: Path) -> Path:
    work = tmp_path / folder.name
    work.mkdir()
    for f in folder.glob("*.tf"):
        shutil.copy(f, work / f.name)
    lock = folder / ".terraform.lock.hcl"
    if lock.exists():
        shutil.copy(lock, work / lock.name)
    init = _run(["init", "-backend=false", "-input=false", "-no-color"], work)
    assert init.returncode == 0, f"terraform init failed:\n{init.stdout}\n{init.stderr}"
    return work


def _main_backend_bucket() -> str:
    body = re.search(r'backend\s+"s3"\s*\{(.*?)\}', _tf_sources(MAIN), re.S)
    assert body, "infra/main must declare an S3 backend"
    bucket = re.search(r'bucket\s*=\s*"([^"]+)"', body.group(1))
    assert bucket, "infra/main backend must name its bucket"
    return bucket.group(1)


def _main_account_id() -> str:
    m = re.fullmatch(r"cadence-tfstate-(\d{12})-ap-southeast-2", _main_backend_bucket())
    assert m, (
        "infra/main backend bucket must hold a real 12-digit account ID "
        f"(placeholder left in?), got {_main_backend_bucket()!r}"
    )
    return m.group(1)


def _terraform_test(tmp_path: Path, asserts: str):
    """Apply bootstrap against a mocked AWS provider and check `asserts` (HCL)."""
    work = _copy_config(BOOTSTRAP, tmp_path)
    (work / "tests").mkdir()
    (work / "tests" / "qa.tftest.hcl").write_text(
        f"""
mock_provider "aws" {{
  override_data {{
    target = data.aws_caller_identity.current
    values = {{ account_id = "{_main_account_id()}" }}
  }}
  # The mock's random string isn't JSON, which the bucket policy rejects.
  override_data {{
    target = data.aws_iam_policy_document.state
    values = {{ json = "{{}}" }}
  }}
}}

run "bootstrap" {{
  command = apply
{asserts}
}}
"""
    )
    result = _run(["test", "-no-color"], work)
    assert result.returncode == 0, f"terraform test failed:\n{result.stdout}\n{result.stderr}"


def _hcl_assert(condition: str, message: str) -> str:
    return f"""
  assert {{
    condition     = {condition}
    error_message = "{message}"
  }}
"""


# [A1] The bucket bootstrap creates is exactly the one infra/main's backend names.
# The mocked account ID is taken from main's literal, so this checks the naming
# template; whether that ID is Jas's real account is a manual check.
def test_bootstrap_bucket_name_equals_main_backend_bucket(tmp_path):
    expected = _main_backend_bucket()
    _terraform_test(
        tmp_path,
        _hcl_assert(
            f'aws_s3_bucket.state.bucket == "{expected}"',
            "bootstrap bucket name differs from infra/main backend bucket",
        ),
    )


# [A2] Versioning, encryption, public access block and ownership controls are
# all attached to the state bucket, with the agreed values.
def test_bootstrap_hardening_is_attached_to_the_state_bucket(tmp_path):
    asserts = "".join(
        [
            _hcl_assert(
                "aws_s3_bucket_versioning.state.bucket == aws_s3_bucket.state.id",
                "versioning not on the state bucket",
            ),
            _hcl_assert(
                'aws_s3_bucket_versioning.state.versioning_configuration[0].status == "Enabled"',
                "versioning must be Enabled",
            ),
            _hcl_assert(
                "aws_s3_bucket_server_side_encryption_configuration.state.bucket == aws_s3_bucket.state.id",
                "encryption not on the state bucket",
            ),
            _hcl_assert(
                'one([for r in aws_s3_bucket_server_side_encryption_configuration.state.rule : '
                'one(r.apply_server_side_encryption_by_default).sse_algorithm]) == "AES256"',
                "encryption must be SSE-S3 (AES256)",
            ),
            _hcl_assert(
                "aws_s3_bucket_public_access_block.state.bucket == aws_s3_bucket.state.id",
                "public access block not on the state bucket",
            ),
            _hcl_assert(
                "aws_s3_bucket_public_access_block.state.block_public_acls && "
                "aws_s3_bucket_public_access_block.state.block_public_policy && "
                "aws_s3_bucket_public_access_block.state.ignore_public_acls && "
                "aws_s3_bucket_public_access_block.state.restrict_public_buckets",
                "all four public access flags must be true",
            ),
            _hcl_assert(
                "aws_s3_bucket_ownership_controls.state.bucket == aws_s3_bucket.state.id",
                "ownership controls not on the state bucket",
            ),
            _hcl_assert(
                'aws_s3_bucket_ownership_controls.state.rule[0].object_ownership == "BucketOwnerEnforced"',
                "ownership must be BucketOwnerEnforced (ACLs off)",
            ),
        ]
    )
    _terraform_test(tmp_path, asserts)


# [A3] The bucket policy is attached to the state bucket and denies non-HTTPS access.
def test_bootstrap_bucket_policy_denies_insecure_transport(tmp_path):
    asserts = "".join(
        [
            _hcl_assert(
                "aws_s3_bucket_policy.state.bucket == aws_s3_bucket.state.id",
                "policy not on the state bucket",
            ),
            _hcl_assert(
                "aws_s3_bucket_policy.state.policy == data.aws_iam_policy_document.state.json",
                "bucket policy must be the policy document",
            ),
            _hcl_assert(
                "anytrue([for s in data.aws_iam_policy_document.state.statement : "
                's.effect == "Deny" && contains(s.actions, "s3:*") && '
                "contains(s.resources, aws_s3_bucket.state.arn) && "
                'contains(s.resources, "${aws_s3_bucket.state.arn}/*") && '
                "anytrue([for c in s.condition : "
                'c.variable == "aws:SecureTransport" && c.test == "Bool" && contains(c.values, "false")])])',
                "a Deny s3:* statement on the bucket and its objects when aws:SecureTransport is false",
            ),
        ]
    )
    _terraform_test(tmp_path, asserts)


# [A4] Old state versions expire after 90 days, keeping the newest 10, on the state bucket.
def test_bootstrap_lifecycle_expires_noncurrent_versions_but_keeps_newest_ten(tmp_path):
    asserts = "".join(
        [
            _hcl_assert(
                "aws_s3_bucket_lifecycle_configuration.state.bucket == aws_s3_bucket.state.id",
                "lifecycle not on the state bucket",
            ),
            _hcl_assert(
                'aws_s3_bucket_lifecycle_configuration.state.rule[0].status == "Enabled"',
                "lifecycle rule must be Enabled",
            ),
            _hcl_assert(
                "aws_s3_bucket_lifecycle_configuration.state.rule[0].noncurrent_version_expiration[0].noncurrent_days == 90",
                "noncurrent versions expire after 90 days",
            ),
            _hcl_assert(
                "aws_s3_bucket_lifecycle_configuration.state.rule[0].noncurrent_version_expiration[0].newer_noncurrent_versions == 10",
                "the newest 10 noncurrent versions are kept",
            ),
            _hcl_assert(
                "aws_s3_bucket_lifecycle_configuration.state.rule[0].abort_incomplete_multipart_upload[0].days_after_initiation == 7",
                "incomplete multipart uploads abort after 7 days",
            ),
        ]
    )
    _terraform_test(tmp_path, asserts)


# [A4b] The lifecycle rule sets an explicit (empty) filter, so it covers every
# object and aws ~> 6.0 doesn't warn about a missing filter or prefix.
def test_bootstrap_lifecycle_rule_has_explicit_filter():
    src = _tf_sources(BOOTSTRAP)
    lc = re.search(
        r'resource\s+"aws_s3_bucket_lifecycle_configuration"\s+"state"\s*\{(.*?)\n\}', src, re.S
    )
    assert lc, "aws_s3_bucket_lifecycle_configuration.state resource"
    assert re.search(r"\brule\s*\{.*?\bfilter\s*\{\s*\}", lc.group(1), re.S), (
        "lifecycle rule needs an explicit `filter {}`"
    )


# [A5] The state_bucket_name output is the bucket's ID and the region output is Sydney.
def test_bootstrap_outputs_point_at_the_state_bucket_and_sydney(tmp_path):
    asserts = "".join(
        [
            _hcl_assert(
                "output.state_bucket_name == aws_s3_bucket.state.id",
                "state_bucket_name must be the state bucket",
            ),
            _hcl_assert('output.region == "ap-southeast-2"', "region output must be Sydney"),
        ]
    )
    _terraform_test(tmp_path, asserts)


# [A6] The state bucket can't be destroyed by accident.
def test_bootstrap_state_bucket_has_prevent_destroy():
    src = _tf_sources(BOOTSTRAP)
    bucket = re.search(r'resource\s+"aws_s3_bucket"\s+"state"\s*\{(.*?)\n\}', src, re.S)
    assert bucket, "aws_s3_bucket.state resource"
    assert re.search(
        r"lifecycle\s*\{[^}]*prevent_destroy\s*=\s*true", bucket.group(1), re.S
    ), "state bucket must set lifecycle { prevent_destroy = true }"


# [A7] Bootstrap creates only S3 resources (no DynamoDB, nothing else that costs).
def test_bootstrap_creates_only_s3_bucket_resources():
    types = re.findall(r'resource\s+"([\w-]+)"', _tf_sources(BOOTSTRAP))
    assert types, "bootstrap declares resources"
    others = [t for t in types if not t.startswith("aws_s3_bucket")]
    assert others == [], f"bootstrap should only manage the S3 bucket, found {others}"


# [A8] Both configs validate with no warnings (e.g. the aws 6 lifecycle filter warning).
@pytest.mark.parametrize("folder", [BOOTSTRAP, MAIN], ids=["bootstrap", "main"])
def test_config_validates_without_warnings(folder, tmp_path):
    work = _copy_config(folder, tmp_path)
    result = json.loads(_run(["validate", "-json", "-no-color"], work).stdout)
    assert result["valid"], result["diagnostics"]
    assert result["warning_count"] == 0, result["diagnostics"]


# [A9] The backend encrypts state and names its bucket, key and region literally
# (no -backend-config needed, no leftover placeholder, no variables).
def test_main_backend_is_complete_and_literal():
    body = re.search(r'backend\s+"s3"\s*\{(.*?)\}', _tf_sources(MAIN), re.S).group(1)
    assert re.search(r"encrypt\s*=\s*true", body), "backend must set encrypt = true"
    assert "REPLACE_WITH_ACCOUNT_ID" not in body, "placeholder account ID left in backend"
    assert "${" not in body and "var." not in body, "backend values must be literals"
    _main_account_id()
    main_provider = re.search(r'provider\s+"aws"\s*\{(.*?)\n\}', _tf_sources(MAIN), re.S)
    assert main_provider, "infra/main needs an aws provider"
    assert re.search(r'region\s*=\s*"ap-southeast-2"', main_provider.group(1)), (
        "infra/main provider must be in Sydney"
    )


# [A10] Lock files pin the same aws provider in both folders, match the
# constraint, and carry hashes for several platforms (Mac and Linux CI/Lambda).
def test_lock_files_pin_same_aws_version_for_several_platforms():
    pins = {}
    for folder in (BOOTSTRAP, MAIN):
        text = (folder / ".terraform.lock.hcl").read_text()
        version = re.search(r'version\s*=\s*"([^"]+)"', text)
        constraint = re.search(r'constraints\s*=\s*"([^"]+)"', text)
        assert version and constraint, f"{folder.name} lock file pins the aws provider"
        assert version.group(1).startswith("6."), f"{folder.name}: aws provider must be 6.x"
        assert constraint.group(1) == "~> 6.0"
        h1 = re.findall(r'"h1:[^"]+"', text)
        assert len(h1) >= 3, (
            f"{folder.name} lock file has {len(h1)} h1 hash(es); "
            "lock darwin_arm64, linux_amd64 and linux_arm64 so init works on every machine"
        )
        pins[folder.name] = version.group(1)
    assert pins["bootstrap"] == pins["main"], f"aws provider versions differ: {pins}"


# [A11] The bootstrap's local state and any tfvars stay out of git; its lock file doesn't.
def test_bootstrap_local_state_is_gitignored():
    def ignored(path):
        r = subprocess.run(
            ["git", "check-ignore", "--quiet", "--no-index", path], cwd=REPO_ROOT
        )
        assert r.returncode in (0, 1)
        return r.returncode == 0

    for path in (
        "infra/bootstrap/terraform.tfstate",
        "infra/bootstrap/terraform.tfstate.backup",
        "infra/bootstrap/terraform.tfstate.1700000000.backup",
        "infra/bootstrap/terraform.tfvars",
        "infra/bootstrap/.terraform/terraform.tfstate",
    ):
        assert ignored(path), f"{path} must be gitignored"
    assert not ignored("infra/bootstrap/.terraform.lock.hcl")


# [A12] The README's recovery steps import every resource bootstrap manages,
# so a lost local state can be fully rebuilt.
def test_bootstrap_readme_imports_every_managed_resource():
    resources = re.findall(r'resource\s+"([\w-]+)"\s+"([\w-]+)"', _tf_sources(BOOTSTRAP))
    readme = (BOOTSTRAP / "README.md").read_text()
    missing = [
        f"{t}.{n}"
        for t, n in resources
        if not re.search(rf"terraform import {re.escape(t)}\.{re.escape(n)}\s", readme)
    ]
    assert missing == [], f"README recovery steps don't import: {missing}"


# [A13] AGENTS.md records Sydney as decided and no longer lists the region as open.
def test_agents_md_records_sydney_as_decided():
    text = (REPO_ROOT / "AGENTS.md").read_text()
    decisions = text.split("## Current decisions", 1)[1].split("\n## ", 1)[0]
    open_q = text.split("## Open questions", 1)[1].split("\n## ", 1)[0]
    assert re.search(r"region.*ap-southeast-2", decisions, re.I), "Sydney under Current decisions"
    assert "region" not in open_q.lower(), "AWS region still listed as an open question"
