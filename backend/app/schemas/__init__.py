"""
Schemas package for FactoryServSim API.

Exports all Pydantic models used across the application.
"""

from .payload import (
    # Enums
    MachineState,
    AdjusterState,
    # Input schemas
    MachineCategoryInput,
    AdjusterInput,
    FactoryConfigInput,
    # Output schemas — Simulation
    SummaryMetrics,
    CategoryMetrics,
    AdjusterMetrics,
    SimulationResultOutput,
    # Output schemas — Optimization
    TradeoffPoint,
    OptimizationResultOutput,
    # Streaming schemas
    StreamTickEvent,
    StreamCompleteEvent,
    # Preset schemas
    PresetCategory,
    PresetAdjuster,
    PresetProfile,
    PresetListResponse,
)

__all__ = [
    "MachineState",
    "AdjusterState",
    "MachineCategoryInput",
    "AdjusterInput",
    "FactoryConfigInput",
    "SummaryMetrics",
    "CategoryMetrics",
    "AdjusterMetrics",
    "SimulationResultOutput",
    "TradeoffPoint",
    "OptimizationResultOutput",
    "StreamTickEvent",
    "StreamCompleteEvent",
    "PresetCategory",
    "PresetAdjuster",
    "PresetProfile",
    "PresetListResponse",
]
