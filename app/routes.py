from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.database import get_connection
from app.models import TaskResponse, TaskCreate, TaskUpdate

router = APIRouter()

# Note: FastAPI resolves routes in a "top to bottom" order; as such,
# `/api/tasks/reorder` has to exist before `/api/tasks/{task_id}`;
# otherwise, FastAPI will try to coerce 'reorder' as a {task_id};
# the user doesn't want that, the developer has enough headaches,
# and Claude has to deal with not enough braincelled me already.

@router.put("/api/tasks/reorder", response_model=list[TaskResponse])
def reorder_tasks(reorder: TaskReorder):
    """
    Swaps the positions of two tasks within the same horizon.

    Expects exactly two task IDs in task_ids.
    Base case is adjacent up/down swaps from the UI; the same endpoint
    supports future drag/drop by accepting any two IDs in the same horizon.
    """
    if len(reorder.task_ids) != 2:
        raise HTTPException(status_code=422, detail="Exactly two task IDs are required to reorder.")

    conn = get_connection()
    task_a, task_b = (
        conn.execute("SELECT * FROM tasks WHERE id = ? AND is_deleted = 0", (reorder.task_ids[0],)).fetchone(),
        conn.execute("SELECT * FROM tasks WHERE id = ? AND is_deleted = 0", (reorder.task_ids[1],)).fetchone(),
    )

    if task_a is None or task_b is None:
        conn.close()
        raise HTTPException(status_code=404, detail="One or both tasks not found.")

    if task_a["horizon"] != task_b["horizon"]:
        conn.close()
        raise HTTPException(status_code=422, detail="Tasks must be in the same horizon to reorder.")

    now = datetime.now(timezone.utc).isoformat()
    conn.execute("UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?", (task_b["position"], now, task_a["id"]))
    conn.execute("UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?", (task_a["position"], now, task_b["id"]))
    conn.commit()

    result = conn.execute("""
        SELECT * FROM tasks
        WHERE id IN (?, ?)
        ORDER BY position
    """, (reorder.task_ids[0], reorder.task_ids[1])).fetchall()
    conn.close()
    return [dict(task) for task in result]

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

@router.get("/api/tasks/{task_id}", response_model=TaskResponse)
def read_task(task_id: int):
    """
    Returns a single non-deleted task by ID.
    """
    conn = get_connection()
    task = conn.execute("""
        SELECT * FROM tasks
        WHERE id = ? AND is_deleted = 0
    """, (task_id,)).fetchone()
    conn.close()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return dict(task)

@router.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, update: TaskUpdate):
    """
    Updates a task's fields. Only the fields provided in the request body are changed.

    Enforces that nogo_reason must be provided when status is set to NOGO.
    """
    conn = get_connection()
    task = conn.execute("""
        SELECT * FROM tasks
        WHERE id = ? AND is_deleted = 0
    """, (task_id,)).fetchone()
    if task is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found.")

    # Merge incoming fields over the existing task, so unset fields retain their values.
    merged = dict(task)
    for field, value in update.model_dump(exclude_unset=True).items():
        merged[field] = value

    # NOGO requires a reason — no reason, no NOGO.
    if merged["status"] == "NOGO" and not merged.get("nogo_reason"):
        conn.close()
        raise HTTPException(status_code=422, detail="A nogo_reason is required when status is NOGO.")

    merged["updated_at"] = datetime.now(timezone.utc).isoformat()

    conn.execute("""
        UPDATE tasks
        SET title = ?, description = ?, status = ?, horizon = ?,
            position = ?, nogo_reason = ?, updated_at = ?
        WHERE id = ?
    """, (
        merged["title"], merged["description"], merged["status"],
        merged["horizon"], merged["position"], merged["nogo_reason"],
        merged["updated_at"], task_id
    ))
    conn.commit()
    updated_task = conn.execute("""
        SELECT * FROM tasks WHERE id = ?
    """, (task_id,)).fetchone()
    conn.close()
    return dict(updated_task)

@router.delete("/api/tasks/{task_id}", response_model=TaskResponse)
def delete_task(task_id: int):
    """
    Soft-deletes a task by setting is_deleted = 1.

    The task is retained in the database for auditing purposes,
    but will no longer appear in enumerate or read responses.
    """
    conn = get_connection()
    task = conn.execute("""
        SELECT * FROM tasks
        WHERE id = ? AND is_deleted = 0
    """, (task_id,)).fetchone()
    if task is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found.")

    now = datetime.now(timezone.utc).isoformat()
    conn.execute("""
        UPDATE tasks
        SET is_deleted = 1, updated_at = ?
        WHERE id = ?
    """, (now, task_id))
    conn.commit()
    # Return the final state of the task — tombstone and all.
    deleted_task = conn.execute("""
        SELECT * FROM tasks WHERE id = ?
    """, (task_id,)).fetchone()
    conn.close()
    return dict(deleted_task)
