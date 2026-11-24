import pymecht as pmt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.parameters import MATERIAL_LABELS, split_key
from app.simulation import MATERIAL_MODELS

client = TestClient(app)

UNIAXIAL = {"type": "uniaxial", "inputMeasure": "stretch", "outputMeasure": "cauchy"}
TUBE = {"type": "tube", "inputMeasure": "radius", "outputMeasure": "pressure"}
GOH = {"id": "c1", "type": "goh", "fiber": {"mode": "single", "angleDeg": 0}}
NH = {"id": "c2", "type": "nh", "fiber": None}


def build(components: list[dict], experiment: dict = UNIAXIAL, previous: list[dict] | None = None):
    body = {"material": {"components": components}, "experiment": experiment}
    if previous is not None:
        body["previous"] = previous
    return client.post("/parameters", json=body)


def table(response) -> dict[str, dict]:
    """The returned rows by key, after checking the request succeeded."""
    assert response.status_code == 200, response.json()
    return {row["key"]: row for row in response.json()["parameters"]}


def edit(row: dict, value: float) -> dict:
    """The row as the user might leave it: a new value, fixed, with new bounds."""
    return {**row, "value": value, "fixed": True, "lower": value / 2, "upper": value * 2}


def test_table_matches_the_pymecht_paramdict():
    rows = table(build([GOH, NH]))

    expected = pmt.UniaxialExtension(pmt.MatModel("goh", "nh")).parameters
    assert list(rows) == list(expected)
    for key, param in expected.items():
        row = rows[key]
        assert (row["value"], row["lower"], row["upper"], row["fixed"]) == (
            param.value,
            param.low,
            param.high,
            param.fixed,
        )


def test_rows_say_which_component_and_group_they_belong_to():
    rows = table(build([GOH, NH]))

    def owner(key):
        return rows[key]["base"], rows[key]["componentId"], rows[key]["group"], rows[key]["label"]

    assert owner("L0") == ("L0", None, "geometry", "Initial length")
    assert owner("k3_0") == ("k3", "c1", "material", "Dispersion k₃")
    assert owner("mu_1") == ("mu", "c2", "material", "Shear modulus")


@pytest.mark.parametrize(
    "experiment, sample",
    [
        (UNIAXIAL, pmt.UniaxialExtension),
        ({"type": "biaxial", "inputMeasure": "stretch", "outputMeasure": "cauchy"}, pmt.PlanarBiaxialExtension),
        (TUBE, pmt.TubeInflation),
    ],
)
def test_each_experiment_has_the_pymecht_geometry(experiment, sample):
    rows = table(build([NH], experiment))

    expected = sample(pmt.MatModel("nh")).parameters
    assert list(rows) == list(expected)
    assert all(rows[key]["value"] == param.value for key, param in expected.items())


def test_no_components_gives_only_the_geometry():
    # The frontend starts with an empty material, so this must not be an error.
    rows = table(build([]))

    assert list(rows) == ["L0", "A0"]


def test_previous_values_are_kept():
    rows = table(build([GOH, NH]))
    previous = [edit(rows["mu_1"], 5), edit(rows["L0"], 2)]

    kept = table(build([GOH, NH], previous=previous))

    assert kept["mu_1"] == previous[0]
    assert kept["L0"] == previous[1]
    assert kept["k1_0"] == rows["k1_0"]


def test_edits_follow_their_component_when_it_moves():
    rows = table(build([GOH, NH]))
    previous = [edit(rows["k1_0"], 20), edit(rows["mu_1"], 5)]

    moved = table(build([NH, GOH], previous=previous))

    # NH moved first, so its mu_1 is now mu_0, and GOH's k1_0 is now k1_1.
    assert moved["mu_0"] == previous[1] | {"key": "mu_0"}
    assert moved["k1_1"] == previous[0] | {"key": "k1_1"}


def test_edits_of_a_removed_component_are_not_given_to_a_new_one():
    rows = table(build([GOH, NH]))
    previous = [edit(rows["mu_1"], 5)]

    # A different neo-Hookean component in the same position gets the same key, mu_1.
    replaced = table(build([GOH, {"id": "c3", "type": "nh", "fiber": None}], previous=previous))

    assert replaced["mu_1"] == rows["mu_1"] | {"componentId": "c3"}


def test_geometry_edits_are_kept_when_the_experiment_changes():
    rows = table(build([NH]))
    previous = [edit(rows["L0"], 2), edit(rows["A0"], 3)]

    tube = table(build([NH], TUBE, previous=previous))

    assert tube["L0"] == previous[0]
    assert "A0" not in tube
    assert tube["Ri"]["value"] == pmt.TubeInflation(pmt.MatModel("nh")).parameters["Ri"].value


def test_previous_rows_that_no_longer_exist_are_ignored():
    stale = {
        "key": "k4_3",
        "base": "k4",
        "componentId": "gone",
        "group": "material",
        "label": "k4",
        "value": 1,
        "fixed": False,
        "lower": 0,
        "upper": 1,
    }

    assert table(build([NH], previous=[stale])) == table(build([NH]))


def test_the_table_can_be_sent_straight_to_simulate():
    parameters = build([GOH, NH]).json()["parameters"]
    config = {
        "material": {"components": [GOH, NH]},
        "experiment": UNIAXIAL,
        "parameters": parameters,
        "protocol": {"control": "displacement", "axes": [{"start": 1, "end": 1.2, "points": 3}]},
        "units": {"length": "mm", "force": "N", "stress": "kPa"},
    }

    assert client.post("/simulate", json={"config": config}).status_code == 200


@pytest.mark.parametrize("model", ["bogus", "ParamDict", "MatModel"])
def test_unknown_material_model_gives_readable_error(model):
    # ParamDict and MatModel are names pyMechT would try to build as a material model.
    response = build([{"id": "c1", "type": model, "fiber": None}])

    assert response.status_code == 422
    assert response.json() == {"detail": f"Unknown material model {model}.", "log": []}


def test_unknown_measure_gives_pymecht_message():
    response = build([NH], {"type": "uniaxial", "inputMeasure": "bogus", "outputMeasure": "cauchy"})

    assert response.status_code == 422
    assert response.json()["detail"].startswith("UniaxialExtension: Unknown disp_measure bogus")


@pytest.mark.parametrize(
    "body",
    [
        {"material": {"components": []}},
        {"material": {"components": []}, "experiment": {**UNIAXIAL, "type": "torsion"}},
        {"material": {"components": [{"type": "nh"}]}, "experiment": UNIAXIAL},
    ],
)
def test_malformed_request_gives_string_detail(body):
    response = client.post("/parameters", json=body)

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


@pytest.mark.parametrize("model", MATERIAL_MODELS)
def test_every_supported_model_has_a_label_for_each_parameter(model):
    bases = {split_key(key)[0] for key in pmt.MatModel(model).parameters}

    assert set(MATERIAL_LABELS[model]) == bases


@pytest.mark.parametrize(
    "key, expected",
    [
        ("mu_0", ("mu", 0)),
        ("k1_12", ("k1", 12)),
        ("L0", ("L0", None)),
        ("L10", ("L10", None)),
        ("lambdaZ", ("lambdaZ", None)),
    ],
)
def test_split_key(key, expected):
    assert split_key(key) == expected
