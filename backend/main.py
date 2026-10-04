"""
FactoryServSim -- FastAPI Application Entry Point.

Configures and launches the FastAPI application with:
- CORS middleware for frontend communication
- All API routers (simulation, optimizer, streaming, auth, factory)
- Health check endpoint
- Custom error handlers
- SQLite database initialization
- Swagger/OpenAPI documentation at /docs

Usage:
    uvicorn main:app --reload --port 8000
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    simulation_router,
    optimizer_router,
    websocket_router,
    auth_router,
    factory_router,
)
from app.database import init_db

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App Configuration
# ---------------------------------------------------------------------------

# Frontend origin URL (configurable via environment variable)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# Allowed CORS origins (comma-separated in env, or default for development)
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    f"{FRONTEND_ORIGIN},http://localhost:3000,http://127.0.0.1:5173",
).split(",")

# ---------------------------------------------------------------------------
# Lifespan Events
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    # --- Startup ---
    logger.info("FactoryServSim API starting up...")

    # Initialize the database (create tables if they don't exist)
    init_db()
    logger.info("Database initialized (SQLite)")

    logger.info("Swagger docs available at: http://localhost:8000/docs")
    logger.info("ReDoc available at: http://localhost:8000/redoc")

    # Check for Person 1's core engine availability
    try:
        from app.core import simulator  # noqa: F401
        logger.info("Core simulation engine (Person 1): AVAILABLE")
    except ImportError:
        logger.info("Core simulation engine (Person 1): NOT YET AVAILABLE (using mocks)")

    # Check for Person 2's optimizer availability
    try:
        from app.services import optimizer  # noqa: F401
        logger.info("Staffing optimizer (Person 2): AVAILABLE")
    except ImportError:
        logger.info("Staffing optimizer (Person 2): NOT YET AVAILABLE (using mocks)")

    yield

    # --- Shutdown ---
    logger.info("FactoryServSim API shutting down...")


# ---------------------------------------------------------------------------
# FastAPI App Instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FactoryServSim API",
    description=(
        "Factory Machine-Adjuster Utilization Simulator API.\n\n"
        "A discrete-event simulation platform to evaluate machine/adjuster "
        "utilization and calculate the optimum number of factory adjusters.\n\n"
        "**Authentication:** Register at `/api/auth/register`, login at "
        "`/api/auth/login` to get a JWT token. Use it as `Bearer <token>` "
        "in the Authorization header for protected endpoints."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permissive for development; tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Handle ValueError exceptions as 400 Bad Request responses."""
    logger.warning("ValueError: %s", str(exc))
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc), "error_type": "validation_error"},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions as 500 Internal Server Error responses."""
    logger.error("Unhandled exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again later.",
            "error_type": "internal_error",
        },
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(factory_router)
app.include_router(simulation_router)
app.include_router(optimizer_router)
app.include_router(websocket_router)

# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["health"])
async def health_check() -> dict:
    """
    Health check endpoint.

    Returns basic application status. Used by frontend and monitoring tools
    to verify backend availability.
    """
    return {
        "status": "ok",
        "service": "FactoryServSim API",
        "version": "2.0.0",
    }
