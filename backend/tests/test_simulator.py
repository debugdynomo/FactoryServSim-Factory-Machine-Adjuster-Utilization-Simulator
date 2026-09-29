from app.core.models import Adjuster, Factory, MachineCategory
from app.core.simulator import Simulator


def test_deterministic_simulation_runs() -> None:
    category = MachineCategory(
        name="Lathe",
        count=1,
        mttf=5.0,
        mean_repair_time=2.0,
    )

    adjuster = Adjuster(
        id=1,
        name="Adjuster 1",
        expertise=["Lathe"],
    )

    factory = Factory(
        machine_categories=[category],
        adjusters=[adjuster],
    )

    simulator = Simulator(
        factory=factory,
        simulation_time=20.0,
        failure_delay_generator=lambda machine: 5.0,
        repair_duration_generator=lambda machine: 2.0,
    )

    metrics = simulator.run()

    assert metrics.total_simulation_time == 20.0
    assert metrics.total_failures_handled > 0
    assert metrics.total_repairs_completed > 0
    assert metrics.total_machine_running_time > 0
    assert metrics.total_adjuster_busy_time > 0


def test_simulation_uses_adjuster_expertise() -> None:
    category = MachineCategory(
        name="Lathe",
        count=1,
        mttf=5.0,
        mean_repair_time=2.0,
    )

    wrong_adjuster = Adjuster(
        id=1,
        name="Drilling Adjuster",
        expertise=["Drilling"],
    )

    factory = Factory(
        machine_categories=[category],
        adjusters=[wrong_adjuster],
    )

    simulator = Simulator(
        factory=factory,
        simulation_time=10.0,
        failure_delay_generator=lambda machine: 5.0,
        repair_duration_generator=lambda machine: 2.0,
    )

    metrics = simulator.run()

    assert metrics.total_failures_handled > 0
    assert metrics.total_repairs_completed == 0


def test_adjuster_busy_time_is_tracked() -> None:
    category = MachineCategory(
        name="Lathe",
        count=1,
        mttf=5.0,
        mean_repair_time=2.0,
    )

    adjuster = Adjuster(
        id=1,
        name="Lathe Adjuster",
        expertise=["Lathe"],
    )

    factory = Factory(
        machine_categories=[category],
        adjusters=[adjuster],
    )

    simulator = Simulator(
        factory=factory,
        simulation_time=10.0,
        failure_delay_generator=lambda machine: 5.0,
        repair_duration_generator=lambda machine: 2.0,
    )

    metrics = simulator.run()

    assert metrics.total_adjuster_busy_time > 0
    assert metrics.adjuster_utilization_pct > 0


def test_machine_waits_when_no_expert_adjuster_exists() -> None:
    category = MachineCategory(
        name="Lathe",
        count=1,
        mttf=5.0,
        mean_repair_time=2.0,
    )

    adjuster = Adjuster(
        id=1,
        name="Drilling Adjuster",
        expertise=["Drilling"],
    )

    factory = Factory(
        machine_categories=[category],
        adjusters=[adjuster],
    )

    simulator = Simulator(
        factory=factory,
        simulation_time=10.0,
        failure_delay_generator=lambda machine: 5.0,
        repair_duration_generator=lambda machine: 2.0,
    )

    simulator.run()

    assert simulator.queue_manager.queue_type == "machine"
    assert simulator.queue_manager.size == 1