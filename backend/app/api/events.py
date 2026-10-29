from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.db_models import DiagnosticEvent
from app.models.schemas import DiagnosticEventSchema

router = APIRouter(prefix="/events", tags=["Diagnostic Events & DTCs"])

@router.get("", summary="Get diagnostic events and alarms")
def get_events(
    event_type: Optional[str] = Query(None, description="Filter by event type substring"),
    severity: Optional[str] = Query(None, description="INFO, WARNING, CRITICAL"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(DiagnosticEvent)
    if event_type:
        query = query.filter(DiagnosticEvent.event_type.ilike(f"%{event_type}%"))
    if severity:
        query = query.filter(DiagnosticEvent.severity == severity.upper())

    events = query.order_by(DiagnosticEvent.timestamp.desc()).limit(limit).all()
    return {
        "is_simulated": True,
        "count": len(events),
        "events": [e.to_dict() for e in events]
    }

@router.get("/dtcs", summary="Get stored Diagnostic Trouble Codes (DTCs)")
def get_dtcs(db: Session = Depends(get_db)):
    """
    Returns all logged DTCs from vehicle subsystems (BMS, Powertrain, ADAS).
    """
    events = db.query(DiagnosticEvent).filter(
        DiagnosticEvent.dtc_code.isnot(None)
    ).order_by(DiagnosticEvent.timestamp.desc()).all()

    return {
        "is_simulated": True,
        "count": len(events),
        "dtcs": [e.to_dict() for e in events]
    }
