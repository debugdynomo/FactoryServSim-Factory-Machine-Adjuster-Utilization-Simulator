"""
Repair Model — Repair Duration Generator & State Transition Logic

Generates repair durations for machines based on their category's
mean repair time using a uniform distribution:

    repair_time ~ U(0.5 × mean_repair_time, 1.5 × mean_repair_time)

This provides variability around the mean while keeping repair times
in a realistic range (50% to 150% of the mean).

Also provides helper functions for computing state transitions
(WAITING_FOR_REPAIR → UNDER_REPAIR → RUNNING).

Author: Person 2 (Kiran)
Module: backend/app/services/repair_model.py
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class MachineState(str, Enum):
    """Machine state transitions during simulation.

    The lifecycle is:
        RUNNING → WAITING_FOR_REPAIR → UNDER_REPAIR → RUNNING
    """

    RUNNING = "RUNNING"
    WAITING_FOR_REPAIR = "WAITING_FOR_REPAIR"
    UNDER_REPAIR = "UNDER_REPAIR"


class AdjusterState(str, Enum):
    """Adjuster availability states."""

    IDLE = "IDLE"
    BUSY = "BUSY"


@dataclass
class RepairModel:
    """Generates repair durations and manages repair state transitions.

    Repair times are drawn from U(0.5 × mean_repair_time, 1.5 × mean_repair_time)
    to provide realistic variability while keeping repairs bounded.

    Attributes:
        seed: Optional random seed for reproducibility.
        _rng: Internal random number generator instance.
    """

    seed: Optional[int] = None
    _rng: random.Random = field(init=False, repr=False)

    def __post_init__(self) -> None:
        """Initialize the internal RNG with the given seed."""
        self._rng = random.Random(self.seed)

    def generate_repair_time(self, mean_repair_time: float) -> float:
        """Generate a single repair duration from a uniform distribution.

        The distribution is U(0.5 × mean, 1.5 × mean) centered around
        the category's mean repair time.

        Args:
            mean_repair_time: Mean repair time for the machine category.
                              Must be a positive number.

        Returns:
            A random repair duration.

        Raises:
            ValueError: If mean_repair_time is not positive.
        """
        if mean_repair_time <= 0:
            raise ValueError(
                f"Mean repair time must be positive, got {mean_repair_time}"
            )

        lower = 0.5 * mean_repair_time
        upper = 1.5 * mean_repair_time
        return self._rng.uniform(lower, upper)

    def generate_repair_times(
        self, mean_repair_time: float, count: int
    ) -> list[float]:
        """Generate multiple repair durations for a machine category.

        Args:
            mean_repair_time: Mean repair time for the machine category.
            count: Number of repair times to generate.

        Returns:
            A list of random repair durations.

        Raises:
            ValueError: If mean_repair_time is not positive or count is not positive.
        """
        if count <= 0:
            raise ValueError(f"Count must be positive, got {count}")

        return [self.generate_repair_time(mean_repair_time) for _ in range(count)]

    @staticmethod
    def next_machine_state(current_state: MachineState) -> MachineState:
        """Determine the next state in the machine lifecycle.

        State transitions follow:
            RUNNING → WAITING_FOR_REPAIR (machine fails)
            WAITING_FOR_REPAIR → UNDER_REPAIR (adjuster assigned)
            UNDER_REPAIR → RUNNING (repair completed)

        Args:
            current_state: The machine's current state.

        Returns:
            The next state in the lifecycle.

        Raises:
            ValueError: If the current state is invalid.
        """
        transitions = {
            MachineState.RUNNING: MachineState.WAITING_FOR_REPAIR,
            MachineState.WAITING_FOR_REPAIR: MachineState.UNDER_REPAIR,
            MachineState.UNDER_REPAIR: MachineState.RUNNING,
        }

        if current_state not in transitions:
            raise ValueError(f"Invalid machine state: {current_state}")

        return transitions[current_state]

    @staticmethod
    def get_adjuster_state_for_repair(is_repairing: bool) -> AdjusterState:
        """Get adjuster state based on repair activity.

        Args:
            is_repairing: Whether the adjuster is currently repairing.

        Returns:
            BUSY if repairing, IDLE otherwise.
        """
        return AdjusterState.BUSY if is_repairing else AdjusterState.IDLE

    def expected_mean(self, mean_repair_time: float) -> float:
        """Return the theoretical expected mean repair time.

        For U(0.5 × mean, 1.5 × mean), the expected value equals the mean.

        Args:
            mean_repair_time: The mean repair time parameter.

        Returns:
            The theoretical mean (equal to mean_repair_time).
        """
        return mean_repair_time

    def expected_variance(self, mean_repair_time: float) -> float:
        """Return the theoretical variance of repair times.

        For U(a, b), Var = (b - a)² / 12.
        Here a = 0.5 × mean, b = 1.5 × mean, so Var = mean² / 12.

        Args:
            mean_repair_time: The mean repair time parameter.

        Returns:
            The theoretical variance.
        """
        spread = 1.5 * mean_repair_time - 0.5 * mean_repair_time
        return spread**2 / 12.0

    def reset(self, seed: Optional[int] = None) -> None:
        """Reset the RNG with a new or the same seed.

        Args:
            seed: New seed value. If None, uses the original seed.
        """
        if seed is not None:
            self.seed = seed
        self._rng = random.Random(self.seed)
