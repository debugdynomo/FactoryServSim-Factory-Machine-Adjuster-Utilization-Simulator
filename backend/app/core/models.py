from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class MachineState(Enum):
    RUNNING = "RUNNING"
    WAITING_FOR_REPAIR = "WAITING_FOR_REPAIR"
    UNDER_REPAIR = "UNDER_REPAIR"


class AdjusterState(Enum):
    IDLE = "IDLE"
    BUSY = "BUSY"


@dataclass
class MachineCategory:
    name: str
    count: int
    mttf: float
    mean_repair_time: float

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("Machine category name cannot be empty.")
        if self.count < 0:
            raise ValueError("Machine count cannot be negative.")
        if self.mttf <= 0:
            raise ValueError("MTTF must be positive.")
        if self.mean_repair_time <= 0:
            raise ValueError("Mean repair time must be positive.")


@dataclass
class Machine:
    id: int
    category: MachineCategory
    state: MachineState = MachineState.RUNNING
    failed_at: Optional[float] = None
    repair_started_at: Optional[float] = None
    repair_completed_at: Optional[float] = None
    total_running_time: float = 0.0
    total_waiting_time: float = 0.0
    total_repair_time: float = 0.0
    total_failures: int = 0

    def fail(self, timestamp: float) -> None:
        if self.state != MachineState.RUNNING:
            raise ValueError(
                f"Machine {self.id} cannot fail while in state {self.state.value}."
            )

        self.state = MachineState.WAITING_FOR_REPAIR
        self.failed_at = timestamp
        self.total_failures += 1

    def start_repair(self, timestamp: float) -> None:
        if self.state != MachineState.WAITING_FOR_REPAIR:
            raise ValueError(
                f"Machine {self.id} cannot start repair while in state "
                f"{self.state.value}."
            )

        if self.failed_at is not None:
            self.total_waiting_time += timestamp - self.failed_at

        self.repair_started_at = timestamp
        self.state = MachineState.UNDER_REPAIR

    def complete_repair(self, timestamp: float) -> None:
        if self.state != MachineState.UNDER_REPAIR:
            raise ValueError(
                f"Machine {self.id} cannot complete repair while in state "
                f"{self.state.value}."
            )

        if self.repair_started_at is not None:
            self.total_repair_time += timestamp - self.repair_started_at

        self.repair_completed_at = timestamp
        self.state = MachineState.RUNNING


@dataclass
class Adjuster:
    id: int
    name: str
    expertise: List[str] = field(default_factory=list)
    state: AdjusterState = AdjusterState.IDLE
    current_machine_id: Optional[int] = None
    total_busy_time: float = 0.0
    repairs_completed: int = 0
    busy_started_at: Optional[float] = None

    def can_repair(self, category_name: str) -> bool:
        return category_name in self.expertise

    def start_repair(self, machine_id: int, timestamp: float) -> None:
        if self.state != AdjusterState.IDLE:
            raise ValueError(
                f"Adjuster {self.id} is not idle."
            )

        self.state = AdjusterState.BUSY
        self.current_machine_id = machine_id
        self.busy_started_at = timestamp

    def complete_repair(self, timestamp: float) -> None:
        if self.state != AdjusterState.BUSY:
            raise ValueError(
                f"Adjuster {self.id} is not busy."
            )

        if self.busy_started_at is not None:
            self.total_busy_time += timestamp - self.busy_started_at

        self.state = AdjusterState.IDLE
        self.current_machine_id = None
        self.busy_started_at = None
        self.repairs_completed += 1


@dataclass
class Factory:
    machine_categories: List[MachineCategory]
    adjusters: List[Adjuster]

    def create_machines(self) -> List[Machine]:
        machines: List[Machine] = []
        machine_id = 1

        for category in self.machine_categories:
            for _ in range(category.count):
                machines.append(
                    Machine(
                        id=machine_id,
                        category=category,
                    )
                )
                machine_id += 1

        return machines