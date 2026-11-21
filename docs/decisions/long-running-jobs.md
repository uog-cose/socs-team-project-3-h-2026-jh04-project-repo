# Long-running jobs (issue #32)

## Decision

Fitting runs as an in-memory job on a `ProcessPoolExecutor`. The frontend
polls `GET /jobs/{id}` about once a second and cancels with `DELETE /jobs/{id}`.

## Options considered

- **Thread + in-memory jobs**: rejected. Fitting is CPU-bound, so it competes
  with the API for the GIL, and threads can't be stopped.
- **Process pool + in-memory jobs**: chosen. Real parallelism, standard library
  only, no extra services.
- **Task queue (Celery/RQ + Redis)**: rejected as overkill. It adds a broker
  and worker service and only pays off with several servers.

## Progress: polling over SSE

Polling fits TanStack Query (`refetchInterval`), our typed `openapi-fetch`
client and MSW mocks. One-second updates are enough for fitting.

```ts
useQuery({
  queryKey: ['job', id],
  queryFn: async () =>
    unwrap(await api.GET('/jobs/{job_id}', { params: { path: { job_id: id } } })),
  // Poll every second until the job finishes
  refetchInterval: (query) =>
    ['succeeded', 'failed', 'cancelled'].includes(query.state.data?.status ?? '') ? false : 1000,
})
```

## Cancelling

`DELETE /jobs/{id}` sets a shared cancel flag that the task checks between
steps. Jobs that haven't started yet are removed from the queue.

## Limits

- Jobs are lost on restart, and the API must run with one uvicorn worker.
- Finished jobs are never cleaned up yet; add a TTL in sprint 3.
- Cancelling needs a hook between fitting iterations. Check what pyMechT
  provides (e.g. an optimiser callback).
- The `/jobs` routes aren't in `frontend/openapi/openapi.yaml` yet; add them
  when fitting is built.

## Proof of concept

`backend/app/jobs.py`, the `/jobs` routes in `backend/app/main.py` and
`backend/tests/test_jobs.py`. `POST /jobs/demo` runs a dummy slow task.
