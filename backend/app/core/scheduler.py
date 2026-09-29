import heapq
from typing import List

from .event import Event


class EventScheduler:
    """Min-heap based scheduler for chronological simulation events."""

    def __init__(self) -> None:
        self._events: List[Event] = []

    def schedule(self, event: Event) -> None:
        """Add an event to the priority queue."""
        heapq.heappush(self._events, event)

    def pop_next(self) -> Event:
        """Remove and return the earliest scheduled event."""
        if not self._events:
            raise IndexError("Cannot pop from an empty event scheduler.")

        return heapq.heappop(self._events)

    def peek(self) -> Event:
        """Return the earliest event without removing it."""
        if not self._events:
            raise IndexError("Cannot peek at an empty event scheduler.")

        return self._events[0]

    def is_empty(self) -> bool:
        """Return True when there are no scheduled events."""
        return len(self._events) == 0

    def __len__(self) -> int:
        """Return the number of scheduled events."""
        return len(self._events)

    def clear(self) -> None:
        """Remove all scheduled events."""
        self._events.clear()