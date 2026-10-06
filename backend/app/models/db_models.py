"""
SQLAlchemy ORM models for FactoryServSim.

Tables:
  - users:    Stores manager accounts (email, hashed password, name)
  - factories: Stores factory profiles (name, linked to a user)
  - reports:   Stores simulation/optimization reports (linked to a factory)
"""

import json
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ---------------------------------------------------------------------------
# User (Manager) Model
# ---------------------------------------------------------------------------

class User(Base):
    """A factory manager who can register, login, and manage factories."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    manager_name = Column(String(255), nullable=False)
    factory_id = Column(String(255), nullable=True)
    factory_name = Column(String(255), nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationship: one user can own many factories
    factories = relationship("Factory", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.manager_name}')>"


# ---------------------------------------------------------------------------
# Factory Model
# ---------------------------------------------------------------------------

class Factory(Base):
    """A factory profile containing its name and link to the owner."""

    __tablename__ = "factories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    factory_name = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    owner = relationship("User", back_populates="factories")
    reports = relationship("Report", back_populates="factory", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Factory(id={self.id}, name='{self.factory_name}')>"


# ---------------------------------------------------------------------------
# Report Model
# ---------------------------------------------------------------------------

class Report(Base):
    """
    A simulation or optimization report stored for a specific factory.

    Stores the full input configuration, output results, and
    optimized adjuster count per category as JSON blobs.
    """

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False)
    report_type = Column(
        String(50), nullable=False, default="simulation"
    )  # "simulation" or "optimization"

    # Simulation parameters
    simulation_time = Column(Integer, nullable=False)

    # Store full configs as JSON text
    machine_config = Column(Text, nullable=False)  # JSON: list of machine categories
    adjuster_config = Column(Text, nullable=False)  # JSON: list of adjusters

    # Results stored as JSON text
    results = Column(Text, nullable=False)  # JSON: full simulation/optimization results

    # Optimized adjuster count per category (JSON)
    # e.g. {"Lathe": 3, "Drilling": 2, "Welding": 1}
    optimized_adjuster_counts = Column(Text, nullable=True)

    # Summary metrics (denormalized for quick queries)
    machine_utilization_pct = Column(Float, nullable=True)
    adjuster_utilization_pct = Column(Float, nullable=True)

    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationship
    factory = relationship("Factory", back_populates="reports")

    def set_machine_config(self, config_list):
        """Serialize machine categories list to JSON."""
        self.machine_config = json.dumps(config_list)

    def get_machine_config(self):
        """Deserialize machine categories JSON to list."""
        return json.loads(self.machine_config) if self.machine_config else []

    def set_adjuster_config(self, config_list):
        """Serialize adjusters list to JSON."""
        self.adjuster_config = json.dumps(config_list)

    def get_adjuster_config(self):
        """Deserialize adjusters JSON to list."""
        return json.loads(self.adjuster_config) if self.adjuster_config else []

    def set_results(self, results_dict):
        """Serialize results dict to JSON."""
        self.results = json.dumps(results_dict)

    def get_results(self):
        """Deserialize results JSON to dict."""
        return json.loads(self.results) if self.results else {}

    def set_optimized_counts(self, counts_dict):
        """Serialize optimized counts dict to JSON."""
        self.optimized_adjuster_counts = json.dumps(counts_dict)

    def get_optimized_counts(self):
        """Deserialize optimized counts JSON to dict."""
        return json.loads(self.optimized_adjuster_counts) if self.optimized_adjuster_counts else {}

    def __repr__(self):
        return f"<Report(id={self.id}, factory_id={self.factory_id}, type='{self.report_type}')>"
