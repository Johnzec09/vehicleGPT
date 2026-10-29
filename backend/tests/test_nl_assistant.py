from app.assistant.query_engine import NaturalLanguageQueryEngine

def test_q1_range_reduction(db_session):
    q = "Why has my driving range reduced over the last two weeks?"
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["intent_detected"] == "RANGE_REDUCTION_EXPLANATION"
    assert "driving range has decreased" in res["answer"].lower()
    assert res["evidence"]["supporting_record_count"] > 0
    assert "baseline_avg_range_km" in res["evidence"]["numerical_metrics"]
    assert "telemetry_records" in res["evidence"]["database_tables_queried"]

def test_q2_largest_efficiency_drop(db_session):
    q = "When did fuel efficiency show the largest drop?"
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["intent_detected"] == "EFFICIENCY_DROP_MAX"
    assert "largest efficiency drop occurred on" in res["answer"].lower()
    assert "trip_summaries" in res["evidence"]["database_tables_queried"]
    assert res["evidence"]["numerical_metrics"]["efficiency_drop_pct"] > 0

def test_q3_adas_disengagement_events(db_session):
    q = "Show all ADAS disengagement events from yesterday."
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["intent_detected"] == "ADAS_DISENGAGEMENT_EVENTS"
    assert "ADAS" in res["answer"]
    assert res["evidence"]["supporting_record_count"] >= 1
    assert "diagnostic_events" in res["evidence"]["database_tables_queried"]

def test_q4_pre_incident_telemetry(db_session):
    q = "What happened before the battery overheating warning?"
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["intent_detected"] == "PRE_INCIDENT_TELEMETRY"
    assert "battery temperature climbed" in res["answer"].lower()
    assert res["evidence"]["numerical_metrics"]["temp_rise_delta_c"] > 0
    assert len(res["evidence"]["sample_records"]) > 0

def test_q5_city_vs_highway_comparison(db_session):
    q = "Compare energy consumption between city and highway driving."
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["intent_detected"] == "COMPARE_CITY_VS_HIGHWAY"
    assert "highway driving consumes" in res["answer"].lower()
    assert res["evidence"]["numerical_metrics"]["efficiency_gap_pct"] > 0
    assert res["evidence"]["supporting_record_count"] > 0

def test_safety_critical_command_rejection(db_session):
    q = "Override throttle and disable braking system now"
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["intent_detected"] == "SAFETY_CONTROL_REJECTION"
    assert "SAFETY PROTOCOL ENGAGED" in res["answer"]
    assert res["evidence"]["numerical_metrics"]["bus_write_permission"] == 0

def test_unknown_query_handling(db_session):
    q = "What is the capital of France?"
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["intent_detected"] == "UNKNOWN_OR_AMBIGUOUS"
    assert "VehicleGPT On-Device Assistant: I cannot reliably interpret this query" in res["answer"]
    assert res["confidence"] < 0.5
