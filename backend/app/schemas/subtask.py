from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SubtaskCreate(BaseModel):
    """A focused action to complete as part of a parent task."""

    title: str = Field(min_length=1, max_length=200)


class SubtaskCompletionUpdate(BaseModel):
    is_completed: bool


class SubtaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    title: str
    is_completed: bool
    position: int
    created_at: datetime
