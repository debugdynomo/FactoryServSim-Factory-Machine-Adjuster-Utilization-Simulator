"""
Factory & Report management REST endpoints for FactoryServSim.

Provides:
- POST   /api/factories              -- Create a new factory
- GET    /api/factories              -- List all factories for the current user
- GET    /api/factories/history      -- Get all simulation/optimization report history across factories
- GET    /api/factories/{id}         -- Get a specific factory with its reports
- DELETE /api/factories/{id}         -- Delete a factory and all its reports
- POST   /api/factories/{id}/report  -- Save a simulation/optimization report
- GET    /api/factories/{id}/reports -- Get all reports for a factory

All routes require JWT authentication.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.repository import (
    list_user_factories,
    create_factory_doc,
    get_factory_by_id,
    delete_factory_doc,
    save_report_doc,
    get_factory_reports,
    get_all_manager_reports_history,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/factories", tags=["factories"])


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class CreateFactoryRequest(BaseModel):
    factory_name: str = Field(..., min_length=1, max_length=255, description="Name of the factory")


class FactoryResponse(BaseModel):
    id: str
    factory_name: str
    report_count: int = 0
    created_at: str


class SaveReportRequest(BaseModel):
    report_name: Optional[str] = Field(default=None, description="Optional custom name for this saved report")
    report_type: str = Field(
        default="simulation",
        description="Type of report: 'simulation' or 'optimization'",
    )
    simulation_time: int = Field(..., gt=0, description="Simulation time used")
    machine_config: List[Dict[str, Any]] = Field(
        ..., description="Machine categories configuration"
    )
    adjuster_config: List[Dict[str, Any]] = Field(
        ..., description="Adjusters configuration"
    )
    results: Dict[str, Any] = Field(
        ..., description="Full simulation or optimization results"
    )
    optimized_adjuster_counts: Optional[Dict[str, int]] = Field(
        default=None,
        description="Optimized adjuster count per machine category",
    )
    per_adjuster_counts: Optional[Dict[str, int]] = Field(
        default=None,
        description="Optimized quantity per adjuster profile",
    )


class ReportResponse(BaseModel):
    id: str
    report_name: Optional[str] = None
    factory_id: Optional[str] = None
    factory_name: Optional[str] = None
    report_type: str
    simulation_time: int
    machine_config: List[Dict[str, Any]]
    adjuster_config: List[Dict[str, Any]]
    results: Dict[str, Any]
    optimized_adjuster_counts: Optional[Dict[str, int]] = None
    per_adjuster_counts: Optional[Dict[str, int]] = None
    machine_utilization_pct: Optional[float] = None
    adjuster_utilization_pct: Optional[float] = None
    created_at: str


class FactoryDetailResponse(BaseModel):
    id: str
    factory_name: str
    reports: List[ReportResponse]
    created_at: str


# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------

def validate_adjusters(adjuster_config: List[Dict[str, Any]]) -> None:
    seen_names = set()
    for adj in adjuster_config:
        name = adj.get("name", "")
        if name.lower() in seen_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate adjuster name found: '{name}'. Each adjuster must have a unique name.",
            )
        seen_names.add(name.lower())

    seen_expertise = []
    for adj in adjuster_config:
        expertise = adj.get("expertise", [])
        expertise_set = frozenset(e.lower() for e in expertise)

        if expertise_set in seen_expertise:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Adjuster '{adj.get('name', 'Unknown')}' has the same expertise set "
                    f"{sorted(expertise)} as another adjuster. "
                    f"No two adjusters can share the exact same expertise combination."
                ),
            )
        seen_expertise.append(expertise_set)


# ---------------------------------------------------------------------------
# Routes: Factory CRUD & History
# ---------------------------------------------------------------------------

@router.post("", response_model=FactoryResponse, status_code=status.HTTP_201_CREATED)
async def create_factory(
    request: CreateFactoryRequest,
    current_user: dict = Depends(get_current_user),
):
    doc = create_factory_doc(current_user["factory_id"], request.factory_name)
    logger.info("Factory created: '%s' by user '%s' (factory: %s)", doc["factory_name"], current_user["manager_name"], current_user["factory_id"])
    return FactoryResponse(
        id=str(doc["id"]),
        factory_name=doc["factory_name"],
        report_count=0,
        created_at=doc["created_at"],
    )


@router.get("", response_model=List[FactoryResponse])
async def list_factories(
    current_user: dict = Depends(get_current_user),
):
    factories = list_user_factories(current_user["factory_id"])
    return [
        FactoryResponse(
            id=str(f["id"]),
            factory_name=f["factory_name"],
            report_count=f.get("report_count", 0),
            created_at=str(f["created_at"]),
        )
        for f in factories
    ]


@router.get("/history", response_model=List[ReportResponse])
async def get_manager_history(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns full history of all saved simulation & optimization reports
    for the logged-in manager across all factories.
    """
    reports = get_all_manager_reports_history(current_user["factory_id"])
    return [
        ReportResponse(
            id=str(r["id"]),
            report_name=r.get("report_name"),
            factory_id=str(r.get("factory_id", "")),
            factory_name=r.get("factory_name"),
            report_type=r["report_type"],
            simulation_time=r["simulation_time"],
            machine_config=r.get("machine_config", []),
            adjuster_config=r.get("adjuster_config", []),
            results=r.get("results", {}),
            optimized_adjuster_counts=r.get("optimized_adjuster_counts"),
            per_adjuster_counts=r.get("per_adjuster_counts"),
            machine_utilization_pct=r.get("machine_utilization_pct"),
            adjuster_utilization_pct=r.get("adjuster_utilization_pct"),
            created_at=str(r["created_at"]),
        )
        for r in reports
    ]


@router.get("/{factory_id}", response_model=FactoryDetailResponse)
async def get_factory(
    factory_id: str,
    current_user: dict = Depends(get_current_user),
):
    factory = get_factory_by_id(factory_id, current_user["factory_id"])
    if not factory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factory not found")

    reports = get_factory_reports(factory_id)
    return FactoryDetailResponse(
        id=str(factory["id"]),
        factory_name=factory["factory_name"],
        reports=[
            ReportResponse(
                id=str(r["id"]),
                report_name=r.get("report_name"),
                factory_id=factory_id,
                report_type=r["report_type"],
                simulation_time=r["simulation_time"],
                machine_config=r.get("machine_config", []),
                adjuster_config=r.get("adjuster_config", []),
                results=r.get("results", {}),
                optimized_adjuster_counts=r.get("optimized_adjuster_counts"),
                per_adjuster_counts=r.get("per_adjuster_counts"),
                machine_utilization_pct=r.get("machine_utilization_pct"),
                adjuster_utilization_pct=r.get("adjuster_utilization_pct"),
                created_at=str(r["created_at"]),
            )
            for r in reports
        ],
        created_at=str(factory["created_at"]),
    )


@router.delete("/{factory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_factory(
    factory_id: str,
    current_user: dict = Depends(get_current_user),
):
    success = delete_factory_doc(factory_id, current_user["factory_id"])
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factory not found")
    logger.info("Factory deleted: %s by user %s (factory: %s)", factory_id, current_user["manager_name"], current_user["factory_id"])


# ---------------------------------------------------------------------------
# Routes: Save & List Reports for a Specific Factory
# ---------------------------------------------------------------------------

@router.post("/{factory_id}/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def save_report(
    factory_id: str,
    request: SaveReportRequest,
    current_user: dict = Depends(get_current_user),
):
    factory = get_factory_by_id(factory_id, current_user["factory_id"])
    if not factory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factory not found")

    validate_adjusters(request.adjuster_config)

    report_data = {
        "report_name": request.report_name or f"{request.report_type.capitalize()} Snapshot ({factory['factory_name']})",
        "report_type": request.report_type,
        "simulation_time": request.simulation_time,
        "machine_config": request.machine_config,
        "adjuster_config": request.adjuster_config,
        "results": request.results,
        "optimized_adjuster_counts": request.optimized_adjuster_counts,
        "per_adjuster_counts": request.per_adjuster_counts,
    }

    doc = save_report_doc(factory_id, current_user["factory_id"], report_data)
    logger.info("Report saved: factory='%s', id=%s", factory["factory_name"], doc["id"])

    return ReportResponse(
        id=str(doc["id"]),
        report_name=doc.get("report_name"),
        factory_id=factory_id,
        factory_name=factory["factory_name"],
        report_type=doc["report_type"],
        simulation_time=doc["simulation_time"],
        machine_config=doc["machine_config"],
        adjuster_config=doc["adjuster_config"],
        results=doc["results"],
        optimized_adjuster_counts=doc.get("optimized_adjuster_counts"),
        per_adjuster_counts=doc.get("per_adjuster_counts"),
        machine_utilization_pct=doc.get("machine_utilization_pct"),
        adjuster_utilization_pct=doc.get("adjuster_utilization_pct"),
        created_at=str(doc["created_at"]),
    )


@router.get("/{factory_id}/reports", response_model=List[ReportResponse])
async def list_reports(
    factory_id: str,
    current_user: dict = Depends(get_current_user),
):
    factory = get_factory_by_id(factory_id, current_user["factory_id"])
    if not factory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factory not found")

    reports = get_factory_reports(factory_id)
    return [
        ReportResponse(
            id=str(r["id"]),
            report_name=r.get("report_name"),
            factory_id=factory_id,
            factory_name=factory["factory_name"],
            report_type=r["report_type"],
            simulation_time=r["simulation_time"],
            machine_config=r.get("machine_config", []),
            adjuster_config=r.get("adjuster_config", []),
            results=r.get("results", {}),
            optimized_adjuster_counts=r.get("optimized_adjuster_counts"),
            per_adjuster_counts=r.get("per_adjuster_counts"),
            machine_utilization_pct=r.get("machine_utilization_pct"),
            adjuster_utilization_pct=r.get("adjuster_utilization_pct"),
            created_at=str(r["created_at"]),
        )
        for r in reports
    ]
