"""Runs pyMechT's documented examples through the API.

The examples are the uniaxial, biaxial and tube inflation notebooks in pyMechT's Examples folder
(04-uniaxial-example, 05-biax-example and 06-tubeinflation-example). Each test sets up the material,
fibers and parameters the same way as the notebook, gets the parameter table from POST /parameters,
runs POST /simulate, and checks the result against the numbers the notebook prints, or against
pyMechT run directly where the notebook only plots.
"""

import numpy as np
import pymecht as pmt
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

UNITS = {"length": "mm", "force": "N", "stress": "kPa"}


def component(id: str, type: str, fiber: dict | None = None) -> dict:
    return {"id": id, "type": type, "fiber": fiber}


def experiment(type: str, input_measure: str, output_measure: str) -> dict:
    return {"type": type, "inputMeasure": input_measure, "outputMeasure": output_measure}


def axis(start: float, end: float, points: int) -> dict:
    return {"start": start, "end": end, "points": points}


def parameter_table(components: list[dict], exp: dict, values: dict, fixed: tuple = ()) -> list[dict]:
    """Gets the table from POST /parameters and sets values the way the notebook does.

    As with pyMechT's ParamDict.fix, a fixed parameter's bounds are set to its value.
    """
    response = client.post("/parameters", json={"material": {"components": components}, "experiment": exp})
    assert response.status_code == 200, response.json()
    rows = response.json()["parameters"]
    assert set(values) | set(fixed) <= {row["key"] for row in rows}
    for row in rows:
        row["value"] = values.get(row["key"], row["value"])
        if row["key"] in fixed:
            row.update(fixed=True, lower=row["value"], upper=row["value"])
    return rows


def simulate(components, exp, parameters, control, axes, initial_guess=None) -> np.ndarray:
    """Runs POST /simulate and returns the output as an N x axes array."""
    config = {
        "material": {"components": components},
        "experiment": exp,
        "parameters": parameters,
        "protocol": {"control": control, "axes": axes, "initialGuess": initial_guess},
        "units": UNITS,
    }
    response = client.post("/simulate", json={"config": config})
    assert response.status_code == 200, response.json()
    return np.array(response.json()["output"])


def pymecht_params(sample, values: dict):
    params = sample.parameters
    for key, value in values.items():
        params.set(key, value)
    return params


# ---------------------------------------------------------------------------- Uniaxial (04)

UNIAXIAL_MATERIAL = [component("c1", "nh"), component("c2", "goh", {"mode": "single", "angleDeg": 0})]
UNIAXIAL_VALUES = {"mu_0": 5, "A0": 0.1, "L0": 1, "k1_1": 5, "k2_1": 15, "k3_1": 0.1}


def uniaxial_sample(**measures):
    """The notebook's sample, built with pyMechT directly."""
    sample = pmt.UniaxialExtension(pmt.MatModel("nh", "goh"), **measures)
    pmt.specify_single_fiber(sample, verbose=False)
    return sample


@pytest.mark.parametrize(
    ("measure", "start", "end"),
    [("length", 1, 1.2), ("stretch", 1, 1.3), ("strain", 0, 0.09), ("deltal", 0, 0.3)],
)
def test_uniaxial_displacement_controlled(measure, start, end):
    exp = experiment("uniaxial", measure, "cauchy")
    rows = parameter_table(UNIAXIAL_MATERIAL, exp, UNIAXIAL_VALUES)

    output = simulate(UNIAXIAL_MATERIAL, exp, rows, "displacement", [axis(start, end, 10)])

    sample = uniaxial_sample(disp_measure=measure)
    expected = sample.disp_controlled(np.linspace(start, end, 10), pymecht_params(sample, UNIAXIAL_VALUES))
    assert np.allclose(output.ravel(), expected)


@pytest.mark.parametrize(("measure", "guess"), [("force", 0.1), ("cauchy", 0.5), ("1pk", 0.5), ("2pk", 0.5)])
def test_uniaxial_force_controlled(measure, guess):
    values = UNIAXIAL_VALUES | {"L0": 10}
    exp = experiment("uniaxial", "stretch", measure)
    rows = parameter_table(UNIAXIAL_MATERIAL, exp, values)

    output = simulate(UNIAXIAL_MATERIAL, exp, rows, "force", [axis(1, 5, 10)], [guess])

    sample = uniaxial_sample(force_measure=measure)
    expected = sample.force_controlled(np.linspace(1, 5, 10), pymecht_params(sample, values), x0=[guess])
    assert np.allclose(output.ravel(), np.ravel(expected))


# ----------------------------------------------------------------------------- Biaxial (05)

BIAXIAL_MATERIAL = [component("c1", "goh", {"mode": "symmetric", "angleDeg": 10}), component("c2", "nh")]
BIAXIAL_VALUES = {"k1_0": 20, "k2_0": 20}
STRETCH_AXES = [axis(1, 1.1, 10), axis(1, 1.3, 10)]


def biaxial_stress() -> np.ndarray:
    """Cauchy stress for the notebook's stretch path, from the API."""
    exp = experiment("biaxial", "stretch", "cauchy")
    rows = parameter_table(BIAXIAL_MATERIAL, exp, BIAXIAL_VALUES)
    return simulate(BIAXIAL_MATERIAL, exp, rows, "displacement", STRETCH_AXES)


def test_biaxial_goh_nh_with_10_degree_fibers_matches_the_docs():
    stress = biaxial_stress()

    assert stress.shape == (10, 2)
    assert np.allclose(stress[1], [1.08277678, 0.20397835])

    sample = pmt.PlanarBiaxialExtension(pmt.MatModel("goh", "nh"))
    pmt.specify_two_fibers(sample, 10, verbose=False)
    stretch = np.column_stack([np.linspace(1, 1.1, 10), np.linspace(1, 1.3, 10)])
    assert np.allclose(stress, sample.disp_controlled(stretch, pymecht_params(sample, BIAXIAL_VALUES)))


def test_biaxial_force_controlled_recovers_the_stretch():
    end = biaxial_stress()[-1]
    exp = experiment("biaxial", "stretch", "cauchy")
    rows = parameter_table(BIAXIAL_MATERIAL, exp, BIAXIAL_VALUES)

    stretch = simulate(BIAXIAL_MATERIAL, exp, rows, "force", [axis(0, end[0], 10), axis(0, end[1], 10)])

    assert np.allclose(stretch[-1], [1.1, 1.3])


@pytest.mark.parametrize(
    ("measure", "geometry", "expected"),
    [
        ("force", {"L10": 1, "L20": 1, "thick": 1}, [1.07087813, 0.19739841]),
        ("force", {"L10": 2, "L20": 2, "thick": 2}, [4.28351252, 0.78959362]),
        ("tension", {"L10": 1, "L20": 1, "thick": 1}, [1.07087813, 0.19739841]),
        ("tension", {"L10": 2, "L20": 2, "thick": 1}, [1.07087813, 0.19739841]),
        ("1pk", {"L10": 1, "L20": 1, "thick": 1}, [1.07087813, 0.19739841]),
    ],
    ids=["force", "force-doubled-geometry", "tension", "tension-doubled-lengths", "1pk"],
)
def test_biaxial_force_measures_match_the_docs(measure, geometry, expected):
    exp = experiment("biaxial", "stretch", measure)
    rows = parameter_table(BIAXIAL_MATERIAL, exp, BIAXIAL_VALUES | geometry)

    output = simulate(BIAXIAL_MATERIAL, exp, rows, "displacement", STRETCH_AXES)

    assert np.allclose(output[1], expected)


@pytest.mark.parametrize(
    ("measure", "guess", "expected"),
    [("strain", [0, 0], [0.01, 0.09]), ("deltal", [0, 0], [0.1, 0.3]), ("length", [1, 1], [1.1, 1.3])],
)
def test_biaxial_displacement_measures_match_the_docs(measure, guess, expected):
    end = biaxial_stress()[-1]
    exp = experiment("biaxial", measure, "cauchy")
    rows = parameter_table(BIAXIAL_MATERIAL, exp, BIAXIAL_VALUES)

    output = simulate(BIAXIAL_MATERIAL, exp, rows, "force", [axis(0, end[0], 10), axis(0, end[1], 10)], guess)

    assert np.allclose(output[-1], expected)


# -------------------------------------------------------------------------------- Tube (06)

TUBE_MATERIAL = [component("c1", "yeoh"), component("c2", "goh", {"mode": "symmetric", "angleDeg": 10})]
TUBE_VALUES = {
    "Ri": 9, "thick": 2, "omega": 0, "L0": 1, "lambdaZ": 1,
    "c1_0": 28, "c2_0": 21, "c3_0": 8, "c4_0": 1, "k1_1": 5, "k2_1": 15, "k3_1": 0.1,
}
# The notebook fixes the geometry, which also sets its bounds to its value (Ri = 9 is outside 0.5 to 1.5).
TUBE_FIXED = ("Ri", "thick", "omega", "L0", "lambdaZ")


def tube_sample(**measures):
    """The notebook's sample, built with pyMechT directly."""
    sample = pmt.TubeInflation(pmt.MatModel("yeoh", "goh"), **measures)
    pmt.specify_two_fibers(sample, 10, verbose=False)
    return sample


def tube(input_measure: str, output_measure: str, values: dict = TUBE_VALUES):
    exp = experiment("tube", input_measure, output_measure)
    return exp, parameter_table(TUBE_MATERIAL, exp, values, TUBE_FIXED)


def test_tube_displacement_controlled():
    exp, rows = tube("radius", "pressure")

    output = simulate(TUBE_MATERIAL, exp, rows, "displacement", [axis(9, 12, 100)])

    sample = tube_sample()
    expected = sample.disp_controlled(np.linspace(9, 12, 100), pymecht_params(sample, TUBE_VALUES))
    assert np.allclose(output.ravel(), expected)


def test_tube_force_controlled():
    exp, rows = tube("radius", "pressure")

    output = simulate(TUBE_MATERIAL, exp, rows, "force", [axis(0, 2000, 100)])

    sample = tube_sample()
    expected = sample.force_controlled(np.linspace(0, 2000, 100), pymecht_params(sample, TUBE_VALUES))
    assert np.allclose(output.ravel(), np.ravel(expected))


@pytest.mark.parametrize(
    ("measure", "length", "expected"),
    [
        ("pressure", 1, 4.008308115330826),
        ("pressure", 2, 4.008308115330826),
        ("force", 1, 251.84942656895345),
        ("force", 2, 503.6988531379069),
    ],
)
def test_tube_force_measures_at_radius_10_match_the_docs(measure, length, expected):
    exp, rows = tube("radius", measure, TUBE_VALUES | {"L0": length})

    output = simulate(TUBE_MATERIAL, exp, rows, "displacement", [axis(10, 10, 2)])

    assert np.allclose(output.ravel(), expected)


@pytest.mark.parametrize(
    ("measure", "guess", "expected"),
    [
        ("stretch", 1, 1.2239472787140655),
        ("deltar", 0, 2.0155255084265886),
        ("radius", 9, 11.015525508426588),
        ("area", np.pi * 9**2, 381.2065144490343),
    ],
)
def test_tube_displacement_measures_at_pressure_10_match_the_docs(measure, guess, expected):
    exp, rows = tube(measure, "pressure")

    output = simulate(TUBE_MATERIAL, exp, rows, "force", [axis(10, 10, 2)], [guess])

    assert np.allclose(output.ravel(), expected)
