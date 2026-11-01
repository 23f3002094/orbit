from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FocusSessionCreate(BaseModel):
    """A completed work interval recorded by the Focus Room."""

    task_id: UUID
    focused_on: date
    duration_minutes: int = Field(gt=0, le=240)


class FocusSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    focused_on: date
    duration_minutes: int
    completed_at: datetime


class DailyFocusSummary(BaseModel):
    focused_on: date
    focused_minutes: int
    completed_pomodoros: int


class TaskStreakSummary(BaseModel):
    current_streak: int
    longest_streak: int
    last_completed_date: date | None
