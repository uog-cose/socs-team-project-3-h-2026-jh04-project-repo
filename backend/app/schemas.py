
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

# Number of loading axes, and so input columns, for each experiment. Matches pyMechT's _ndim.
EXPERIMENT_AXES = {"uniaxial": 1, "biaxial": 2, "tube": 1}

# A 1000-point force-controlled tube run takes about 2 seconds, so this keeps requests short.
MAX_POINTS = 1000


class CamelModel(BaseModel):
    """Uses camelCase in JSON, like the frontend, and snake_case in Python.

    NaN and infinity are rejected, because Python's JSON parser accepts them.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, allow_inf_nan=False)


class FiberConfig(CamelModel):
    mode: Literal["single", "symmetric"]
    # -90 to 90 covers every direction, because a fiber at 100° is the same as one at -80°.
    angle_deg: float = Field(ge=-90, le=90)


class MaterialComponent(CamelModel):
    id: str
    type: str
    fiber: FiberConfig | None = None


class MaterialConfig(CamelModel):
    components: list[MaterialComponent]


class ExperimentConfig(CamelModel):
    type: Literal["uniaxial", "biaxial", "tube"]
    input_measure: str
    output_measure: str


class ParameterRow(CamelModel):
    key: str
    base: str
    component_id: str | None = None
    group: Literal["geometry", "material"]
    label: str
    value: float
    fixed: bool
    lower: float
    upper: float


class ProtocolAxis(CamelModel):
    start: float
    end: float
    points: int = Field(ge=2, le=MAX_POINTS)


class Protocol(CamelModel):
    control: Literal["displacement", "force"]
    axes: list[ProtocolAxis] = Field(min_length=1, max_length=2)
    initial_guess: list[float] | None = None


class UnitLabels(CamelModel):
    length: str
    force: str
    stress: str


class SessionConfig(CamelModel):
    material: MaterialConfig
    experiment: ExperimentConfig
    parameters: list[ParameterRow]
    protocol: Protocol
    units: UnitLabels

    @field_validator("parameters")
    @classmethod
    def values_within_bounds(cls, rows: list[ParameterRow]) -> list[ParameterRow]:
        """Checks each value is within its bounds. Equal bounds are allowed, as pyMechT uses them."""
        problems = []
        for row in rows:
            if row.lower > row.upper:
                problems.append(f"{row.key} has a lower bound of {row.lower:g}, above its upper bound of {row.upper:g}")
            elif not row.lower <= row.value <= row.upper:
                problems.append(f"{row.key} is {row.value:g}, outside its bounds of {row.lower:g} to {row.upper:g}")
        if problems:
            raise ValueError("; ".join(problems))
        return rows

    @model_validator(mode="after")
    def protocol_matches_experiment(self) -> "SessionConfig":
        """Checks there is one protocol range, and one initial guess value, per loading axis."""
        axes = EXPERIMENT_AXES[self.experiment.type]
        given = len(self.protocol.axes)
        if given != axes:
            raise ValueError(f"This experiment needs {axes} protocol axis range(s), but {given} were given")
        guess = self.protocol.initial_guess
        if guess is not None and len(guess) != axes:
            raise ValueError(f"The initial guess needs {axes} value(s), one per axis, but {len(guess)} were given")
        return self


class ParametersRequest(CamelModel):
    material: MaterialConfig
    experiment: ExperimentConfig
    previous: list[ParameterRow] = []


class ParametersResponse(CamelModel):
    parameters: list[ParameterRow]


class SimulateRequest(CamelModel):
    config: SessionConfig


class SimulateResponse(CamelModel):
    input: list[list[float]]
    output: list[list[float]]
    log: list[str]
    warnings: list[str]