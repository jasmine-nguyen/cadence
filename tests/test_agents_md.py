"""AGENTS.md points agents at the simulator-check skill, right after the checks block."""

import re
from pathlib import Path

AGENTS_MD = Path(__file__).resolve().parent.parent / "AGENTS.md"

SKILL_FOLDER = ".claude/skills/simulator-check/"
AXE_INSTALL = "brew install cameroncooke/axe/axe"


def _read_checks_section():
    """Return (checks fence body, prose between the closing fence and the next heading)."""
    text = AGENTS_MD.read_text()
    match = re.search(
        r"^```checks\n(?P<fence>.*?)^```[ \t]*\n(?P<after>.*?)(?=^## )",
        text,
        re.DOTALL | re.MULTILINE,
    )
    assert match, "AGENTS.md has no ```checks block followed by another section"
    return match.group("fence"), match.group("after")


def test_simulator_check_pointer_follows_checks_block_and_names_skill_folder_and_axe_install():
    fence, after = _read_checks_section()

    assert "`simulator-check`" in after
    assert SKILL_FOLDER in after
    assert AXE_INSTALL in after

    # Inside the fence the build would run it as a check command.
    assert "simulator-check" not in fence
    assert AXE_INSTALL not in fence
