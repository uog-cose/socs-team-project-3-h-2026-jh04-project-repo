
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Uses camelCase in JSON, like the frontend, and snake_case in Python."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class FiberConfig(CamelModel):
    mode: Literal["single", "symmetric"]
    angle_deg: float


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
    points: int = Field(ge=2)


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


class SimulateRequest(CamelModel):
    config: SessionConfig


class SimulateResponse(CamelModel):
    input: list[list[float]]
    output: list[list[float]]
    log: list[str]
    warnings: list[str]