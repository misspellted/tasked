from fastapi import APIRouter
from app.database import get_connection
from app.models import TaskResponse, TaskCreate

router = APIRouter()

# We start with E from CRUDE, so that we can begin testing the implementation
# with an empty list of tasks returned. As we introduce more CRUDE routes, we
# will be able to demonstrate, maybe even automate with unittests, that the
# data layer is functioning properly. But first, we need to start on E:

@router.get("/api/tasks", response_model=list[TaskResponse])
def enumerate_tasks():
    """
    Returns all non-deleted tasks, ordered by horizon then position.
    """
    conn = get_connection()
    tasks = conn.execute("""
        SELECT * FROM tasks
        WHERE is_deleted = 0
        ORDER BY horizon, position
    """).fetchall()
    conn.close()
    return [dict(task) for task in tasks]

from datetime import datetime, timezone

@router.post("/api/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate):
    """
    Creates a new task. Defaults to TODO status and SPRINT horizon.
    Position is set to the end of the existing tasks in that horizon.
    """
    conn = get_connection()

    # Find the next position in the given horizon
    last = conn.execute("""
        SELECT MAX(position) as max_pos FROM tasks
        WHERE horizon = ? AND is_deleted = 0
    """, (task.horizon,)).fetchone()
    next_position = (last["max_pos"] + 1) if last["max_pos"] is not None else 0

    now = datetime.now(timezone.utc).isoformat()

    conn.execute("""
        INSERT INTO tasks (title, description, horizon, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (task.title, task.description, task.horizon, next_position, now, now))
    conn.commit()

    new_task = conn.execute("""
        SELECT * FROM tasks WHERE id = last_insert_rowid()
    """).fetchone()
    conn.close()

    return dict(new_task)
