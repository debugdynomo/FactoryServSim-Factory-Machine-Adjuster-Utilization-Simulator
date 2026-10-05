"""
Unified data repository supporting MongoDB as primary with SQLite fallback.
Provides clean dictionary-based abstractions for Users, Factories, and Reports.

Data is stored per factory_id, NOT per user email. This ensures that when a
manager leaves and a new one registers with the same factory_id, all historical
data (factories, reports) persists.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from bson import ObjectId

from app.database import get_mongo_db, SessionLocal
from app.models.db_models import User as SqlUser, Factory as SqlFactory, Report as SqlReport

logger = logging.getLogger(__name__)


def _serialize_id(val: Any) -> str:
    """Helper to ensure ID is cleanly serializable as string or int."""
    if isinstance(val, ObjectId):
        return str(val)
    return str(val)


# ---------------------------------------------------------------------------
# User Data Access
# ---------------------------------------------------------------------------

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Legacy lookup by email only. Used for backward compatibility."""
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        user = mongo_db.users.find_one({"email": email})
        if user:
            user["id"] = _serialize_id(user["_id"])
            return user
        return None

    # SQLite fallback
    with SessionLocal() as db:
        u = db.query(SqlUser).filter(SqlUser.email == email).first()
        if u:
            return {
                "id": str(u.id),
                "email": u.email,
                "hashed_password": u.hashed_password,
                "manager_name": u.manager_name,
                "factory_id": getattr(u, 'factory_id', ''),
                "factory_name": getattr(u, 'factory_name', ''),
                "created_at": u.created_at.isoformat() if u.created_at else "",
            }
        return None


def find_user_by_factory_and_email(factory_id: str, email: str) -> Optional[Dict[str, Any]]:
    """Find a user by both factory_id AND email."""
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        user = mongo_db.users.find_one({"factory_id": factory_id, "email": email})
        if user:
            user["id"] = _serialize_id(user["_id"])
            return user
        return None

    # SQLite fallback
    with SessionLocal() as db:
        u = db.query(SqlUser).filter(SqlUser.email == email).first()
        if u and getattr(u, 'factory_id', '') == factory_id:
            return {
                "id": str(u.id),
                "email": u.email,
                "hashed_password": u.hashed_password,
                "manager_name": u.manager_name,
                "factory_id": getattr(u, 'factory_id', ''),
                "factory_name": getattr(u, 'factory_name', ''),
                "created_at": u.created_at.isoformat() if u.created_at else "",
            }
        return None


def create_user(factory_id: str, factory_name: str, email: str, hashed_password: str, manager_name: str) -> Dict[str, Any]:
    mongo_db = get_mongo_db()
    now = datetime.now(timezone.utc)
    if mongo_db is not None:
        doc = {
            "factory_id": factory_id,
            "factory_name": factory_name,
            "email": email,
            "hashed_password": hashed_password,
            "manager_name": manager_name,
            "created_at": now,
        }
        res = mongo_db.users.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        return doc

    # SQLite fallback
    with SessionLocal() as db:
        u = SqlUser(email=email, hashed_password=hashed_password, manager_name=manager_name)
        db.add(u)
        db.commit()
        db.refresh(u)
        return {
            "id": str(u.id),
            "email": u.email,
            "hashed_password": u.hashed_password,
            "manager_name": u.manager_name,
            "factory_id": factory_id,
            "factory_name": factory_name,
            "created_at": u.created_at.isoformat() if u.created_at else "",
        }


# ---------------------------------------------------------------------------
# Factory Data Access (keyed by factory_id from user registration)
# ---------------------------------------------------------------------------

def list_user_factories(factory_id: str) -> List[Dict[str, Any]]:
    """List all factory profiles for a given factory_id."""
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        cursor = mongo_db.factories.find({"factory_id": factory_id}).sort("created_at", -1)
        results = []
        for doc in cursor:
            doc_id = str(doc["_id"])
            rep_count = mongo_db.reports.count_documents({"factory_doc_id": doc_id})
            results.append({
                "id": doc_id,
                "factory_name": doc["factory_name"],
                "report_count": rep_count,
                "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at")),
            })
        return results

    # SQLite fallback
    with SessionLocal() as db:
        factories = db.query(SqlFactory).order_by(SqlFactory.created_at.desc()).all()
        return [
            {
                "id": str(f.id),
                "factory_name": f.factory_name,
                "report_count": len(f.reports),
                "created_at": f.created_at.isoformat() if f.created_at else "",
            }
            for f in factories
        ]


def create_factory_doc(factory_id: str, factory_name: str) -> Dict[str, Any]:
    """Create a new factory profile document tied to the user's factory_id."""
    mongo_db = get_mongo_db()
    now = datetime.now(timezone.utc)
    if mongo_db is not None:
        doc = {
            "factory_name": factory_name,
            "factory_id": factory_id,
            "created_at": now,
        }
        res = mongo_db.factories.insert_one(doc)
        return {
            "id": str(res.inserted_id),
            "factory_name": factory_name,
            "report_count": 0,
            "created_at": now.isoformat(),
        }

    # SQLite fallback
    with SessionLocal() as db:
        f = SqlFactory(factory_name=factory_name, user_id=1)
        db.add(f)
        db.commit()
        db.refresh(f)
        return {
            "id": str(f.id),
            "factory_name": f.factory_name,
            "report_count": 0,
            "created_at": f.created_at.isoformat() if f.created_at else "",
        }


def get_factory_by_id(factory_doc_id: str, factory_id: str) -> Optional[Dict[str, Any]]:
    """Get a factory profile by its document ID, scoped to the user's factory_id."""
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            oid = ObjectId(factory_doc_id)
            doc = mongo_db.factories.find_one({"_id": oid, "factory_id": factory_id})
        except Exception:
            doc = mongo_db.factories.find_one({"_id": factory_doc_id, "factory_id": factory_id})

        if doc:
            return {
                "id": str(doc["_id"]),
                "factory_name": doc["factory_name"],
                "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at")),
            }
        return None

    # SQLite fallback
    with SessionLocal() as db:
        try:
            fid = int(factory_doc_id)
        except ValueError:
            return None
        f = db.query(SqlFactory).filter(SqlFactory.id == fid).first()
        if f:
            return {
                "id": str(f.id),
                "factory_name": f.factory_name,
                "created_at": f.created_at.isoformat() if f.created_at else "",
            }
        return None


def delete_factory_doc(factory_doc_id: str, factory_id: str) -> bool:
    """Delete a factory profile and all its reports, scoped to factory_id."""
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            oid = ObjectId(factory_doc_id)
            res = mongo_db.factories.delete_one({"_id": oid, "factory_id": factory_id})
        except Exception:
            res = mongo_db.factories.delete_one({"_id": factory_doc_id, "factory_id": factory_id})
        if res.deleted_count > 0:
            mongo_db.reports.delete_many({"factory_doc_id": factory_doc_id})
            return True
        return False

    # SQLite fallback
    with SessionLocal() as db:
        try:
            fid = int(factory_doc_id)
        except ValueError:
            return False
        f = db.query(SqlFactory).filter(SqlFactory.id == fid).first()
        if f:
            db.delete(f)
            db.commit()
            return True
        return False


# ---------------------------------------------------------------------------
# Reports Data Access & History
# ---------------------------------------------------------------------------

def save_report_doc(factory_doc_id: str, factory_id: str, report_data: Dict[str, Any]) -> Dict[str, Any]:
    """Save a simulation/optimization report, keyed by factory_id for persistence."""
    mongo_db = get_mongo_db()
    now = datetime.now(timezone.utc)
    machine_util = None
    adjuster_util = None
    summary = report_data.get("results", {}).get("summary", {})
    if summary:
        machine_util = summary.get("overall_machine_utilization_pct")
        adjuster_util = summary.get("overall_adjuster_utilization_pct")

    if mongo_db is not None:
        doc = {
            "factory_doc_id": factory_doc_id,
            "factory_id": factory_id,
            "report_name": report_data.get("report_name") or f"{report_data.get('report_type', 'Simulation').capitalize()} Report",
            "report_type": report_data.get("report_type", "simulation"),
            "simulation_time": report_data["simulation_time"],
            "machine_config": report_data["machine_config"],
            "adjuster_config": report_data["adjuster_config"],
            "results": report_data["results"],
            "optimized_adjuster_counts": report_data.get("optimized_adjuster_counts"),
            "per_adjuster_counts": report_data.get("per_adjuster_counts"),
            "machine_utilization_pct": machine_util,
            "adjuster_utilization_pct": adjuster_util,
            "created_at": now,
        }
        res = mongo_db.reports.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        doc["created_at"] = now.isoformat()
        return doc

    # SQLite fallback
    with SessionLocal() as db:
        fid = int(factory_doc_id)
        rep = SqlReport(
            factory_id=fid,
            report_type=report_data.get("report_type", "simulation"),
            simulation_time=report_data["simulation_time"],
            machine_utilization_pct=machine_util,
            adjuster_utilization_pct=adjuster_util,
        )
        rep.set_machine_config(report_data["machine_config"])
        rep.set_adjuster_config(report_data["adjuster_config"])
        rep.set_results(report_data["results"])
        if report_data.get("optimized_adjuster_counts"):
            rep.set_optimized_counts(report_data["optimized_adjuster_counts"])

        db.add(rep)
        db.commit()
        db.refresh(rep)

        return {
            "id": str(rep.id),
            "report_name": report_data.get("report_name") or f"{rep.report_type.capitalize()} Report",
            "report_type": rep.report_type,
            "simulation_time": rep.simulation_time,
            "machine_config": rep.get_machine_config(),
            "adjuster_config": rep.get_adjuster_config(),
            "results": rep.get_results(),
            "optimized_adjuster_counts": rep.get_optimized_counts() or None,
            "per_adjuster_counts": report_data.get("per_adjuster_counts"),
            "machine_utilization_pct": rep.machine_utilization_pct,
            "adjuster_utilization_pct": rep.adjuster_utilization_pct,
            "created_at": rep.created_at.isoformat() if rep.created_at else now.isoformat(),
        }


def get_factory_reports(factory_doc_id: str) -> List[Dict[str, Any]]:
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        cursor = mongo_db.reports.find({"factory_doc_id": factory_doc_id}).sort("created_at", -1)
        results = []
        for doc in cursor:
            results.append({
                "id": str(doc["_id"]),
                "report_name": doc.get("report_name") or f"{doc.get('report_type', 'Report').capitalize()} Run",
                "report_type": doc.get("report_type", "simulation"),
                "simulation_time": doc["simulation_time"],
                "machine_config": doc.get("machine_config", []),
                "adjuster_config": doc.get("adjuster_config", []),
                "results": doc.get("results", {}),
                "optimized_adjuster_counts": doc.get("optimized_adjuster_counts"),
                "per_adjuster_counts": doc.get("per_adjuster_counts"),
                "machine_utilization_pct": doc.get("machine_utilization_pct"),
                "adjuster_utilization_pct": doc.get("adjuster_utilization_pct"),
                "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at")),
            })
        return results

    # SQLite fallback
    with SessionLocal() as db:
        try:
            fid = int(factory_doc_id)
        except ValueError:
            return []
        reps = db.query(SqlReport).filter(SqlReport.factory_id == fid).order_by(SqlReport.created_at.desc()).all()
        return [
            {
                "id": str(r.id),
                "report_name": f"{r.report_type.capitalize()} Run #{r.id}",
                "report_type": r.report_type,
                "simulation_time": r.simulation_time,
                "machine_config": r.get_machine_config(),
                "adjuster_config": r.get_adjuster_config(),
                "results": r.get_results(),
                "optimized_adjuster_counts": r.get_optimized_counts() or None,
                "per_adjuster_counts": None,
                "machine_utilization_pct": r.machine_utilization_pct,
                "adjuster_utilization_pct": r.adjuster_utilization_pct,
                "created_at": r.created_at.isoformat() if r.created_at else "",
            }
            for r in reps
        ]


def get_all_manager_reports_history(factory_id: str) -> List[Dict[str, Any]]:
    """Returns complete chronological report history across all factory profiles for this factory_id."""
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        cursor = mongo_db.reports.find({"factory_id": factory_id}).sort("created_at", -1)
        results = []
        for doc in cursor:
            # Look up factory name for clarity
            factory_name = "Factory"
            try:
                fid = doc.get("factory_doc_id")
                fdoc = mongo_db.factories.find_one({"_id": ObjectId(fid)}) if ObjectId.is_valid(fid) else mongo_db.factories.find_one({"_id": fid})
                if fdoc:
                    factory_name = fdoc.get("factory_name", "Factory")
            except Exception:
                pass

            results.append({
                "id": str(doc["_id"]),
                "factory_id": str(doc.get("factory_doc_id", doc.get("factory_id"))),
                "factory_name": factory_name,
                "report_name": doc.get("report_name") or f"{doc.get('report_type', 'Simulation').capitalize()} Report",
                "report_type": doc.get("report_type", "simulation"),
                "simulation_time": doc["simulation_time"],
                "machine_config": doc.get("machine_config", []),
                "adjuster_config": doc.get("adjuster_config", []),
                "results": doc.get("results", {}),
                "optimized_adjuster_counts": doc.get("optimized_adjuster_counts"),
                "per_adjuster_counts": doc.get("per_adjuster_counts"),
                "machine_utilization_pct": doc.get("machine_utilization_pct"),
                "adjuster_utilization_pct": doc.get("adjuster_utilization_pct"),
                "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at")),
            })
        return results

    # SQLite fallback
    with SessionLocal() as db:
        factories = db.query(SqlFactory).all()
        f_map = {f.id: f.factory_name for f in factories}
        factory_ids = list(f_map.keys())
        if not factory_ids:
            return []

        reps = db.query(SqlReport).filter(SqlReport.factory_id.in_(factory_ids)).order_by(SqlReport.created_at.desc()).all()
        return [
            {
                "id": str(r.id),
                "factory_id": str(r.factory_id),
                "factory_name": f_map.get(r.factory_id, "Factory"),
                "report_name": f"{r.report_type.capitalize()} Run #{r.id}",
                "report_type": r.report_type,
                "simulation_time": r.simulation_time,
                "machine_config": r.get_machine_config(),
                "adjuster_config": r.get_adjuster_config(),
                "results": r.get_results(),
                "optimized_adjuster_counts": r.get_optimized_counts() or None,
                "per_adjuster_counts": None,
                "machine_utilization_pct": r.machine_utilization_pct,
                "adjuster_utilization_pct": r.adjuster_utilization_pct,
                "created_at": r.created_at.isoformat() if r.created_at else "",
            }
            for r in reps
        ]
