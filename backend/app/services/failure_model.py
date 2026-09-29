"""
Failure Model — Uniform MTTF Stochastic Failure Time Generator

Generates failure times for machines using a continuous uniform distribution
centered around the Mean Time To Failure (MTTF):

    failure_time ~ U(0, 2 × MTTF)

This ensures the expected failure time equals MTTF while introducing
stochastic variability across individual machines.

Author: Person 2 (Kiran)
Module: backend/app/services/failure_model.py
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FailureModel:
    """Generates stochastic failure times using a uniform distribution.

    The uniform distribution U(0, 2 × MTTF) is used so that:
        - E[failure_time] = MTTF
        - Var[failure_time] = (2 × MTTF)² / 12
        - All failure times are non-negative

    Attributes:
        seed: Optional random seed for reproducibility.
        _rng: Internal random number generator instance.
    """

    seed: Optional[int] = None
    _rng: random.Random = field(init=False, repr=False)

    def __post_init__(self) -> None:
        """Initialize the internal RNG with the given seed."""
        self._rng = random.Random(self.seed)

    def generate_failure_time(self, mttf: float) -> float:
        """Generate a single failure time from U(0, 2 × MTTF).

        Args:
            mttf: Mean Time To Failure for the machine category.
                  Must be a positive number.

        Returns:
            A random failure time drawn from the uniform distribution.

        Raises:
            ValueError: If mttf is not positive.
        """
        if mttf <= 0:
            raise ValueError(f"MTTF must be positive, got {mttf}")

        return self._rng.uniform(0.0, 2.0 * mttf)

    def generate_failure_times(self, mttf: float, count: int) -> list[float]:
        """Generate multiple failure times for a machine category.

        Args:
            mttf: Mean Time To Failure for the machine category.
            count: Number of failure times to generate.

        Returns:
            A list of random failure times.

        Raises:
            ValueError: If mttf is not positive or count is not positive.
        """
        if count <= 0:
            raise ValueError(f"Count must be positive, got {count}")

        return [self.generate_failure_time(mttf) for _ in range(count)]

    def expected_mean(self, mttf: float) -> float:
        """Return the theoretical expected mean of the distribution.

        For U(0, 2 × MTTF), the expected value is MTTF.

        Args:
            mttf: Mean Time To Failure.

        Returns:
            The theoretical mean (equal to MTTF).
        """
        return mttf

    def expected_variance(self, mttf: float) -> float:
        """Return the theoretical variance of the distribution.

        For U(0, 2 × MTTF), the variance is (2 × MTTF)² / 12.

        Args:
            mttf: Mean Time To Failure.

        Returns:
            The theoretical variance.
        """
        return (2.0 * mttf) ** 2 / 12.0

    def reset(self, seed: Optional[int] = None) -> None:
        """Reset the RNG with a new or the same seed.

        Args:
            seed: New seed value. If None, uses the original seed.
        """
        if seed is not None:
            self.seed = seed
        self._rng = random.Random(self.seed)
