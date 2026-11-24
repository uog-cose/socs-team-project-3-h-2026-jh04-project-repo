
import contextlib
import io
import warnings

import numpy as np
import pymecht as pmt

from app.errors import SimulationError, readable_message, run_force_controlled
from app.schemas import (
    FiberConfig,
    ParameterRow,
    Protocol,
    SessionConfig,
    SimulateResponse,
)

EXPERIMENTS = {
    "uniaxial": pmt.UniaxialExtension,
    "biaxial": pmt.PlanarBiaxialExtension,
    "tube": pmt.TubeInflation,
}

INVALID_VALUES_MESSAGE = "The simulation produced invalid values. Check the protocol range and parameter values."
NO_INITIAL_GUESS_WARNING = "No initial guess given for a force-controlled run; using the default for each axis."


def fiber_directions(experiment_type: str, fiber: FiberConfig) -> list[np.ndarray]:
    """Turns a fibre angle into pyMechT fibre direction vectors.

    The angle is measured from the x-axis in the xy plane for uniaxial and
    biaxial samples, and from the circumferential axis for tubes, the same
    as pyMechT's specify_single_fiber and specify_two_fibers.
    """

    def direction(angle_rad: float) -> np.ndarray:
        cos, sin = np.cos(angle_rad), np.sin(angle_rad)
        if experiment_type == "tube":
            return np.array([0.0, cos, sin])
        return np.array([cos, sin, 0.0])

    angle_rad = np.deg2rad(fiber.angle_deg)
    if fiber.mode == "single":
        return [direction(angle_rad)]
    return [direction(angle_rad), direction(-angle_rad)]


def build_sample(config: SessionConfig):
    """Builds the pyMechT material and experiment described by the config."""
    components = config.material.components
    if not components:
        raise SimulationError("Add at least one material component before simulating.")

    material = pmt.MatModel(*(component.type for component in components))
    for component, model in zip(components, material.models):
        if component.fiber is not None:
            model.fiber_dirs = fiber_directions(config.experiment.type, component.fiber)

    experiment = EXPERIMENTS[config.experiment.type]
    return experiment(
        material,
        disp_measure=config.experiment.input_measure,
        force_measure=config.experiment.output_measure,
    )


def apply_parameters(sample, rows: list[ParameterRow]):
    """Returns the sample's parameters with the values from the parameter table.

    Parameters missing from the table keep pyMechT's defaults.
    """
    params = sample.parameters
    for row in rows:
        if row.key not in params:
            raise SimulationError(f"Unknown parameter {row.key} for this material and experiment.")
        params.set(row.key, row.value)
    return params


def protocol_input(protocol: Protocol, ndim: int) -> tuple[np.ndarray, list[str]]:
    """Builds the N x ndim input array from the protocol's axis ranges."""
    if len(protocol.axes) != ndim:
        raise SimulationError(
            f"This experiment needs {ndim} protocol axis range(s), but {len(protocol.axes)} were given."
        )
    ranges = [np.linspace(axis.start, axis.end, axis.points) for axis in protocol.axes]
    points = min(len(values) for values in ranges)
    messages = []
    if any(len(values) != points for values in ranges):
        messages.append(f"The axes have different numbers of points, so the first {points} of each were used.")
    return np.column_stack([values[:points] for values in ranges]), messages


def run_simulation(config: SessionConfig) -> SimulateResponse:
    """Runs a displacement- or force-controlled simulation.

    pyMechT's console output is returned as the log, and its warnings as warnings.
    """
    console = io.StringIO()
    with contextlib.redirect_stdout(console), warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        try:
            sample = build_sample(config)
            params = apply_parameters(sample, config.parameters)
            inputs, messages = protocol_input(config.protocol, sample._ndim)
            if config.protocol.control == "displacement":
                outputs = sample.disp_controlled(inputs, params)
            else:
                guess = config.protocol.initial_guess
                if guess is None:
                    messages.append(NO_INITIAL_GUESS_WARNING)
                x0 = None if guess is None else np.asarray(guess, dtype=float)
                outputs = run_force_controlled(sample, inputs, params, x0=x0)
        except SimulationError as exc:
            exc.log = console.getvalue().splitlines() + exc.log
            raise
        except (ValueError, ArithmeticError) as exc:
            # A stretch of 0 divides by zero, and a negative one takes the square root of a
            # negative number ("math domain error"). Other ValueErrors are pyMechT's own messages.
            is_math_error = isinstance(exc, ArithmeticError) or str(exc) == "math domain error"
            detail = INVALID_VALUES_MESSAGE if is_math_error else readable_message(exc)
            raise SimulationError(detail, console.getvalue().splitlines()) from exc

    outputs = np.asarray(outputs, dtype=float).reshape(inputs.shape)
    if not np.all(np.isfinite(outputs)):
        raise SimulationError(INVALID_VALUES_MESSAGE, console.getvalue().splitlines())

    warning_messages = list(dict.fromkeys(str(warning.message) for warning in caught))
    return SimulateResponse(
        input=inputs.tolist(),
        output=outputs.tolist(),
        log=console.getvalue().splitlines(),
        warnings=messages + warning_messages,
    )