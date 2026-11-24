import json

import pymecht as pmt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import EXPERIMENT_AXES, MAX_POINTS, SessionConfig
from app.simulation import EXPERIMENTS, MATERIAL_MODELS

client = TestClient(app)

UNIAXIAL = {"type": "uniaxial", "inputMeasure": "stretch", "outputMeasure": "cauchy"}
BIAXIAL = {"type": "biaxial", "inputMeasure": "stretch", "outputMeasure": "cauchy"}
TUBE = {"type": "tube", "inputMeasure": "radius", "outputMeasure": "pressure"}
AXIS = {"start": 1, "end": 1.2, "points": 3}


def make_config(**changes) -> dict:
    """A valid uniaxial neo-Hookean config, with any top-level parts replaced."""
    config = {
        "material": {"components": [{"id": "c1", "type": "nh", "fiber": None}]},
        "experiment": UNIAXIAL,
        "parameters": [],
        "protocol": {"control": "displacement", "axes": [AXIS], "initialGuess": None},
        "units": {"length": "mm", "force": "N", "stress": "kPa"},
    }
    config.update(changes)
    return config


def parameter(key: str, value: float, lower: float, upper: float) -> dict:
    return {
        "key": key, "base": key.split("_")[0], "componentId": None, "group": "material",
        "label": key, "value": value, "fixed": False, "lower": lower, "upper": upper,
    }


def simulate(config: dict):
    return client.post("/simulate", json={"config": config})


def assert_invalid(response, detail: str):
    assert response.status_code == 422
    assert response.json() == {"detail": f"The request is invalid. {detail}", "log": []}


def test_valid_config_is_accepted():
    assert simulate(make_config(parameters=[parameter("mu_0", 2, 0.0001, 100)])).status_code == 200


def test_value_outside_its_bounds_is_rejected():
    response = simulate(make_config(parameters=[parameter("mu_0", 500, 0.0001, 100)]))

    assert_invalid(response, "config.parameters: mu_0 is 500, outside its bounds of 0.0001 to 100")


def test_lower_bound_above_upper_bound_is_rejected():
    response = simulate(make_config(parameters=[parameter("mu_0", 2, 10, 1)]))

    assert_invalid(response, "config.parameters: mu_0 has a lower bound of 10, above its upper bound of 1")


def test_every_parameter_problem_is_reported():
    rows = [parameter("mu_0", 500, 0.0001, 100), parameter("L0", -1, 0.0001, 1000)]

    detail = simulate(make_config(parameters=rows)).json()["detail"]

    assert "mu_0 is 500" in detail
    assert "L0 is -1" in detail


def test_equal_bounds_are_allowed():
    # pyMechT's own tube defaults, e.g. lambdaZ is 1 with bounds of 1 to 1.
    config = make_config(experiment=TUBE, parameters=[parameter("lambdaZ", 1, 1, 1)])

    assert simulate(config).status_code == 200


@pytest.mark.parametrize(
    ("experiment", "axes"),
    [(UNIAXIAL, [AXIS, AXIS]), (BIAXIAL, [AXIS]), (TUBE, [AXIS, AXIS])],
    ids=["uniaxial", "biaxial", "tube"],
)
def test_protocol_needs_one_range_per_axis(experiment, axes):
    config = make_config(experiment=experiment, protocol={"control": "displacement", "axes": axes})

    needed = EXPERIMENT_AXES[experiment["type"]]
    assert_invalid(
        simulate(config),
        f"config: This experiment needs {needed} protocol axis range(s), but {len(axes)} were given",
    )


def test_initial_guess_needs_one_value_per_axis():
    protocol = {"control": "force", "axes": [AXIS, AXIS], "initialGuess": [1.0]}

    response = simulate(make_config(experiment=BIAXIAL, protocol=protocol))

    assert_invalid(response, "config: The initial guess needs 2 value(s), one per axis, but 1 were given")


@pytest.mark.parametrize(
    "protocol",
    [{"control": "displacement", "axes": []}, {"control": "displacement", "axes": [{**AXIS, "points": 1}]}],
    ids=["no axes", "one point"],
)
def test_empty_protocol_is_rejected(protocol):
    response = simulate(make_config(protocol=protocol))

    assert response.status_code == 422
    assert response.json()["detail"].startswith("The request is invalid. config.protocol.axes")


def test_points_are_capped():
    protocol = {"control": "displacement", "axes": [{**AXIS, "points": MAX_POINTS + 1}]}

    response = simulate(make_config(protocol=protocol))

    assert_invalid(response, f"config.protocol.axes.0.points: Input should be less than or equal to {MAX_POINTS}")


def test_the_cap_itself_is_allowed():
    protocol = {"control": "displacement", "axes": [{**AXIS, "points": MAX_POINTS}]}

    assert simulate(make_config(protocol=protocol)).status_code == 200


@pytest.mark.parametrize("angle", [-90, 0, 45, 90])
def test_fiber_angles_in_range_are_accepted(angle):
    component = {"id": "c1", "type": "goh", "fiber": {"mode": "symmetric", "angleDeg": angle}}

    response = client.post("/parameters", json={"material": {"components": [component]}, "experiment": BIAXIAL})

    assert response.status_code == 200


@pytest.mark.parametrize("angle", [-91, 90.5, 180])
def test_fiber_angles_out_of_range_are_rejected(angle):
    component = {"id": "c1", "type": "goh", "fiber": {"mode": "single", "angleDeg": angle}}

    response = client.post("/parameters", json={"material": {"components": [component]}, "experiment": BIAXIAL})

    assert response.status_code == 422
    assert response.json()["detail"].startswith("The request is invalid. material.components.0.fiber.angleDeg")


@pytest.mark.parametrize("number", ["NaN", "Infinity", "-Infinity"])
def test_non_finite_numbers_are_rejected(number):
    # Python's JSON parser accepts these, so send them as raw JSON.
    body = json.dumps({"config": make_config()}).replace('"start": 1', f'"start": {number}')

    response = client.post("/simulate", content=body, headers={"Content-Type": "application/json"})

    assert_invalid(response, "config.protocol.axes.0.start: Input should be a finite number")


@pytest.mark.parametrize("experiment", EXPERIMENT_AXES)
def test_experiment_axes_match_pymecht(experiment):
    assert EXPERIMENT_AXES[experiment] == EXPERIMENTS[experiment](pmt.MatModel("nh"))._ndim


@pytest.mark.parametrize("experiment", [UNIAXIAL, BIAXIAL, TUBE], ids=["uniaxial", "biaxial", "tube"])
@pytest.mark.parametrize("model", MATERIAL_MODELS)
def test_every_default_table_passes_validation(model, experiment):
    # pyMechT's polyI4 d1 defaults to 0, below its lower bound of 0.0001, so /parameters widens the bounds.
    material = {"components": [{"id": "c1", "type": model, "fiber": None}]}
    rows = client.post("/parameters", json={"material": material, "experiment": experiment}).json()["parameters"]
    protocol = {"control": "force", "axes": [AXIS] * EXPERIMENT_AXES[experiment["type"]]}
    config = make_config(material=material, experiment=experiment, parameters=rows, protocol=protocol)

    SessionConfig.model_validate(config)
