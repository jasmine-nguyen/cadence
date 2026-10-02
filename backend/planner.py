"""Planner interface: what any AI provider must return for a suggested week.

Stdlib only, so the plan shape and its checks don't depend on any provider's SDK.
"""

from dataclasses import dataclass, field
from typing import Optional, Protocol

SESSION_TYPES = ("rest", "easy_run", "walk_run", "long_easy_run", "strides", "cross_training")

# Statuses a planner can report.
STATUSES = ("ok", "refusal", "api_error", "malformed", "max_tokens")

# Structured-output schema. Keep to what structured outputs support: no numeric
# minimum/maximum and no maxItems; parse_week enforces counts and ranges.
PLAN_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "days": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "YYYY-MM-DD"},
                    "session_type": {"type": "string", "enum": list(SESSION_TYPES)},
                    "duration_min": {"type": "integer", "description": "Total minutes; 0 on rest days"},
                    "hr_target": {"type": "string", "description": "Heart-rate target, empty on rest days"},
                    "reason": {"type": "string", "description": "One line"},
                },
                "required": ["date", "session_type", "duration_min", "hr_target", "reason"],
                "additionalProperties": False,
            },
        },
        "rationale": {"type": "string"},
    },
    "required": ["days", "rationale"],
    "additionalProperties": False,
}


@dataclass
class PlannedDay:
    date: str
    session_type: str
    duration_min: int
    hr_target: str
    reason: str


@dataclass
class WeekPlan:
    days: list[PlannedDay]
    rationale: str


@dataclass
class PlanResult:
    ok: bool
    status: str
    plan: Optional[WeekPlan] = None
    error_type: Optional[str] = None
    usage: dict = field(default_factory=dict)


class Planner(Protocol):
    def suggest_week(self, data: dict, plan_dates: list[str]) -> PlanResult: ...


def parse_week(obj, plan_dates: list[str]) -> WeekPlan:
    """Check a decoded reply and turn it into a WeekPlan. Raises ValueError if it's off."""
    if not isinstance(obj, dict):
        raise ValueError("reply is not an object")
    days = obj.get("days")
    rationale = obj.get("rationale")
    if not isinstance(days, list) or len(days) != 7:
        raise ValueError("expected exactly 7 days")
    if not isinstance(rationale, str) or not rationale.strip():
        raise ValueError("missing rationale")

    parsed = []
    for day in days:
        if not isinstance(day, dict):
            raise ValueError("day is not an object")
        session_type = day.get("session_type")
        minutes = day.get("duration_min")
        if session_type not in SESSION_TYPES:
            raise ValueError(f"unknown session type {session_type!r}")
        if not isinstance(minutes, int) or isinstance(minutes, bool) or minutes < 0:
            raise ValueError("duration_min must be a whole number >= 0")
        if session_type == "rest" and minutes != 0:
            raise ValueError("rest days must have 0 minutes")
        parsed.append(
            PlannedDay(
                date=str(day.get("date")),
                session_type=session_type,
                duration_min=minutes,
                hr_target=str(day.get("hr_target") or ""),
                reason=str(day.get("reason") or ""),
            )
        )

    if [day.date for day in parsed] != list(plan_dates):
        raise ValueError("dates don't match the requested week")
    return WeekPlan(days=parsed, rationale=rationale)
