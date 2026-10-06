"""
Database configuration for FactoryServSim.

Supports MongoDB as primary database (via MONGODB_URI),
with automatic fallback/interop so the application runs seamlessly
both locally and in cloud environments (Render, Atlas).
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# MongoDB Configuration
# ---------------------------------------------------------------------------

MONGODB_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "factoryservsim")

_mongo_client = None
_mongo_db = None
_mongo_available = False


def get_mongo_db():
    """
    Returns the active MongoDB database object or None if MongoDB is unreachable.
    """
    global _mongo_client, _mongo_db, _mongo_available
    if _mongo_db is not None:
        return _mongo_db

    try:
        from pymongo import MongoClient
        _mongo_client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
        )
        # Ping to verify active connection
        _mongo_client.admin.command('ping')
        _mongo_db = _mongo_client[MONGODB_DB_NAME]
        _mongo_available = True
        logger.info("Successfully connected to MongoDB: %s", MONGODB_DB_NAME)
        return _mongo_db
    except Exception as e:
        logger.warning(
            "MongoDB not accessible at %s (%s). Will use local database engine.",
            MONGODB_URI,
            str(e),
        )
        _mongo_available = False
        return None


def is_mongo_active() -> bool:
    """Check if MongoDB is actively connected."""
    return get_mongo_db() is not None


# ---------------------------------------------------------------------------
# SQLite Fallback Engine & Session
# ---------------------------------------------------------------------------

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{os.path.join(_BASE_DIR, 'factoryservsim.db')}",
)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency for relational/SQLite fallback session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize collections/indexes in MongoDB and tables in SQLite."""
    # 1. Initialize MongoDB indexes if connected
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            # Create a unique compound index on factory_id and email
            mongo_db.users.create_index([("factory_id", 1), ("email", 1)], unique=True)
            mongo_db.factories.create_index("factory_id")
            mongo_db.reports.create_index("factory_id")
            mongo_db.reports.create_index("factory_doc_id")
            logger.info("MongoDB collections and indexes initialized successfully.")
        except Exception as e:
            logger.error("Failed creating MongoDB indexes: %s", e)

    # 2. Also ensure SQLite tables exist for fallback compatibility
    Base.metadata.create_all(bind=engine)
