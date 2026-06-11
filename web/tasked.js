
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
      "<td><input type='button' value='/'/></td>" +
      "<td><input type='button' value='X'/></td>"
    table.appendChild(row)
  }
}
