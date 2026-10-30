from datetime import date, time
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class TaskPriority(str, Enum):
    """How important a task is for its scheduled day."""

    MUST_DO = "must_do"
    SHOULD_DO = "should_do"
    COULD_DO = "could_do"


class TaskResponse(BaseModel):
    """The task shape returned to API clients."""

    id: UUID
    title: str = Field(min_length=1, max_length=200)
    scheduled_date: date
    start_time: time | None = None
    end_time: time | None = None
    priority: TaskPriority
    category: str = Field(min_length=1, max_length=50)
    estimated_minutes: int | None = Field(default=None, gt=0)
    is_completed: bool
