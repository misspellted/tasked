
function clearTaskEntryDetails()
{
  // Wipe out the div contents;
  document.getElementById("task-entry-details").innerHTML = ""
}

async function reviewEntry(id)
{
  return await fetch("/api/tasks/" + id)
}

function renderNoGoReason(task)
{
  return task.status !== "NOGO" ? "" :
    "<tr>" +
    "<td>Reason</td>" +
    "<td>" + task.nogo_reason + "</td>" +
    "</tr>"
}

async function onReviewEntryClicked(id)
{
  // TODO: Figure out if there is a way to preempt calling the API if a task is currently displayed and it has the same id.

  const response = await reviewEntry(id)

  // Do an early out path, to avoid having to depopulate the task-entry-details div.
  if (!response.ok)
  {
    // TODO: Dump something in console.

    return
  }

  // Should be good to spam the user!
  const task = await response.json()

  // We're going to reuse the task-entry-details div for now; may change in the future, but for now, ugly and workin'!
  const task_entry_details = document.getElementById("task-entry-details")
  task_entry_details.innerHTML =
    "<table>" +
    "<tr>" +
    "<td>Horizon</td>" +
    "<td>" + task.horizon + "</td>" +
    "</tr>" +
    "<tr>" +
    "<td>Title</td>" +
    "<td>" + task.title + "</td>" +
    "</tr>" +
    "<tr>" +
    "<td>Description</td>" +
    "<td>" + (task.description ?? "&lt;none&gt;") + "</td>" +
    "</tr>" +
    "<tr>" +
    "<td>Status</td>" +
    "<td>" + task.status + "</td>" +
    "</tr>" +
    "</table>" +
    renderNoGoReason(task) +
    "<input type='button' value='Vanish' onclick='clearTaskEntryDetails()'/>"

  // Seems weird to display the horizon attribute, since they should be filtered accordingly, but... *shrug*
  // ya never know what derps technology is gonna do!
}

async function onHorizonSelected()
{
  // Now that we are crossing the aisle to the backend, we can simply "know" which horizon is selected..
  const horizon = document.getElementById("horizon-near").checked ? "NEAR" : "LONG"

  // Since we're not overly complicating probably one of this simplest API changes, we're also making it
  // overtly obvious as to the obtuseness of the horizon selection for tasks - instead of sending the
  // horizon directly to the API for filtering returned tasks, we're going to burn local network traffic
  // (because it is also not metered, or at least, it shouldn't be... but companies gonna captialism, so..
  const all_tasks_response = await fetch("/api/tasks")
  const all_tasks = await all_tasks_response.json()
  console.log("--- All tasks ---")
  console.log(all_tasks)

  // And here we see the disadvantage of our naivete in full force, suffering the browser to filter data,
  // instead the backend pulling it's weight.
  const tasks = all_tasks.filter(t => t.horizon == horizon)
  console.log("--- " + horizon + "-filtered tasks ---")
  console.log(tasks)

  const task_counts = { TODO: 0, ONGO: 0, DONE: 0, NOGO: 0 }
  for (const task of tasks)
  {
    if (task_counts[task.status] !== undefined)
    {
      task_counts[task.status]++
    }
  }

  // ... which also simplifies the counts updates block .. count (2 -> 1).
  // Maximum horrible UI torment embraced!
  document.getElementById("horizon-count-todo").innerHTML = "<center>" + task_counts.TODO + "</center>"
  document.getElementById("horizon-count-ongo").innerHTML = "<center>" + task_counts.ONGO + "</center>"
  document.getElementById("horizon-count-done").innerHTML = "<center>" + task_counts.DONE + "</center>"
  document.getElementById("horizon-count-nogo").innerHTML = "<center>" + task_counts.NOGO + "</center>"

  // Ensure James' favorite activity keeps the list ready for the horizon toggling..
  const table = document.getElementById("horizon-entries").querySelector("table")
  // DELETE EVERYTING!
  table.innerHTML = "";

  // But a table without content is pointless, so.. maybe we should have something..
  for (const task of tasks)
  {
    const row = document.createElement("tr")
    row.innerHTML =
      "<td><input type='button' value='/\\'/></td>" +
      "<td><input type='button' value='\\/'/></td>" +
      "<td>|</td>" +
      "<td>" + task.title + "</td>" +
      "<td>|</td>" +
      "<td><input type='button' value='/' onclick='onReviewEntryClicked(" + task.id + ")'/></td>" +
      "<td><input type='button' value='X'/></td>"
    table.appendChild(row)
  }
}

async function createNewEntry(horizon, title)
{
  return await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      horizon: horizon,
      title: title
    })
  })
}

async function onCreateNewEntryClicked()
{
  // Collect the data from the fields.
  const horizon = document.getElementById("horizon-near").checked ? "NEAR" : "LONG"
  const title = document.getElementById("new-entry-title").value.trim()

  // Guard against empty titles - can't create a task without one!
  if (!title)
  {
    return
  }

  const response = await createNewEntry(horizon, title)

  if (response.ok)
  {
    clearTaskEntryDetails()

    // Refresh the task entry list to show the newly minted task.
    await onHorizonSelected()
  }
}

function onNewEntryClicked()
{
  // Since this function is going to populate the task-entry-details div, we should probably nab a reference.
  const task_entry_details = document.getElementById("task-entry-details")

  task_entry_details.innerHTML =
    "<input type='button' value='Cancel' onclick='clearTaskEntryDetails()'/>" +
    "<input type='text' id='new-entry-title' placeholder='Task title' />" +
    "<input type='button' value='Create' onclick='onCreateNewEntryClicked()'/>"
}
