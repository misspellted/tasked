
function clearTaskEntryDetails()
{
  // Wipe out the div contents;
  document.getElementById("task-entry-details").innerHTML = ""
}

async function getTask(id)
{
  return await fetch("/api/tasks/" + id)
}

function renderUpdateNoGoReason(task, modified_task_status)
{
  console.log("renderUpdateNoGoReason(current status:" + task.status + "; modifed status:"  + modified_task_status + ")")

  const task_status = modified_task_status !== task.status ? modified_task_status : task.status

  return task_status !== "NOGO" ? "" :
    "<tr id='modify-task-nogo-reason-row'>" +
    "<td>Reason</td>" +
    "<td>" +
    "<textarea id='modify-task-nogo-reason'>" +
    (task.nogo_reason ?? "") +
    "</textarea>" +
    "</td>" +
    "</tr>"
}

async function putTask(id, attributes)
{
  const response = await fetch("/api/tasks/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(attributes)
  })

  if (!response.ok)
  {
    // TODO: Indicate the problem to the user.
    // For now, log to console.
    console.log("Failed to PUT for task " + id)
  }

  return response.ok
}

async function onUpdateEntryClicked(id)
{
  // Only perform the update if the page is in modify "mode".
  if (document.getElementById("modify-update-button") !== null)
  {
    // Capture all the attributes of the task in order to send an update.
    const horizon = document.getElementById("modify-task-horizon").value
    const title = document.getElementById("modify-task-title").value.trim()
    const description = document.getElementById("modify-task-description").value.trim()
    const status = document.getElementById("modify-task-status").value
    const nogo_reason = status !== "NOGO" ? null : document.getElementById("modify-task-nogo-reason").value.trim()

    // TODO: Implement the DODO (dirty) check here - we have the modified task attributes, and the id from the call.
    // We can therefore call getTask(id) again, compare values against the task the API returns, and update by just
    // the different fields; however, the API doesn't support small changes to tasks - it's all or nothing for now.
    if (!putTask(id, {
      horizon: horizon,
      title: title,
      description: description,
      status: status,
      nogo_reason: nogo_reason
    }))
    {
      // Leave the user at the task update view.
      return
    }
    else
    {
      // A successful update should return to the main view, just as if the page was first loaded.
      clearTaskEntryDetails()

      await onHorizonSelected()
    }
  }
}

function renderTaskEntryUpdateView(task)
{
  // Get the modified task status value before rerendering on status selection change.
  const existing_task_status_selector = document.getElementById("modify-task-status")
  const task_status = existing_task_status_selector !== null ? existing_task_status_selector.value : task.status

  // We don't actually modify the task here; instead, we're putting the page in modify "mode".
  // But we also use the task id field so a Cancel action switches back to review "mode".
  // We're going to reuse the task-entry-details div for now; may change in the future, but for now, ugly and workin'!
  const task_entry_details = document.getElementById("task-entry-details")
  task_entry_details.innerHTML =
    "<table>" +
    "<tr>" +
    "<td>Horizon</td>" +
    "<td>" +
    "<select name='horizon' id='modify-task-horizon'>" +
    "<option value='NEAR'" + (task.horizon === "NEAR" ? " selected" : "") + ">NEAR</option>" +
    "<option value='LONG'" + (task.horizon === "LONG" ? " selected" : "") + ">LONG</option>" +
    "</select>" +
    "</tr>" +
    "<tr>" +
    "<td>Title</td>" +
    "<td>" +
    "<input type='text' id='modify-task-title' value='" + task.title + "' />" +
    "</td>" +
    "</tr>" +
    "<tr>" +
    "<td>Description</td>" +
    "<td>" +
    "<textarea id='modify-task-description'>" +
    (task.description ?? "") +
    "</textarea>" +
    "</td>" +
    "</tr>" +
    "<tr>" +
    "<td>Status</td>" +
    "<td>" +
    "<select name='status' id='modify-task-status'>" +
    "<option value='TODO'" + (task_status === "TODO" ? " selected" : "") + ">TODO</option>" +
    "<option value='ONGO'" + (task_status === "ONGO" ? " selected" : "") + ">ONGO</option>" +
    "<option value='DONE'" + (task_status === "DONE" ? " selected" : "") + ">DONE</option>" +
    "<option value='NOGO'" + (task_status === "NOGO" ? " selected" : "") + ">NOGO</option>" +
    "</select>" +
    "</td>" +
    "</tr>" +
    renderUpdateNoGoReason(task, task_status) +
    "<tr>" +
    "<td>Actions</td>" +
    "<td>" +
    "<input type='button' value='Cancel' onclick='onReviewEntryClicked(" + task.id + ")'/>" +
    "<input type='button' value='Update' id='modify-update-button' onclick='onUpdateEntryClicked(" + task.id + ")'/>" +
    "</td>" +
    "</tr>" +
    "</table>"

  // Since it doesn't look easy to connect the status selection and the NOGO reason rendering, it's probably
  // better to use addEventListener (ref: https://www.xjavascript.com/blog/get-selected-value-text-from-select-on-change/#2-the-change-event-what-you-need-to-know)
  // But does it work after injecting the HTML above via innerHTML?
  const task_status_selector = document.getElementById("modify-task-status")
  // task_status_selector.addEventListener("change", onModifyEntryClicked(id)) // NOPE! This calls the function and returns the value (nothing).. not.. useful.
  task_status_selector.addEventListener("change", () => renderTaskEntryUpdateView(task)) // Ooh, this looks like lambdas in Python! Useful at times, but huge XP there.
}

async function onModifyEntryClicked(id)
{
  // It was origionally conceived that we'd pass in the task object itself; however, writing the HTML got ... confusing QUIC,
  // so after a quick consultation with le Claude, we're going to just provide the task id, and fetch again. Sure, another
  // API call, but.. always the latest data! ... *yay*...
  const response = await getTask(id)

  // Do an early out path, to avoid having to depopulate the task-entry-details div.
  if (!response.ok)
  {
    // TODO: Dump something in console.

    return
  }

  // Should be good to allow the user to maybe modify?
  const task = await response.json()

  renderTaskEntryUpdateView(task)
}

function renderReviewNoGoReason(task)
{
  return task.status !== "NOGO" ? "" :
    "<tr>" +
    "<td>Reason</td>" +
    "<td>" + task.nogo_reason + "</td>" +
    "</tr>"
}

async function onReviewEntryClicked(id)
{
  // Well, since behavior is getting more complex, we also need to check whether the page is in the modify "mode".
  // If so, exit early and quick - we don't wanna lose changes!
  const modifying = document.getElementById("modify-task-button") !== null
  if (modifying)
  {
    // Aaand.. we're done!
    return
  }

  // TODO: Figure out if there is a way to preempt calling the API if a task is currently displayed and it has the same id.
  // IDEA: Maybe throw the task id into the id of the task_entry_details table below, then we can pull the same null check
  //       to avoid calling the API... :thinkingface:

  const response = await getTask(id)

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
    "<td>" +
    "<textarea readonly>" +
    (task.description ?? "&lt;none&gt;") +
    "</textarea>" +
    "</td>" +
    "</tr>" +
    "<tr>" +
    "<td>Status</td>" +
    "<td>" + task.status + "</td>" +
    "</tr>" +
    renderReviewNoGoReason(task) +
    "<tr>" +
    "<td>Actions</td>" +
    "<td>" +
    "<input type='button' value='Vanish' onclick='clearTaskEntryDetails()'/>" +
    "<input type='button' value='Modify' id='modify-task-button' onclick='onModifyEntryClicked(" + task.id + ")'/>" +
    "</td>" +
    "</tr>" +
    "</table>"

  // Seems weird to display the horizon attribute, since they should be filtered accordingly, but... *shrug*
  // ya never know what derps technology is gonna do!
}

async function deleteTask(id)
{
  const response = await fetch("/api/tasks/" + id, {
    method: "DELETE"
  })

  if (!response.ok)
  {
    // TODO: Implement a user notification mechanism.
    // For now, console them instead.
    console.log("Failed to DELETE task " + id)
  }

  return response.ok
}

async function onDeleteEntryClicked(id)
{
  // Successful deletion should return the user to the base entries list.
  if (await deleteTask(id))
  {
    clearTaskEntryDetails()

    await onHorizonSelected()
  }
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
      "<td><input type='button' value='X' onclick='onDeleteEntryClicked(" + task.id + ")'/></td>"
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
