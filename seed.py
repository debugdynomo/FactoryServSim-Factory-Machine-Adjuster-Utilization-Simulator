import os
import sys
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from app.database import get_mongo_db
from app.auth import hash_password
from app.repository import (
    create_user, 
    create_factory_doc, 
    save_report_doc, 
    upsert_adjuster_category
)

db = get_mongo_db()
if not db:
    print("MongoDB not available!")
    sys.exit(1)

def seed():
    print("Clearing old data...")
    db.users.delete_many({"factory_id": {"$in": ["STARK01", "WAYNE01"]}})
    db.factories.delete_many({"factory_id": {"$in": ["STARK01", "WAYNE01"]}})
    db.reports.delete_many({"factory_id": {"$in": ["STARK01", "WAYNE01"]}})
    db.adjuster_categories.delete_many({"factory_id": {"$in": ["STARK01", "WAYNE01"]}})

    print("Seeding Stark Industries...")
    # Owner
    create_user("STARK01", "Stark Industries", "tony@stark.com", hash_password("password123"), "Tony Stark", role="owner")
    # Managers
    create_user("STARK01", "Stark Industries", "pepper@stark.com", hash_password("password123"), "Pepper Potts", role="manager")
    create_user("STARK01", "Stark Industries", "happy@stark.com", hash_password("password123"), "Happy Hogan", role="manager")
    
    # Factory doc
    factory1 = create_factory_doc("STARK01", "Stark Industries")
    factory1_id = factory1["id"]

    # Adjuster Categories
    upsert_adjuster_category("STARK01", "Mechanic", 50.0)
    upsert_adjuster_category("STARK01", "Electrician", 75.0)

    # Reports
    now = datetime.now(timezone.utc)
    report1_data = {
        "report_name": "Arc Reactor Assembly Simulation",
        "report_type": "simulation",
        "simulation_time": 8,
        "machine_config": [{"name": "Assembly Arm", "count": 10, "mttf": 100, "mean_repair_time": 2}],
        "adjuster_config": [{"id": 1, "name": "Mechanic", "expertise": ["Assembly Arm"]}],
        "results": {
            "summary": {
                "overall_machine_utilization_pct": 92.5,
                "overall_adjuster_utilization_pct": 45.2,
                "adjuster_hours": {"Mechanic": 12.5}
            }
        },
    }
    r1 = save_report_doc(factory1_id, "STARK01", report1_data)
    pepper = db.users.find_one({"email": "pepper@stark.com"})
    db.reports.update_one({"_id": ObjectId(r1["id"])}, {"$set": {"manager_id": str(pepper["_id"]), "created_at": now - timedelta(days=2)}})

    report2_data = {
        "report_name": "Suit Assembly Optimization",
        "report_type": "optimization",
        "simulation_time": 24,
        "machine_config": [{"name": "Soldering Arm", "count": 20, "mttf": 50, "mean_repair_time": 5}],
        "adjuster_config": [{"id": 1, "name": "Electrician", "expertise": ["Soldering Arm"]}],
        "results": {
            "summary": {
                "overall_machine_utilization_pct": 95.0,
                "overall_adjuster_utilization_pct": 80.0,
                "adjuster_hours": {"Electrician": 55.0}
            }
        },
    }
    r2 = save_report_doc(factory1_id, "STARK01", report2_data)
    happy = db.users.find_one({"email": "happy@stark.com"})
    db.reports.update_one({"_id": ObjectId(r2["id"])}, {"$set": {"manager_id": str(happy["_id"]), "created_at": now - timedelta(days=1)}})


    # Wayne Enterprises
    print("Seeding Wayne Enterprises...")
    create_user("WAYNE01", "Wayne Enterprises", "bruce@wayne.com", hash_password("password123"), "Bruce Wayne", role="owner")
    create_user("WAYNE01", "Wayne Enterprises", "lucius@wayne.com", hash_password("password123"), "Lucius Fox", role="manager")
    
    factory2 = create_factory_doc("WAYNE01", "Wayne Enterprises")
    factory2_id = factory2["id"]
    
    upsert_adjuster_category("WAYNE01", "Engineer", 120.0)

    report3_data = {
        "report_name": "Batmobile Production Line",
        "report_type": "optimization",
        "simulation_time": 24,
        "machine_config": [{"name": "Welder", "count": 5, "mttf": 50, "mean_repair_time": 5}],
        "adjuster_config": [{"id": 1, "name": "Engineer", "expertise": ["Welder"]}],
        "results": {
            "summary": {
                "overall_machine_utilization_pct": 88.0,
                "overall_adjuster_utilization_pct": 60.0,
                "adjuster_hours": {"Engineer": 30.5}
            }
        },
    }
    r3 = save_report_doc(factory2_id, "WAYNE01", report3_data)
    lucius = db.users.find_one({"email": "lucius@wayne.com"})
    db.reports.update_one({"_id": ObjectId(r3["id"])}, {"$set": {"manager_id": str(lucius["_id"]), "created_at": now - timedelta(days=1)}})

    print("Seeding complete!")

if __name__ == "__main__":
    seed()
