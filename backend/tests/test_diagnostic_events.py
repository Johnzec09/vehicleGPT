import json
from app.models.db_models import DiagnosticEvent

def test_diagnostic_events_generation(db_session):
    events = db_session.query(DiagnosticEvent).all()
    assert len(events) >= 3

    event_types = [e.event_type for e in events]
    assert any("BATTERY" in et for et in event_types)
    assert any("ADAS" in et for et in event_types)
    assert any("CONSUMPTION" in et or "EFFICIENCY" in et for et in event_types)

def test_dtc_codes_logged(db_session):
    dtc_events = db_session.query(DiagnosticEvent).filter(
        DiagnosticEvent.dtc_code.isnot(None)
    ).all()
    assert len(dtc_events) >= 2

    codes = [e.dtc_code for e in dtc_events]
    # Check standard EV DTC codes are present
    assert "P0A7F" in codes or "P1A01" in codes or "U0415" in codes

    for e in dtc_events:
        assert e.supporting_telemetry is not None
        payload = json.loads(e.supporting_telemetry)
        assert isinstance(payload, dict)
