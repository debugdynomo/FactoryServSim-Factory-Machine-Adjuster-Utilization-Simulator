"""
Pydantic schemas for FactoryServSim API data contracts.

Defines request/response models for:
- Factory configuration input (simulation & optimization)
- Simulation result output
- Optimization result output
- Streaming event payloads
- Preset factory profiles

All schemas adhere to the JSON contracts specified in guide.md.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class MachineState(str, Enum):
    """Possible states for a machine in the simulation."""
    RUNNING = "RUNNING"
    WAITING_FOR_REPAIR = "WAITING_FOR_REPAIR"
    UNDER_REPAIR = "UNDER_REPAIR"


class AdjusterState(str, Enum):
    """Possible states for an adjuster in the simulation."""
    IDLE = "IDLE"
    BUSY = "BUSY"


# ---------------------------------------------------------------------------
# Input Schemas (Request Bodies)
# ---------------------------------------------------------------------------

class MachineCategoryInput(BaseModel):
    """Schema for a single machine category in the factory configuration."""
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the machine category (e.g., Lathe, Turning, Drilling)",
    )
    count: int = Field(
        ...,
        ge=1,
        description="Number of machines in this category (must be >= 1)",
    )
    mttf: float = Field(
        ...,
        gt=0,
        description="Mean time to failure (positive value)",
    )
    mean_repair_time: float = Field(
        ...,
        gt=0,
        description="Mean repair time for machines in this category (positive value)",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Lathe",
                    "count": 200,
                    "mttf": 100,
                    "mean_repair_time": 10,
                }
            ]
        }
    }


class AdjusterInput(BaseModel):
    """Schema for a single adjuster in the factory configuration."""
    id: int = Field(..., ge=1, description="Unique adjuster identifier")
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Display name of the adjuster",
    )
    expertise: List[str] = Field(
        ...,
        min_length=1,
        description="List of machine category names this adjuster can repair",
    )

    @field_validator("expertise")
    @classmethod
    def expertise_must_be_non_empty_strings(cls, v: List[str]) -> List[str]:
        for item in v:
            if not item or not item.strip():
                raise ValueError("Each expertise entry must be a non-empty string")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Adjuster 1",
                    "expertise": ["Lathe", "Turning"],
                }
            ]
        }
    }


class FactoryConfigInput(BaseModel):
    """
    Full factory configuration request payload.

    Used by both POST /api/simulation/run and POST /api/simulation/optimize.
    """
    simulation_time: int = Field(
        ...,
        gt=0,
        le=1_000_000,
        description="Total simulation time units (must be > 0)",
    )
    machine_categories: List[MachineCategoryInput] = Field(
        ...,
        min_length=1,
        description="At least one machine category is required",
    )
    adjusters: List[AdjusterInput] = Field(
        ...,
        min_length=1,
        description="At least one adjuster is required",
    )

    @model_validator(mode="after")
    def validate_adjuster_expertise_matches_categories(self) -> "FactoryConfigInput":
        """Warn if adjuster expertise references unknown category names."""
        category_names = {cat.name for cat in self.machine_categories}
        for adjuster in self.adjusters:
            unknown = set(adjuster.expertise) - category_names
            if unknown:
                raise ValueError(
                    f"Adjuster '{adjuster.name}' has expertise in unknown categories: "
                    f"{unknown}. Available categories: {category_names}"
                )
        return self

    @model_validator(mode="after")
    def validate_unique_adjuster_ids(self) -> "FactoryConfigInput":
        """Ensure adjuster IDs are unique."""
        ids = [a.id for a in self.adjusters]
        if len(ids) != len(set(ids)):
            raise ValueError("Adjuster IDs must be unique")
        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "simulation_time": 10000,
                    "machine_categories": [
                        {"name": "Lathe", "count": 200, "mttf": 100, "mean_repair_time": 10},
                        {"name": "Turning", "count": 50, "mttf": 150, "mean_repair_time": 12},
                        {"name": "Drilling", "count": 80, "mttf": 80, "mean_repair_time": 8},
                        {"name": "Soldering", "count": 30, "mttf": 200, "mean_repair_time": 15},
                    ],
                    "adjusters": [
                        {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe", "Turning"]},
                        {"id": 2, "name": "Adjuster 2", "expertise": ["Drilling", "Soldering"]},
                        {"id": 3, "name": "Adjuster 3", "expertise": ["Lathe", "Drilling", "Turning"]},
                    ],
                }
            ]
        }
    }


# ---------------------------------------------------------------------------
# Output Schemas (Response Bodies)
# ---------------------------------------------------------------------------

class SummaryMetrics(BaseModel):
    """Top-level summary metrics from a simulation run."""
    total_simulation_time: int = Field(..., description="Total simulation time that was run")
    overall_machine_utilization_pct: float = Field(
        ...,
        ge=0,
        le=100,
        description="Overall machine utilization percentage (0-100)",
    )
    overall_adjuster_utilization_pct: float = Field(
        ...,
        ge=0,
        le=100,
        description="Overall adjuster utilization percentage (0-100)",
    )
    avg_queue_wait_time: float = Field(
        ...,
        ge=0,
        description="Average time a machine waits in queue before repair",
    )
    total_failures_handled: int = Field(
        ...,
        ge=0,
        description="Total number of machine failures handled during simulation",
    )


class CategoryMetrics(BaseModel):
    """Per-category utilization metrics from a simulation run."""
    category: str = Field(..., description="Machine category name")
    utilization_pct: float = Field(
        ...,
        ge=0,
        le=100,
        description="Utilization percentage for this category (0-100)",
    )
    total_failures: int = Field(
        ...,
        ge=0,
        description="Total failures observed for this category",
    )


class AdjusterMetrics(BaseModel):
    """Per-adjuster utilization metrics from a simulation run."""
    id: int = Field(..., description="Adjuster identifier")
    name: str = Field(..., description="Adjuster display name")
    busy_time_pct: float = Field(
        ...,
        ge=0,
        le=100,
        description="Percentage of time the adjuster was busy (0-100)",
    )
    repairs_completed: int = Field(
        ...,
        ge=0,
        description="Total repairs this adjuster completed",
    )


class SimulationResultOutput(BaseModel):
    """
    Complete simulation result response.

    Returned by POST /api/simulation/run.
    Contract defined in guide.md section 'Simulation Results Response'.
    """
    summary: SummaryMetrics
    category_metrics: List[CategoryMetrics]
    adjuster_metrics: List[AdjusterMetrics]

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "summary": {
                        "total_simulation_time": 10000,
                        "overall_machine_utilization_pct": 88.42,
                        "overall_adjuster_utilization_pct": 93.15,
                        "avg_queue_wait_time": 3.84,
                        "total_failures_handled": 12430,
                    },
                    "category_metrics": [
                        {"category": "Lathe", "utilization_pct": 87.1, "total_failures": 7200},
                        {"category": "Turning", "utilization_pct": 91.5, "total_failures": 1410},
                    ],
                    "adjuster_metrics": [
                        {"id": 1, "name": "Adjuster 1", "busy_time_pct": 94.2, "repairs_completed": 4210},
                        {"id": 2, "name": "Adjuster 2", "busy_time_pct": 92.1, "repairs_completed": 3980},
                    ],
                }
            ]
        }
    }


# ---------------------------------------------------------------------------
# Optimization Schemas
# ---------------------------------------------------------------------------

class TradeoffPoint(BaseModel):
    """A single point on the adjuster count vs. utilization tradeoff curve."""
    adjuster_count: int = Field(..., ge=1, description="Number of adjusters evaluated")
    machine_utilization: float = Field(
        ...,
        ge=0,
        le=100,
        description="Machine utilization at this adjuster count (0-100)",
    )
    adjuster_utilization: float = Field(
        ...,
        ge=0,
        le=100,
        description="Adjuster utilization at this adjuster count (0-100)",
    )


class OptimizationResultOutput(BaseModel):
    """
    Staffing optimization result response.

    Returned by POST /api/simulation/optimize.
    Contract defined in guide.md section 'Optimizer Request & Response'.
    """
    optimum_adjuster_count: int = Field(
        ...,
        ge=1,
        description="Recommended optimum number of adjusters",
    )
    tradeoff_curve: List[TradeoffPoint] = Field(
        ...,
        description="List of utilization tradeoff points across adjuster counts",
    )
    recommendation_reason: str = Field(
        ...,
        min_length=1,
        description="Human-readable explanation for the recommendation",
    )
    per_category_adjusters: Optional[dict] = Field(
        default=None,
        description="Recommended number of adjusters per machine category (e.g. {'Lathe': 3, 'Drilling': 2})",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "optimum_adjuster_count": 6,
                    "tradeoff_curve": [
                        {"adjuster_count": 2, "machine_utilization": 64.2, "adjuster_utilization": 99.8},
                        {"adjuster_count": 4, "machine_utilization": 83.5, "adjuster_utilization": 94.2},
                        {"adjuster_count": 6, "machine_utilization": 93.8, "adjuster_utilization": 82.1},
                        {"adjuster_count": 8, "machine_utilization": 95.1, "adjuster_utilization": 64.0},
                    ],
                    "recommendation_reason": (
                        "6 adjusters provides 93.8% machine uptime. "
                        "Adding 2 more adjusters yields only +1.3% uptime at 64% worker utilization."
                    ),
                    "per_category_adjusters": {"Lathe": 3, "Drilling": 2, "Soldering": 1},
                }
            ]
        }
    }


# ---------------------------------------------------------------------------
# Streaming / WebSocket Event Schemas
# ---------------------------------------------------------------------------

class StreamTickEvent(BaseModel):
    """Schema for a single tick event sent over WebSocket/SSE."""
    tick: int = Field(..., ge=0, description="Current simulation tick number")
    simulation_time: float = Field(..., ge=0, description="Current simulation time")
    running_machines: int = Field(..., ge=0, description="Count of machines currently running")
    waiting_machines: int = Field(..., ge=0, description="Count of machines waiting for repair")
    repairing_machines: int = Field(..., ge=0, description="Count of machines under repair")
    idle_adjusters: int = Field(..., ge=0, description="Count of idle adjusters")
    busy_adjusters: int = Field(..., ge=0, description="Count of busy adjusters")
    queue_type: str = Field(
        ...,
        description="Which queue is active: 'machines' or 'adjusters' (single-queue invariant)",
    )
    queue_length: int = Field(..., ge=0, description="Length of the active queue")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "tick": 42,
                    "simulation_time": 420.5,
                    "running_machines": 340,
                    "waiting_machines": 12,
                    "repairing_machines": 8,
                    "idle_adjusters": 0,
                    "busy_adjusters": 3,
                    "queue_type": "machines",
                    "queue_length": 12,
                }
            ]
        }
    }


class StreamCompleteEvent(BaseModel):
    """Schema for the final event when streaming simulation completes."""
    status: str = Field(default="complete", description="Stream completion status")
    result: SimulationResultOutput = Field(..., description="Final simulation results")


# ---------------------------------------------------------------------------
# Preset Schemas
# ---------------------------------------------------------------------------

class PresetCategory(BaseModel):
    """Machine category within a preset configuration."""
    name: str
    count: int = Field(..., ge=1)
    mttf: float = Field(..., gt=0)
    mean_repair_time: float = Field(..., gt=0)


class PresetAdjuster(BaseModel):
    """Adjuster within a preset configuration."""
    id: int = Field(..., ge=1)
    name: str
    expertise: List[str]


class PresetProfile(BaseModel):
    """A single factory preset / benchmark profile."""
    id: str = Field(..., description="Unique identifier for the preset")
    name: str = Field(..., description="Human-readable preset name")
    description: Optional[str] = Field(None, description="Optional description of the factory profile")
    simulation_time: int = Field(default=10000, gt=0, description="Default simulation time for this preset")
    machine_categories: List[PresetCategory]
    adjusters: List[PresetAdjuster]


class PresetListResponse(BaseModel):
    """Response model for GET /api/simulation/presets."""
    presets: List[PresetProfile]
