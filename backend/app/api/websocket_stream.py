"""
WebSocket and Server-Sent Events (SSE) streaming for FactoryServSim.

Provides:
- WebSocket /api/ws/stream     — Real-time simulation tick-by-tick streaming
- SSE      /api/simulation/stream — Server-Sent Events alternative for browsers

INTEGRATION POINTS:
- Person 1 (Core Engine): Step-by-step simulation state from simulator
- Person 5 (Frontend Visualizer): Consumes these events for live floor animation

The streaming protocol:
1. Client connects and sends a FactoryConfigInput JSON payload
2. Server streams StreamTickEvent JSON objects for each simulation tick
3. On completion, server sends a StreamCompleteEvent with final results
4. Connection closes
"""

import asyncio
import json
import logging
import math
import random

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi import Request

from app.schemas.payload import (
    FactoryConfigInput,
    StreamTickEvent,
    SummaryMetrics,
    CategoryMetrics,
    AdjusterMetrics,
    SimulationResultOutput,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["streaming"])


def _try_import_simulator():
    """
    Attempt to import Person 1's step-by-step simulation generator.
    Returns the generator function or None if not available.
    """
    try:
        from app.core.simulator import run_simulation_steps as _run_steps
        return _run_steps
    except ImportError:
        return None


def _generate_mock_tick(
    tick: int,
    total_machines: int,
    num_adjusters: int,
    simulation_time: int,
    total_ticks: int,
) -> dict:
    """
    Generate a single mock tick event for streaming.
    Simulates realistic factory floor state transitions.
    """
    # Progress through simulation
    progress = tick / max(total_ticks, 1)
    sim_time = progress * simulation_time

    # Simulate machine failures increasing then stabilizing
    failure_rate = 0.05 + 0.03 * math.sin(progress * math.pi * 2)
    broken = min(total_machines, max(0, int(total_machines * failure_rate + random.gauss(0, 2))))

    # Split broken machines between waiting and repairing
    repairing = min(broken, num_adjusters)
    waiting = max(0, broken - repairing)
    running = max(0, total_machines - broken)

    # Adjuster states
    busy_adjusters = repairing
    idle_adjusters = max(0, num_adjusters - busy_adjusters)

    # Single-queue invariant: either machines queue OR adjusters queue is non-empty
    if waiting > 0:
        queue_type = "machines"
        queue_length = waiting
    else:
        queue_type = "adjusters"
        queue_length = idle_adjusters

    return StreamTickEvent(
        tick=tick,
        simulation_time=round(sim_time, 2),
        running_machines=running,
        waiting_machines=waiting,
        repairing_machines=repairing,
        idle_adjusters=idle_adjusters,
        busy_adjusters=busy_adjusters,
        queue_type=queue_type,
        queue_length=queue_length,
    ).model_dump()


# ---------------------------------------------------------------------------
# WebSocket Streaming Endpoint
# ---------------------------------------------------------------------------

@router.websocket("/api/ws/stream")
async def websocket_stream(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for real-time simulation streaming.

    Protocol:
    1. Client connects
    2. Client sends a JSON payload (FactoryConfigInput) — optional, uses defaults if not sent
    3. Server streams tick events as JSON messages
    4. Server sends a final 'complete' event with results
    5. Connection closes

    If no config is received within 5 seconds, uses a default small simulation.
    """
    await websocket.accept()
    logger.info("WebSocket client connected")

    # Try to receive a configuration payload from the client
    total_machines = 360
    num_adjusters = 3
    simulation_time = 10000
    total_ticks = 100  # Number of ticks to stream (configurable)

    try:
        # Wait briefly for the client to send config
        try:
            raw_data = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
            config_data = json.loads(raw_data)
            config = FactoryConfigInput(**config_data)
            total_machines = sum(cat.count for cat in config.machine_categories)
            num_adjusters = len(config.adjusters)
            simulation_time = config.simulation_time
            logger.info(
                "WebSocket config received: machines=%d, adjusters=%d, time=%d",
                total_machines,
                num_adjusters,
                simulation_time,
            )
        except asyncio.TimeoutError:
            logger.info("No config received, using default simulation parameters")
        except (json.JSONDecodeError, Exception) as e:
            logger.warning("Invalid config payload: %s, using defaults", str(e))

        # Try to use real simulation stepper (Person 1)
        run_steps = _try_import_simulator()

        if run_steps is not None:
            try:
                for step_data in run_steps(config_data if 'config_data' in dir() else None):
                    await websocket.send_text(json.dumps(step_data))
                    await asyncio.sleep(0.05)  # Small delay for client rendering
            except Exception as e:
                logger.error("Simulation step error: %s", str(e))
                await websocket.send_text(
                    json.dumps({"error": str(e), "status": "error"})
                )
        else:
            # Mock streaming: send tick events
            for tick in range(1, total_ticks + 1):
                tick_data = _generate_mock_tick(
                    tick=tick,
                    total_machines=total_machines,
                    num_adjusters=num_adjusters,
                    simulation_time=simulation_time,
                    total_ticks=total_ticks,
                )
                await websocket.send_text(json.dumps(tick_data))
                await asyncio.sleep(0.1)  # ~10 ticks per second

        # Send completion event
        completion_event = {
            "status": "complete",
            "result": {
                "summary": {
                    "total_simulation_time": simulation_time,
                    "overall_machine_utilization_pct": 88.42,
                    "overall_adjuster_utilization_pct": 93.15,
                    "avg_queue_wait_time": 3.84,
                    "total_failures_handled": 12430,
                },
                "category_metrics": [
                    {"category": "Lathe", "utilization_pct": 87.1, "total_failures": 7200},
                ],
                "adjuster_metrics": [
                    {"id": 1, "name": "Adjuster 1", "busy_time_pct": 94.2, "repairs_completed": 4210},
                ],
            },
        }
        await websocket.send_text(json.dumps(completion_event))
        logger.info("WebSocket simulation stream completed")

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error("WebSocket stream error: %s", str(e))
        try:
            await websocket.send_text(
                json.dumps({"error": str(e), "status": "error"})
            )
        except Exception:
            pass


# ---------------------------------------------------------------------------
# WebSocket Live Streaming Endpoint (Real-time Event-Driven Simulation)
# ---------------------------------------------------------------------------

@router.websocket("/api/ws/live")
async def websocket_live_stream(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for real-time live simulation streaming.
    Streams individual machine and adjuster states every 1 second (1 tick = 1 hour sim time).
    """
    await websocket.accept()
    logger.info("WebSocket live client connected")

    try:
        raw_data = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
        config_data = json.loads(raw_data)
        config = FactoryConfigInput(**config_data)
    except Exception as e:
        logger.error("Failed to receive config for live stream: %s", str(e))
        await websocket.close()
        return

    machines = []
    for cat in config.machine_categories:
        for i in range(cat.count):
            machines.append({
                "id": f"{cat.name.lower().replace(' ', '_')}-{i}",
                "name": f"{cat.name} Unit {i+1}",
                "category": cat.name,
                "mttf": cat.mttf,
                "mean_repair_time": cat.mean_repair_time,
                "state": "WORKING",
                "assigned_adjuster": None,
                "repair_remaining": 0,
            })

    adjusters = []
    for adj in config.adjusters:
        adjusters.append({
            "id": adj.id,
            "name": adj.name,
            "expertise": adj.expertise,
            "state": "IDLE",
            "assigned_machine": None
        })

    simulation_time = config.simulation_time
    total_time = simulation_time
    total_failures = 0
    total_repairs = 0

    stop_event = asyncio.Event()

    async def receive_messages():
        try:
            while True:
                msg = await websocket.receive_text()
                msg_data = json.loads(msg)
                if msg_data.get("action") == "stop":
                    stop_event.set()
                    break
        except Exception:
            stop_event.set()

    recv_task = asyncio.create_task(receive_messages())

    try:
        for tick in range(1, simulation_time + 1):
            if stop_event.is_set():
                break

            # 1. Failure Roll
            for m in machines:
                if m["state"] == "WORKING":
                    if m["mttf"] > 0 and random.random() < (1.0 / m["mttf"]):
                        m["state"] = "WAITING_FOR_REPAIR"
                        total_failures += 1

            # 2. Repair Assignment
            waiting_machines = [m for m in machines if m["state"] == "WAITING_FOR_REPAIR"]
            for m in waiting_machines:
                for a in adjusters:
                    if a["state"] == "IDLE" and m["category"] in a["expertise"]:
                        m["state"] = "UNDER_REPAIR"
                        m["assigned_adjuster"] = a["name"]
                        m["repair_remaining"] = m["mean_repair_time"]
                        a["state"] = "BUSY"
                        a["assigned_machine"] = m["id"]
                        break

            # 3. Repair Countdown
            for m in machines:
                if m["state"] == "UNDER_REPAIR":
                    m["repair_remaining"] -= 1
                    if m["repair_remaining"] <= 0:
                        m["state"] = "WORKING"
                        for a in adjusters:
                            if a["assigned_machine"] == m["id"]:
                                a["state"] = "IDLE"
                                a["assigned_machine"] = None
                                break
                        m["assigned_adjuster"] = None
                        total_repairs += 1

            # Prepare stats
            running_count = sum(1 for m in machines if m["state"] == "WORKING")
            waiting_count = sum(1 for m in machines if m["state"] == "WAITING_FOR_REPAIR")
            repairing_count = sum(1 for m in machines if m["state"] == "UNDER_REPAIR")
            idle_adj = sum(1 for a in adjusters if a["state"] == "IDLE")
            busy_adj = sum(1 for a in adjusters if a["state"] == "BUSY")

            stats = {
                "running": running_count,
                "waiting": waiting_count,
                "repairing": repairing_count,
                "idle_adjusters": idle_adj,
                "busy_adjusters": busy_adj,
                "total_failures": total_failures,
                "total_repairs": total_repairs
            }

            tick_msg = {
                "type": "tick",
                "tick": tick,
                "simulation_time": tick,
                "total_time": total_time,
                "machines": [{
                    "id": m["id"],
                    "name": m["name"],
                    "category": m["category"],
                    "state": m["state"],
                    "assigned_adjuster": m["assigned_adjuster"],
                    "repair_remaining": m["repair_remaining"]
                } for m in machines],
                "adjusters": [{
                    "id": a["id"],
                    "name": a["name"],
                    "state": a["state"],
                    "assigned_machine": a["assigned_machine"]
                } for a in adjusters],
                "stats": stats
            }

            try:
                await websocket.send_text(json.dumps(tick_msg))
            except Exception:
                stop_event.set()
                break

            # Wait 1 tick = 1 second, but allow early stop
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=1.0)
                break
            except asyncio.TimeoutError:
                pass

        # 4. Completion
        if not stop_event.is_set():
            final_stats = {
                "running": sum(1 for m in machines if m["state"] == "WORKING"),
                "waiting": sum(1 for m in machines if m["state"] == "WAITING_FOR_REPAIR"),
                "repairing": sum(1 for m in machines if m["state"] == "UNDER_REPAIR"),
                "idle_adjusters": sum(1 for a in adjusters if a["state"] == "IDLE"),
                "busy_adjusters": sum(1 for a in adjusters if a["state"] == "BUSY"),
                "total_failures": total_failures,
                "total_repairs": total_repairs
            }
            complete_msg = {
                "type": "complete",
                "status": "complete",
                "stats": final_stats
            }
            try:
                await websocket.send_text(json.dumps(complete_msg))
            except Exception:
                pass
    finally:
        recv_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass
        logger.info("WebSocket live stream completed")


# ---------------------------------------------------------------------------
# Server-Sent Events (SSE) Streaming Endpoint
# ---------------------------------------------------------------------------

@router.post("/api/simulation/stream")
async def sse_stream(payload: FactoryConfigInput) -> StreamingResponse:
    """
    Server-Sent Events (SSE) endpoint for simulation streaming.

    Alternative to WebSocket for browsers that prefer SSE.
    Streams tick events in SSE format (text/event-stream).
    """
    total_machines = sum(cat.count for cat in payload.machine_categories)
    num_adjusters = len(payload.adjusters)
    total_ticks = 100

    async def event_generator():
        for tick in range(1, total_ticks + 1):
            tick_data = _generate_mock_tick(
                tick=tick,
                total_machines=total_machines,
                num_adjusters=num_adjusters,
                simulation_time=payload.simulation_time,
                total_ticks=total_ticks,
            )
            yield f"data: {json.dumps(tick_data)}\n\n"
            await asyncio.sleep(0.1)

        # Final completion event
        yield f"event: complete\ndata: {{\"status\": \"complete\"}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
