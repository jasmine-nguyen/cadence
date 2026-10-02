"""Read-only COROS reader, via the community library coros-mcp (used as a library).

Reads the last 28 days of activities, the daily records (nightly sleep-HRV, its
baseline, resting HR, training load) and the calendar plan for the coming 7 days.
It never writes, never reads sleep and never uses the mobile login (which may log
Jas's COROS phone app out).
"""

import asyncio
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

MELBOURNE = ZoneInfo("Australia/Melbourne")
HISTORY_DAYS = 28
PLAN_DAYS = 7
PAGE_SIZE = 30
MAX_PAGES = 10


def _ymd(day: date) -> str:
    return day.strftime("%Y%m%d")


def _iso_from_ymd(value):
    text = str(value)
    return f"{text[:4]}-{text[4:6]}-{text[6:8]}" if len(text) == 8 and text.isdigit() else None


def _minutes(seconds):
    try:
        return round(float(seconds) / 60) if seconds is not None else None
    except (TypeError, ValueError):
        return None


def _melbourne_date(epoch_seconds):
    try:
        return datetime.fromtimestamp(int(epoch_seconds), MELBOURNE).date().isoformat()
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def _activity(summary) -> dict:
    distance = summary.distance_meters
    return {
        "date": _melbourne_date(summary.start_time),
        "sport_name": summary.sport_name,
        "minutes": _minutes(summary.duration_seconds),
        "distance_km": round(distance / 1000, 2) if distance is not None else None,
        "avg_hr": summary.avg_hr,
        "max_hr": summary.max_hr,
        "training_load": summary.training_load,
        "name": summary.name,
    }


def _daily(record) -> dict:
    return {
        "date": _iso_from_ymd(record.date) or record.date,
        "sleep_hrv": record.avg_sleep_hrv,
        "hrv_baseline": record.baseline,
        "rhr": record.rhr,
        "training_load": record.training_load,
        "load_ratio": record.training_load_ratio,
    }


def _planned(schedule, first: str, last: str) -> list[dict]:
    """Pair each calendar entity with its program (joined on idInPlan), within first..last."""
    schedule = schedule or {}
    programs = {str(program.get("idInPlan")): program for program in schedule.get("programs") or []}
    entries = []
    for entity in schedule.get("entities") or []:
        happen_day = str(entity.get("happenDay"))  # may arrive as an int
        if not first <= happen_day <= last:
            continue
        program = programs.get(str(entity.get("idInPlan"))) or {}
        entries.append(
            {
                "date": _iso_from_ymd(happen_day),
                "name": program.get("name"),
                "planned_min": _minutes(program.get("duration") or program.get("estimatedTime")),
            }
        )
    entries.sort(key=lambda entry: entry["date"] or "")
    return entries


class CorosReader:
    def __init__(self, email: str, password: str, region: str = "us"):
        self.email = email
        self.password = password
        self.region = region

    def read(self, today: date) -> dict:
        """Everything the planner needs, as JSON-safe dicts. `today` is Melbourne's date."""
        from coros_mcp import coros_api

        return asyncio.run(self._read(coros_api, today))

    async def _read(self, coros_api, today: date) -> dict:
        auth = await coros_api.login(self.email, self.password, self.region, skip_mobile=True)

        start, end = _ymd(today - timedelta(days=HISTORY_DAYS)), _ymd(today - timedelta(days=1))
        activities = []
        for page in range(1, MAX_PAGES + 1):
            batch, total = await coros_api.fetch_activities(auth, start, end, page=page, size=PAGE_SIZE)
            activities.extend(batch)
            if not batch or len(activities) >= (total or 0):
                break

        records = await coros_api.fetch_daily_records(auth, start, end)

        first, last = _ymd(today + timedelta(days=1)), _ymd(today + timedelta(days=PLAN_DAYS))
        schedule = await coros_api.fetch_schedule_raw(auth, first, last)

        return {
            "activities": sorted((_activity(a) for a in activities), key=lambda a: a["date"] or ""),
            "daily": [_daily(r) for r in records],
            "planned": _planned(schedule, first, last),
            "sleep_available": False,
        }
