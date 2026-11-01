from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.subtask import Subtask
from app.models.task import Task
from app.schemas.task import TaskCompletionUpdate, TaskCreate, TaskResponse
from app.schemas.subtask import SubtaskCompletionUpdate, SubtaskCreate, SubtaskResponse


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


@app.get("/health", tags=["system"])
def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    """Report whether the API process and its database are available."""
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/tasks", response_model=list[TaskResponse], tags=["tasks"])
def list_tasks(db: Session = Depends(get_db)) -> list[TaskResponse]:
    """Return tasks from PostgreSQL in calendar order."""
    statement = select(Task).order_by(Task.scheduled_date, Task.start_time, Task.created_at)
    return list(db.scalars(statement))


@app.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
def create_task(task: TaskCreate, db: Session = Depends(get_db)) -> TaskResponse:
    """Create and persist a task in PostgreSQL."""
    created_task = Task(**task.model_dump())
    db.add(created_task)
    db.commit()
    db.refresh(created_task)
    return created_task


@app.patch("/tasks/{task_id}", response_model=TaskResponse, tags=["tasks"])
def update_task_completion(
    task_id: UUID,
    task_update: TaskCompletionUpdate,
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Update a task's completion state in PostgreSQL."""
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.is_completed = task_update.is_completed
    db.commit()
    db.refresh(task)
    return task


@app.get("/tasks/{task_id}/subtasks", response_model=list[SubtaskResponse], tags=["subtasks"])
def list_subtasks(task_id: UUID, db: Session = Depends(get_db)) -> list[SubtaskResponse]:
    """Return a task's subtasks in their focus-session order."""
    if db.get(Task, task_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    statement = select(Subtask).where(Subtask.task_id == task_id).order_by(Subtask.position, Subtask.created_at)
    return list(db.scalars(statement))


@app.post(
    "/tasks/{task_id}/subtasks",
    response_model=SubtaskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["subtasks"],
)
def create_subtask(
    task_id: UUID,
    subtask: SubtaskCreate,
    db: Session = Depends(get_db),
) -> SubtaskResponse:
    """Add a focused action under an existing task."""
    if db.get(Task, task_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    last_position = db.scalar(
        select(func.coalesce(func.max(Subtask.position), -1)).where(Subtask.task_id == task_id)
    )
    created_subtask = Subtask(task_id=task_id, position=last_position + 1, **subtask.model_dump())
    db.add(created_subtask)
    db.commit()
    db.refresh(created_subtask)
    return created_subtask


@app.patch("/subtasks/{subtask_id}", response_model=SubtaskResponse, tags=["subtasks"])
def update_subtask_completion(
    subtask_id: UUID,
    subtask_update: SubtaskCompletionUpdate,
    db: Session = Depends(get_db),
) -> SubtaskResponse:
    """Mark a subtask complete or incomplete."""
    subtask = db.get(Subtask, subtask_id)
    if subtask is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

    subtask.is_completed = subtask_update.is_completed
    db.commit()
    db.refresh(subtask)
    return subtask
