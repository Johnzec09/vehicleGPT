from datetime import datetime, timedelta, timezone
from app.models.db_models import TelemetryRecord, TripSummary

def test_telemetry_time_window_filtering(db_session):
    now = datetime.now(timezone.utc)
    one_week_ago = now - timedelta(days=7)

    recent_records = db_session.query(TelemetryRecord).filter(
        TelemetryRecord.timestamp >= one_week_ago
    ).all()

    assert len(recent_records) > 0
    for rec in recent_records:
        rec_ts = rec.timestamp
        if rec_ts.tzinfo is None:
            rec_ts = rec_ts.replace(tzinfo=timezone.utc)
        assert rec_ts >= one_week_ago

def test_driving_condition_filtering(db_session):
    city_records = db_session.query(TelemetryRecord).filter(
        TelemetryRecord.driving_condition == "CITY"
    ).all()
    highway_records = db_session.query(TelemetryRecord).filter(
        TelemetryRecord.driving_condition == "HIGHWAY"
    ).all()

    assert len(city_records) > 0
    assert len(highway_records) > 0

    # City speeds should on average be lower than highway speeds
    avg_city_speed = sum(r.speed_kmh for r in city_records) / len(city_records)
    avg_hwy_speed = sum(r.speed_kmh for r in highway_records) / len(highway_records)
    assert avg_city_speed < avg_hwy_speed

def test_trip_summaries_query(db_session):
    trips = db_session.query(TripSummary).all()
    assert len(trips) >= 30
    first_trip = trips[0]
    assert first_trip.distance_km > 0
    assert first_trip.avg_consumption_wh_km > 0
