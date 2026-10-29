from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import psutil

from app.db.session import get_db
from app.config import settings
from app.models.db_models import TelemetryRecord, DiagnosticEvent
from app.simulator.vehicle_simulator import vehicle_simulator

router = APIRouter(prefix="/health", tags=["Health & System"])

@router.get("", summary="Get system health and on-edge status")
def get_health_status(db: Session = Depends(get_db)):
    """
    Returns edge runtime status, database health, record counts,
    and confirms strict offline operation and safety isolation.
    """
    try:
        telemetry_count = db.query(func.count(TelemetryRecord.id)).scalar() or 0
        events_count = db.query(func.count(DiagnosticEvent.id)).scalar() or 0
        db_connected = True
    except Exception:
        telemetry_count = 0
        events_count = 0
        db_connected = False

    mem = psutil.virtual_memory()

    return {
        "status": "healthy" if db_connected else "degraded",
        "project": settings.PROJECT_TITLE,
        "team": settings.TEAM_NAME,
        "version": settings.VERSION,
        "safety_isolated": settings.SAFETY_ISOLATED,
        "is_simulated": True,
        "database_connected": db_connected,
        "telemetry_records_count": telemetry_count,
        "diagnostic_events_count": events_count,
        "simulator_state": vehicle_simulator.state,
        "offline_ready": True,
        "cloud_api_dependencies": False,
        "edge_system_resources": {
            "ram_total_mb": round(mem.total / (1024 * 1024), 1),
            "ram_used_mb": round(mem.used / (1024 * 1024), 1),
            "ram_percent": mem.percent
        }
    }
