from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FocusSessionCreate(BaseModel):
    """A completed work interval recorded by the Focus Room."""

    task_id: UUID
    focused_on: date
    duration_minutes: int | None = Field(default=None, gt=0, le=240)
    duration_seconds: int | None = Field(default=None, gt=0, le=14_400)
    is_full_pomodoro: bool = False

    @model_validator(mode="after")
    def require_duration(self) -> "FocusSessionCreate":
        if self.duration_minutes is None and self.duration_seconds is None:
            raise ValueError("duration_minutes or duration_seconds is required")
        return self


class FocusSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    focused_on: date
    duration_minutes: int
    duration_seconds: int
    is_full_pomodoro: bool
    completed_at: datetime


class DailyFocusSummary(BaseModel):
    focused_on: date
    focused_minutes: int
    completed_pomodoros: int


class TaskStreakSummary(BaseModel):
    current_streak: int
    longest_streak: int
    last_completed_date: date | None


class TaskCompletionSummary(BaseModel):
    """Completion progress for tasks planned today and this calendar week."""

    today_total: int
    today_completed: int
    week_total: int
    week_completed: int
