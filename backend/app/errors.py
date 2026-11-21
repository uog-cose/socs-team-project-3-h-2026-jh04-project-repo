import logging

import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("pymecht_api")

CONVERGENCE_HINT = (
    "The solver could not find a solution for this load. "
    "Try a different initial guess, or a smaller load range."
)


class SimulationError(Exception):
    """An error caused by the user's setup, with a message that is safe to show them."""

    status_code = 422

    def __init__(self, detail: str, log: list[str] | None = None):
        super().__init__(detail)
        self.detail = detail
        self.log = log or []


class ConvergenceError(SimulationError):
    """A force-controlled run that did not converge."""

    def __init__(self, log: list[str] | None = None):
        super().__init__(CONVERGENCE_HINT, log)


def readable_message(exc: Exception) -> str:
    """Joins the parts of an exception into one sentence.

    pyMechT often raises errors with several arguments, for example
    ValueError("UniaxialExtension", ": Unknown disp_measure", "bogus"),
    which str() would show as a tuple.
    """
    parts = [str(arg).strip() for arg in exc.args if isinstance(arg, str)]
    message = " ".join(parts).replace(" :", ":").replace(" .", ".")
    return message or "The calculation failed. Check your parameter values."


def check_force_controlled(sample, forces, result, params, tolerance=1e-3):
    """Raises ConvergenceError if a force-controlled result is missing or wrong.

    pyMechT can return without raising, so this runs the result back through
    disp_controlled and checks it reproduces the requested forces.
    """
    forces = np.asarray(forces, dtype=float).reshape(-1, sample._ndim)
    result = np.asarray(result, dtype=float).reshape(-1, sample._ndim)
    if not np.all(np.isfinite(result)):
        raise ConvergenceError()
    recomputed = np.asarray(sample.disp_controlled(result, params), dtype=float).reshape(forces.shape)
    relative_error = np.abs(recomputed - forces) / (np.abs(forces) + 1)
    if np.max(relative_error) > tolerance:
        raise ConvergenceError()


def run_force_controlled(sample, forces, params, x0=None):
    """Runs a force-controlled simulation and turns solver failures into ConvergenceError."""
    try:
        result = sample.force_controlled(forces, params, x0=x0)
    except RuntimeError as exc:
        if "not converged" in readable_message(exc):
            raise ConvergenceError() from exc
        raise
    except (ValueError, FloatingPointError, ArithmeticError) as exc:
        # A bad initial guess can push the solver to invalid stretches,
        # e.g. "math domain error" from a square root of a negative number.
        raise ConvergenceError([readable_message(exc)]) from exc
    check_force_controlled(sample, forces, result, params)
    return result


def _error_response(status_code: int, detail: str, log: list[str] | None = None) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail, "log": log or []})


async def handle_simulation_error(request: Request, exc: SimulationError) -> JSONResponse:
    return _error_response(exc.status_code, exc.detail, exc.log)


async def handle_calculation_error(request: Request, exc: Exception) -> JSONResponse:
    return _error_response(422, readable_message(exc))


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unexpected error on %s %s", request.method, request.url.path)
    return _error_response(500, "Something went wrong on the server. Please try again.")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(SimulationError, handle_simulation_error)
    for error_type in (ValueError, ArithmeticError, np.linalg.LinAlgError):
        app.add_exception_handler(error_type, handle_calculation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)