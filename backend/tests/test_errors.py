import logging

import numpy as np
import pymecht as pmt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.errors import (
    CONVERGENCE_HINT,
    ConvergenceError,
    SimulationError,
    readable_message,
    register_exception_handlers,
    run_force_controlled,
)


def make_client(error: Exception) -> TestClient:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/fail")
    def fail():
        raise error

    return TestClient(app, raise_server_exceptions=False)


def uniaxial():
    material = pmt.MatModel("nh")
    return pmt.UniaxialExtension(material, disp_measure="stretch", force_measure="cauchy")


def test_readable_message_joins_pymecht_tuple_errors():
    with pytest.raises(ValueError) as info:
        pmt.UniaxialExtension(pmt.MatModel("nh"), disp_measure="bogus")
    message = readable_message(info.value)
    assert message.startswith("UniaxialExtension: Unknown disp_measure bogus")
    assert "(" not in message


def test_pymecht_value_error_returns_readable_422():
    response = make_client(ValueError("GOH model class uses I4 but no fiber directions have been defined.")).get("/fail")
    assert response.status_code == 422
    assert response.json()["detail"] == "GOH model class uses I4 but no fiber directions have been defined."


def test_numpy_error_returns_422():
    response = make_client(np.linalg.LinAlgError("Singular matrix")).get("/fail")
    assert response.status_code == 422
    assert response.json()["detail"] == "Singular matrix"


def test_simulation_error_keeps_its_log():
    response = make_client(SimulationError("Bad setup", ["step 1 failed"])).get("/fail")
    assert response.status_code == 422
    assert response.json() == {"detail": "Bad setup", "log": ["step 1 failed"]}


def test_unexpected_error_is_hidden_from_browser_and_logged(caplog):
    with caplog.at_level(logging.ERROR, logger="pymecht_api"):
        response = make_client(KeyError("secret_internal_name")).get("/fail")
    assert response.status_code == 500
    assert "secret_internal_name" not in response.text
    assert "Traceback" not in response.text
    assert "secret_internal_name" in caplog.text


def test_force_controlled_success_returns_result():
    sample = uniaxial()
    result = run_force_controlled(sample, np.array([0.0, 10.0]), sample.parameters)
    assert np.allclose(result, [1.0, 3.2111], atol=1e-3)


def test_non_converging_run_gives_initial_guess_hint():
    sample = uniaxial()
    with pytest.raises(ConvergenceError) as info:
        run_force_controlled(sample, np.array([np.nan]), sample.parameters)
    assert info.value.detail == CONVERGENCE_HINT
    assert "initial guess" in info.value.detail


def test_bad_initial_guess_gives_initial_guess_hint():
    sample = uniaxial()
    with pytest.raises(ConvergenceError):
        run_force_controlled(sample, np.array([10.0]), sample.parameters, x0=np.array([-3.0]))


def test_silently_wrong_result_is_caught(monkeypatch):
    sample = uniaxial()
    monkeypatch.setattr(sample, "force_controlled", lambda forces, params, x0=None: np.array([1.0, 1.0]))
    with pytest.raises(ConvergenceError):
        run_force_controlled(sample, np.array([0.0, 10.0]), sample.parameters)