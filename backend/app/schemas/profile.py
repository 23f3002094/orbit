from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProfileResponse(BaseModel):
    id: UUID
    email: str | None
    display_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
