from datetime import date, timedelta
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import case, func, select, text
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.focus_session import FocusSession
from app.models.profile import Profile
from app.models.subtask import Subtask
from app.models.task import Task
from app.schemas.task import TaskBase, TaskCreate, TaskResponse, TaskUpdate
from app.schemas.subtask import SubtaskCompletionUpdate, SubtaskCreate, SubtaskResponse
from app.schemas.focus import DailyFocusSummary, FocusSessionCreate, FocusSessionResponse, TaskCompletionSummary, TaskStreakSummary
from app.schemas.profile import ProfileResponse


app = FastAPI(
    title="Orbit API",
    version="0.1.0",
    description="API for the Orbit productivity app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


def get_owned_task_or_404(db: Session, task_id: UUID, user: AuthenticatedUser) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def get_owned_subtask_or_404(db: Session, subtask_id: UUID, user: AuthenticatedUser) -> Subtask:
    subtask = db.scalar(
        select(Subtask).join(Task, Subtask.task_id == Task.id).where(Subtask.id == subtask_id, Task.user_id == user.id)
    )
    if subtask is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    return subtask


@app.get("/health", tags=["system"])
def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    """Report whether the API process and its database are available."""
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/me", response_model=ProfileResponse, tags=["profile"])
def get_profile(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Create or refresh the signed-in user's lightweight Orbit profile."""
    profile = db.get(Profile, user.id)
    if profile is None:
        profile = Profile(id=user.id, email=user.email, display_name=user.display_name or "Orbit user")
        db.add(profile)
    else:
        profile.email = user.email
        if user.display_name:
            profile.display_name = user.display_name
    db.commit()
    db.refresh(profile)
    return profile


@app.get("/tasks", response_model=list[TaskResponse], tags=["tasks"])
def list_tasks(user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)) -> list[TaskResponse]:
    """Return tasks from PostgreSQL in calendar order."""
    statement = select(Task).where(Task.user_id == user.id).order_by(Task.scheduled_date, Task.start_time, Task.created_at)
    return list(db.scalars(statement))


@app.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
def create_task(task: TaskCreate, user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)) -> TaskResponse:
    """Create and persist a task in PostgreSQL."""
    created_task = Task(user_id=user.id, **task.model_dump())
    db.add(created_task)
    db.commit()
    db.refresh(created_task)
    return created_task


@app.patch("/tasks/{task_id}", response_model=TaskResponse, tags=["tasks"])
def update_task_completion(
    task_id: UUID,
    task_update: TaskUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Update a task's completion state in PostgreSQL."""
    task = get_owned_task_or_404(db, task_id, user)

    updates = task_update.model_dump(exclude_unset=True)
    proposed_task = TaskBase.model_validate({
        "title": updates.get("title", task.title),
        "scheduled_date": updates.get("scheduled_date", task.scheduled_date),
        "start_time": updates.get("start_time", task.start_time),
        "end_time": updates.get("end_time", task.end_time),
        "priority": updates.get("priority", task.priority),
        "category": updates.get("category", task.category),
        "color": updates.get("color", task.color),
        "estimated_minutes": updates.get("estimated_minutes", task.estimated_minutes),
    })
    for field, value in updates.items():
        setattr(task, field, value)
    # Model validation above ensures merged start/end times remain valid.
    _ = proposed_task
    db.commit()
    db.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["tasks"])
def delete_task(task_id: UUID, user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    """Permanently delete one task and its related focus data."""
    task = get_owned_task_or_404(db, task_id, user)
    db.delete(task)
    db.commit()


@app.get("/tasks/{task_id}/subtasks", response_model=list[SubtaskResponse], tags=["subtasks"])
def list_subtasks(task_id: UUID, user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SubtaskResponse]:
    """Return a task's subtasks in their focus-session order."""
    get_owned_task_or_404(db, task_id, user)
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
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubtaskResponse:
    """Add a focused action under an existing task."""
    get_owned_task_or_404(db, task_id, user)

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
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubtaskResponse:
    """Mark a subtask complete or incomplete."""
    subtask = get_owned_subtask_or_404(db, subtask_id, user)

    subtask.is_completed = subtask_update.is_completed
    db.commit()
    db.refresh(subtask)
    return subtask


@app.post(
    "/focus-sessions",
    response_model=FocusSessionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["focus"],
)
def create_focus_session(
    focus_session: FocusSessionCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FocusSessionResponse:
    """Persist one completed work interval for later focus insights."""
    get_owned_task_or_404(db, focus_session.task_id, user)

    duration_seconds = focus_session.duration_seconds or focus_session.duration_minutes * 60
    created_session = FocusSession(
        task_id=focus_session.task_id,
        focused_on=focus_session.focused_on,
        duration_minutes=max(1, round(duration_seconds / 60)),
        duration_seconds=duration_seconds,
        is_full_pomodoro=focus_session.is_full_pomodoro,
    )
    db.add(created_session)
    db.commit()
    db.refresh(created_session)
    return created_session


@app.get("/focus-sessions/daily", response_model=list[DailyFocusSummary], tags=["focus"])
def get_daily_focus_summary(
    end_date: date,
    days: int = 7,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DailyFocusSummary]:
    """Return daily completed focus minutes for a dashboard date range."""
    days = max(1, min(days, 366))
    start_date = end_date - timedelta(days=days - 1)
    statement = (
        select(
            FocusSession.focused_on,
            func.coalesce(func.sum(FocusSession.duration_seconds), 0),
            func.coalesce(func.sum(case((FocusSession.is_full_pomodoro, 1), else_=0)), 0),
        )
        .join(Task, FocusSession.task_id == Task.id)
        .where(FocusSession.focused_on.between(start_date, end_date), Task.user_id == user.id)
        .group_by(FocusSession.focused_on)
        .order_by(FocusSession.focused_on)
    )
    rows = db.execute(statement).all()
    return [
        DailyFocusSummary(
            focused_on=focused_on,
            focused_minutes=round(focused_minutes / 60),
            completed_pomodoros=completed_pomodoros,
        )
        for focused_on, focused_minutes, completed_pomodoros in rows
    ]


@app.get("/focus-sessions", response_model=list[FocusSessionResponse], tags=["focus"])
def list_focus_sessions(
    start_date: date,
    end_date: date,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FocusSessionResponse]:
    """Return completed focus intervals for a visual timeline."""
    statement = (
        select(FocusSession)
        .join(Task, FocusSession.task_id == Task.id)
        .where(FocusSession.focused_on.between(start_date, end_date), Task.user_id == user.id)
        .order_by(FocusSession.completed_at)
    )
    return list(db.scalars(statement))


@app.get("/insights/task-streak", response_model=TaskStreakSummary, tags=["insights"])
def get_task_streak(end_date: date, user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)) -> TaskStreakSummary:
    """Calculate completed planned-day streaks from scheduled tasks."""
    tasks = list(db.scalars(select(Task).where(Task.user_id == user.id, Task.scheduled_date <= end_date)))
    by_date: dict[date, list[Task]] = {}
    for task in tasks:
        by_date.setdefault(task.scheduled_date, []).append(task)

    completed_dates = {
        scheduled_date
        for scheduled_date, day_tasks in by_date.items()
        if all(task.is_completed for task in day_tasks)
    }
    incomplete_dates = set(by_date) - completed_dates

    current_streak = 0
    cursor = end_date
    while cursor >= min(by_date, default=end_date):
        if cursor in incomplete_dates:
            break
        if cursor in completed_dates:
            current_streak += 1
        cursor -= timedelta(days=1)

    longest_streak = 0
    running_streak = 0
    for scheduled_date in sorted(by_date):
        if scheduled_date in completed_dates:
            running_streak += 1
            longest_streak = max(longest_streak, running_streak)
        else:
            running_streak = 0

    return TaskStreakSummary(
        current_streak=current_streak,
        longest_streak=longest_streak,
        last_completed_date=max(completed_dates, default=None),
    )


@app.get("/insights/task-completion", response_model=TaskCompletionSummary, tags=["insights"])
def get_task_completion(end_date: date, user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)) -> TaskCompletionSummary:
    """Return planned-task completion counts for today and the preceding seven days."""
    week_start = end_date - timedelta(days=6)
    week_tasks = list(db.scalars(select(Task).where(Task.user_id == user.id, Task.scheduled_date.between(week_start, end_date))))
    today_tasks = [task for task in week_tasks if task.scheduled_date == end_date]
    return TaskCompletionSummary(
        today_total=len(today_tasks),
        today_completed=sum(task.is_completed for task in today_tasks),
        week_total=len(week_tasks),
        week_completed=sum(task.is_completed for task in week_tasks),
    )
