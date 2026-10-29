import time
from app.simulator.vehicle_simulator import vehicle_simulator

def test_simulator_lifecycle():
    """Test start, pause, resume, and reset transitions."""
    vehicle_simulator.reset()
    status = vehicle_simulator.get_status()
    assert status["state"] == "STOPPED"
    assert status["safety_isolated"] is True

    # Start
    start_res = vehicle_simulator.start(profile="city_commute")
    assert start_res["status"] == "started"
    assert vehicle_simulator.state == "RUNNING"

    # Step simulation
    vehicle_simulator._step_simulation()
    status = vehicle_simulator.get_status()
    assert status["ticks_count"] >= 1
    assert status["current_telemetry"] is not None
    assert "battery_soc_pct" in status["current_telemetry"]
    assert "speed_kmh" in status["current_telemetry"]

    # Pause
    pause_res = vehicle_simulator.pause()
    assert pause_res["status"] == "paused"
    assert vehicle_simulator.state == "PAUSED"

    # Resume
    resume_res = vehicle_simulator.resume()
    assert resume_res["status"] == "resumed"
    assert vehicle_simulator.state == "RUNNING"

    # Reset
    reset_res = vehicle_simulator.reset()
    assert reset_res["status"] == "reset"
    assert vehicle_simulator.state == "STOPPED"
    assert vehicle_simulator.ticks_count == 0

def test_simulator_anomaly_injection():
    """Test injecting battery overheat anomaly."""
    vehicle_simulator.reset()
    vehicle_simulator.start(profile="city_commute")

    res = vehicle_simulator.inject_anomaly(
        anomaly_type="battery_overheat",
        severity="WARNING",
        duration_sec=5
    )
    assert res["status"] == "injected"
    assert res["anomaly"] == "battery_overheat"

    initial_temp = vehicle_simulator.battery_temp_c
    vehicle_simulator._step_simulation()
    assert vehicle_simulator.battery_temp_c > initial_temp

    vehicle_simulator.reset()
