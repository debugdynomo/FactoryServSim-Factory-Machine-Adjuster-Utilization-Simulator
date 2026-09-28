"""
API package for FactoryServSim.

Exports all route routers for inclusion in the FastAPI app.
"""

from .routes_simulation import router as simulation_router
from .routes_optimizer import router as optimizer_router
from .websocket_stream import router as websocket_router

__all__ = ["simulation_router", "optimizer_router", "websocket_router"]
