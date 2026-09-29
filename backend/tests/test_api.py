"""
Comprehensive API test suite for FactoryServSim (Person 3).

Tests cover:
- Health check endpoint
- POST /api/simulation/run (valid payloads, validation errors, edge cases)
- POST /api/simulation/optimize (valid payloads, validation errors)
- GET /api/simulation/presets (preset loading)
- WebSocket /api/ws/stream (streaming connection and data)
- POST /api/simulation/stream (SSE streaming)
- Schema validation edge cases
- Error handling
"""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Fixtures: Reusable test data
# ---------------------------------------------------------------------------

VALID_PAYLOAD = {
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

MINIMAL_PAYLOAD = {
    "simulation_time": 100,
    "machine_categories": [
        {"name": "Lathe", "count": 1, "mttf": 10, "mean_repair_time": 2},
    ],
    "adjusters": [
        {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]},
    ],
}


# ===========================================================================
# Health Check Tests
# ===========================================================================

class TestHealthCheck:
    """Tests for GET /api/health."""

    def test_health_check_returns_200(self):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_check_response_body(self):
        response = client.get("/api/health")
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data
        assert "version" in data


# ===========================================================================
# Simulation Endpoint Tests
# ===========================================================================

class TestRunSimulation:
    """Tests for POST /api/simulation/run."""

    def test_valid_payload_returns_200(self):
        response = client.post("/api/simulation/run", json=VALID_PAYLOAD)
        assert response.status_code == 200

    def test_response_contains_required_keys(self):
        response = client.post("/api/simulation/run", json=VALID_PAYLOAD)
        data = response.json()
        assert "summary" in data
        assert "category_metrics" in data
        assert "adjuster_metrics" in data

    def test_summary_fields(self):
        response = client.post("/api/simulation/run", json=VALID_PAYLOAD)
        summary = response.json()["summary"]
        assert summary["total_simulation_time"] == 10000
        assert 0 <= summary["overall_machine_utilization_pct"] <= 100
        assert 0 <= summary["overall_adjuster_utilization_pct"] <= 100
        assert summary["avg_queue_wait_time"] >= 0
        assert summary["total_failures_handled"] >= 0

    def test_category_metrics_populated(self):
        response = client.post("/api/simulation/run", json=VALID_PAYLOAD)
        categories = response.json()["category_metrics"]
        assert len(categories) > 0
        for cat in categories:
            assert "category" in cat
            assert "utilization_pct" in cat
            assert "total_failures" in cat
            assert 0 <= cat["utilization_pct"] <= 100

    def test_adjuster_metrics_populated(self):
        response = client.post("/api/simulation/run", json=VALID_PAYLOAD)
        adjusters = response.json()["adjuster_metrics"]
        assert len(adjusters) > 0
        for adj in adjusters:
            assert "id" in adj
            assert "name" in adj
            assert "busy_time_pct" in adj
            assert "repairs_completed" in adj

    def test_minimal_payload_returns_200(self):
        response = client.post("/api/simulation/run", json=MINIMAL_PAYLOAD)
        assert response.status_code == 200

    def test_missing_simulation_time_returns_422(self):
        payload = {
            "machine_categories": [
                {"name": "Lathe", "count": 10, "mttf": 100, "mean_repair_time": 10}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_negative_simulation_time_returns_422(self):
        payload = {
            "simulation_time": -100,
            "machine_categories": [
                {"name": "Lathe", "count": 10, "mttf": 100, "mean_repair_time": 10}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_zero_simulation_time_returns_422(self):
        payload = {
            "simulation_time": 0,
            "machine_categories": [
                {"name": "Lathe", "count": 10, "mttf": 100, "mean_repair_time": 10}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_empty_machine_categories_returns_422(self):
        payload = {
            "simulation_time": 1000,
            "machine_categories": [],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_empty_adjusters_returns_422(self):
        payload = {
            "simulation_time": 1000,
            "machine_categories": [
                {"name": "Lathe", "count": 10, "mttf": 100, "mean_repair_time": 10}
            ],
            "adjusters": [],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_zero_mttf_returns_422(self):
        payload = {
            "simulation_time": 1000,
            "machine_categories": [
                {"name": "Lathe", "count": 10, "mttf": 0, "mean_repair_time": 10}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_negative_repair_time_returns_422(self):
        payload = {
            "simulation_time": 1000,
            "machine_categories": [
                {"name": "Lathe", "count": 10, "mttf": 100, "mean_repair_time": -5}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_unknown_expertise_category_returns_422(self):
        """Adjuster expertise must reference valid machine category names."""
        payload = {
            "simulation_time": 1000,
            "machine_categories": [
                {"name": "Lathe", "count": 10, "mttf": 100, "mean_repair_time": 10}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["NonExistentCategory"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_duplicate_adjuster_ids_returns_422(self):
        """Adjuster IDs must be unique."""
        payload = {
            "simulation_time": 1000,
            "machine_categories": [
                {"name": "Lathe", "count": 10, "mttf": 100, "mean_repair_time": 10}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]},
                {"id": 1, "name": "Adjuster 2", "expertise": ["Lathe"]},
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422

    def test_empty_body_returns_422(self):
        response = client.post("/api/simulation/run", json={})
        assert response.status_code == 422

    def test_missing_fields_in_body_returns_422(self):
        response = client.post("/api/simulation/run", json={"simulation_time": 100})
        assert response.status_code == 422

    def test_empty_category_name_returns_422(self):
        payload = {
            "simulation_time": 1000,
            "machine_categories": [
                {"name": "", "count": 10, "mttf": 100, "mean_repair_time": 10}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 422


# ===========================================================================
# Optimization Endpoint Tests
# ===========================================================================

class TestOptimizeStaffing:
    """Tests for POST /api/simulation/optimize."""

    def test_valid_payload_returns_200(self):
        response = client.post("/api/simulation/optimize", json=VALID_PAYLOAD)
        assert response.status_code == 200

    def test_response_contains_required_keys(self):
        response = client.post("/api/simulation/optimize", json=VALID_PAYLOAD)
        data = response.json()
        assert "optimum_adjuster_count" in data
        assert "tradeoff_curve" in data
        assert "recommendation_reason" in data

    def test_optimum_count_is_positive(self):
        response = client.post("/api/simulation/optimize", json=VALID_PAYLOAD)
        data = response.json()
        assert data["optimum_adjuster_count"] >= 1

    def test_tradeoff_curve_is_list(self):
        response = client.post("/api/simulation/optimize", json=VALID_PAYLOAD)
        data = response.json()
        assert isinstance(data["tradeoff_curve"], list)
        assert len(data["tradeoff_curve"]) > 0

    def test_tradeoff_point_fields(self):
        response = client.post("/api/simulation/optimize", json=VALID_PAYLOAD)
        data = response.json()
        for point in data["tradeoff_curve"]:
            assert "adjuster_count" in point
            assert "machine_utilization" in point
            assert "adjuster_utilization" in point
            assert point["adjuster_count"] >= 1
            assert 0 <= point["machine_utilization"] <= 100
            assert 0 <= point["adjuster_utilization"] <= 100

    def test_recommendation_reason_non_empty(self):
        response = client.post("/api/simulation/optimize", json=VALID_PAYLOAD)
        data = response.json()
        assert len(data["recommendation_reason"]) > 0

    def test_minimal_payload_returns_200(self):
        response = client.post("/api/simulation/optimize", json=MINIMAL_PAYLOAD)
        assert response.status_code == 200

    def test_missing_fields_returns_422(self):
        response = client.post("/api/simulation/optimize", json={})
        assert response.status_code == 422

    def test_invalid_payload_returns_422(self):
        payload = {"simulation_time": -1, "machine_categories": [], "adjusters": []}
        response = client.post("/api/simulation/optimize", json=payload)
        assert response.status_code == 422


# ===========================================================================
# Presets Endpoint Tests
# ===========================================================================

class TestGetPresets:
    """Tests for GET /api/simulation/presets."""

    def test_presets_returns_200(self):
        response = client.get("/api/simulation/presets")
        assert response.status_code == 200

    def test_presets_contains_list(self):
        response = client.get("/api/simulation/presets")
        data = response.json()
        assert "presets" in data
        assert isinstance(data["presets"], list)

    def test_presets_non_empty(self):
        response = client.get("/api/simulation/presets")
        data = response.json()
        assert len(data["presets"]) > 0

    def test_preset_has_required_fields(self):
        response = client.get("/api/simulation/presets")
        data = response.json()
        for preset in data["presets"]:
            assert "id" in preset
            assert "name" in preset
            assert "machine_categories" in preset
            assert "adjusters" in preset
            assert len(preset["machine_categories"]) > 0
            assert len(preset["adjusters"]) > 0

    def test_preset_categories_have_required_fields(self):
        response = client.get("/api/simulation/presets")
        data = response.json()
        for preset in data["presets"]:
            for cat in preset["machine_categories"]:
                assert "name" in cat
                assert "count" in cat
                assert "mttf" in cat
                assert "mean_repair_time" in cat

    def test_preset_adjusters_have_required_fields(self):
        response = client.get("/api/simulation/presets")
        data = response.json()
        for preset in data["presets"]:
            for adj in preset["adjusters"]:
                assert "id" in adj
                assert "name" in adj
                assert "expertise" in adj
                assert len(adj["expertise"]) > 0


# ===========================================================================
# WebSocket Streaming Tests
# ===========================================================================

class TestWebSocketStream:
    """Tests for WebSocket /api/ws/stream."""

    def test_websocket_connects(self):
        with client.websocket_connect("/api/ws/stream") as websocket:
            data = websocket.receive_json()
            assert data is not None

    def test_websocket_receives_tick_data(self):
        with client.websocket_connect("/api/ws/stream") as websocket:
            data = websocket.receive_json()
            assert "tick" in data
            assert "running_machines" in data
            assert "waiting_machines" in data
            assert "repairing_machines" in data

    def test_websocket_tick_has_queue_info(self):
        with client.websocket_connect("/api/ws/stream") as websocket:
            data = websocket.receive_json()
            assert "queue_type" in data
            assert data["queue_type"] in ("machines", "adjusters")
            assert "queue_length" in data
            assert data["queue_length"] >= 0

    def test_websocket_tick_has_adjuster_info(self):
        with client.websocket_connect("/api/ws/stream") as websocket:
            data = websocket.receive_json()
            assert "idle_adjusters" in data
            assert "busy_adjusters" in data

    def test_websocket_multiple_ticks_increment(self):
        with client.websocket_connect("/api/ws/stream") as websocket:
            tick1 = websocket.receive_json()
            tick2 = websocket.receive_json()
            assert tick2["tick"] > tick1["tick"]


# ===========================================================================
# SSE Streaming Tests
# ===========================================================================

class TestSSEStream:
    """Tests for POST /api/simulation/stream (Server-Sent Events)."""

    def test_sse_returns_200(self):
        response = client.post("/api/simulation/stream", json=MINIMAL_PAYLOAD)
        assert response.status_code == 200

    def test_sse_content_type(self):
        response = client.post("/api/simulation/stream", json=MINIMAL_PAYLOAD)
        assert "text/event-stream" in response.headers["content-type"]


# ===========================================================================
# Schema Validation Tests (Pydantic)
# ===========================================================================

class TestSchemaValidation:
    """Direct Pydantic schema validation tests."""

    def test_factory_config_valid(self):
        from app.schemas.payload import FactoryConfigInput
        config = FactoryConfigInput(**VALID_PAYLOAD)
        assert config.simulation_time == 10000
        assert len(config.machine_categories) == 4
        assert len(config.adjusters) == 3

    def test_factory_config_rejects_zero_sim_time(self):
        from app.schemas.payload import FactoryConfigInput
        with pytest.raises(Exception):
            FactoryConfigInput(
                simulation_time=0,
                machine_categories=[{"name": "X", "count": 1, "mttf": 10, "mean_repair_time": 2}],
                adjusters=[{"id": 1, "name": "A", "expertise": ["X"]}],
            )

    def test_factory_config_rejects_empty_categories(self):
        from app.schemas.payload import FactoryConfigInput
        with pytest.raises(Exception):
            FactoryConfigInput(
                simulation_time=100,
                machine_categories=[],
                adjusters=[{"id": 1, "name": "A", "expertise": ["X"]}],
            )

    def test_factory_config_rejects_mismatched_expertise(self):
        from app.schemas.payload import FactoryConfigInput
        with pytest.raises(Exception):
            FactoryConfigInput(
                simulation_time=100,
                machine_categories=[{"name": "Lathe", "count": 1, "mttf": 10, "mean_repair_time": 2}],
                adjusters=[{"id": 1, "name": "A", "expertise": ["NonExistent"]}],
            )

    def test_simulation_result_output_valid(self):
        from app.schemas.payload import (
            SimulationResultOutput,
            SummaryMetrics,
            CategoryMetrics,
            AdjusterMetrics,
        )
        result = SimulationResultOutput(
            summary=SummaryMetrics(
                total_simulation_time=10000,
                overall_machine_utilization_pct=88.42,
                overall_adjuster_utilization_pct=93.15,
                avg_queue_wait_time=3.84,
                total_failures_handled=12430,
            ),
            category_metrics=[
                CategoryMetrics(category="Lathe", utilization_pct=87.1, total_failures=7200),
            ],
            adjuster_metrics=[
                AdjusterMetrics(id=1, name="Adjuster 1", busy_time_pct=94.2, repairs_completed=4210),
            ],
        )
        assert result.summary.total_simulation_time == 10000

    def test_optimization_result_valid(self):
        from app.schemas.payload import OptimizationResultOutput, TradeoffPoint
        result = OptimizationResultOutput(
            optimum_adjuster_count=6,
            tradeoff_curve=[
                TradeoffPoint(adjuster_count=2, machine_utilization=64.2, adjuster_utilization=99.8),
                TradeoffPoint(adjuster_count=6, machine_utilization=93.8, adjuster_utilization=82.1),
            ],
            recommendation_reason="6 adjusters is optimal.",
        )
        assert result.optimum_adjuster_count == 6
        assert len(result.tradeoff_curve) == 2

    def test_stream_tick_event_valid(self):
        from app.schemas.payload import StreamTickEvent
        tick = StreamTickEvent(
            tick=1,
            simulation_time=10.0,
            running_machines=350,
            waiting_machines=5,
            repairing_machines=5,
            idle_adjusters=0,
            busy_adjusters=3,
            queue_type="machines",
            queue_length=5,
        )
        assert tick.tick == 1
        assert tick.queue_type == "machines"


# ===========================================================================
# Edge Case & Error Handling Tests
# ===========================================================================

class TestEdgeCases:
    """Edge case tests for robustness."""

    def test_very_large_simulation_time(self):
        payload = {
            "simulation_time": 1000000,
            "machine_categories": [
                {"name": "Lathe", "count": 1, "mttf": 100, "mean_repair_time": 10}
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe"]}
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 200

    def test_single_machine_single_adjuster(self):
        response = client.post("/api/simulation/run", json=MINIMAL_PAYLOAD)
        assert response.status_code == 200
        data = response.json()
        assert len(data["adjuster_metrics"]) == 1

    def test_multiple_categories(self):
        payload = {
            "simulation_time": 5000,
            "machine_categories": [
                {"name": "Lathe", "count": 100, "mttf": 100, "mean_repair_time": 10},
                {"name": "Turning", "count": 50, "mttf": 150, "mean_repair_time": 12},
                {"name": "Drilling", "count": 80, "mttf": 80, "mean_repair_time": 8},
            ],
            "adjusters": [
                {"id": 1, "name": "Adjuster 1", "expertise": ["Lathe", "Turning", "Drilling"]},
            ],
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code == 200

    def test_nonexistent_endpoint_returns_404(self):
        response = client.get("/api/nonexistent")
        assert response.status_code == 404

    def test_wrong_http_method_returns_405(self):
        response = client.get("/api/simulation/run")
        assert response.status_code == 405

    def test_invalid_json_returns_422(self):
        response = client.post(
            "/api/simulation/run",
            content="not json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422
