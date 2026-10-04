"""
Factory & Report management REST endpoints for FactoryServSim.

Provides:
- POST   /api/factories              -- Create a new factory
- GET    /api/factories              -- List all factories for the current user
- GET    /api/factories/{id}         -- Get a specific factory with its reports
- DELETE /api/factories/{id}         -- Delete a factory and all its reports
- POST   /api/factories/{id}/report  -- Save a simulation/optimization report
- GET    /api/factories/{id}/reports -- Get all reports for a factory

All routes require JWT authentication.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.db_models import Factory, Report, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/factories", tags=["factories"])


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class CreateFactoryRequest(BaseModel):
    """Schema for creating a new factory."""
    factory_name: str = Field(..., min_length=1, max_length=255, description="Name of the factory")


class FactoryResponse(BaseModel):
    """Schema for a factory in API responses."""
    id: int
    factory_name: str
    report_count: int = 0
    created_at: str


class SaveReportRequest(BaseModel):
    """Schema for saving a simulation/optimization report."""
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
        description="Optimized adjuster count per machine category (e.g. {'Lathe': 3, 'Drilling': 2})",
    )


class ReportResponse(BaseModel):
    """Schema for a report in API responses."""
    id: int
    report_type: str
    simulation_time: int
    machine_config: List[Dict[str, Any]]
    adjuster_config: List[Dict[str, Any]]
    results: Dict[str, Any]
    optimized_adjuster_counts: Optional[Dict[str, int]]
    machine_utilization_pct: Optional[float]
    adjuster_utilization_pct: Optional[float]
    created_at: str


class FactoryDetailResponse(BaseModel):
    """Schema for a factory with its reports."""
    id: int
    factory_name: str
    reports: List[ReportResponse]
    created_at: str


# ---------------------------------------------------------------------------
# Adjuster Validation Helpers
# ---------------------------------------------------------------------------

def validate_adjusters(adjuster_config: List[Dict[str, Any]]) -> None:
    """
    Validate adjuster business rules:
    1. Adjuster names must be unique (no duplicates).
    2. No two adjusters can have the exact same set of expertise.
       (e.g., if Adjuster1 has {Lathe, Drilling}, Adjuster2 cannot also
        have {Lathe, Drilling}, but can have {Lathe} or {Drilling} alone.)
    """
    # Rule 1: Check for duplicate adjuster names
    names = [adj.get("name", "") for adj in adjuster_config]
    seen_names = set()
    for name in names:
        if name.lower() in seen_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate adjuster name found: '{name}'. Each adjuster must have a unique name.",
            )
        seen_names.add(name.lower())

    # Rule 2: Check for duplicate expertise sets
    seen_expertise = []
    for adj in adjuster_config:
        expertise = adj.get("expertise", [])
        # Normalize: sort and convert to a frozen set for comparison
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
# Routes: Factory CRUD
# ---------------------------------------------------------------------------

@router.post("", response_model=FactoryResponse, status_code=status.HTTP_201_CREATED)
async def create_factory(
    request: CreateFactoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new factory for the current user.
    """
    factory = Factory(
        factory_name=request.factory_name,
        user_id=current_user.id,
    )
    db.add(factory)
    db.commit()
    db.refresh(factory)

    logger.info(
        "Factory created: '%s' by user '%s'",
        factory.factory_name,
        current_user.manager_name,
    )

    return FactoryResponse(
        id=factory.id,
        factory_name=factory.factory_name,
        report_count=0,
        created_at=factory.created_at.isoformat(),
    )


@router.get("", response_model=List[FactoryResponse])
async def list_factories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all factories owned by the current user.
    """
    factories = (
        db.query(Factory)
        .filter(Factory.user_id == current_user.id)
        .order_by(Factory.created_at.desc())
        .all()
    )

    return [
        FactoryResponse(
            id=f.id,
            factory_name=f.factory_name,
            report_count=len(f.reports),
            created_at=f.created_at.isoformat(),
        )
        for f in factories
    ]


@router.get("/{factory_id}", response_model=FactoryDetailResponse)
async def get_factory(
    factory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific factory with all its reports.
    """
    factory = (
        db.query(Factory)
        .filter(Factory.id == factory_id, Factory.user_id == current_user.id)
        .first()
    )

    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Factory not found",
        )

    reports = [
        ReportResponse(
            id=r.id,
            report_type=r.report_type,
            simulation_time=r.simulation_time,
            machine_config=r.get_machine_config(),
            adjuster_config=r.get_adjuster_config(),
            results=r.get_results(),
            optimized_adjuster_counts=r.get_optimized_counts() or None,
            machine_utilization_pct=r.machine_utilization_pct,
            adjuster_utilization_pct=r.adjuster_utilization_pct,
            created_at=r.created_at.isoformat(),
        )
        for r in factory.reports
    ]

    return FactoryDetailResponse(
        id=factory.id,
        factory_name=factory.factory_name,
        reports=reports,
        created_at=factory.created_at.isoformat(),
    )


@router.delete("/{factory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_factory(
    factory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a factory and all its reports.
    """
    factory = (
        db.query(Factory)
        .filter(Factory.id == factory_id, Factory.user_id == current_user.id)
        .first()
    )

    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Factory not found",
        )

    db.delete(factory)
    db.commit()

    logger.info("Factory deleted: id=%d by user '%s'", factory_id, current_user.manager_name)


# ---------------------------------------------------------------------------
# Routes: Reports
# ---------------------------------------------------------------------------

@router.post("/{factory_id}/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def save_report(
    factory_id: int,
    request: SaveReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save a simulation or optimization report for a factory.

    Validates adjuster business rules before saving:
    1. No duplicate adjuster names.
    2. No two adjusters can have the exact same expertise set.
    """
    # Verify factory belongs to current user
    factory = (
        db.query(Factory)
        .filter(Factory.id == factory_id, Factory.user_id == current_user.id)
        .first()
    )

    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Factory not found",
        )

    # Validate adjuster business rules
    validate_adjusters(request.adjuster_config)

    # Extract utilization metrics from results for quick access
    machine_util = None
    adjuster_util = None
    summary = request.results.get("summary", {})
    if summary:
        machine_util = summary.get("overall_machine_utilization_pct")
        adjuster_util = summary.get("overall_adjuster_utilization_pct")

    # Create report
    report = Report(
        factory_id=factory_id,
        report_type=request.report_type,
        simulation_time=request.simulation_time,
        machine_utilization_pct=machine_util,
        adjuster_utilization_pct=adjuster_util,
    )
    report.set_machine_config(request.machine_config)
    report.set_adjuster_config(request.adjuster_config)
    report.set_results(request.results)

    if request.optimized_adjuster_counts:
        report.set_optimized_counts(request.optimized_adjuster_counts)

    db.add(report)
    db.commit()
    db.refresh(report)

    logger.info(
        "Report saved: factory='%s', type='%s', id=%d",
        factory.factory_name,
        request.report_type,
        report.id,
    )

    return ReportResponse(
        id=report.id,
        report_type=report.report_type,
        simulation_time=report.simulation_time,
        machine_config=report.get_machine_config(),
        adjuster_config=report.get_adjuster_config(),
        results=report.get_results(),
        optimized_adjuster_counts=report.get_optimized_counts() or None,
        machine_utilization_pct=report.machine_utilization_pct,
        adjuster_utilization_pct=report.adjuster_utilization_pct,
        created_at=report.created_at.isoformat(),
    )


@router.get("/{factory_id}/reports", response_model=List[ReportResponse])
async def list_reports(
    factory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all reports for a specific factory.
    """
    factory = (
        db.query(Factory)
        .filter(Factory.id == factory_id, Factory.user_id == current_user.id)
        .first()
    )

    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Factory not found",
        )

    reports = (
        db.query(Report)
        .filter(Report.factory_id == factory_id)
        .order_by(Report.created_at.desc())
        .all()
    )

    return [
        ReportResponse(
            id=r.id,
            report_type=r.report_type,
            simulation_time=r.simulation_time,
            machine_config=r.get_machine_config(),
            adjuster_config=r.get_adjuster_config(),
            results=r.get_results(),
            optimized_adjuster_counts=r.get_optimized_counts() or None,
            machine_utilization_pct=r.machine_utilization_pct,
            adjuster_utilization_pct=r.adjuster_utilization_pct,
            created_at=r.created_at.isoformat(),
        )
        for r in reports
    ]
