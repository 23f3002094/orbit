from datetime import date, time
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class TaskPriority(str, Enum):
    """How important a task is for its scheduled day."""

    MUST_DO = "must_do"
    SHOULD_DO = "should_do"
    COULD_DO = "could_do"


class TaskBase(BaseModel):
    """Fields shared by incoming and outgoing task data."""

    title: str = Field(min_length=1, max_length=200)
    scheduled_date: date
    start_time: time | None = None
    end_time: time | None = None
    priority: TaskPriority
    category: str = Field(min_length=1, max_length=50)
    estimated_minutes: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_time_range(self) -> "TaskBase":
        """Require a complete, sensible time block when one is supplied."""
        if (self.start_time is None) != (self.end_time is None):
            raise ValueError("start_time and end_time must be provided together")
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class TaskCreate(TaskBase):
    """Fields accepted when a client creates a task."""


class TaskResponse(TaskBase):
    """The task shape returned to API clients."""

    id: UUID
    is_completed: bool
