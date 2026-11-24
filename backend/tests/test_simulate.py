import numpy as np
import pymecht as pmt
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_config(**changes) -> dict:
    """A valid uniaxial neo-Hookean config, with any top-level parts replaced."""
    config = {
        "material": {"components": [{"id": "c1", "type": "nh", "fiber": None}]},
        "experiment": {"type": "uniaxial", "inputMeasure": "stretch", "outputMeasure": "cauchy"},
        "parameters": [],
        "protocol": {"control": "displacement", "axes": [{"start": 1, "end": 1.3, "points": 4}], "initialGuess": None},
        "units": {"length": "mm", "force": "N", "stress": "kPa"},
    }
    config.update(changes)
    return config


def simulate(config: dict):
    return client.post("/simulate", json={"config": config})


def parameter(key: str, value: float, group: str = "material") -> dict:
    return {
        "key": key, "base": key.split("_")[0], "componentId": None, "group": group,
        "label": key, "value": value, "fixed": False, "lower": 0, "upper": 1000,
    }


def test_uniaxial_matches_pymecht():
    response = simulate(make_config())
    assert response.status_code == 200
    body = response.json()

    sample = pmt.UniaxialExtension(pmt.MatModel("nh"), disp_measure="stretch", force_measure="cauchy")
    stretches = np.linspace(1, 1.3, 4).reshape(-1, 1)
    expected = sample.disp_controlled(stretches, sample.parameters)

    assert np.allclose(body["input"], stretches)
    assert np.allclose(body["output"], expected)


def test_biaxial_with_fibres_matches_pymecht():
    config = make_config(
        material={"components": [
            {"id": "c1", "type": "goh", "fiber": {"mode": "symmetric", "angleDeg": 30}},
            {"id": "c2", "type": "nh", "fiber": None},
        ]},
        experiment={"type": "biaxial", "inputMeasure": "stretch", "outputMeasure": "cauchy"},
        protocol={"control": "displacement", "axes": [
            {"start": 1, "end": 1.2, "points": 3}, {"start": 1, "end": 1.1, "points": 3},
        ]},
    )
    response = simulate(config)
    assert response.status_code == 200

    sample = pmt.PlanarBiaxialExtension(pmt.MatModel("goh", "nh"), disp_measure="stretch", force_measure="cauchy")
    pmt.specify_two_fibers(sample, 30, verbose=False)
    stretches = np.column_stack([np.linspace(1, 1.2, 3), np.linspace(1, 1.1, 3)])
    expected = sample.disp_controlled(stretches, sample.parameters)

    assert np.allclose(response.json()["output"], expected)


def test_tube_inflation_matches_pymecht():
    config = make_config(
        experiment={"type": "tube", "inputMeasure": "radius", "outputMeasure": "pressure"},
        protocol={"control": "displacement", "axes": [{"start": 1, "end": 1.3, "points": 4}]},
    )
    response = simulate(config)
    assert response.status_code == 200

    sample = pmt.TubeInflation(pmt.MatModel("nh"), disp_measure="radius", force_measure="pressure")
    radii = np.linspace(1, 1.3, 4).reshape(-1, 1)
    expected = sample.disp_controlled(radii, sample.parameters)

    assert np.allclose(response.json()["output"], expected)


def test_parameter_values_are_used():
    default = simulate(make_config()).json()["output"]
    doubled = simulate(make_config(parameters=[parameter("mu_0", 2.0)])).json()["output"]
    # Neo-Hookean stress is proportional to mu, which defaults to 1
    assert np.allclose(doubled, 2 * np.asarray(default))


def test_force_controlled_reproduces_the_requested_forces():
    config = make_config(protocol={"control": "force", "axes": [{"start": 0, "end": 5, "points": 3}], "initialGuess": [1.0]})
    response = simulate(config)
    assert response.status_code == 200
    body = response.json()

    sample = pmt.UniaxialExtension(pmt.MatModel("nh"), disp_measure="stretch", force_measure="cauchy")
    forces = sample.disp_controlled(np.asarray(body["output"]), sample.parameters)
    assert np.allclose(forces, body["input"], atol=1e-4)
    assert body["warnings"] == []


def test_force_controlled_without_initial_guess_warns():
    config = make_config(protocol={"control": "force", "axes": [{"start": 0, "end": 5, "points": 3}]})
    response = simulate(config)
    assert response.status_code == 200
    assert "No initial guess" in response.json()["warnings"][0]


def test_no_material_components_gives_readable_error():
    response = simulate(make_config(material={"components": []}))
    assert response.status_code == 422
    assert response.json()["detail"] == "Add at least one material component before simulating."


def test_wrong_number_of_axes_gives_readable_error():
    config = make_config(protocol={"control": "displacement", "axes": [
        {"start": 1, "end": 1.2, "points": 3}, {"start": 1, "end": 1.2, "points": 3},
    ]})
    response = simulate(config)
    assert response.status_code == 422
    assert "needs 1 protocol axis" in response.json()["detail"]


def test_unknown_parameter_gives_readable_error():
    response = simulate(make_config(parameters=[parameter("k1_5", 1.0)]))
    assert response.status_code == 422
    assert response.json()["detail"] == "Unknown parameter k1_5 for this material and experiment."


def test_unknown_measure_gives_pymecht_message():
    config = make_config(experiment={"type": "uniaxial", "inputMeasure": "bogus", "outputMeasure": "cauchy"})
    response = simulate(config)
    assert response.status_code == 422
    assert response.json()["detail"].startswith("UniaxialExtension: Unknown disp_measure bogus")


@pytest.mark.parametrize("start", [0, -1])
def test_invalid_values_are_reported_not_returned(start):
    config = make_config(protocol={"control": "displacement", "axes": [{"start": start, "end": 1, "points": 3}]})
    response = simulate(config)
    assert response.status_code == 422
    assert "invalid values" in response.json()["detail"]


@pytest.mark.parametrize("body", [{}, {"config": {"material": {}}}])
def test_malformed_request_gives_string_detail(body):
    response = client.post("/simulate", json=body)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    assert response.json()["detail"].startswith("The request is invalid.")


@pytest.mark.parametrize(
    ("experiment", "axes", "sample"),
    [
        (
            {"type": "biaxial", "inputMeasure": "stretch", "outputMeasure": "cauchy"},
            [{"start": 0, "end": 5, "points": 3}, {"start": 0, "end": 3, "points": 3}],
            lambda: pmt.PlanarBiaxialExtension(pmt.MatModel("nh"), disp_measure="stretch", force_measure="cauchy"),
        ),
        (
            {"type": "tube", "inputMeasure": "radius", "outputMeasure": "pressure"},
            [{"start": 0, "end": 0.08, "points": 3}],
            lambda: pmt.TubeInflation(pmt.MatModel("nh"), disp_measure="radius", force_measure="pressure"),
        ),
    ],
    ids=["biaxial", "tube"],
)
def test_force_controlled_biaxial_and_tube_reproduce_the_requested_forces(experiment, axes, sample):
    config = make_config(experiment=experiment, protocol={"control": "force", "axes": axes})
    response = simulate(config)
    assert response.status_code == 200
    body = response.json()
    assert np.shape(body["output"]) == np.shape(body["input"])

    expected_sample = sample()
    forces = expected_sample.disp_controlled(np.asarray(body["output"]), expected_sample.parameters)
    assert np.allclose(forces, body["input"], atol=1e-4)


def test_pressure_above_the_tube_limit_gives_initial_guess_hint():
    # A neo-Hookean tube with default geometry can't hold more than about 0.094, so there is no solution
    config = make_config(
        experiment={"type": "tube", "inputMeasure": "radius", "outputMeasure": "pressure"},
        protocol={"control": "force", "axes": [{"start": 0, "end": 0.5, "points": 3}], "initialGuess": [1.0]},
    )
    response = simulate(config)
    assert response.status_code == 422
    assert "initial guess" in response.json()["detail"]