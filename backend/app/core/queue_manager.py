from collections import deque
from typing import Deque, List, Optional, Union

from .models import Adjuster, AdjusterState, Machine, MachineState


QueueItem = Union[Machine, Adjuster]


class QueueManager:
    """
    Maintains the single service queue.

    The queue contains either:
    - machines waiting for an adjuster, or
    - idle adjusters waiting for a machine

    It must never contain both at the same time.
    """

    def __init__(self) -> None:
        self._queue: Deque[QueueItem] = deque()
        self._queue_type: Optional[str] = None

    @property
    def queue_type(self) -> Optional[str]:
        """Return 'machine', 'adjuster', or None when the queue is empty."""
        return self._queue_type

    @property
    def size(self) -> int:
        """Return the number of items currently waiting."""
        return len(self._queue)

    def is_empty(self) -> bool:
        """Return True when the service queue is empty."""
        return not self._queue

    def _validate_item(self, item: QueueItem) -> str:
        """Determine the queue type and validate the item's state."""
        if isinstance(item, Machine):
            if item.state != MachineState.WAITING_FOR_REPAIR:
                raise ValueError(
                    f"Machine {item.id} must be waiting for repair."
                )
            return "machine"

        if isinstance(item, Adjuster):
            if item.state != AdjusterState.IDLE:
                raise ValueError(
                    f"Adjuster {item.id} must be idle."
                )
            return "adjuster"

        raise TypeError("Queue item must be a Machine or Adjuster.")

    def add(self, item: QueueItem) -> None:
        """
        Add an item to the FIFO queue.

        The single-queue invariant prevents machines and adjusters
        from being present together.
        """
        item_type = self._validate_item(item)

        if self._queue_type is not None and self._queue_type != item_type:
            raise ValueError(
                "Single-queue invariant violated: "
                "machines and adjusters cannot share the queue."
            )

        if self._queue_type is None:
            self._queue_type = item_type

        self._queue.append(item)

    def peek(self) -> Optional[QueueItem]:
        """Return the first queued item without removing it."""
        if self.is_empty():
            return None

        return self._queue[0]

    def pop(self) -> Optional[QueueItem]:
        """Remove and return the first queued item."""
        if self.is_empty():
            return None

        item = self._queue.popleft()

        if not self._queue:
            self._queue_type = None

        return item

    def find_expert_adjuster(
        self,
        machine: Machine,
        adjusters: List[Adjuster],
    ) -> Optional[Adjuster]:
        """
        Find the first idle adjuster with expertise for the machine category.
        """
        for adjuster in adjusters:
            if (
                adjuster.state == AdjusterState.IDLE
                and adjuster.can_repair(machine.category.name)
            ):
                return adjuster

        return None

    def find_waiting_machine(
        self,
        adjuster: Adjuster,
    ) -> Optional[Machine]:
        """
        Find the first queued machine that the adjuster can repair.

        This method is used when the queue contains machines.
        """
        if self._queue_type != "machine":
            return None

        for item in self._queue:
            if isinstance(item, Machine):
                if adjuster.can_repair(item.category.name):
                    return item

        return None

    def remove(self, item: QueueItem) -> bool:
        """Remove a specific item from the queue."""
        try:
            self._queue.remove(item)
        except ValueError:
            return False

        if not self._queue:
            self._queue_type = None

        return True

    def assign_available_adjuster(
        self,
        machine: Machine,
        adjusters: List[Adjuster],
        timestamp: float,
    ) -> Optional[Adjuster]:
        """
        Assign the first suitable idle adjuster to a failed machine.

        Returns the assigned adjuster, or None if no suitable adjuster exists.
        """
        adjuster = self.find_expert_adjuster(machine, adjusters)

        if adjuster is None:
            return None

        adjuster.start_repair(machine.id, timestamp)
        machine.start_repair(timestamp)

        return adjuster

    def assign_next_machine(
        self,
        adjuster: Adjuster,
        timestamp: float,
    ) -> Optional[Machine]:
        """
        Assign the first compatible machine in the queue to an idle adjuster.

        The machine is removed from the queue and its repair starts.
        """
        machine = self.find_waiting_machine(adjuster)

        if machine is None:
            return None

        self.remove(machine)

        adjuster.start_repair(machine.id, timestamp)
        machine.start_repair(timestamp)

        return machine

    def items(self) -> List[QueueItem]:
        """Return a snapshot of the current queue."""
        return list(self._queue)