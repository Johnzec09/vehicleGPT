def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["team"] == "Team SANJO (K. John Zechariah & B. Rohan)"
    assert data["safety_status"]["safety_isolated"] is True
    assert data["offline_operation"] is True

def test_health_endpoint(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    assert data["telemetry_records_count"] > 0
    assert data["offline_ready"] is True

def test_latest_telemetry_endpoint(client):
    res = client.get("/api/v1/telemetry/latest")
    assert res.status_code == 200
    data = res.json()
    assert "battery_soc_pct" in data
    assert "speed_kmh" in data
    assert data["is_simulated"] is True

def test_historical_telemetry_endpoint(client):
    res = client.get("/api/v1/telemetry/history?limit=25")
    assert res.status_code == 200
    data = res.json()
    assert data["limit"] == 25
    assert len(data["records"]) <= 25

def test_events_endpoint(client):
    res = client.get("/api/v1/events")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0
    assert "events" in data

def test_dtcs_endpoint(client):
    res = client.get("/api/v1/events/dtcs")
    assert res.status_code == 200
    data = res.json()
    assert "dtcs" in data
    assert data["count"] > 0

def test_analytics_city_vs_highway(client):
    res = client.get("/api/v1/analytics/city-vs-highway?days=30")
    assert res.status_code == 200
    data = res.json()
    assert "city" in data
    assert "highway" in data
    assert data["efficiency_difference_pct"] > 0

def test_simulator_status_and_control(client):
    # Status
    res = client.get("/api/v1/simulator/status")
    assert res.status_code == 200
    assert "state" in res.json()

    # Control - Start
    res = client.post("/api/v1/simulator/control", json={"command": "start", "profile": "city_commute"})
    assert res.status_code == 200

    # Control - Pause
    res = client.post("/api/v1/simulator/control", json={"command": "pause"})
    assert res.status_code == 200

    # Control - Resume
    res = client.post("/api/v1/simulator/control", json={"command": "resume"})
    assert res.status_code == 200

    # Control - Reset
    res = client.post("/api/v1/simulator/control", json={"command": "reset"})
    assert res.status_code == 200

def test_assistant_query_endpoint(client):
    res = client.post(
        "/api/v1/assistant/query",
        json={"query": "Why has my driving range reduced over the last two weeks?"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent_detected"] == "RANGE_REDUCTION_EXPLANATION"
    assert "evidence" in data
    assert data["evidence"]["supporting_record_count"] > 0
