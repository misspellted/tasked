
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

async function onDeleteClicked(task_id, horizon)
{
  // NOTE: horizon comes from openReviewView, and after deleting the task (successfully),
  // the user should be returned to the correct horizon listing.

  // Claude won't let me have fun and just automagically delete!
  // So we have to be reasonable and wise... ugh! (grin)
  if (!confirm("Delete this task?"))
  {
    return
  }

  if (await deleteTask(task_id))
  {
    await openCountsView(horizon)
  }
}

async function getTask(task_id)
{
  return await fetch("/api/tasks/" + task_id)
}

async function putTask(task_id, task_attributes)
{
  const response = await fetch("/api/tasks/" + task_id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(task_attributes)
  })

  if (!response.ok)
  {
    // TODO: Indicate the problem to the user.
    // For now, log to console.
    console.log("Failed to PUT for task " + task_id)
  }

  return response.ok
}

async function onUpdateClicked(task_id)
{
  // Capture all the attributes of the task in order to send an update.
  const horizon = document.getElementById("update-task-horizon").value
  const title = document.getElementById("update-task-title").value.trim()
  const description = document.getElementById("update-task-description").value.trim()
  const status = document.getElementById("update-task-status").value
  const nogo_reason = status !== "NOGO" ? null : document.getElementById("update-task-nogo-reason").value.trim()

  // TODO: Implement the DODO (dirty) check here - we have the modified task attributes, and the id from the call.
  // We can therefore call getTask(task_id) again, compare values against the task the API returns, and update by just
  // the different fields; however, the API doesn't support small changes to tasks - it's all or nothing for now.
  if (!putTask(task_id, {
    horizon: horizon,
    title: title,
    description: description,
    status: status,
    nogo_reason: nogo_reason
  }))
  {
    // Leave the user at the task update view. TODO: Figure out how to highlight errant fields.
    return
  }
  else
  {
    // A successful update should return to the main view, just as if the page was first loaded.
    await openCountsView(horizon)
  }
}

async function openUpdateView(task_id, task_status)
{
  /*
   * The view of the web document where tasks can be updated.
   *
   * +---+-----------------------------+
   * |   | Cancel               Update |
   * | T +-----------------------------+
   * | A |                             |
   * | S |  Horizon | NEAR [\/]        |
   * | K |  Title   | [NEAR Test]      |
   * | E |  Descript| Create NEAR task |
   * | D |  Status  | ONGO [\/]        |
   * |   |  [Reason]| [...]            | <-- Reason only visible with NOGO Status (and required before update committed).
   * |   +-----------------------------+
   * |   |                             |
   * +---+-----------------------------+
   *
   */

  // Grab a reference to the page containers.
  const page_header = document.getElementById("page-header")
  const page_detail = document.getElementById("page-detail")
  const page_footer = document.getElementById("page-footer")

  // Ensure James' favorite activity keeps the view ready for the contents..
  // DELETE EVERYTING!
  page_header.innerHTML = ""
  page_detail.innerHTML = ""
  page_footer.innerHTML = ""

  // Let's not repeat review's missing data...
  const review_task_response = await getTask(task_id)

  if (review_task_response.ok)
  {
    const review_task = await review_task_response.json()

    console.log("openUpdateView(current status:" + review_task.status + "; pending status:"  + task_status + ")")

    const update_task_status = task_status !== review_task.status ? task_status : review_task.status

    // Yeaup, still moving the "action" buttons to the page header.
    page_header.innerHTML =
      "<input type='button' value='Cancel' onclick='openReviewView(" + review_task.id + ")'/>" +
      "<input type='button' value='Update' onclick='onUpdateClicked(" + review_task.id + ")'/>"

    // The task details are .. in the page detail section.
    page_detail.innerHTML =
      "<table>" +
      "<tr>" +
      "<td>Horizon</td>" +
      "<td>" +
      "<select name='horizon' id='update-task-horizon'>" +
      "<option value='NEAR'" + (review_task.horizon === "NEAR" ? " selected" : "") + ">NEAR</option>" +
      "<option value='LONG'" + (review_task.horizon === "LONG" ? " selected" : "") + ">LONG</option>" +
      "</select>" +
      "</tr>" +
      "<tr>" +
      "<td>Title</td>" +
      "<td>" +
      "<input type='text' id='update-task-title' value='" + review_task.title + "' />" +
      "</td>" +
      "</tr>" +
      "<tr>" +
      "<td>Description</td>" +
      "<td>" +
      "<textarea id='update-task-description'>" +
      (review_task.description ?? "") +
      "</textarea>" +
      "</td>" +
      "</tr>" +
      "<tr>" +
      "<td>Status</td>" +
      "<td>" +
      "<select name='status' id='update-task-status'>" +
      "<option value='TODO'" + (update_task_status === "TODO" ? " selected" : "") + ">TODO</option>" +
      "<option value='ONGO'" + (update_task_status === "ONGO" ? " selected" : "") + ">ONGO</option>" +
      "<option value='DONE'" + (update_task_status === "DONE" ? " selected" : "") + ">DONE</option>" +
      "<option value='NOGO'" + (update_task_status === "NOGO" ? " selected" : "") + ">NOGO</option>" +
      "</select>" +
      "</td>" +
      "</tr>" + (update_task_status !== "NOGO" ? "</table>" :
      "<tr id='update-task-nogo-reason-row'>" +
      "<td>Reason</td>" +
      "<td>" +
      "<textarea id='update-task-nogo-reason'>" +
      (review_task.nogo_reason ?? "") +
      "</textarea>" +
      "</td>" +
      "</tr>" +
      "</table>")

    // Since it doesn't look easy to connect the status selection and the NOGO reason rendering, it's probably
    // better to use addEventListener (ref: https://www.xjavascript.com/blog/get-selected-value-text-from-select-on-change/#2-the-change-event-what-you-need-to-know)
    // But does it work after injecting the HTML above via innerHTML?
    const update_task_status_selector = document.getElementById("update-task-status")
    update_task_status_selector.addEventListener("change", () => openUpdateView(review_task.id, update_task_status_selector.value)) // Ooh, this looks like lambdas in Python! Useful at times, but huge XP there.
    // But will the rerender call work through the event listener? Seems to be so, but we haven't saved changes just yet, but it does render the new status fine.

    // And for updates, nothing in the footer now. IDEA: Maybe make a search function to associate tasks to another?
  }
  else
  {
    // It's Claude's fault this time!
  }
}

async function openReviewView(task_id)
{
  /*
   * The view of the web document where tasks can be reviewed (prior to updating).
   *
   * +---+-----------------------------+
   * |   | Cancel    Modify     Delete |
   * | T +-----------------------------+
   * | A |                             |
   * | S |  Horizon | NEAR             |
   * | K |  Title   | NEAR Test        |
   * | E |  Descript| Create NEAR task |
   * | D |  Status  | ONGO             |
   * |   |                             |
   * |   +-----------------------------+
   * |   |                             |
   * +---+-----------------------------+
   *
   */

  // Grab a reference to the page containers.
  const page_header = document.getElementById("page-header")
  const page_detail = document.getElementById("page-detail")
  const page_footer = document.getElementById("page-footer")

  // Ensure James' favorite activity keeps the view ready for the contents..
  // DELETE EVERYTING!
  page_header.innerHTML = ""
  page_detail.innerHTML = ""
  page_footer.innerHTML = ""

  // Kind of helps to have the task data, no?
  const review_task_response = await getTask(task_id)

  if (review_task_response.ok)
  {
    const review_task = await review_task_response.json()

    // The "action" buttons are now moved to the page header.
    page_header.innerHTML =
      "<input type='button' value='Cancel' onclick='openCountsView(\"" + review_task.horizon + "\")'/>" +
      "<input type='button' value='Modify' onclick='openUpdateView(" + review_task.id + ")'/>" +
      "<input type='button' value='Delete' onclick='onDeleteClicked(" + review_task.id + ", \"" + review_task.horizon + "\")'/>"

    // The page detail is the more detailed task view, in case the user wants to update something.
    page_detail.innerHTML =
      "<table>" +
      "<tr>" +
      "<td>Horizon</td>" +
      "<td>" + review_task.horizon + "</td>" +
      "</tr>" +
      "<tr>" +
      "<td>Title</td>" +
      "<td>" + review_task.title + "</td>" +
      "</tr>" +
      "<tr>" +
      "<td>Description</td>" +
      "<td>" +
      "<textarea readonly>" +
      (review_task.description ?? "&lt;none&gt;") +
      "</textarea>" +
      "</td>" +
      "</tr>" +
      "<tr>" +
      "<td>Status</td>" +
      "<td>" + review_task.status + "</td>" +
      "</tr>" + (review_task.status !== "NOGO" ? "</table>" :
      "<tr>" +
      "<td>Reason</td>" +
      "<td>" + review_task.nogo_reason + "</td>" +
      "</tr>" +
      "</table>")

    // For now, nothing in the page footer. IDEA: Possible listing of related tasks (like a LONG task (goal) with supporting NEAR tasks).
  }
  else
  {
    // TODO: Handle errors in an ungraceful and trolling way.
  }
}

async function createHorizonTask(horizon, title)
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

async function onCreateClicked()
{
  // Collect the data from the fields.
  const horizon = document.getElementById("create-task-horizon").value
  const title = document.getElementById("create-task-title").value.trim()

  // Guard against empty titles - can't create a task without one!
  if (!title)
  {
    return
  }

  const create_task_response = await createHorizonTask(horizon, title)

  // Show the counts view with the newly minted task (and hopefully updated status count!).
  if (create_task_response.ok)
  {
    await openCountsView(horizon)
  }
  else
  {
    // TODO: Handle errors in an ungraceful and trolling way.
  }
}

function openCreateView(horizon)
{
  /*
   * The view of the web document where new tasks can be created.
   *
   * NOTE: Only the minimum fields required to create a task are displayed.
   *
   * +---+-----------------------------+
   * |   | Cancel               Create |
   * | T +-----------------------------+
   * | A |                             |
   * | S |  Horizon | NEAR [\/]        |
   * | K |  Title   | [Task title]     |
   * | E |                             |
   * | D +-----------------------------+
   * |   |                             |
   * |   |                             |
   * +---+-----------------------------+
   *
   */

  // Grab a reference to the page containers.
  const page_header = document.getElementById("page-header")
  const page_detail = document.getElementById("page-detail")
  const page_footer = document.getElementById("page-footer")

  // Ensure James' favorite activity keeps the view ready for the contents..
  // DELETE EVERYTING!
  page_header.innerHTML = ""
  page_detail.innerHTML = ""
  page_footer.innerHTML = ""

  // The "action" buttons are now moved to the page header.
  page_header.innerHTML =
    "<input type='button' value='Cancel' onclick='openCountsView(\"" + horizon + "\")'/>" +
    "<input type='button' value='Create' onclick='onCreateClicked()'/>"

  // The page detail is a simplified task view, namely just the horizon and title.
  page_detail.innerHTML =
    "<table>" +
    "<tr>" +
    "<td>Horizon</td>" +
    "<td>" +
    "<select name='horizon' id='create-task-horizon'>" +
    "<option value='NEAR'" + (horizon === "NEAR" ? " selected" : "") + ">NEAR</option>" +
    "<option value='LONG'" + (horizon === "LONG" ? " selected" : "") + ">LONG</option>" +
    "</select>" +
    "</tr>" +
    "<tr>" +
    "<td>Title</td>" +
    "<td>" +
    "<input type='text' id='create-task-title' placeholder='Task title' />" +
    "</td>" +
    "</tr>" +
    "</table>"
}

async function getTasks(horizon)
{
  // TODO: Probably should avoid query parameter injection, but for now... we're just gonna...
  // Claude mentioned encodeURIComponent(horizon), but I'm not familiar with it just yet. So... Soon (tm).
  const horizon_tasks_response = await fetch("/api/tasks?horizon=" + horizon)

  let horizon_tasks = []

  if (!horizon_tasks_response.ok)
  {
    console.log("Failed to retrieve the tasks for " + horizon)
  }
  else
  {
    horizon_tasks.push(...await horizon_tasks_response.json())
    // ... is the spread operation, similar to flatten([[a, b, c]]) in Terraform.
  }

  return horizon_tasks
}

async function openCountsView(horizon, status = null)
{
  /*
   * The main view of the web document.
   *
   * +---+-----------------------------+
   * |   | NEAR         +         LONG |
   * | T +-----------------------------+
   * | A |                             |
   * | S |   TOGO  ONGO   DONE  NOGO   |
   * | K |     0     0      0     1    |
   * | E |                             |
   * | D +-----------------------------+
   * |   |  - + | TICK OFF Alex        |
   * |   |                             |
   * +---+-----------------------------+
   *
   */

  // Grab a reference to the page containers.
  const page_header = document.getElementById("page-header")
  const page_detail = document.getElementById("page-detail")
  const page_footer = document.getElementById("page-footer")

  // Ensure James' favorite activity keeps the view ready for the contents..
  // DELETE EVERYTING!
  page_header.innerHTML = ""
  page_detail.innerHTML = ""
  page_footer.innerHTML = ""

  // The page header contains the horizons (NEAR, LONG) as clickable labels, plus a centered "+" button (to create a new task).
  page_header.innerHTML =
    // "<input type='radio' name='horizon' id='horizon-near' value='near'" + (horizon === "NEAR" ? " checked" : " ") + "onclick='openCountsView(\"NEAR\")'/>" + /* see comment below */
    "<input type='radio' name='horizon' id='horizon-near' value='near' onclick='openCountsView(\"NEAR\")'/>" +
    "<label for='horizon-near'>NEAR</label>" +
    "<input type='button' value='+' onclick='openCreateView(\"" + horizon + "\")'/>" + /* This is 'safe', as clicking NEAR or LONG will set the value (above and below). */
    // "<input type='radio' name='horizon' id='horizon-long' value='long'" + (horizon === "LONG" ? " checked" : " ") + "onclick='openCountsView(\"LONG\")'/>" + /* see comment below */
    "<input type='radio' name='horizon' id='horizon-long' value='long' onclick='openCountsView(\"LONG\")'/>" +
    "<label for='horizon-long'>LONG</label>"

  // When clicking the LONG horizon after loading (and actually, on loading, NEAR wasn't properly styled), LONG remained unchecked.
  // Claude reasoned that the above innerHTML setting was interfering with "settling" of the document's style, so it felt like 2 clicks
  // were needed to actually apply the style. It suggested to set the checked state after removing the checked attribute above:
  document.getElementById(horizon === "NEAR" ? "horizon-near" : "horizon-long").checked = true

  // The remaining page containers are dynamic, so we need to grab the driving data.
  const horizon_tasks = await getTasks(horizon)

  // The page detail contains the status counts. (TODO: Add HEAP status count for showing soft-deleted tasks: is_deleted = 1)
  const horizon_task_counts = { TODO: 0, ONGO: 0, DONE: 0, NOGO: 0 }
  for (const horizon_task of horizon_tasks)
  {
    if (horizon_task_counts[horizon_task.status] !== undefined)
    {
      horizon_task_counts[horizon_task.status]++
    }
  }

  page_detail.innerHTML =
    "<table id='horizon-counts'>" +
    "<tr>" +
    "<td class='horizon-status" + (status === "TODO" ? " active" : "") + "' onclick='openCountsView(\"" + horizon + "\", " + (status === "TODO" ? "null" : "\"TODO\"") + ")'>TODO</td>" +
    "<td class='horizon-status" + (status === "ONGO" ? " active" : "") + "' onclick='openCountsView(\"" + horizon + "\", " + (status === "ONGO" ? "null" : "\"ONGO\"") + ")'>ONGO</td>" +
    "<td class='horizon-status" + (status === "DONE" ? " active" : "") + "' onclick='openCountsView(\"" + horizon + "\", " + (status === "DONE" ? "null" : "\"DONE\"") + ")'>DONE</td>" +
    "<td class='horizon-status" + (status === "NOGO" ? " active" : "") + "' onclick='openCountsView(\"" + horizon + "\", " + (status === "NOGO" ? "null" : "\"NOGO\"") + ")'>NOGO</td>" +
    "</tr>" +
    "<tr>" +
    "<td class='horizon-count' id='horizon-count-todo'><center>" + horizon_task_counts.TODO + "</center></td>" +
    "<td class='horizon-count' id='horizon-count-ongo'><center>" + horizon_task_counts.ONGO + "</center></td>" +
    "<td class='horizon-count' id='horizon-count-done'><center>" + horizon_task_counts.DONE + "</center></td>" +
    "<td class='horizon-count' id='horizon-count-nogo'><center>" + horizon_task_counts.NOGO + "</center></td>" +
    "</tr>" +
    "</table>" // TODO: Utilize the horizon-count class to center the counts instead of using center elements.

  // The page footer contains the listing of the $horizon tasks with the selected $status filter(s).
  if (horizon_tasks.length !== 0) // But a table without content is pointless, so.. maybe we should have something..
  {
    // NAIVE IMPLEMENTATION (IT PROBABALY COULD HAVE MAYBE WORKED...)
    // --------------
    // page_footer.innerHTML = "<table id='horizon-entries'>"
    //
    // for (const horizon_task of horizon_tasks)
    // {
    //   page_footer.innerHTML +=
    //     "<tr>" +
    //     "<td><input type='button' value='/\\'/></td>" + // TODO: onIncrementPriority(horizon_task.id)
    //     "<td><input type='button' value='\\/'/></td>" + // TODO: onDecrementPriority(horizon_task.id)
    //     "<td>|</td>" +
    //     "<td class='task-title' onclick='openReviewView(" + horizon_task.id + ")'>" + horizon_task.title + "</td>" +
    //     "</tr>"
    // }
    //
    // page_footer.innerHTML += "</table>"

    // However, Claude pointed out map(...), and I was like "YES! I .. THERE HAD TO BE SOMETHING LIKE THAT - I JUST DIDN'T KNOW!"
    // So... here's that version:

    // const rows = horizon_tasks.map(horizon_task =>
    //   "<tr>" +
    //   "<td><input type='button' value='/\\'/></td>" + // TODO: onIncrementPriority(horizon_task.id)
    //   "<td><input type='button' value='\\/'/></td>" + // TODO: onDecrementPriority(horizon_task.id)
    //   "<td>|</td>" +
    //   "<td class='task-title' onclick='openReviewView(" + horizon_task.id + ")'>" + horizon_task.title + "</td>" +
    //   "</tr>"
    // )

    // STATUS FILTRATION
    // To make it easier to dogfeed (actually deploy this for internal field testing on a Raspberry Pi), the status
    // count headers function as a toggle filter (only one active at a time).
    const filtered_tasks = status !== null ? horizon_tasks.filter(t => t.status === status) : horizon_tasks

    const rows = filtered_tasks.map(horizon_task =>
      "<tr>" +
      "<td><input type='button' value='/\\'/></td>" + // TODO: onIncrementPriority(horizon_task.id)
      "<td><input type='button' value='\\/'/></td>" + // TODO: onDecrementPriority(horizon_task.id)
      "<td>|</td>" +
      "<td class='task-title' onclick='openReviewView(" + horizon_task.id + ")'>" + horizon_task.title + "</td>" +
      "</tr>"
    )

    page_footer.innerHTML = "<table id='horizon-entries'>" + rows.join("") + "</table>"
  }
}
