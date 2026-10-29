import os
import tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.db_models import Base, TelemetryRecord, DiagnosticEvent, TripSummary
from app.db.demo_data import generate_demo_dataset

def test_sqlite_persistence_across_reconnect():
    """Verify that records saved in SQLite persist after closing and reopening connections."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_file:
        tmp_db_path = tmp_file.name

    try:
        engine = create_engine(f"sqlite:///{tmp_db_path}")
        Base.metadata.create_all(bind=engine)
        SessionMaker = sessionmaker(bind=engine)

        # Write data in first session
        session1 = SessionMaker()
        res = generate_demo_dataset(db=session1, force=True, days=30)
        assert res["status"] == "success"
        written_count = res["telemetry_count"]
        session1.close()

        # Reopen completely new session from disk file
        session2 = SessionMaker()
        persisted_records = session2.query(TelemetryRecord).count()
        persisted_events = session2.query(DiagnosticEvent).count()
        persisted_trips = session2.query(TripSummary).count()

        assert persisted_records == written_count
        assert persisted_records > 500
        assert persisted_events > 0
        assert persisted_trips > 20

        # Verify simulated flag is True on all records
        sample = session2.query(TelemetryRecord).first()
        assert sample.is_simulated is True
        assert sample.vehicle_id == "SANJO-EV-01"

        session2.close()
        engine.dispose()
    finally:
        if os.path.exists(tmp_db_path):
            try:
                os.remove(tmp_db_path)
            except Exception:
                pass
