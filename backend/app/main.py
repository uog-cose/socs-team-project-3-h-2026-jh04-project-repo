from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.jobs import JobManager, dummy_slow_task


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.jobs = JobManager()
    yield
    app.state.jobs.shutdown()


app = FastAPI(title="pyMechT GUI API", version="0.1.0", debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


class DemoJobRequest(BaseModel):
    steps: int = Field(10, ge=1, le=100)
    step_seconds: float = Field(0.5, ge=0, le=5)


@app.post("/jobs/demo", status_code=202)
def start_demo_job(body: DemoJobRequest, request: Request):
    job = request.app.state.jobs.submit(dummy_slow_task, body.steps, body.step_seconds)
    return job.to_dict()


@app.get("/jobs/{job_id}")
def get_job(job_id: str, request: Request):
    job = request.app.state.jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job.to_dict()


@app.delete("/jobs/{job_id}")
def cancel_job(job_id: str, request: Request):
    job = request.app.state.jobs.cancel(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job.to_dict()
