# The CRUDE operations are now implemented, however, testing is still manual, mainly
# via the Swagger UI (at /docs), where a sanity test can be performed over all the
# CRUDE + reorder routes:

# 1. POST a new task -> get an ID back
# 2a. GET /api/tasks -> see new task in list
# 2b. GET /api/tasks/{task_id} -> see it individually
# 3a. PUT it to NOGO without a reason -> expect 422 for failed validation (nogo_reason missing)
# 3b. PUT it to NOGO with a reason -> expect 200
# 5. POST another new task -> now 2 IDs are ready to swap
# 6. PUT /api/tasks/reorder with both IDs -> confirm positions of tasks swapped
# 7. DELETE one task -> confirm is_deleted = 1 for the soft delete
# 8. Get /api/tasks -> see deleted task omitted from list
