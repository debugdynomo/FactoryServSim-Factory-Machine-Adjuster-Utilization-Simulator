"""
Simulation REST endpoints for FactoryServSim.

Provides:
- POST /api/simulation/run   — Execute a full simulation with given factory config
- GET  /api/simulation/presets — Fetch pre-built industry benchmark profiles

INTEGRATION POINTS:
- Person 1 (Core Engine): simulator.run_simulation() for actual DES execution
- Person 2 (Services):    monte_carlo module for multi-run aggregation
"""

import json
import logging
import os
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app.schemas.payload import (
    AdjusterMetrics,
    CategoryMetrics,
    FactoryConfigInput,
    PresetListResponse,
    SimulationResultOutput,
    SummaryMetrics,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

# Path to the preset configurations file
_CONFIG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "config",
)
_DEFAULT_PRESETS_PATH = os.path.join(_CONFIG_DIR, "default_factory.json")


def _try_import_simulator():
    """
    Attempt to import Person 1's simulation engine.
    Returns the run function or None if not available yet.
    """
    try:
        from app.core.simulator import run_simulation as _run_sim
        return _run_sim
    except ImportError:
        return None


def _try_import_monte_carlo():
    """
    Attempt to import Person 2's Monte Carlo aggregator.
    Returns the function or None if not available yet.
    """
    try:
        from app.services.monte_carlo import run_monte_carlo as _run_mc
        return _run_mc
    except ImportError:
        return None


def _generate_mock_simulation_result(payload: FactoryConfigInput) -> SimulationResultOutput:
    """
    Generate mock simulation results that match the guide.md contract.
    Used when Person 1/2's backend modules are not yet integrated.
    Produces category-specific and adjuster-specific mock data based on input.
    """
    total_machines = sum(cat.count for cat in payload.machine_categories)
    num_adjusters = len(payload.adjusters)

    # Generate plausible mock metrics based on input ratios
    # More adjusters per machine -> higher machine utilization, lower adjuster utilization
    ratio = num_adjusters / max(total_machines, 1)
    machine_util = min(98.0, 50.0 + ratio * 5000)
    adjuster_util = max(20.0, 99.0 - ratio * 1000)

    category_metrics = []
    total_failures = 0
    for cat in payload.machine_categories:
        # Estimate failures: sim_time / mttf * count (approximate)
        est_failures = int(payload.simulation_time / cat.mttf * cat.count * 0.5)
        # Higher MTTF -> higher utilization
        cat_util = min(99.0, 100.0 - (cat.mean_repair_time / cat.mttf) * 100)
        category_metrics.append(
            CategoryMetrics(
                category=cat.name,
                utilization_pct=round(cat_util, 2),
                total_failures=est_failures,
            )
        )
        total_failures += est_failures

    adjuster_metrics = []
    repairs_per_adjuster = max(1, total_failures // max(num_adjusters, 1))
    for adj in payload.adjusters:
        adjuster_metrics.append(
            AdjusterMetrics(
                id=adj.id,
                name=adj.name,
                busy_time_pct=round(adjuster_util + (adj.id % 3) * 0.5, 2),
                repairs_completed=repairs_per_adjuster + (adj.id * 10),
            )
        )

    avg_wait = max(0.1, (1.0 - ratio * 100) * 5) if ratio < 0.01 else 0.5

    return SimulationResultOutput(
        summary=SummaryMetrics(
            total_simulation_time=payload.simulation_time,
            overall_machine_utilization_pct=round(machine_util, 2),
            overall_adjuster_utilization_pct=round(adjuster_util, 2),
            avg_queue_wait_time=round(avg_wait, 2),
            total_failures_handled=total_failures,
        ),
        category_metrics=category_metrics,
        adjuster_metrics=adjuster_metrics,
    )


@router.post("/run", response_model=SimulationResultOutput)
async def run_simulation(payload: FactoryConfigInput) -> SimulationResultOutput:
    """
    Execute a full factory simulation with the given configuration.

    Accepts a FactoryConfigInput payload and returns SimulationResultOutput
    containing summary metrics, per-category metrics, and per-adjuster metrics.

    Validates adjuster business rules:
    - Adjuster names must be unique
    - No two adjusters can have the exact same expertise set

    Integration: Delegates to Person 1's DES engine when available,
    otherwise returns intelligent mock data.
    """
    # --- Adjuster Validation ---
    # Rule 1: No duplicate adjuster names
    seen_names = set()
    for adj in payload.adjusters:
        if adj.name.lower() in seen_names:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate adjuster name: '{adj.name}'. Each adjuster must have a unique name.",
            )
        seen_names.add(adj.name.lower())

    # Rule 2: No two adjusters can have the exact same expertise set
    seen_expertise = []
    for adj in payload.adjusters:
        expertise_set = frozenset(e.lower() for e in adj.expertise)
        if expertise_set in seen_expertise:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Adjuster '{adj.name}' has the same expertise set "
                    f"{sorted(adj.expertise)} as another adjuster. "
                    f"No two adjusters can share the exact same expertise combination."
                ),
            )
        seen_expertise.append(expertise_set)

    logger.info(
        "Simulation requested: sim_time=%d, categories=%d, adjusters=%d",
        payload.simulation_time,
        len(payload.machine_categories),
        len(payload.adjusters),
    )

    # Try to use the real simulation engine (Person 1)
    run_sim = _try_import_simulator()
    if run_sim is not None:
        try:
            result = run_sim(payload)
            logger.info("Simulation completed using core engine")
            return result
        except Exception as e:
            logger.error("Core simulation engine error: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Simulation engine error: {str(e)}",
            )

    # Fallback to mock data when the engine is not yet available
    logger.info("Core engine not available, returning mock simulation results")
    return _generate_mock_simulation_result(payload)


@router.get("/presets", response_model=PresetListResponse)
async def get_presets() -> Dict[str, Any]:
    """
    Fetch pre-built industry benchmark factory profiles.

    Loads presets from config/default_factory.json.
    Falls back to hardcoded presets if the file is not found.
    """
    if os.path.exists(_DEFAULT_PRESETS_PATH):
        try:
            with open(_DEFAULT_PRESETS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            logger.info("Loaded %d presets from config file", len(data.get("presets", [])))
            return data
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("Failed to parse presets file: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail="Failed to load preset configurations",
            )

    # Fallback presets matching guide.md examples
    logger.info("Presets file not found, returning fallback presets")
    return {
        "presets": [
            {
                "id": "automotive_plant",
                "name": "Automotive Plant",
                "description": "Standard automotive manufacturing with 200 Lathes, 50 Turning, 80 Drilling, 30 Soldering machines",
                "simulation_time": 10000,
                "machine_categories": [
                    {"name": "Lathe", "count": 200, "mttf": 100, "mean_repair_time": 10},
                    {"name": "Turning", "count": 50, "mttf": 150, "mean_repair_time": 12},
                    {"name": "Drilling", "count": 80, "mttf": 80, "mean_repair_time": 8},
                    {"name": "Soldering", "count": 30, "mttf": 200, "mean_repair_time": 15},
                ],
                "adjusters": [
                    {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe", "Turning"]},
                    {"id": 2, "name": "Adjuster 2", "expertise": ["Drilling", "Soldering"]},
                    {"id": 3, "name": "Adjuster 3", "expertise": ["Lathe", "Drilling", "Turning"]},
                ],
            },
            {
                "id": "small_workshop",
                "name": "Small Workshop",
                "description": "Small-scale workshop with 20 Lathes, 10 Drilling machines",
                "simulation_time": 5000,
                "machine_categories": [
                    {"name": "Lathe", "count": 20, "mttf": 120, "mean_repair_time": 8},
                    {"name": "Drilling", "count": 10, "mttf": 90, "mean_repair_time": 6},
                ],
                "adjusters": [
                    {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe", "Drilling"]},
                ],
            },
            {
                "id": "heavy_industry",
                "name": "Heavy Industry Plant",
                "description": "Large-scale factory with high machine counts and diverse categories",
                "simulation_time": 20000,
                "machine_categories": [
                    {"name": "Lathe", "count": 500, "mttf": 80, "mean_repair_time": 12},
                    {"name": "Turning", "count": 200, "mttf": 120, "mean_repair_time": 10},
                    {"name": "Drilling", "count": 300, "mttf": 100, "mean_repair_time": 9},
                    {"name": "Soldering", "count": 150, "mttf": 180, "mean_repair_time": 14},
                    {"name": "Welding", "count": 100, "mttf": 60, "mean_repair_time": 20},
                ],
                "adjusters": [
                    {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe", "Turning"]},
                    {"id": 2, "name": "Adjuster 2", "expertise": ["Drilling", "Soldering"]},
                    {"id": 3, "name": "Adjuster 3", "expertise": ["Welding", "Lathe"]},
                    {"id": 4, "name": "Adjuster 4", "expertise": ["Turning", "Drilling", "Soldering"]},
                    {"id": 5, "name": "Adjuster 5", "expertise": ["Lathe", "Turning", "Welding"]},
                ],
            },
        ]
    }
