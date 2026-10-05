"""
Optimization REST endpoints for FactoryServSim.

Provides:
- POST /api/simulation/optimize — Run staffing optimization to find optimum adjuster count

INTEGRATION POINTS:
- Person 2 (Services): optimizer.run_optimization() for actual parameter sweep
- Person 1 (Core Engine): simulator used internally by Person 2's optimizer
"""

import logging
from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas.payload import (
    FactoryConfigInput,
    OptimizationResultOutput,
    TradeoffPoint,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/simulation", tags=["optimizer"])


def _try_import_optimizer():
    """
    Attempt to import Person 2's staffing optimizer.
    Returns the optimization function or None if not available yet.
    """
    try:
        from app.services.optimizer import run_optimization as _run_opt
        return _run_opt
    except ImportError:
        return None


def _generate_mock_optimization_result(
    payload: FactoryConfigInput,
) -> OptimizationResultOutput:
    """
    Generate optimization results based on queueing theory.

    The steady-state repair demand (offered load) is:
        rho = sum( count_i * mean_repair_time_i / mttf_i )  for each category i

    This gives the minimum number of adjusters needed to keep up with failures.
    The optimum adds a small buffer so adjusters aren't pegged at 100% and
    machines don't wait too long in the queue.
    """
    import math

    total_machines = sum(cat.count for cat in payload.machine_categories)

    # Offered load: average number of concurrent repairs needed at steady state
    rho = sum(
        cat.count * cat.mean_repair_time / cat.mttf
        for cat in payload.machine_categories
    )

    # Minimum adjusters to keep up (must be > rho for a stable queue)
    min_adjusters = max(1, math.ceil(rho))

    # Sweep from 1 to a reasonable upper bound
    max_adjusters = max(min_adjusters + 6, min_adjusters * 3, 10)
    max_adjusters = min(max_adjusters, total_machines)  # cap at total machines

    tradeoff_curve: List[TradeoffPoint] = []
    best_score = -1.0
    optimum_count = min_adjusters

    for count in range(1, max_adjusters + 1):
        # Machine utilization: fraction of time machines are working
        # With `count` adjusters and load `rho`:
        #   if count <= rho, queue grows unbounded -> utilization approaches (count/rho) * (mttf/(mttf+repair))
        #   if count > rho, steady state is stable
        if count >= rho and rho > 0:
            # Probability a machine is down ~ rho * mean_repair / (count * mttf) scaled
            # Approximate: fraction of machines being repaired at any time = rho / total_machines
            # With enough adjusters, wait time drops, so effective downtime ~ repair_time only
            avg_repair = sum(cat.count * cat.mean_repair_time for cat in payload.machine_categories) / total_machines if total_machines > 0 else 1
            avg_mttf = sum(cat.count * cat.mttf for cat in payload.machine_categories) / total_machines if total_machines > 0 else 100
            # Wait factor: when adjusters == rho, wait is high; as adjusters >> rho, wait -> 0
            excess = count - rho
            wait_factor = rho / (excess + rho) if (excess + rho) > 0 else 1.0  # fraction of repair time spent waiting
            effective_downtime = avg_repair * (1 + wait_factor)
            machine_util = min(99.5, (avg_mttf / (avg_mttf + effective_downtime)) * 100)
        elif rho > 0:
            # Understaffed: queue grows, utilization degrades significantly
            machine_util = min(95.0, max(10.0, (count / rho) * 80.0))
        else:
            machine_util = 99.5  # no failures expected

        # Adjuster utilization: what fraction of time adjusters are busy
        if count > 0:
            adjuster_util = min(99.0, max(5.0, (rho / count) * 100))
        else:
            adjuster_util = 0.0

        tradeoff_curve.append(
            TradeoffPoint(
                adjuster_count=count,
                machine_utilization=round(machine_util, 1),
                adjuster_utilization=round(adjuster_util, 1),
            )
        )

        # Elbow heuristic: maximize machine uptime without wasting adjuster time
        # We want machine_util high but adjuster_util not too low
        score = machine_util * 0.7 + adjuster_util * 0.3
        if score > best_score:
            best_score = score
            optimum_count = count

    # Build recommendation reason
    opt_point = next(
        (pt for pt in tradeoff_curve if pt.adjuster_count == optimum_count), None
    )
    next_points = [pt for pt in tradeoff_curve if pt.adjuster_count > optimum_count]

    if opt_point and next_points:
        next_pt = next_points[0]
        gain = round(next_pt.machine_utilization - opt_point.machine_utilization, 1)
        reason = (
            f"{optimum_count} adjusters provides {opt_point.machine_utilization}% machine uptime. "
            f"Adding {next_pt.adjuster_count - optimum_count} more adjusters yields only "
            f"+{gain}% uptime at {next_pt.adjuster_utilization}% worker utilization."
        )
    else:
        reason = (
            f"{optimum_count} adjusters provides the best balance of machine uptime "
            f"and adjuster utilization for this factory configuration."
        )

    # Calculate per-category adjuster distribution
    # Distribute optimum adjusters proportionally based on machine count * failure rate
    total_weight = sum(cat.count / cat.mttf for cat in payload.machine_categories)
    per_category = {}
    allocated = 0
    sorted_cats = sorted(
        payload.machine_categories,
        key=lambda c: c.count / c.mttf,
        reverse=True,
    )
    for i, cat in enumerate(sorted_cats):
        weight = (cat.count / cat.mttf) / total_weight if total_weight > 0 else 1.0 / len(sorted_cats)
        if i == len(sorted_cats) - 1:
            # Last category gets the remainder
            per_category[cat.name] = max(1, optimum_count - allocated)
        else:
            count = max(1, round(optimum_count * weight))
            per_category[cat.name] = count
            allocated += count

    # Calculate per-adjuster distribution across the provided adjuster types/profiles
    per_adjuster = {}
    if payload.adjusters:
        num_profiles = len(payload.adjusters)
        # Compute how many machines each adjuster profile is qualified to service
        profile_workloads = {}
        for adj in payload.adjusters:
            workload = sum(
                (cat.count / cat.mttf)
                for cat in payload.machine_categories
                if cat.name in adj.expertise
            )
            profile_workloads[adj.name] = max(workload, 0.1)

        total_workload = sum(profile_workloads.values())
        adj_allocated = 0
        sorted_profiles = sorted(
            payload.adjusters,
            key=lambda a: profile_workloads[a.name],
            reverse=True,
        )

        for j, adj in enumerate(sorted_profiles):
            if j == num_profiles - 1:
                # Last adjuster profile gets the exact remainder to ensure sum equals optimum_count
                remainder = max(1, optimum_count - adj_allocated)
                per_adjuster[adj.name] = remainder
            else:
                share = profile_workloads[adj.name] / total_workload
                alloc = max(1, round(optimum_count * share))
                # Don't exceed total minus remaining slots
                max_allowed = optimum_count - adj_allocated - (num_profiles - 1 - j)
                alloc = min(alloc, max(1, max_allowed))
                per_adjuster[adj.name] = alloc
                adj_allocated += alloc

    return OptimizationResultOutput(
        optimum_adjuster_count=optimum_count,
        tradeoff_curve=tradeoff_curve,
        recommendation_reason=reason,
        per_category_adjusters=per_category,
        per_adjuster_counts=per_adjuster if per_adjuster else None,
    )


@router.post("/optimize", response_model=OptimizationResultOutput)
async def optimize_staffing(
    payload: FactoryConfigInput,
) -> OptimizationResultOutput:
    """
    Run staffing optimization to determine the optimum number of adjusters.

    Simulates across different adjuster counts and calculates the 'elbow point'
    where machine downtime cost balances adjuster idle time.

    Validates adjuster business rules:
    - Adjuster names must be unique
    - No two adjusters can have the exact same expertise set

    Integration: Delegates to Person 2's optimizer when available,
    otherwise returns intelligent mock tradeoff data.
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
        "Optimization requested: sim_time=%d, categories=%d, adjusters=%d",
        payload.simulation_time,
        len(payload.machine_categories),
        len(payload.adjusters),
    )

    # Try to use the real optimizer (Person 2)
    run_opt = _try_import_optimizer()
    if run_opt is not None:
        try:
            result = run_opt(payload)
            logger.info(
                "Optimization completed: optimum=%d adjusters",
                result.optimum_adjuster_count,
            )
            # If real engine result doesn't have per-category or per-adjuster breakdown, generate it
            mock_supplement = _generate_mock_optimization_result(payload)
            return OptimizationResultOutput(
                optimum_adjuster_count=result.optimum_adjuster_count,
                tradeoff_curve=result.tradeoff_curve,
                recommendation_reason=result.recommendation_reason,
                per_category_adjusters=getattr(result, "per_category_adjusters", None) or mock_supplement.per_category_adjusters,
                per_adjuster_counts=getattr(result, "per_adjuster_counts", None) or mock_supplement.per_adjuster_counts,
            )
        except Exception as e:
            logger.error("Optimizer engine error: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Optimization engine error: {str(e)}",
            )

    # Fallback to mock data when optimizer is not yet available
    logger.info("Optimizer not available, returning mock optimization results")
    return _generate_mock_optimization_result(payload)
