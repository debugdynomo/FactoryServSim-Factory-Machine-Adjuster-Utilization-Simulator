from dataclasses import dataclass
from typing import Callable, Dict, List, Optional

from .event import Event, EventType
from .models import (
    Adjuster,
    AdjusterState,
    Factory,
    Machine,
    MachineState,
)
from .queue_manager import QueueManager
from .scheduler import EventScheduler


FailureDelayGenerator = Callable[[Machine], float]
RepairDurationGenerator = Callable[[Machine], float]


@dataclass
class SimulationMetrics:
    """Raw metrics collected during a simulation run."""

    total_simulation_time: float
    total_failures_handled: int
    total_repairs_completed: int
    total_machine_running_time: float
    total_machine_waiting_time: float
    total_machine_repair_time: float
    total_adjuster_busy_time: float
    total_queue_wait_time: float

    @property
    def machine_utilization_pct(self) -> float:
        """Percentage of available machine time spent running."""
        if self.total_simulation_time <= 0:
            return 0.0

        return (
            self.total_machine_running_time
            / self.total_simulation_time
        ) * 100.0

    @property
    def adjuster_utilization_pct(self) -> float:
        """Average percentage of simulation time adjusters were busy."""
        return self._adjuster_utilization_from_busy_time()

    def _adjuster_utilization_from_busy_time(self) -> float:
        return self.total_adjuster_busy_time


class Simulator:
    """
    Discrete-event simulation engine for the factory.

    Failure and repair timing are injected through generator functions.
    Person 2 can later provide the stochastic implementations without
    changing the simulation engine.
    """

    def __init__(
        self,
        factory: Factory,
        simulation_time: float,
        failure_delay_generator: Optional[
            FailureDelayGenerator
        ] = None,
        repair_duration_generator: Optional[
            RepairDurationGenerator
        ] = None,
    ) -> None:
        if simulation_time <= 0:
            raise ValueError("Simulation time must be positive.")

        self.factory = factory
        self.simulation_time = simulation_time

        self.failure_delay_generator = (
            failure_delay_generator
            if failure_delay_generator is not None
            else self._default_failure_delay
        )

        self.repair_duration_generator = (
            repair_duration_generator
            if repair_duration_generator is not None
            else self._default_repair_duration
        )

        self.scheduler = EventScheduler()
        self.queue_manager = QueueManager()

        self.machines: List[Machine] = []
        self.adjusters: List[Adjuster] = []

        self.current_time = 0.0
        self._event_sequence = 0

        self._last_machine_timestamp: Dict[int, float] = {}
        self._last_adjuster_timestamp: Dict[int, float] = {}

        self._total_machine_running_time = 0.0
        self._total_adjuster_busy_time = 0.0
        self._total_failures_handled = 0
        self._total_repairs_completed = 0
        self._total_queue_wait_time = 0.0

    @staticmethod
    def _default_failure_delay(machine: Machine) -> float:
        """
        Temporary deterministic fallback.

        Person 2 can replace this with the required stochastic
        U(0, 2 * MTTF) generator.
        """
        return machine.category.mttf

    @staticmethod
    def _default_repair_duration(machine: Machine) -> float:
        """
        Temporary deterministic fallback.

        Person 2 can replace this with the required repair-time model.
        """
        return machine.category.mean_repair_time

    def _next_sequence(self) -> int:
        sequence = self._event_sequence
        self._event_sequence += 1
        return sequence

    def _schedule(
        self,
        timestamp: float,
        event_type: EventType,
        data: object,
    ) -> None:
        if timestamp > self.simulation_time:
            return

        self.scheduler.schedule(
            Event(
                timestamp=timestamp,
                sequence=self._next_sequence(),
                event_type=event_type,
                data=data,
            )
        )

    def _schedule_machine_failure(
        self,
        machine: Machine,
        current_time: float,
    ) -> None:
        delay = self.failure_delay_generator(machine)

        if delay < 0:
            raise ValueError("Failure delay cannot be negative.")

        failure_time = current_time + delay

        self._schedule(
            failure_time,
            EventType.MACHINE_FAILURE,
            machine,
        )

    def _schedule_repair_completion(
        self,
        machine: Machine,
        current_time: float,
    ) -> None:
        duration = self.repair_duration_generator(machine)

        if duration < 0:
            raise ValueError("Repair duration cannot be negative.")

        completion_time = current_time + duration

        self._schedule(
            completion_time,
            EventType.REPAIR_COMPLETION,
            machine,
        )

    def _update_machine_running_time(
        self,
        machine: Machine,
        timestamp: float,
    ) -> None:
        previous_timestamp = self._last_machine_timestamp.get(
            machine.id,
            0.0,
        )

        elapsed = timestamp - previous_timestamp

        if elapsed < 0:
            raise ValueError("Simulation time cannot move backwards.")

        if machine.state == MachineState.RUNNING:
            self._total_machine_running_time += elapsed

        self._last_machine_timestamp[machine.id] = timestamp

    def _update_adjuster_busy_time(
        self,
        adjuster: Adjuster,
        timestamp: float,
    ) -> None:
        previous_timestamp = self._last_adjuster_timestamp.get(
            adjuster.id,
            0.0,
        )

        elapsed = timestamp - previous_timestamp

        if elapsed < 0:
            raise ValueError("Simulation time cannot move backwards.")

        if adjuster.state == AdjusterState.BUSY:
            self._total_adjuster_busy_time += elapsed

        self._last_adjuster_timestamp[adjuster.id] = timestamp

    def _find_adjuster_for_machine(
        self,
        machine: Machine,
    ) -> Optional[Adjuster]:
        return self.queue_manager.find_expert_adjuster(
            machine,
            self.adjusters,
        )

    def _start_repair(
        self,
        machine: Machine,
        adjuster: Adjuster,
        timestamp: float,
    ) -> None:
        self._update_machine_running_time(machine, timestamp)
        self._update_adjuster_busy_time(adjuster, timestamp)

        adjuster.start_repair(machine.id, timestamp)
        machine.start_repair(timestamp)

        self._total_queue_wait_time += machine.total_waiting_time

        self._schedule_repair_completion(
            machine,
            timestamp,
        )

    def _handle_machine_failure(
        self,
        machine: Machine,
        timestamp: float,
    ) -> None:
        if machine.state != MachineState.RUNNING:
            return

        self._update_machine_running_time(machine, timestamp)

        machine.fail(timestamp)
        self._total_failures_handled += 1

        adjuster = self._find_adjuster_for_machine(machine)

        if adjuster is not None:
            self.queue_manager.remove(adjuster)
            self._start_repair(
                machine,
                adjuster,
                timestamp,
            )
            return

        self.queue_manager.add(machine)

    def _handle_repair_completion(
        self,
        machine: Machine,
        timestamp: float,
    ) -> None:
        if machine.state != MachineState.UNDER_REPAIR:
            return

        adjuster = self._find_adjuster_repairing_machine(
            machine.id
        )

        self._update_machine_running_time(machine, timestamp)

        if adjuster is not None:
            self._update_adjuster_busy_time(
                adjuster,
                timestamp,
            )

            machine.complete_repair(timestamp)
            adjuster.complete_repair(timestamp)

            self._total_repairs_completed += 1

            self._schedule_machine_failure(
                machine,
                timestamp,
            )

            self._assign_waiting_machine_or_queue_adjuster(
                adjuster,
                timestamp,
            )
        else:
            machine.complete_repair(timestamp)

            self._total_repairs_completed += 1

            self._schedule_machine_failure(
                machine,
                timestamp,
            )

    def _find_adjuster_repairing_machine(
        self,
        machine_id: int,
    ) -> Optional[Adjuster]:
        for adjuster in self.adjusters:
            if adjuster.current_machine_id == machine_id:
                return adjuster

        return None

    def _assign_waiting_machine_or_queue_adjuster(
        self,
        adjuster: Adjuster,
        timestamp: float,
    ) -> None:
        machine = self.queue_manager.assign_next_machine(
            adjuster,
            timestamp,
        )

        if machine is not None:
            self._total_queue_wait_time += machine.total_waiting_time

            self._schedule_repair_completion(
                machine,
                timestamp,
            )
            return

        if self.queue_manager.is_empty():
            self.queue_manager.add(adjuster)

    def _process_event(self, event: Event) -> None:
        self.current_time = event.timestamp

        if event.event_type == EventType.MACHINE_FAILURE:
            machine = event.data

            if not isinstance(machine, Machine):
                raise TypeError(
                    "Machine failure event must contain a Machine."
                )

            self._handle_machine_failure(
                machine,
                event.timestamp,
            )

        elif event.event_type == EventType.REPAIR_COMPLETION:
            machine = event.data

            if not isinstance(machine, Machine):
                raise TypeError(
                    "Repair completion event must contain a Machine."
                )

            self._handle_repair_completion(
                machine,
                event.timestamp,
            )

    def _initialize(self) -> None:
        self.machines = self.factory.create_machines()
        self.adjusters = self.factory.adjusters

        self._last_machine_timestamp = {
            machine.id: 0.0
            for machine in self.machines
        }

        self._last_adjuster_timestamp = {
            adjuster.id: 0.0
            for adjuster in self.adjusters
        }

        for machine in self.machines:
            self._schedule_machine_failure(
                machine,
                0.0,
            )

    def _finalize_metrics(self) -> SimulationMetrics:
        end_time = self.current_time

        if end_time < self.simulation_time:
            end_time = self.simulation_time

        for machine in self.machines:
            self._update_machine_running_time(
                machine,
                end_time,
            )

        for adjuster in self.adjusters:
            self._update_adjuster_busy_time(
                adjuster,
                end_time,
            )

        total_machine_waiting_time = sum(
            machine.total_waiting_time
            for machine in self.machines
        )

        total_machine_repair_time = sum(
            machine.total_repair_time
            for machine in self.machines
        )

        return SimulationMetrics(
            total_simulation_time=self.simulation_time,
            total_failures_handled=self._total_failures_handled,
            total_repairs_completed=self._total_repairs_completed,
            total_machine_running_time=self._total_machine_running_time,
            total_machine_waiting_time=total_machine_waiting_time,
            total_machine_repair_time=total_machine_repair_time,
            total_adjuster_busy_time=self._total_adjuster_busy_time,
            total_queue_wait_time=self._total_queue_wait_time,
        )

    def run(self) -> SimulationMetrics:
        """Run the discrete-event simulation and return raw metrics."""
        self._initialize()

        while not self.scheduler.is_empty():
            event = self.scheduler.peek()

            if event.timestamp > self.simulation_time:
                break

            event = self.scheduler.pop_next()
            self._process_event(event)

        self.current_time = self.simulation_time

        return self._finalize_metrics()