import pytest

from app.core.event import Event, EventType
from app.core.models import (
    Adjuster,
    AdjusterState,
    Factory,
    Machine,
    MachineCategory,
    MachineState,
)
from app.core.queue_manager import QueueManager
from app.core.scheduler import EventScheduler


def create_machine(
    machine_id: int = 1,
    category_name: str = "Lathe",
) -> Machine:
    category = MachineCategory(
        name=category_name,
        count=1,
        mttf=100.0,
        mean_repair_time=10.0,
    )
    return Machine(id=machine_id, category=category)


def create_adjuster(
    adjuster_id: int = 1,
    expertise: list[str] | None = None,
) -> Adjuster:
    if expertise is None:
        expertise = ["Lathe"]

    return Adjuster(
        id=adjuster_id,
        name=f"Adjuster {adjuster_id}",
        expertise=expertise,
    )


def test_machine_state_transitions() -> None:
    machine = create_machine()

    assert machine.state == MachineState.RUNNING

    machine.fail(10.0)

    assert machine.state == MachineState.WAITING_FOR_REPAIR
    assert machine.failed_at == 10.0
    assert machine.total_failures == 1

    machine.start_repair(15.0)

    assert machine.state == MachineState.UNDER_REPAIR
    assert machine.total_waiting_time == 5.0

    machine.complete_repair(25.0)

    assert machine.state == MachineState.RUNNING
    assert machine.total_repair_time == 10.0


def test_adjuster_expertise_matching() -> None:
    adjuster = create_adjuster(
        expertise=["Lathe", "Turning"]
    )

    assert adjuster.can_repair("Lathe")
    assert adjuster.can_repair("Turning")
    assert not adjuster.can_repair("Drilling")


def test_scheduler_returns_events_in_timestamp_order() -> None:
    scheduler = EventScheduler()

    scheduler.schedule(
        Event(
            timestamp=30.0,
            sequence=3,
            event_type=EventType.MACHINE_FAILURE,
        )
    )

    scheduler.schedule(
        Event(
            timestamp=10.0,
            sequence=1,
            event_type=EventType.MACHINE_FAILURE,
        )
    )

    scheduler.schedule(
        Event(
            timestamp=20.0,
            sequence=2,
            event_type=EventType.REPAIR_COMPLETION,
        )
    )

    assert scheduler.pop_next().timestamp == 10.0
    assert scheduler.pop_next().timestamp == 20.0
    assert scheduler.pop_next().timestamp == 30.0
    assert scheduler.is_empty()


def test_scheduler_uses_sequence_for_equal_timestamps() -> None:
    scheduler = EventScheduler()

    first = Event(
        timestamp=10.0,
        sequence=1,
        event_type=EventType.MACHINE_FAILURE,
    )

    second = Event(
        timestamp=10.0,
        sequence=2,
        event_type=EventType.REPAIR_COMPLETION,
    )

    scheduler.schedule(second)
    scheduler.schedule(first)

    assert scheduler.pop_next() == first
    assert scheduler.pop_next() == second


def test_single_queue_accepts_only_one_item_type() -> None:
    queue_manager = QueueManager()

    machine = create_machine()
    machine.fail(5.0)

    adjuster = create_adjuster()

    queue_manager.add(machine)

    assert queue_manager.queue_type == "machine"
    assert queue_manager.size == 1

    with pytest.raises(ValueError, match="Single-queue invariant"):
        queue_manager.add(adjuster)


def test_single_queue_can_switch_type_after_becoming_empty() -> None:
    queue_manager = QueueManager()

    machine = create_machine()
    machine.fail(5.0)

    adjuster = create_adjuster()

    queue_manager.add(machine)

    assert queue_manager.pop() == machine
    assert queue_manager.is_empty()
    assert queue_manager.queue_type is None

    queue_manager.add(adjuster)

    assert queue_manager.queue_type == "adjuster"
    assert queue_manager.peek() == adjuster


def test_adjuster_assignment_to_machine() -> None:
    queue_manager = QueueManager()

    machine = create_machine()
    machine.fail(5.0)

    adjuster = create_adjuster(
        expertise=["Lathe"]
    )

    assigned = queue_manager.assign_available_adjuster(
        machine=machine,
        adjusters=[adjuster],
        timestamp=6.0,
    )

    assert assigned == adjuster
    assert machine.state == MachineState.UNDER_REPAIR
    assert adjuster.state == AdjusterState.BUSY
    assert adjuster.current_machine_id == machine.id


def test_incompatible_adjuster_is_not_assigned() -> None:
    queue_manager = QueueManager()

    machine = create_machine(category_name="Lathe")
    machine.fail(5.0)

    adjuster = create_adjuster(
        expertise=["Drilling"]
    )

    assigned = queue_manager.assign_available_adjuster(
        machine=machine,
        adjusters=[adjuster],
        timestamp=6.0,
    )

    assert assigned is None
    assert machine.state == MachineState.WAITING_FOR_REPAIR
    assert adjuster.state == AdjusterState.IDLE


def test_fifo_machine_queue() -> None:
    queue_manager = QueueManager()

    machine1 = create_machine(machine_id=1)
    machine2 = create_machine(machine_id=2)

    machine1.fail(1.0)
    machine2.fail(2.0)

    queue_manager.add(machine1)
    queue_manager.add(machine2)

    assert queue_manager.pop() == machine1
    assert queue_manager.pop() == machine2
    assert queue_manager.is_empty()


def test_factory_creates_requested_number_of_machines() -> None:
    lathe = MachineCategory(
        name="Lathe",
        count=3,
        mttf=100.0,
        mean_repair_time=10.0,
    )

    drilling = MachineCategory(
        name="Drilling",
        count=2,
        mttf=80.0,
        mean_repair_time=8.0,
    )

    factory = Factory(
        machine_categories=[lathe, drilling],
        adjusters=[],
    )

    machines = factory.create_machines()

    assert len(machines) == 5
    assert [machine.id for machine in machines] == [1, 2, 3, 4, 5]
    assert [machine.category.name for machine in machines] == [
        "Lathe",
        "Lathe",
        "Lathe",
        "Drilling",
        "Drilling",
    ]