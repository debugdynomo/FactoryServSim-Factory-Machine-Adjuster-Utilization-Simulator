"""
Monte Carlo Multi-Run Engine — Statistical Aggregation Across Seeds

Runs the simulation engine multiple times with different random seeds
and computes statistical means and confidence intervals for key metrics.

This module serves as a bridge between the simulation engine (Person 1)
and the optimizer (Person 2). It accepts simulation configuration,
runs N independent replications, and returns aggregated statistics.

Integration Point:
    - Depends on Person 1's simulator (backend/app/core/simulator.py)
    - When Person 1's simulator is available, the `_run_single_simulation`
      method should be updated to use it directly.
    - Currently provides a self-contained simulation fallback for
      independent testing and development.

Author: Person 2 (Kiran)
Module: backend/app/services/monte_carlo.py
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from typing import Any, Optional

from .failure_model import FailureModel
from .repair_model import RepairModel


@dataclass
class SimulationConfig:
    """Configuration for a single simulation run.

    Attributes:
        simulation_time: Total simulation time units.
        machine_categories: List of dicts with keys:
            name, count, mttf, mean_repair_time.
        adjusters: List of dicts with keys:
            id, name, expertise (list of category names).
    """

    simulation_time: float
    machine_categories: list[dict[str, Any]]
    adjusters: list[dict[str, Any]]


@dataclass
class RunResult:
    """Results from a single simulation run.

    Attributes:
        overall_machine_utilization_pct: Percentage of time machines
            were running (vs. waiting/under repair).
        overall_adjuster_utilization_pct: Percentage of time adjusters
            were busy (vs. idle).
        avg_queue_wait_time: Average time machines spent waiting for
            an adjuster in the queue.
        total_failures_handled: Total number of failures processed.
        category_metrics: Per-category utilization breakdowns.
        adjuster_metrics: Per-adjuster utilization breakdowns.
    """

    overall_machine_utilization_pct: float
    overall_adjuster_utilization_pct: float
    avg_queue_wait_time: float
    total_failures_handled: int
    category_metrics: list[dict[str, Any]]
    adjuster_metrics: list[dict[str, Any]]


@dataclass
class AggregatedResult:
    """Aggregated results from multiple Monte Carlo simulation runs.

    Attributes:
        num_runs: Number of simulation runs aggregated.
        mean_machine_utilization_pct: Mean machine utilization across runs.
        mean_adjuster_utilization_pct: Mean adjuster utilization across runs.
        mean_queue_wait_time: Mean queue wait time across runs.
        mean_total_failures: Mean total failures across runs.
        ci_machine_utilization: 95% confidence interval (lower, upper).
        ci_adjuster_utilization: 95% confidence interval (lower, upper).
        ci_queue_wait_time: 95% confidence interval (lower, upper).
        category_metrics: Averaged per-category metrics.
        adjuster_metrics: Averaged per-adjuster metrics.
        individual_runs: Results of each individual run.
    """

    num_runs: int
    mean_machine_utilization_pct: float
    mean_adjuster_utilization_pct: float
    mean_queue_wait_time: float
    mean_total_failures: float
    ci_machine_utilization: tuple[float, float]
    ci_adjuster_utilization: tuple[float, float]
    ci_queue_wait_time: tuple[float, float]
    category_metrics: list[dict[str, Any]]
    adjuster_metrics: list[dict[str, Any]]
    individual_runs: list[RunResult] = field(default_factory=list)


class MonteCarloRunner:
    """Runs multiple simulation replications and aggregates statistics.

    Uses different random seeds per run to capture stochastic variability
    and computes means and 95% confidence intervals.

    Attributes:
        num_runs: Number of replications to execute.
        base_seed: Base seed for generating per-run seeds.
    """

    def __init__(self, num_runs: int = 10, base_seed: Optional[int] = None) -> None:
        """Initialize the Monte Carlo runner.

        Args:
            num_runs: Number of simulation replications. Must be >= 2
                     for confidence interval computation.
            base_seed: Base seed for reproducibility. If None, results
                      will vary between executions.

        Raises:
            ValueError: If num_runs is less than 2.
        """
        if num_runs < 2:
            raise ValueError(
                f"Number of runs must be at least 2 for CI computation, got {num_runs}"
            )
        self.num_runs = num_runs
        self.base_seed = base_seed

    def run(self, config: SimulationConfig) -> AggregatedResult:
        """Execute multiple simulation runs and aggregate results.

        Args:
            config: The simulation configuration to run.

        Returns:
            Aggregated results with means and confidence intervals.
        """
        results: list[RunResult] = []

        for i in range(self.num_runs):
            seed = (self.base_seed + i) if self.base_seed is not None else None
            result = self._run_single_simulation(config, seed)
            results.append(result)

        return self._aggregate_results(results)

    def _run_single_simulation(
        self, config: SimulationConfig, seed: Optional[int] = None
    ) -> RunResult:
        """Run a single simulation replication.

        Integration Point:
            This method should be replaced/updated to call Person 1's
            simulator.run() when it becomes available. Currently uses
            a self-contained discrete-event simulation for independent
            development and testing.

        Args:
            config: The simulation configuration.
            seed: Random seed for this particular run.

        Returns:
            Results from a single simulation run.
        """
        # Try to import Person 1's simulator
        try:
            from ..core.simulator import Simulator  # type: ignore[import]

            # If available, use Person 1's simulator
            sim = Simulator(config=config, seed=seed)
            return sim.run()
        except (ImportError, AttributeError):
            # Fallback: self-contained simulation for independent development
            return self._fallback_simulation(config, seed)

    def _fallback_simulation(
        self, config: SimulationConfig, seed: Optional[int] = None
    ) -> RunResult:
        """Self-contained DES fallback when Person 1's engine is unavailable.

        Implements a simplified discrete-event simulation that follows
        the same logic described in the project spec:
        - Machines fail according to U(0, 2 × MTTF)
        - Repairs take U(0.5 × mean_repair, 1.5 × mean_repair)
        - Single-queue invariant: either machine queue OR adjuster queue
          is non-empty, never both

        Args:
            config: The simulation configuration.
            seed: Random seed for reproducibility.

        Returns:
            Results from the simulation run.
        """
        import heapq

        failure_model = FailureModel(seed=seed)
        repair_seed = (seed * 31 + 7) if seed is not None else None
        repair_model = RepairModel(seed=repair_seed)

        sim_time = config.simulation_time
        num_adjusters = len(config.adjusters)

        # Build machine list with category info
        machines: list[dict[str, Any]] = []
        machine_id = 0
        for cat in config.machine_categories:
            for _ in range(cat["count"]):
                machines.append(
                    {
                        "id": machine_id,
                        "category": cat["name"],
                        "mttf": cat["mttf"],
                        "mean_repair_time": cat["mean_repair_time"],
                        "running_time": 0.0,
                        "wait_time": 0.0,
                        "repair_time": 0.0,
                        "failures": 0,
                    }
                )
                machine_id += 1

        # Initialize adjuster tracking
        adjuster_busy_time: list[float] = [0.0] * num_adjusters
        adjuster_repairs: list[int] = [0] * num_adjusters
        adjuster_available_at: list[float] = [0.0] * num_adjusters

        # Build expertise mapping: adjuster index -> set of categories
        adjuster_expertise: list[set[str]] = []
        for adj in config.adjusters:
            adjuster_expertise.append(set(adj.get("expertise", [])))

        # Event types
        FAILURE_EVENT = 0
        REPAIR_COMPLETE_EVENT = 1

        # Event queue: (time, event_type, machine_index, adjuster_index_or_-1)
        event_queue: list[tuple[float, int, int, int]] = []

        # Schedule initial failure for each machine
        for i, m in enumerate(machines):
            fail_time = failure_model.generate_failure_time(m["mttf"])
            if fail_time < sim_time:
                heapq.heappush(event_queue, (fail_time, FAILURE_EVENT, i, -1))

        # Queues for single-queue invariant
        machine_wait_queue: list[tuple[float, int]] = []  # (arrival_time, machine_idx)
        idle_adjusters: list[int] = list(range(num_adjusters))

        current_time = 0.0

        # Track machine states for utilization
        machine_last_state_change: list[float] = [0.0] * len(machines)
        machine_state: list[str] = ["RUNNING"] * len(machines)

        def find_eligible_adjuster(
            category: str, idle_list: list[int]
        ) -> Optional[int]:
            """Find an idle adjuster with expertise for the given category."""
            # First try to find one with matching expertise
            for idx in idle_list:
                if not adjuster_expertise[idx] or category in adjuster_expertise[idx]:
                    return idx
            # If no expertise match found, return any idle adjuster
            # (adjusters may be generalists with empty expertise sets)
            return idle_list[0] if idle_list else None

        while event_queue:
            time, event_type, machine_idx, adj_idx = heapq.heappop(event_queue)

            if time > sim_time:
                break

            elapsed = time - current_time
            current_time = time

            if event_type == FAILURE_EVENT:
                m = machines[machine_idx]

                # Record running time since last state change
                state_duration = time - machine_last_state_change[machine_idx]
                if machine_state[machine_idx] == "RUNNING":
                    m["running_time"] += state_duration

                m["failures"] += 1
                machine_state[machine_idx] = "WAITING"
                machine_last_state_change[machine_idx] = time

                # Try to assign an adjuster immediately
                eligible = find_eligible_adjuster(m["category"], idle_adjusters)
                if eligible is not None:
                    idle_adjusters.remove(eligible)
                    machine_state[machine_idx] = "UNDER_REPAIR"
                    machine_last_state_change[machine_idx] = time

                    repair_time = repair_model.generate_repair_time(
                        m["mean_repair_time"]
                    )
                    repair_end = time + repair_time
                    if repair_end <= sim_time:
                        heapq.heappush(
                            event_queue,
                            (repair_end, REPAIR_COMPLETE_EVENT, machine_idx, eligible),
                        )
                    else:
                        # Repair extends beyond sim_time
                        m["repair_time"] += sim_time - time
                        adjuster_busy_time[eligible] += sim_time - time
                else:
                    # No adjuster available — add to machine wait queue
                    machine_wait_queue.append((time, machine_idx))

            elif event_type == REPAIR_COMPLETE_EVENT:
                m = machines[machine_idx]

                # Record repair time
                state_duration = time - machine_last_state_change[machine_idx]
                m["repair_time"] += state_duration
                adjuster_busy_time[adj_idx] += state_duration
                adjuster_repairs[adj_idx] += 1

                # Machine returns to RUNNING
                machine_state[machine_idx] = "RUNNING"
                machine_last_state_change[machine_idx] = time

                # Schedule next failure
                next_fail = time + failure_model.generate_failure_time(m["mttf"])
                if next_fail <= sim_time:
                    heapq.heappush(
                        event_queue, (next_fail, FAILURE_EVENT, machine_idx, -1)
                    )

                # Check if any machines are waiting in queue
                if machine_wait_queue:
                    # Find a waiting machine this adjuster can handle
                    assigned = False
                    for q_idx, (arrival, waiting_m_idx) in enumerate(
                        machine_wait_queue
                    ):
                        wm = machines[waiting_m_idx]
                        if (
                            not adjuster_expertise[adj_idx]
                            or wm["category"] in adjuster_expertise[adj_idx]
                        ):
                            # Assign this adjuster to the waiting machine
                            machine_wait_queue.pop(q_idx)
                            wm["wait_time"] += time - arrival
                            machine_state[waiting_m_idx] = "UNDER_REPAIR"
                            machine_last_state_change[waiting_m_idx] = time

                            repair_time = repair_model.generate_repair_time(
                                wm["mean_repair_time"]
                            )
                            repair_end = time + repair_time
                            if repair_end <= sim_time:
                                heapq.heappush(
                                    event_queue,
                                    (
                                        repair_end,
                                        REPAIR_COMPLETE_EVENT,
                                        waiting_m_idx,
                                        adj_idx,
                                    ),
                                )
                            else:
                                wm["repair_time"] += sim_time - time
                                adjuster_busy_time[adj_idx] += sim_time - time
                            assigned = True
                            break

                    if not assigned:
                        # No matching machine in queue, adjuster goes idle
                        idle_adjusters.append(adj_idx)
                else:
                    # No waiting machines — adjuster becomes idle
                    idle_adjusters.append(adj_idx)

        # Finalize — account for time from last state change to sim end
        for i, m in enumerate(machines):
            remaining = sim_time - machine_last_state_change[i]
            if remaining > 0:
                if machine_state[i] == "RUNNING":
                    m["running_time"] += remaining
                elif machine_state[i] == "WAITING":
                    m["wait_time"] += remaining
                elif machine_state[i] == "UNDER_REPAIR":
                    m["repair_time"] += remaining

        # Calculate metrics
        total_machine_time = len(machines) * sim_time
        total_running = sum(m["running_time"] for m in machines)
        total_wait = sum(m["wait_time"] for m in machines)
        total_failures = sum(m["failures"] for m in machines)

        overall_machine_util = (
            (total_running / total_machine_time * 100.0) if total_machine_time > 0 else 0.0
        )

        total_adjuster_time = num_adjusters * sim_time
        total_busy = sum(adjuster_busy_time)
        overall_adjuster_util = (
            (total_busy / total_adjuster_time * 100.0) if total_adjuster_time > 0 else 0.0
        )

        num_machines_waited = sum(
            1 for m in machines if m["wait_time"] > 0 or m["failures"] > 0
        )
        avg_wait = (
            (total_wait / total_failures) if total_failures > 0 else 0.0
        )

        # Per-category metrics
        cat_metrics: dict[str, dict[str, Any]] = {}
        for m in machines:
            cat = m["category"]
            if cat not in cat_metrics:
                cat_metrics[cat] = {
                    "category": cat,
                    "total_running": 0.0,
                    "total_time": 0.0,
                    "total_failures": 0,
                }
            cat_metrics[cat]["total_running"] += m["running_time"]
            cat_metrics[cat]["total_time"] += sim_time
            cat_metrics[cat]["total_failures"] += m["failures"]

        category_metrics = [
            {
                "category": cm["category"],
                "utilization_pct": round(
                    cm["total_running"] / cm["total_time"] * 100.0, 2
                )
                if cm["total_time"] > 0
                else 0.0,
                "total_failures": cm["total_failures"],
            }
            for cm in cat_metrics.values()
        ]

        # Per-adjuster metrics
        adj_metrics = []
        for i, adj in enumerate(config.adjusters):
            busy_pct = (
                (adjuster_busy_time[i] / sim_time * 100.0) if sim_time > 0 else 0.0
            )
            adj_metrics.append(
                {
                    "id": adj["id"],
                    "name": adj["name"],
                    "busy_time_pct": round(busy_pct, 2),
                    "repairs_completed": adjuster_repairs[i],
                }
            )

        return RunResult(
            overall_machine_utilization_pct=round(overall_machine_util, 2),
            overall_adjuster_utilization_pct=round(overall_adjuster_util, 2),
            avg_queue_wait_time=round(avg_wait, 4),
            total_failures_handled=total_failures,
            category_metrics=category_metrics,
            adjuster_metrics=adj_metrics,
        )

    def _aggregate_results(self, results: list[RunResult]) -> AggregatedResult:
        """Aggregate results from multiple simulation runs.

        Computes means and 95% confidence intervals using the
        t-distribution for small samples.

        Args:
            results: List of individual run results.

        Returns:
            Aggregated statistics with confidence intervals.
        """
        n = len(results)

        machine_utils = [r.overall_machine_utilization_pct for r in results]
        adjuster_utils = [r.overall_adjuster_utilization_pct for r in results]
        wait_times = [r.avg_queue_wait_time for r in results]
        total_failures = [r.total_failures_handled for r in results]

        mean_mu = statistics.mean(machine_utils)
        mean_au = statistics.mean(adjuster_utils)
        mean_wt = statistics.mean(wait_times)
        mean_tf = statistics.mean(total_failures)

        ci_mu = self._compute_confidence_interval(machine_utils)
        ci_au = self._compute_confidence_interval(adjuster_utils)
        ci_wt = self._compute_confidence_interval(wait_times)

        # Aggregate category metrics (average across runs)
        category_metrics = self._aggregate_category_metrics(results)
        adjuster_metrics = self._aggregate_adjuster_metrics(results)

        return AggregatedResult(
            num_runs=n,
            mean_machine_utilization_pct=round(mean_mu, 2),
            mean_adjuster_utilization_pct=round(mean_au, 2),
            mean_queue_wait_time=round(mean_wt, 4),
            mean_total_failures=round(mean_tf, 2),
            ci_machine_utilization=(round(ci_mu[0], 2), round(ci_mu[1], 2)),
            ci_adjuster_utilization=(round(ci_au[0], 2), round(ci_au[1], 2)),
            ci_queue_wait_time=(round(ci_wt[0], 4), round(ci_wt[1], 4)),
            category_metrics=category_metrics,
            adjuster_metrics=adjuster_metrics,
            individual_runs=results,
        )

    @staticmethod
    def _compute_confidence_interval(
        data: list[float], confidence: float = 0.95
    ) -> tuple[float, float]:
        """Compute a confidence interval for the given data.

        Uses the t-distribution approximation. For large samples (n >= 30),
        this approaches the normal distribution z-interval.

        Args:
            data: Sample data points.
            confidence: Confidence level (default 0.95 for 95% CI).

        Returns:
            Tuple of (lower_bound, upper_bound).
        """
        n = len(data)
        if n < 2:
            mean = data[0] if data else 0.0
            return (mean, mean)

        mean = statistics.mean(data)
        stdev = statistics.stdev(data)
        stderr = stdev / math.sqrt(n)

        # t-critical value approximation for 95% CI
        # Using common t-values for small sample sizes
        t_critical_values = {
            2: 12.706,
            3: 4.303,
            4: 3.182,
            5: 2.776,
            6: 2.571,
            7: 2.447,
            8: 2.365,
            9: 2.306,
            10: 2.262,
            15: 2.145,
            20: 2.093,
            25: 2.064,
            30: 2.045,
        }

        # Find closest t-critical value
        if n in t_critical_values:
            t_crit = t_critical_values[n]
        elif n > 30:
            t_crit = 1.96  # Approximate with z for large samples
        else:
            # Linear interpolation between known values
            keys = sorted(t_critical_values.keys())
            lower_key = max(k for k in keys if k <= n)
            upper_key = min(k for k in keys if k >= n)
            if lower_key == upper_key:
                t_crit = t_critical_values[lower_key]
            else:
                fraction = (n - lower_key) / (upper_key - lower_key)
                t_crit = (
                    t_critical_values[lower_key]
                    + fraction
                    * (t_critical_values[upper_key] - t_critical_values[lower_key])
                )

        margin = t_crit * stderr
        return (mean - margin, mean + margin)

    @staticmethod
    def _aggregate_category_metrics(
        results: list[RunResult],
    ) -> list[dict[str, Any]]:
        """Average category metrics across runs.

        Args:
            results: List of individual run results.

        Returns:
            Averaged per-category metrics.
        """
        category_data: dict[str, list[dict[str, Any]]] = {}

        for result in results:
            for cm in result.category_metrics:
                cat = cm["category"]
                if cat not in category_data:
                    category_data[cat] = []
                category_data[cat].append(cm)

        averaged: list[dict[str, Any]] = []
        for cat, metrics_list in category_data.items():
            avg_util = statistics.mean(m["utilization_pct"] for m in metrics_list)
            avg_failures = statistics.mean(m["total_failures"] for m in metrics_list)
            averaged.append(
                {
                    "category": cat,
                    "utilization_pct": round(avg_util, 2),
                    "total_failures": round(avg_failures),
                }
            )

        return averaged

    @staticmethod
    def _aggregate_adjuster_metrics(
        results: list[RunResult],
    ) -> list[dict[str, Any]]:
        """Average adjuster metrics across runs.

        Args:
            results: List of individual run results.

        Returns:
            Averaged per-adjuster metrics.
        """
        adjuster_data: dict[int, list[dict[str, Any]]] = {}

        for result in results:
            for am in result.adjuster_metrics:
                adj_id = am["id"]
                if adj_id not in adjuster_data:
                    adjuster_data[adj_id] = []
                adjuster_data[adj_id].append(am)

        averaged: list[dict[str, Any]] = []
        for adj_id, metrics_list in sorted(adjuster_data.items()):
            avg_busy = statistics.mean(m["busy_time_pct"] for m in metrics_list)
            avg_repairs = statistics.mean(m["repairs_completed"] for m in metrics_list)
            name = metrics_list[0]["name"]
            averaged.append(
                {
                    "id": adj_id,
                    "name": name,
                    "busy_time_pct": round(avg_busy, 2),
                    "repairs_completed": round(avg_repairs),
                }
            )

        return averaged
