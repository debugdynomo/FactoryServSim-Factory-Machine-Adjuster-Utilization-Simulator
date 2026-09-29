from dataclasses import dataclass
from enum import Enum
from typing import Any


class EventType(Enum):
    MACHINE_FAILURE = "MACHINE_FAILURE"
    REPAIR_COMPLETION = "REPAIR_COMPLETION"


@dataclass(order=True)
class Event:
    timestamp: float
    sequence: int
    event_type: EventType
    data: Any = None