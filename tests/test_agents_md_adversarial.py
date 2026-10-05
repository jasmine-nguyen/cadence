"""Adversarial checks for the simulator-check pointer in AGENTS.md."""

import re

from tests.test_agents_md import AGENTS_MD, SKILL_FOLDER, _read_checks_section

REPO_ROOT = AGENTS_MD.parent
TEMPLATE_MD = REPO_ROOT / "AGENTS-template.md"
TEMPLATE_PREFIX = "iOS app? "


def _squash(text):
    return re.sub(r"\s+", " ", text).strip()


def _template_pointer():
    """The template's simulator-check paragraph, without its leading 'iOS app?'."""
    paragraphs = re.split(r"\n\s*\n", TEMPLATE_MD.read_text())
    matches = [p for p in paragraphs if "`simulator-check` skill" in p]
    assert len(matches) == 1, "AGENTS-template.md should hold one simulator-check paragraph"
    pointer = _squash(matches[0])
    assert pointer.startswith(TEMPLATE_PREFIX)
    return pointer[len(TEMPLATE_PREFIX):]


def test_pointer_wording_matches_template_without_ios_prefix():
    # [A1]
    _, after = _read_checks_section()
    assert _template_pointer() in _squash(after)


def test_pointer_names_a_skill_folder_that_exists():
    # [A2]
    _, after = _read_checks_section()
    assert SKILL_FOLDER in after
    assert (REPO_ROOT / SKILL_FOLDER / "SKILL.md").is_file()


def test_checks_block_still_holds_only_the_check_commands():
    # [A3] Every non-comment line in the fence runs as a command; prose must not leak in.
    fence, _ = _read_checks_section()
    commands = [
        line for line in fence.splitlines() if line.strip() and not line.lstrip().startswith("#")
    ]
    assert commands == [
        "rm -rf .expo/types && npm run typecheck",
        'npx expo export -p ios --output-dir "$(mktemp -d)"',
    ]
