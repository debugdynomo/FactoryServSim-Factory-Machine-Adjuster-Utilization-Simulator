"""
Services Package — Stochastic Modeling, Failure Dynamics & Staffing Optimizer

This package (PERSON 2) provides:
- failure_model: Uniform MTTF failure time generation
- repair_model: Repair duration generation and state transitions
- monte_carlo: Multi-run simulation aggregator with confidence intervals
- optimizer: Automated adjuster staffing sweep and optimum detection

These services are consumed by the simulation engine (Person 1 / core)
and exposed through the REST API (Person 3 / api).
"""

from .failure_model import FailureModel
from .repair_model import RepairModel
from .monte_carlo import MonteCarloRunner
from .optimizer import StaffingOptimizer

__all__ = [
    "FailureModel",
    "RepairModel",
    "MonteCarloRunner",
    "StaffingOptimizer",
]
