
---

## Status Vocabulary

| Status | Meaning |
|--------|---------|
| `TODO` | Pending, not yet started |
| `ONGO` | Actively being worked on |
| `DONE` | Completed |
| `NOGO` | Could not be completed — requires a reason |

> `NOGO` tasks require a `nogo_reason` before they can be saved.
> Future: a `NOGO` blocker may be referenced by a future task that resolves it (many-to-many, parked for post-MVP).

---

## Data Model — Tasks Table

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | Primary key |
| `title` | text | Short card label |
| `description` | text | Nullable — optional context |
| `status` | enum | `TODO`, `ONGO`, `DONE`, `NOGO` |
| `horizon` | enum | `SPRINT` (short-term), `LONGTERM` |
| `position` | integer | Order within status column — implicit priority |
| `nogo_reason` | text | Nullable; **required** when `status = NOGO` |
| `recurs †` | boolean | Default `false` — reserved for future use |
| `recur_interval †` | text | Nullable — e.g. `monthly` |
| `is_deleted` | boolean | Default `false` — soft delete flag |
| `created_at` | timestamp | Capture time |
| `updated_at` | timestamp | Last modified |
| `completed_at †` | timestamp | Nullable — set on `DONE` or `NOGO` |
| `deleted_at †` | timestamp | Nullable — set on soft delete |

> Fields marked † are specified but not yet in the active migration — reserved for Phase 4.

> No hard deletes. Ever. The graveyard is data. 💀

---

## Future Table Relationships (Parked)

```
Task
 └── (future) Tag / Label
 └── (future) Reminder / Annoyance 👀
 └── (future) User — SCRUDE territory, do not approach
 └── (future) RecurringSchedule
 └── (future) task_blockers (many-to-many: blocked_task_id ↔ blocking_task_id)
```

---

## CRUDE Operations

> CRUDE = Create, Read, Update, Delete, Enumerate
> SCRUDE = CRUDE + Sessions/Sign-ins. Not today.

### Task Collection

| Method | Endpoint | Operation | Notes |
|--------|----------|-----------|-------|
| `GET` | `/api/tasks` | Enumerate | All tasks; excludes `is_deleted=true`. Filterable: `?status=TODO`, `?horizon=SPRINT`, etc. |
| `POST` | `/api/tasks` | Create | Body: `title`, `description`, `horizon` |
| `PUT` | `/api/tasks/reorder` | Reorder | Body: `task_ids: [id_a, id_b]` — swaps positions |

### Single Task

| Method | Endpoint | Operation | Notes |
|--------|----------|-----------|-------|
| `GET` | `/api/tasks/{id}` | Read | Single task by id |
| `PUT` | `/api/tasks/{id}` | Update | Body: any changed fields incl. `status`, `nogo_reason` |
| `DELETE` | `/api/tasks/{id}` | Soft Delete | Sets `is_deleted=true`, `deleted_at=now()` |

### Compost Heap 🌱

| Method | Endpoint | Operation | Notes |
|--------|----------|-----------|-------|
| `GET` | `/api/tasks/composted` | Enumerate | Soft-deleted tasks only |
| `POST` | `/api/tasks/{id}/recreate` | Recreate | Spawns a fresh `TODO` from deleted task's `title`/`description`. Original record untouched. |

> TODO: name the compost heap action buttons. Must be 4 letters. 🦤

---

## Save Button — State Machine (The DODO Flag 🦤)

```
Save enabled = (DODO == true) AND (status != NOGO OR nogo_reason != empty)
```

| Scenario | Save State |
|----------|------------|
| Card opened, no changes | Disabled |
| Title / description edited | Enabled |
| Status changed to `ONGO` or `DONE` | Enabled |
| Status changed to `NOGO`, no reason | Disabled |
| Status changed to `NOGO`, reason filled | Enabled |
| `NOPE` clicked | Discard all changes, close card |

> The card snapshots task state on open. The DODO flag diffs against that snapshot on every change.
> `NOPE` is the universal abandon-ship button — always reverts to snapshot, closes card, no questions asked.

---

## UI Wireframe

### List View (centered, no card open)

```
+------------------------------------------+
|  TASKED                        [ + ]     |
+------------------------------------------+
|                                          |
|   ↑↓  ○  Task one title                 |
|   ↑↓  ▶  Task two title                 |
|   ↑↓  ✓  Task three title               |
|   ↑↓  ✗  Task four title                |
|                                          |
+------------------------------------------+
  ↑ reorder arrows hidden until hover
  ↑ clicking any status icon or [ + ] opens card
```

### Card View (list shifts left, card slides in to the DMs)

```
+--------------------+----------------------+
|  TASKED            |  [ Title_________  ] |
|                    |  [ Desc__________  ] |
|  ↑↓ ○ Task one    |  [ ______________  ] |
|  ↑↓ ▶ Task two    |                      |
|  ↑↓ ✓ Task three  |  -- meta --          |
|  ↑↓ ✗ Task four   |  created:  ...       |
|                    |  updated:  ...       |
|                    |  horizon:  SPRINT    |
|                    |  recurs:   false     |
|                    |                      |
|                    |  [ ONGO ] [ DONE ]   |
|                    |  [ NOGO ]            |
|                    |                      |
|                    |  [ NOPE ]  [ SAVE ]  |
+--------------------+----------------------+
```

### NOGO State (reason required, SAVE locked)

```
|                    |  !! Why NOGO? !!     |
|                    |  [ ______________  ] | ← red border, required
|                    |  [ ______________  ] |
|                    |                      |
|                    |  [ NOPE ]  [ SAVE ]  |
|                    |            (locked)  |
+--------------------+----------------------+
```

---

## Feature Registry

| Feature | MVP? | Notes |
|---------|------|-------|
| Task list with CRUDE operations | ✅ | Core |
| Status flow: TODO → ONGO → DONE / NOGO | ✅ | Core |
| NOGO reason — required field | ✅ | Validated on save |
| DODO flag + NOPE button | ✅ | State management |
| Short vs long-term horizon (SPRINT / LONGTERM) | ✅ | Swim lanes |
| Soft delete | ✅ | `is_deleted` flag, data preserved |
| Reorder via hover arrows | ✅ | Pain point by design — drives drag-and-drop post-MVP |
| Docker deployment | ✅ | From day one |
| Compost heap 🌱 | 🔜 | Review + recreate deleted tasks |
| Email annoyances 👀 | 🔜 | Reminders. We're calling them reminders. |
| Recurring tasks | 🔜 | e.g. monthly spreadsheet updates |
| Drag-and-drop reorder | 🔜 | Unlocked by the hover-arrow pain point |
| Velocity metrics | 🔜 | Tasks completed / NOGO'd / deleted over time |
| SQLite → PostgreSQL migration | 🔜 | Its own portfolio story |
| Goals (higher abstraction over tasks) | 🔜 | Long-term vision |
| Sprint ↔ Longterm task linking | 🔜 | Many-to-many, post-SCRUDE |
| SCRUDE (sessions / sign-in) | 🔜 | Do not spike this complexity prematurely |
| Raspberry Pi display mode | 🔜 | TASKED on the side like a book spine 📚 |
| Due dates | 🔜 | Revisit alongside recurring tasks |

---

## Implementation Phases

### Phase 1 — Design & Planning ✅
- Personas defined
- Data model agreed
- Wireframe agreed
- API endpoints defined
- This README

### Phase 2 — Backend Foundations ✅
- Python + Flask/FastAPI
- SQLite schema
- CRUDE REST API
- Dockerized from day one

### Phase 3 — Frontend Foundations *(you are here)*
- Vanilla HTML/CSS/JS
- Static task list wired to API
- Card panel, DODO flag, NOPE button
- NOGO reason validation

### Phase 4 — Feature Depth
- SPRINT / LONGTERM horizons
- Soft delete
- Reorder arrows
- Month-end reset mechanic

### Phase 5 — Post-MVP Features
- Compost heap 🌱
- Email annoyances 👀
- Recurring tasks
- Drag-and-drop
- SQLite → PostgreSQL migration

### Phase 6 — Portfolio Wrap-up
- Write up the journey
- Deploy publicly
- Domain renews in June/July — no rush, it's on auto 😄
