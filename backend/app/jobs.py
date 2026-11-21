import time
import uuid
from concurrent.futures import Future, ProcessPoolExecutor
from dataclasses import dataclass
from multiprocessing import Manager
from typing import Any


class JobCancelled(Exception):
    pass


def dummy_slow_task(steps: int, step_seconds: float, progress, cancel) -> dict:
    for i in range(steps):
        if cancel.is_set():
            raise JobCancelled()
        time.sleep(step_seconds)
        progress.value = (i + 1) / steps
    return {"answer": 42}


@dataclass
class Job:
    id: str
    future: Future
    progress: Any
    cancel: Any

    @property
    def status(self) -> str:
        if not self.future.done():
            return "running" if self.future.running() else "queued"
        if self.future.cancelled() or isinstance(self.future.exception(), JobCancelled):
            return "cancelled"
        if self.future.exception() is not None:
            return "failed"
        return "succeeded"

    def to_dict(self) -> dict:
        status = self.status
        return {
            "id": self.id,
            "status": status,
            "progress": self.progress.value,
            "result": self.future.result() if status == "succeeded" else None,
            "error": str(self.future.exception()) if status == "failed" else None,
        }


class JobManager:
    def __init__(self, max_workers: int = 2):
        self._executor = ProcessPoolExecutor(max_workers=max_workers)
        self._manager = Manager()
        self._jobs: dict[str, Job] = {}

    def submit(self, fn, *args) -> Job:
        progress = self._manager.Value("d", 0.0)
        cancel = self._manager.Event()
        future = self._executor.submit(fn, *args, progress, cancel)
        job = Job(id=uuid.uuid4().hex, future=future, progress=progress, cancel=cancel)
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def cancel(self, job_id: str) -> Job | None:
        job = self._jobs.get(job_id)
        if job is not None:
            job.future.cancel()
            job.cancel.set()
        return job

    def shutdown(self) -> None:
        for job in self._jobs.values():
            job.cancel.set()
        self._executor.shutdown(wait=True, cancel_futures=True)
        self._manager.shutdown()
