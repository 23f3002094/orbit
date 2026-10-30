from datetime import date, time
from uuid import UUID

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.task import TaskPriority, TaskResponse


app = FastAPI(
    title="Orbit API",
    version="0.1.0",
    description="API for the Orbit productivity app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


# Temporary application data. PostgreSQL will replace this in MVP step 6.
TASKS: list[TaskResponse] = [
    TaskResponse(
        id=UUID("7d3cfa2f-1fb1-475d-a9c4-3dbf8e68e459"),
        title="Review project proposal",
        scheduled_date=date.today(),
        start_time=time(9, 0),
        end_time=time(10, 0),
        priority=TaskPriority.MUST_DO,
        category="Work",
        estimated_minutes=60,
        is_completed=False,
    ),
    TaskResponse(
        id=UUID("a7e4c6ed-6e11-4a85-a7d6-2f40ddd978aa"),
        title="Read two chapters",
        scheduled_date=date.today(),
        priority=TaskPriority.SHOULD_DO,
        category="Study",
        estimated_minutes=45,
        is_completed=False,
    ),
    TaskResponse(
        id=UUID("cc0765d6-378e-4873-9d80-2e4dc8c0f93b"),
        title="Plan next week",
        scheduled_date=date.today(),
        priority=TaskPriority.COULD_DO,
        category="Personal",
        estimated_minutes=30,
        is_completed=True,
    ),
]


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Report whether the API process is available."""
    return {"status": "ok"}


@app.get("/tasks", response_model=list[TaskResponse], tags=["tasks"])
async def list_tasks() -> list[TaskResponse]:
    """Return the temporary task collection."""
    return TASKS
