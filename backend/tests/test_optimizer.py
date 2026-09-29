"""
Tests for Person 2 — Stochastic Modeling, Failure Dynamics & Staffing Optimizer

Test coverage:
1. FailureModel: Distribution properties, parameter validation, reproducibility
2. RepairModel: Distribution properties, state transitions, parameter validation
3. MonteCarloRunner: Multi-run aggregation, confidence intervals, result structure
4. StaffingOptimizer: Convergence, elbow detection, API contract output

Author: Person 2 (Kiran)
Module: backend/tests/test_optimizer.py
"""

from __future__ import annotations

import math
import statistics
import sys
import os

import pytest

# Ensure backend is on the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.failure_model import FailureModel
from app.services.repair_model import RepairModel, MachineState, AdjusterState
from app.services.monte_carlo import (
    MonteCarloRunner,
    SimulationConfig,
    RunResult,
    AggregatedResult,
)
from app.services.optimizer import StaffingOptimizer, OptimizationResult, TradeoffPoint


# ═══════════════════════════════════════════════════════════════════════
# FailureModel Tests
# ═══════════════════════════════════════════════════════════════════════


class TestFailureModel:
    """Tests for the uniform MTTF failure time generator."""

    def test_generate_failure_time_positive(self) -> None:
        """All generated failure times must be non-negative."""
        model = FailureModel(seed=42)
        for _ in range(1000):
            t = model.generate_failure_time(mttf=100.0)
            assert t >= 0.0, f"Failure time must be >= 0, got {t}"

    def test_generate_failure_time_upper_bound(self) -> None:
        """Failure times must not exceed 2 × MTTF."""
        model = FailureModel(seed=42)
        mttf = 100.0
        for _ in range(1000):
            t = model.generate_failure_time(mttf=mttf)
            assert t <= 2.0 * mttf, f"Failure time must be <= {2 * mttf}, got {t}"

    def test_mean_converges_to_mttf(self) -> None:
        """Sample mean should converge to MTTF for large N."""
        model = FailureModel(seed=42)
        mttf = 100.0
        samples = model.generate_failure_times(mttf=mttf, count=10000)
        sample_mean = statistics.mean(samples)
        # Allow 5% tolerance
        assert abs(sample_mean - mttf) < mttf * 0.05, (
            f"Sample mean {sample_mean:.2f} should be close to MTTF {mttf}"
        )

    def test_variance_matches_theoretical(self) -> None:
        """Sample variance should approximate (2 × MTTF)² / 12."""
        model = FailureModel(seed=42)
        mttf = 100.0
        samples = model.generate_failure_times(mttf=mttf, count=10000)
        sample_var = statistics.variance(samples)
        expected_var = model.expected_variance(mttf)
        # Allow 10% tolerance for variance
        assert abs(sample_var - expected_var) < expected_var * 0.10, (
            f"Sample variance {sample_var:.2f} should be close to "
            f"theoretical {expected_var:.2f}"
        )

    def test_expected_mean_equals_mttf(self) -> None:
        """Theoretical expected mean should equal MTTF."""
        model = FailureModel()
        assert model.expected_mean(100.0) == 100.0
        assert model.expected_mean(50.0) == 50.0

    def test_expected_variance_formula(self) -> None:
        """Theoretical variance should be (2 × MTTF)² / 12."""
        model = FailureModel()
        mttf = 100.0
        expected = (2.0 * mttf) ** 2 / 12.0
        assert model.expected_variance(mttf) == expected

    def test_invalid_mttf_raises_error(self) -> None:
        """Negative or zero MTTF should raise ValueError."""
        model = FailureModel(seed=42)
        with pytest.raises(ValueError, match="MTTF must be positive"):
            model.generate_failure_time(mttf=0.0)
        with pytest.raises(ValueError, match="MTTF must be positive"):
            model.generate_failure_time(mttf=-10.0)

    def test_invalid_count_raises_error(self) -> None:
        """Negative or zero count should raise ValueError."""
        model = FailureModel(seed=42)
        with pytest.raises(ValueError, match="Count must be positive"):
            model.generate_failure_times(mttf=100.0, count=0)

    def test_reproducibility_with_seed(self) -> None:
        """Same seed should produce identical sequences."""
        model1 = FailureModel(seed=123)
        model2 = FailureModel(seed=123)
        samples1 = model1.generate_failure_times(mttf=100.0, count=100)
        samples2 = model2.generate_failure_times(mttf=100.0, count=100)
        assert samples1 == samples2, "Same seed must produce identical results"

    def test_different_seeds_produce_different_results(self) -> None:
        """Different seeds should produce different sequences."""
        model1 = FailureModel(seed=1)
        model2 = FailureModel(seed=2)
        samples1 = model1.generate_failure_times(mttf=100.0, count=100)
        samples2 = model2.generate_failure_times(mttf=100.0, count=100)
        assert samples1 != samples2, "Different seeds should produce different results"

    def test_reset_reproduces_results(self) -> None:
        """Resetting with same seed should reproduce the sequence."""
        model = FailureModel(seed=42)
        first_run = model.generate_failure_times(mttf=100.0, count=50)
        model.reset(seed=42)
        second_run = model.generate_failure_times(mttf=100.0, count=50)
        assert first_run == second_run, "Reset should reproduce the sequence"

    def test_different_mttf_values(self) -> None:
        """Different MTTF values should produce different distributions."""
        model = FailureModel(seed=42)
        samples_low = model.generate_failure_times(mttf=10.0, count=1000)
        model.reset(seed=42)
        samples_high = model.generate_failure_times(mttf=1000.0, count=1000)
        assert statistics.mean(samples_low) < statistics.mean(samples_high)


# ═══════════════════════════════════════════════════════════════════════
# RepairModel Tests
# ═══════════════════════════════════════════════════════════════════════


class TestRepairModel:
    """Tests for the repair duration generator and state transitions."""

    def test_repair_time_bounds(self) -> None:
        """Repair times must be within [0.5 × mean, 1.5 × mean]."""
        model = RepairModel(seed=42)
        mean_repair = 10.0
        for _ in range(1000):
            t = model.generate_repair_time(mean_repair)
            assert t >= 0.5 * mean_repair - 1e-10, (
                f"Repair time {t} below lower bound {0.5 * mean_repair}"
            )
            assert t <= 1.5 * mean_repair + 1e-10, (
                f"Repair time {t} above upper bound {1.5 * mean_repair}"
            )

    def test_repair_mean_converges(self) -> None:
        """Sample mean should converge to the mean repair time."""
        model = RepairModel(seed=42)
        mean_repair = 10.0
        samples = model.generate_repair_times(mean_repair, count=10000)
        sample_mean = statistics.mean(samples)
        assert abs(sample_mean - mean_repair) < mean_repair * 0.05, (
            f"Sample mean {sample_mean:.2f} should be close to {mean_repair}"
        )

    def test_repair_variance_matches_theoretical(self) -> None:
        """Sample variance should match (mean)² / 12."""
        model = RepairModel(seed=42)
        mean_repair = 10.0
        samples = model.generate_repair_times(mean_repair, count=10000)
        sample_var = statistics.variance(samples)
        expected_var = model.expected_variance(mean_repair)
        assert abs(sample_var - expected_var) < expected_var * 0.15, (
            f"Sample variance {sample_var:.2f} should be close to "
            f"theoretical {expected_var:.2f}"
        )

    def test_invalid_mean_repair_raises_error(self) -> None:
        """Negative or zero mean repair time should raise ValueError."""
        model = RepairModel(seed=42)
        with pytest.raises(ValueError, match="Mean repair time must be positive"):
            model.generate_repair_time(0.0)
        with pytest.raises(ValueError, match="Mean repair time must be positive"):
            model.generate_repair_time(-5.0)

    def test_machine_state_transitions(self) -> None:
        """Machine state transitions should follow the correct lifecycle."""
        assert (
            RepairModel.next_machine_state(MachineState.RUNNING)
            == MachineState.WAITING_FOR_REPAIR
        )
        assert (
            RepairModel.next_machine_state(MachineState.WAITING_FOR_REPAIR)
            == MachineState.UNDER_REPAIR
        )
        assert (
            RepairModel.next_machine_state(MachineState.UNDER_REPAIR)
            == MachineState.RUNNING
        )

    def test_adjuster_state_mapping(self) -> None:
        """Adjuster state should map correctly to repairing status."""
        assert (
            RepairModel.get_adjuster_state_for_repair(True) == AdjusterState.BUSY
        )
        assert (
            RepairModel.get_adjuster_state_for_repair(False) == AdjusterState.IDLE
        )

    def test_reproducibility_with_seed(self) -> None:
        """Same seed should produce identical repair times."""
        model1 = RepairModel(seed=99)
        model2 = RepairModel(seed=99)
        samples1 = model1.generate_repair_times(10.0, count=100)
        samples2 = model2.generate_repair_times(10.0, count=100)
        assert samples1 == samples2

    def test_machine_state_enum_values(self) -> None:
        """Machine state enum values should match expected strings."""
        assert MachineState.RUNNING.value == "RUNNING"
        assert MachineState.WAITING_FOR_REPAIR.value == "WAITING_FOR_REPAIR"
        assert MachineState.UNDER_REPAIR.value == "UNDER_REPAIR"

    def test_adjuster_state_enum_values(self) -> None:
        """Adjuster state enum values should match expected strings."""
        assert AdjusterState.IDLE.value == "IDLE"
        assert AdjusterState.BUSY.value == "BUSY"


# ═══════════════════════════════════════════════════════════════════════
# MonteCarloRunner Tests
# ═══════════════════════════════════════════════════════════════════════


class TestMonteCarloRunner:
    """Tests for the multi-run simulation aggregator."""

    @pytest.fixture
    def sample_config(self) -> SimulationConfig:
        """Create a sample simulation config for testing."""
        return SimulationConfig(
            simulation_time=1000,
            machine_categories=[
                {"name": "Lathe", "count": 20, "mttf": 100, "mean_repair_time": 10},
                {"name": "Drilling", "count": 10, "mttf": 80, "mean_repair_time": 8},
            ],
            adjusters=[
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe", "Drilling"]},
                {"id": 2, "name": "Adjuster 2", "expertise": ["Lathe"]},
                {"id": 3, "name": "Adjuster 3", "expertise": ["Drilling"]},
            ],
        )

    def test_minimum_runs_validation(self) -> None:
        """MonteCarloRunner requires at least 2 runs."""
        with pytest.raises(ValueError, match="at least 2"):
            MonteCarloRunner(num_runs=1)

    def test_aggregated_result_structure(self, sample_config: SimulationConfig) -> None:
        """Aggregated result should have all required fields."""
        runner = MonteCarloRunner(num_runs=3, base_seed=42)
        result = runner.run(sample_config)

        assert isinstance(result, AggregatedResult)
        assert result.num_runs == 3
        assert 0.0 <= result.mean_machine_utilization_pct <= 100.0
        assert 0.0 <= result.mean_adjuster_utilization_pct <= 100.0
        assert result.mean_queue_wait_time >= 0.0
        assert result.mean_total_failures >= 0.0

    def test_confidence_intervals_bracket_mean(
        self, sample_config: SimulationConfig
    ) -> None:
        """95% CI should bracket the sample mean."""
        runner = MonteCarloRunner(num_runs=5, base_seed=42)
        result = runner.run(sample_config)

        ci_lo, ci_hi = result.ci_machine_utilization
        assert ci_lo <= result.mean_machine_utilization_pct <= ci_hi

        ci_lo, ci_hi = result.ci_adjuster_utilization
        assert ci_lo <= result.mean_adjuster_utilization_pct <= ci_hi

        ci_lo, ci_hi = result.ci_queue_wait_time
        assert ci_lo <= result.mean_queue_wait_time <= ci_hi

    def test_individual_runs_stored(self, sample_config: SimulationConfig) -> None:
        """Individual run results should be available."""
        runner = MonteCarloRunner(num_runs=3, base_seed=42)
        result = runner.run(sample_config)

        assert len(result.individual_runs) == 3
        for run in result.individual_runs:
            assert isinstance(run, RunResult)

    def test_reproducibility(self, sample_config: SimulationConfig) -> None:
        """Same base_seed should produce identical results."""
        runner1 = MonteCarloRunner(num_runs=3, base_seed=42)
        runner2 = MonteCarloRunner(num_runs=3, base_seed=42)

        result1 = runner1.run(sample_config)
        result2 = runner2.run(sample_config)

        assert result1.mean_machine_utilization_pct == result2.mean_machine_utilization_pct
        assert result1.mean_adjuster_utilization_pct == result2.mean_adjuster_utilization_pct

    def test_category_metrics_present(self, sample_config: SimulationConfig) -> None:
        """Category metrics should include all configured categories."""
        runner = MonteCarloRunner(num_runs=3, base_seed=42)
        result = runner.run(sample_config)

        category_names = {cm["category"] for cm in result.category_metrics}
        assert "Lathe" in category_names
        assert "Drilling" in category_names

    def test_adjuster_metrics_present(self, sample_config: SimulationConfig) -> None:
        """Adjuster metrics should include all configured adjusters."""
        runner = MonteCarloRunner(num_runs=3, base_seed=42)
        result = runner.run(sample_config)

        adjuster_ids = {am["id"] for am in result.adjuster_metrics}
        assert 1 in adjuster_ids
        assert 2 in adjuster_ids
        assert 3 in adjuster_ids

    def test_more_runs_tighter_ci(self) -> None:
        """More runs should generally produce tighter confidence intervals."""
        config = SimulationConfig(
            simulation_time=500,
            machine_categories=[
                {"name": "Lathe", "count": 10, "mttf": 50, "mean_repair_time": 5},
            ],
            adjusters=[
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]},
                {"id": 2, "name": "Adjuster 2", "expertise": ["Lathe"]},
            ],
        )

        runner_few = MonteCarloRunner(num_runs=3, base_seed=42)
        runner_many = MonteCarloRunner(num_runs=20, base_seed=42)

        result_few = runner_few.run(config)
        result_many = runner_many.run(config)

        ci_width_few = (
            result_few.ci_machine_utilization[1]
            - result_few.ci_machine_utilization[0]
        )
        ci_width_many = (
            result_many.ci_machine_utilization[1]
            - result_many.ci_machine_utilization[0]
        )

        # More runs should generally produce tighter CIs
        # (not guaranteed for every seed, but usually holds)
        # Use a generous tolerance
        assert ci_width_many <= ci_width_few * 2.0, (
            f"CI with 20 runs ({ci_width_many:.2f}) should not be much wider "
            f"than CI with 3 runs ({ci_width_few:.2f})"
        )


# ═══════════════════════════════════════════════════════════════════════
# StaffingOptimizer Tests
# ═══════════════════════════════════════════════════════════════════════


class TestStaffingOptimizer:
    """Tests for the automated adjuster staffing optimizer."""

    @pytest.fixture
    def categories(self) -> list[dict]:
        """Sample machine categories for optimization tests."""
        return [
            {"name": "Lathe", "count": 20, "mttf": 100, "mean_repair_time": 10},
            {"name": "Drilling", "count": 10, "mttf": 80, "mean_repair_time": 8},
        ]

    def test_optimizer_parameter_validation(self) -> None:
        """Invalid parameters should raise ValueError."""
        with pytest.raises(ValueError, match="min_adjusters"):
            StaffingOptimizer(min_adjusters=0)
        with pytest.raises(ValueError, match="step"):
            StaffingOptimizer(step=0)
        with pytest.raises(ValueError, match="monte_carlo_runs"):
            StaffingOptimizer(monte_carlo_runs=1)
        with pytest.raises(ValueError, match="utilization_threshold"):
            StaffingOptimizer(utilization_threshold=0.0)
        with pytest.raises(ValueError, match="utilization_threshold"):
            StaffingOptimizer(utilization_threshold=101.0)

    def test_optimization_result_structure(self, categories: list[dict]) -> None:
        """Optimization result should match the API contract."""
        optimizer = StaffingOptimizer(
            min_adjusters=1,
            max_adjusters=5,
            step=2,
            monte_carlo_runs=2,
            base_seed=42,
        )
        result = optimizer.optimize(
            simulation_time=500,
            machine_categories=categories,
        )

        assert isinstance(result, OptimizationResult)
        assert result.optimum_adjuster_count >= 1
        assert isinstance(result.tradeoff_curve, list)
        assert len(result.tradeoff_curve) > 0
        assert isinstance(result.recommendation_reason, str)
        assert len(result.recommendation_reason) > 0

    def test_tradeoff_curve_format(self, categories: list[dict]) -> None:
        """Each point in the tradeoff curve should have the contract keys."""
        optimizer = StaffingOptimizer(
            min_adjusters=1,
            max_adjusters=4,
            step=1,
            monte_carlo_runs=2,
            base_seed=42,
        )
        result = optimizer.optimize(
            simulation_time=500,
            machine_categories=categories,
        )

        for point in result.tradeoff_curve:
            assert "adjuster_count" in point
            assert "machine_utilization" in point
            assert "adjuster_utilization" in point
            assert isinstance(point["adjuster_count"], int)
            assert isinstance(point["machine_utilization"], float)
            assert isinstance(point["adjuster_utilization"], float)

    def test_more_adjusters_generally_increases_machine_util(
        self, categories: list[dict]
    ) -> None:
        """Machine utilization should generally increase with more adjusters."""
        optimizer = StaffingOptimizer(
            min_adjusters=1,
            max_adjusters=8,
            step=1,
            monte_carlo_runs=3,
            base_seed=42,
        )
        result = optimizer.optimize(
            simulation_time=1000,
            machine_categories=categories,
        )

        curve = result.tradeoff_curve
        # Check overall trend: last point should have higher machine util
        # than the first point (with enough adjusters)
        if len(curve) >= 2:
            assert curve[-1]["machine_utilization"] >= curve[0]["machine_utilization"], (
                "Machine utilization should generally increase with more adjusters"
            )

    def test_more_adjusters_generally_decreases_adjuster_util(
        self, categories: list[dict]
    ) -> None:
        """Adjuster utilization should generally decrease with more adjusters."""
        optimizer = StaffingOptimizer(
            min_adjusters=1,
            max_adjusters=10,
            step=2,
            monte_carlo_runs=3,
            base_seed=42,
        )
        result = optimizer.optimize(
            simulation_time=1000,
            machine_categories=categories,
        )

        curve = result.tradeoff_curve
        # With many adjusters, adjuster utilization should drop
        if len(curve) >= 2:
            assert curve[-1]["adjuster_utilization"] <= curve[0]["adjuster_utilization"], (
                "Adjuster utilization should generally decrease with more adjusters"
            )

    def test_optimum_is_in_curve(self, categories: list[dict]) -> None:
        """The optimum adjuster count should be one of the tested counts."""
        optimizer = StaffingOptimizer(
            min_adjusters=1,
            max_adjusters=6,
            step=1,
            monte_carlo_runs=2,
            base_seed=42,
        )
        result = optimizer.optimize(
            simulation_time=500,
            machine_categories=categories,
        )

        tested_counts = [p["adjuster_count"] for p in result.tradeoff_curve]
        assert result.optimum_adjuster_count in tested_counts, (
            f"Optimum {result.optimum_adjuster_count} should be in "
            f"tested counts {tested_counts}"
        )

    def test_optimize_from_request(self, categories: list[dict]) -> None:
        """optimize_from_request should return API-contract-compatible dict."""
        optimizer = StaffingOptimizer(
            min_adjusters=1,
            max_adjusters=4,
            monte_carlo_runs=2,
            base_seed=42,
        )
        request = {
            "simulation_time": 500,
            "machine_categories": categories,
            "adjusters": [
                {"id": 1, "name": "Adj 1", "expertise": ["Lathe", "Drilling"]},
            ],
        }
        result = optimizer.optimize_from_request(request)

        assert "optimum_adjuster_count" in result
        assert "tradeoff_curve" in result
        assert "recommendation_reason" in result
        assert isinstance(result["optimum_adjuster_count"], int)
        assert isinstance(result["tradeoff_curve"], list)
        assert isinstance(result["recommendation_reason"], str)

    def test_recommendation_reason_format(self, categories: list[dict]) -> None:
        """Recommendation reason should mention the adjuster count."""
        optimizer = StaffingOptimizer(
            min_adjusters=1,
            max_adjusters=5,
            monte_carlo_runs=2,
            base_seed=42,
        )
        result = optimizer.optimize(
            simulation_time=500,
            machine_categories=categories,
        )

        # Reason should mention the optimum number
        assert str(result.optimum_adjuster_count) in result.recommendation_reason

    def test_expertise_template_cycling(self) -> None:
        """Adjusters should cycle through expertise templates."""
        optimizer = StaffingOptimizer(
            min_adjusters=1, max_adjusters=4, monte_carlo_runs=2, base_seed=42
        )
        adjusters = optimizer._create_adjusters(
            count=5,
            category_names=["Lathe", "Drilling"],
            expertise_template=[["Lathe"], ["Drilling"]],
        )

        assert len(adjusters) == 5
        assert adjusters[0]["expertise"] == ["Lathe"]
        assert adjusters[1]["expertise"] == ["Drilling"]
        assert adjusters[2]["expertise"] == ["Lathe"]  # Cycles back
        assert adjusters[3]["expertise"] == ["Drilling"]
        assert adjusters[4]["expertise"] == ["Lathe"]

    def test_generalist_adjusters_default(self) -> None:
        """Without expertise template, adjusters should be generalists."""
        optimizer = StaffingOptimizer(
            min_adjusters=1, max_adjusters=4, monte_carlo_runs=2, base_seed=42
        )
        adjusters = optimizer._create_adjusters(
            count=3,
            category_names=["Lathe", "Drilling"],
            expertise_template=None,
        )

        for adj in adjusters:
            assert "Lathe" in adj["expertise"]
            assert "Drilling" in adj["expertise"]


# ═══════════════════════════════════════════════════════════════════════
# Confidence Interval Utility Tests
# ═══════════════════════════════════════════════════════════════════════


class TestConfidenceInterval:
    """Tests for the confidence interval computation utility."""

    def test_single_value(self) -> None:
        """Single-value data should return the value as both bounds."""
        ci = MonteCarloRunner._compute_confidence_interval([42.0])
        assert ci == (42.0, 42.0)

    def test_identical_values(self) -> None:
        """Identical values should have zero-width CI."""
        ci = MonteCarloRunner._compute_confidence_interval([5.0, 5.0, 5.0])
        assert ci[0] == ci[1] == 5.0

    def test_ci_brackets_mean(self) -> None:
        """CI should bracket the sample mean."""
        data = [10.0, 12.0, 11.0, 9.0, 13.0, 10.5, 11.5, 12.5]
        ci = MonteCarloRunner._compute_confidence_interval(data)
        mean = statistics.mean(data)
        assert ci[0] <= mean <= ci[1]

    def test_ci_width_with_large_sample(self) -> None:
        """Large sample CI should be narrower than small sample CI."""
        import random

        rng = random.Random(42)
        small_data = [rng.gauss(100, 10) for _ in range(5)]
        large_data = [rng.gauss(100, 10) for _ in range(100)]

        ci_small = MonteCarloRunner._compute_confidence_interval(small_data)
        ci_large = MonteCarloRunner._compute_confidence_interval(large_data)

        width_small = ci_small[1] - ci_small[0]
        width_large = ci_large[1] - ci_large[0]

        # Large sample CI should generally be narrower
        assert width_large < width_small


# ═══════════════════════════════════════════════════════════════════════
# Integration / Fallback Simulation Tests
# ═══════════════════════════════════════════════════════════════════════


class TestFallbackSimulation:
    """Tests for the self-contained fallback simulation in MonteCarloRunner."""

    def test_simulation_produces_valid_metrics(self) -> None:
        """Fallback simulation should produce valid metric ranges."""
        config = SimulationConfig(
            simulation_time=1000,
            machine_categories=[
                {"name": "Lathe", "count": 10, "mttf": 100, "mean_repair_time": 10},
            ],
            adjusters=[
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]},
                {"id": 2, "name": "Adjuster 2", "expertise": ["Lathe"]},
            ],
        )

        runner = MonteCarloRunner(num_runs=2, base_seed=42)
        result = runner.run(config)

        assert 0.0 <= result.mean_machine_utilization_pct <= 100.0
        assert 0.0 <= result.mean_adjuster_utilization_pct <= 100.0
        assert result.mean_queue_wait_time >= 0.0

    def test_more_adjusters_improves_utilization(self) -> None:
        """Adding more adjusters should improve machine utilization."""
        categories = [
            {"name": "Lathe", "count": 20, "mttf": 50, "mean_repair_time": 10},
        ]

        # Few adjusters
        config_few = SimulationConfig(
            simulation_time=2000,
            machine_categories=categories,
            adjusters=[
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]},
            ],
        )

        # Many adjusters
        config_many = SimulationConfig(
            simulation_time=2000,
            machine_categories=categories,
            adjusters=[
                {"id": i, "name": f"Adjuster {i}", "expertise": ["Lathe"]}
                for i in range(1, 8)
            ],
        )

        runner = MonteCarloRunner(num_runs=3, base_seed=42)
        result_few = runner.run(config_few)

        runner2 = MonteCarloRunner(num_runs=3, base_seed=42)
        result_many = runner2.run(config_many)

        assert (
            result_many.mean_machine_utilization_pct
            >= result_few.mean_machine_utilization_pct
        ), (
            f"More adjusters ({result_many.mean_machine_utilization_pct:.1f}%) "
            f"should give >= machine util than fewer "
            f"({result_few.mean_machine_utilization_pct:.1f}%)"
        )

    def test_zero_simulation_time(self) -> None:
        """Zero simulation time should not crash and produce zero metrics."""
        config = SimulationConfig(
            simulation_time=0,
            machine_categories=[
                {"name": "Lathe", "count": 5, "mttf": 100, "mean_repair_time": 10},
            ],
            adjusters=[
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]},
            ],
        )

        runner = MonteCarloRunner(num_runs=2, base_seed=42)
        result = runner.run(config)
        # Should not crash — metrics will be 0 or edge cases
        assert isinstance(result, AggregatedResult)
