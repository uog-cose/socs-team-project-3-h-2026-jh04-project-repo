from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_vite_dev_server():
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_blocks_unknown_origin():
    response = client.get("/health", headers={"Origin": "http://not-allowed.example"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_read_from_env(monkeypatch):
    monkeypatch.setenv("PYMECHT_CORS_ORIGINS", "http://a.example, http://b.example")
    assert Settings().cors_origin_list == ["http://a.example", "http://b.example"]