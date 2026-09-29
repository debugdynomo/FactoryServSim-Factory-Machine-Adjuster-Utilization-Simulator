"""
Staffing Optimizer — Automated Adjuster Count Optimization

Performs an automated parameter sweep over different adjuster counts
to find the optimum staffing level that balances:
    - Machine downtime cost (want high machine utilization)
    - Adjuster idle time (want high adjuster utilization)

The optimizer finds the "elbow point" where adding more adjusters
yields diminishing returns on machine utilization.

Output follows the API contract from guide.md:
{
    "optimum_adjuster_count": N,
    "tradeoff_curve": [...],
    "recommendation_reason": "..."
}

Author: Person 2 (Kiran)
Module: backend/app/services/optimizer.py
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from .monte_carlo import MonteCarloRunner, SimulationConfig


@dataclass
class TradeoffPoint:
    """A single point on the adjuster count tradeoff curve.

    Attributes:
        adjuster_count: Number of adjusters used.
        machine_utilization: Mean machine utilization percentage.
        adjuster_utilization: Mean adjuster utilization percentage.
        avg_queue_wait_time: Mean queue wait time.
        ci_machine_utilization: 95% CI for machine utilization.
        ci_adjuster_utilization: 95% CI for adjuster utilization.
    """

    adjuster_count: int
    machine_utilization: float
    adjuster_utilization: float
    avg_queue_wait_time: float = 0.0
    ci_machine_utilization: tuple[float, float] = (0.0, 0.0)
    ci_adjuster_utilization: tuple[float, float] = (0.0, 0.0)


@dataclass
class OptimizationResult:
    """Complete optimization result matching the API contract.

    Attributes:
        optimum_adjuster_count: Recommended number of adjusters.
        tradeoff_curve: List of tradeoff points across adjuster counts.
        recommendation_reason: Human-readable explanation.
    """

    optimum_adjuster_count: int
    tradeoff_curve: list[dict[str, Any]]
    recommendation_reason: str


class StaffingOptimizer:
    """Automated parameter sweep to determine optimal adjuster staffing.

    Runs simulations across a range of adjuster counts and identifies
    the optimum point using an elbow detection algorithm.

    The optimizer considers:
    1. Machine utilization (higher is better for productivity)
    2. Adjuster utilization (higher is better for cost efficiency)
    3. The marginal gain of adding more adjusters

    Attributes:
        min_adjusters: Minimum number of adjusters to test.
        max_adjusters: Maximum number of adjusters to test.
        step: Step size for adjuster count sweep.
        monte_carlo_runs: Number of MC replications per configuration.
        base_seed: Base random seed for reproducibility.
        utilization_threshold: Target machine utilization percentage.
        marginal_gain_threshold: Minimum improvement in machine utilization
            (percentage points) to justify adding more adjusters.
    """

    def __init__(
        self,
        min_adjusters: int = 1,
        max_adjusters: Optional[int] = None,
        step: int = 1,
        monte_carlo_runs: int = 5,
        base_seed: Optional[int] = None,
        utilization_threshold: float = 90.0,
        marginal_gain_threshold: float = 2.0,
    ) -> None:
        """Initialize the staffing optimizer.

        Args:
            min_adjusters: Minimum adjuster count to test (default 1).
            max_adjusters: Maximum adjuster count to test. If None,
                          auto-calculated as 2 × total machines / 10.
            step: Increment between adjuster counts (default 1).
            monte_carlo_runs: Number of replications per count (default 5).
            base_seed: Random seed for reproducibility.
            utilization_threshold: Target machine utilization (default 90%).
            marginal_gain_threshold: Minimum marginal improvement to add
                                     more adjusters (default 2.0 pp).

        Raises:
            ValueError: If parameters are invalid.
        """
        if min_adjusters < 1:
            raise ValueError(
                f"min_adjusters must be at least 1, got {min_adjusters}"
            )
        if step < 1:
            raise ValueError(f"step must be at least 1, got {step}")
        if monte_carlo_runs < 2:
            raise ValueError(
                f"monte_carlo_runs must be at least 2, got {monte_carlo_runs}"
            )
        if not (0.0 < utilization_threshold <= 100.0):
            raise ValueError(
                f"utilization_threshold must be in (0, 100], "
                f"got {utilization_threshold}"
            )

        self.min_adjusters = min_adjusters
        self.max_adjusters = max_adjusters
        self.step = step
        self.monte_carlo_runs = monte_carlo_runs
        self.base_seed = base_seed
        self.utilization_threshold = utilization_threshold
        self.marginal_gain_threshold = marginal_gain_threshold

    def optimize(
        self,
        simulation_time: float,
        machine_categories: list[dict[str, Any]],
        adjuster_expertise_template: Optional[list[list[str]]] = None,
    ) -> OptimizationResult:
        """Run the optimization sweep and find the optimal adjuster count.

        Simulates across different adjuster counts and identifies the
        elbow point where marginal returns diminish.

        Args:
            simulation_time: Total simulation time units.
            machine_categories: List of machine category configurations
                               (name, count, mttf, mean_repair_time).
            adjuster_expertise_template: Optional list of expertise lists.
                If provided, adjusters are created cycling through these
                templates. If None, all adjusters are generalists.

        Returns:
            OptimizationResult with optimum count, tradeoff curve,
            and recommendation reason.
        """
        total_machines = sum(cat["count"] for cat in machine_categories)
        category_names = [cat["name"] for cat in machine_categories]

        # Determine max adjusters if not specified
        max_adj = self.max_adjusters
        if max_adj is None:
            # Heuristic: at most 1 adjuster per 5 machines, minimum 10
            max_adj = max(10, total_machines // 5)

        # Ensure min doesn't exceed max
        max_adj = max(max_adj, self.min_adjusters + self.step)

        # Build the adjuster count range
        adjuster_counts = list(range(self.min_adjusters, max_adj + 1, self.step))

        # Ensure we have at least 3 data points for meaningful analysis
        if len(adjuster_counts) < 3:
            adjuster_counts = list(range(self.min_adjusters, max_adj + 1))

        tradeoff_points: list[TradeoffPoint] = []

        for count in adjuster_counts:
            # Create adjusters for this count
            adjusters = self._create_adjusters(
                count, category_names, adjuster_expertise_template
            )

            config = SimulationConfig(
                simulation_time=simulation_time,
                machine_categories=machine_categories,
                adjusters=adjusters,
            )

            runner = MonteCarloRunner(
                num_runs=self.monte_carlo_runs, base_seed=self.base_seed
            )
            result = runner.run(config)

            point = TradeoffPoint(
                adjuster_count=count,
                machine_utilization=result.mean_machine_utilization_pct,
                adjuster_utilization=result.mean_adjuster_utilization_pct,
                avg_queue_wait_time=result.mean_queue_wait_time,
                ci_machine_utilization=result.ci_machine_utilization,
                ci_adjuster_utilization=result.ci_adjuster_utilization,
            )
            tradeoff_points.append(point)

        # Find the optimum
        optimum = self._find_elbow_point(tradeoff_points)
        reason = self._generate_recommendation(tradeoff_points, optimum)

        # Build API-contract-compatible output
        tradeoff_curve = [
            {
                "adjuster_count": p.adjuster_count,
                "machine_utilization": p.machine_utilization,
                "adjuster_utilization": p.adjuster_utilization,
            }
            for p in tradeoff_points
        ]

        return OptimizationResult(
            optimum_adjuster_count=optimum,
            tradeoff_curve=tradeoff_curve,
            recommendation_reason=reason,
        )

    def _create_adjusters(
        self,
        count: int,
        category_names: list[str],
        expertise_template: Optional[list[list[str]]] = None,
    ) -> list[dict[str, Any]]:
        """Create a list of adjuster configurations.

        Args:
            count: Number of adjusters to create.
            category_names: Available machine category names.
            expertise_template: Optional expertise template to cycle through.

        Returns:
            List of adjuster configuration dictionaries.
        """
        adjusters: list[dict[str, Any]] = []

        for i in range(count):
            if expertise_template:
                # Cycle through the expertise templates
                expertise = expertise_template[i % len(expertise_template)]
            else:
                # Default: generalist adjusters (can handle all categories)
                expertise = category_names.copy()

            adjusters.append(
                {
                    "id": i + 1,
                    "name": f"Adjuster {i + 1}",
                    "expertise": expertise,
                }
            )

        return adjusters

    def _find_elbow_point(self, points: list[TradeoffPoint]) -> int:
        """Find the elbow point in the utilization curve.

        Uses a multi-criteria approach:
        1. First check if any point exceeds the utilization threshold
           with acceptable marginal gain loss.
        2. Compute marginal gains and find where they drop below
           the marginal gain threshold.
        3. If no clear elbow, use the maximum curvature method.

        Args:
            points: Sorted list of tradeoff points.

        Returns:
            Optimum adjuster count.
        """
        if not points:
            return 1

        if len(points) == 1:
            return points[0].adjuster_count

        # Method 1: Find first point meeting utilization threshold
        # where the next point's marginal gain is below threshold
        for i, point in enumerate(points):
            if point.machine_utilization >= self.utilization_threshold:
                return point.adjuster_count

        # Method 2: Find where marginal gains drop below threshold
        for i in range(1, len(points)):
            marginal_gain = (
                points[i].machine_utilization - points[i - 1].machine_utilization
            )
            step_size = points[i].adjuster_count - points[i - 1].adjuster_count
            gain_per_adjuster = marginal_gain / step_size if step_size > 0 else 0

            if gain_per_adjuster < self.marginal_gain_threshold:
                return points[i - 1].adjuster_count

        # Method 3: Maximum curvature (elbow detection)
        # Use the point with maximum second derivative magnitude
        if len(points) >= 3:
            max_curvature = 0.0
            elbow_idx = len(points) // 2  # Default to middle

            for i in range(1, len(points) - 1):
                # Second difference (discrete approximation of second derivative)
                d2 = (
                    points[i + 1].machine_utilization
                    - 2 * points[i].machine_utilization
                    + points[i - 1].machine_utilization
                )
                curvature = abs(d2)
                if curvature > max_curvature:
                    max_curvature = curvature
                    elbow_idx = i

            return points[elbow_idx].adjuster_count

        # Fallback: return the last point
        return points[-1].adjuster_count

    def _generate_recommendation(
        self, points: list[TradeoffPoint], optimum: int
    ) -> str:
        """Generate a human-readable recommendation string.

        Follows the format from guide.md:
        "N adjusters provides X% machine uptime. Adding M more adjusters
         yields only +Y% uptime at Z% worker utilization."

        Args:
            points: List of tradeoff points.
            optimum: The determined optimum adjuster count.

        Returns:
            Human-readable recommendation string.
        """
        # Find the optimum point
        opt_point = None
        opt_idx = -1
        for i, p in enumerate(points):
            if p.adjuster_count == optimum:
                opt_point = p
                opt_idx = i
                break

        if opt_point is None:
            return (
                f"Recommended {optimum} adjusters based on analysis of "
                f"{len(points)} configurations."
            )

        reason = (
            f"{optimum} adjusters provides {opt_point.machine_utilization:.1f}% "
            f"machine uptime"
        )

        # Compare with the next point if available
        if opt_idx + 1 < len(points):
            next_point = points[opt_idx + 1]
            extra_adjusters = next_point.adjuster_count - optimum
            extra_util = next_point.machine_utilization - opt_point.machine_utilization
            reason += (
                f". Adding {extra_adjusters} more adjuster"
                f"{'s' if extra_adjusters > 1 else ''} yields only "
                f"+{extra_util:.1f}% uptime at "
                f"{next_point.adjuster_utilization:.1f}% worker utilization."
            )
        else:
            reason += (
                f" with {opt_point.adjuster_utilization:.1f}% adjuster utilization."
            )

        return reason

    def optimize_from_request(
        self,
        config: dict[str, Any],
        min_adjusters: Optional[int] = None,
        max_adjusters: Optional[int] = None,
    ) -> dict[str, Any]:
        """Convenience method to run optimization from an API request dict.

        Accepts a configuration dict matching the API contract and returns
        a result dict matching the OptimizationResultOutput schema.

        Args:
            config: Configuration dict with simulation_time,
                   machine_categories, and adjusters.
            min_adjusters: Override for minimum adjuster count.
            max_adjusters: Override for maximum adjuster count.

        Returns:
            Dict matching the API optimization result contract.
        """
        if min_adjusters is not None:
            self.min_adjusters = min_adjusters
        if max_adjusters is not None:
            self.max_adjusters = max_adjusters

        # Extract expertise template from provided adjusters if available
        expertise_template = None
        if "adjusters" in config and config["adjusters"]:
            expertise_template = [
                adj.get("expertise", []) for adj in config["adjusters"]
            ]

        result = self.optimize(
            simulation_time=config["simulation_time"],
            machine_categories=config["machine_categories"],
            adjuster_expertise_template=expertise_template,
        )

        return {
            "optimum_adjuster_count": result.optimum_adjuster_count,
            "tradeoff_curve": result.tradeoff_curve,
            "recommendation_reason": result.recommendation_reason,
        }
