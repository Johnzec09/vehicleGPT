from app.analytics.engine import AnalyticsEngine

def test_city_vs_highway_analytics(db_session):
    res = AnalyticsEngine.get_city_vs_highway_comparison(db_session, days=30)
    assert res["is_simulated"] is True
    assert "city" in res
    assert "highway" in res

    city = res["city"]
    highway = res["highway"]
    assert highway["avg_consumption_wh_km"] > city["avg_consumption_wh_km"]
    assert highway["avg_speed_kmh"] > city["avg_speed_kmh"]
    assert res["efficiency_difference_pct"] > 0
    assert "kWh/100km" in res["analysis_summary"]

def test_range_reduction_analytics(db_session):
    res = AnalyticsEngine.get_range_reduction_analysis(db_session, window_days=14)
    assert res["is_simulated"] is True
    assert res["reduction_km"] > 0
    assert res["reduction_pct"] > 0
    assert len(res["primary_causes"]) > 0

    m = res["supporting_metrics"]
    assert m["consumption_increase_pct"] > 0
    assert m["temperature_drop_c"] > 0

def test_largest_efficiency_drop(db_session):
    res = AnalyticsEngine.get_largest_efficiency_drop(db_session, days=30)
    assert res["is_simulated"] is True
    assert res["consumption_wh_km"] >= 250.0  # Spiked in sport mode trip
    assert res["efficiency_drop_pct"] > 30.0
    assert "associated_diagnostic_event" in res
    assert res["associated_diagnostic_event"] is not None

def test_pre_incident_telemetry(db_session):
    res = AnalyticsEngine.get_pre_incident_telemetry(db_session, event_type="BATTERY_OVERHEAT", window_minutes=15)
    assert res["is_simulated"] is True
    assert res["sample_count"] > 0
    assert len(res["telemetry_samples"]) > 0
    metrics = res["summary_metrics"]
    assert metrics["temp_rise_delta_c"] > 0
    assert metrics["peak_discharge_current_a"] > 100.0
    assert "root_cause_explanation" in res

def test_soc_trends(db_session):
    res = AnalyticsEngine.get_soc_trends(db_session, days=30)
    assert res["is_simulated"] is True
    assert len(res["daily_soc_averages"]) > 10
    assert res["total_discharged_pct"] > 0

def test_anomaly_detection(db_session):
    res = AnalyticsEngine.detect_anomalies(db_session, days=30)
    assert res["is_simulated"] is True
    assert res["total_anomalies"] > 0
    assert len(res["recent_anomalies"]) > 0
