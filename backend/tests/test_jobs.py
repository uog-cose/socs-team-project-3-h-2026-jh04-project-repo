import time

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def wait_until_done(client, job_id, timeout=10):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        job = client.get(f"/jobs/{job_id}").json()
        if job["status"] in ("succeeded", "failed", "cancelled"):
            return job
        time.sleep(0.05)
    raise AssertionError("job did not finish in time")


def test_job_runs_to_completion(client):
    response = client.post("/jobs/demo", json={"steps": 3, "step_seconds": 0.05})
    assert response.status_code == 202

    job = wait_until_done(client, response.json()["id"])
    assert job["status"] == "succeeded"
    assert job["progress"] == 1.0
    assert job["result"] == {"answer": 42}


def test_progress_is_reported_while_running(client):
    job_id = client.post("/jobs/demo", json={"steps": 20, "step_seconds": 0.05}).json()["id"]

    time.sleep(0.4)
    job = client.get(f"/jobs/{job_id}").json()
    assert job["status"] == "running"
    assert 0 < job["progress"] < 1

    client.delete(f"/jobs/{job_id}")


def test_job_can_be_cancelled(client):
    job_id = client.post("/jobs/demo", json={"steps": 100, "step_seconds": 0.05}).json()["id"]
    time.sleep(0.2)

    client.delete(f"/jobs/{job_id}")
    job = wait_until_done(client, job_id)
    assert job["status"] == "cancelled"
    assert job["progress"] < 1


def test_unknown_job_returns_404(client):
    assert client.get("/jobs/nope").status_code == 404
    assert client.delete("/jobs/nope").status_code == 404
