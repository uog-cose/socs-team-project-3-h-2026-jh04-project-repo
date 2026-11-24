from app.schemas import MaterialComponent, ParameterRow, ParametersRequest, ParametersResponse
from app.simulation import build_sample

GEOMETRY_LABELS = {
    "L0": "Initial length",
    "A0": "Cross-sectional area",
    "L10": "Initial length, axis 1",
    "L20": "Initial length, axis 2",
    "thick": "Thickness",
    "Ri": "Inner radius",
    "omega": "Opening angle (radians)",
    "lambdaZ": "Axial stretch",
}

# Labels are per model, because the same name means different things in different models:
# k3 is the dispersion in GOH but the fiber stiffness in HGO.
MATERIAL_LABELS = {
    "nh": {"mu": "Shear modulus"},
    "mr": {"c1": "Mooney–Rivlin c₁", "c2": "Mooney–Rivlin c₂"},
    "yeoh": {"c1": "Yeoh c₁", "c2": "Yeoh c₂", "c3": "Yeoh c₃", "c4": "Yeoh c₄"},
    "expI1": {"k1": "Stiffness k₁", "k2": "Exponent k₂"},
    "goh": {"k1": "Stiffness k₁", "k2": "Exponent k₂", "k3": "Dispersion k₃"},
    "hgo": {"k3": "Fiber stiffness k₃", "k4": "Fiber exponent k₄"},
    "ls": {
        "k1": "Stiffness k₁",
        "k2": "Matrix exponent k₂",
        "k3": "Fiber exponent k₃",
        "k4": "Matrix weighting k₄",
    },
    "polyI4": {"d1": "Fiber coefficient d₁", "d2": "Fiber coefficient d₂", "d3": "Fiber coefficient d₃"},
}


def split_key(key: str) -> tuple[str, int | None]:
    """Splits a pyMechT parameter key into its base name and component index.

    MatModel names material parameters <base>_<component index>, e.g. mu_0 or k1_1.
    Geometry keys such as L0 or lambdaZ have no suffix, so their index is None.
    """
    base, _, index = key.rpartition("_")
    if base and index.isdigit():
        return base, int(index)
    return key, None


def paramdict_to_rows(params, components: list[MaterialComponent]) -> list[ParameterRow]:
    """Converts a pyMechT ParamDict into parameter table rows, in pyMechT's order.

    Values, bounds and the fixed flag are pyMechT's own. components must be the ones the
    ParamDict was built from, so that component i owns the keys ending in _i.
    """
    rows = []
    for key, param in params.items():
        base, index = split_key(key)
        if index is None:
            component_id, group = None, "geometry"
            label = GEOMETRY_LABELS.get(key, key)
        else:
            component = components[index]
            component_id, group = component.id, "material"
            label = MATERIAL_LABELS.get(component.type, {}).get(base, base)
        rows.append(
            ParameterRow(
                key=key,
                base=base,
                component_id=component_id,
                group=group,
                label=label,
                value=param.value,
                fixed=param.fixed,
                lower=param.low,
                upper=param.high,
            )
        )
    return rows


def match_key(row: ParameterRow) -> tuple:
    """Identifies a parameter across rebuilds of the table.

    Material rows are matched on their component and base name rather than their key, because
    keys follow the component's position: mu_0 becomes mu_1 when a component moves down.
    Geometry rows belong to no component, so they are matched on their key.
    """
    if row.group == "geometry":
        return ("geometry", row.key)
    return ("material", row.component_id, row.base)


def keep_previous(rows: list[ParameterRow], previous: list[ParameterRow]) -> list[ParameterRow]:
    """Keeps the user's value, bounds and fixed flag for each parameter that still exists."""
    edits = {match_key(row): row for row in previous}
    kept = []
    for row in rows:
        edit = edits.get(match_key(row))
        if edit is not None:
            row = row.model_copy(
                update={"value": edit.value, "fixed": edit.fixed, "lower": edit.lower, "upper": edit.upper}
            )
        kept.append(row)
    return kept


def build_parameter_table(request: ParametersRequest) -> ParametersResponse:
    """Builds the parameter table for a material and experiment, keeping previous edits."""
    sample = build_sample(request.material, request.experiment)
    rows = paramdict_to_rows(sample.parameters, request.material.components)
    return ParametersResponse(parameters=keep_previous(rows, request.previous))
