from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.db_models import TelemetryRecord, TripSummary
from app.models.schemas import TelemetryRecordSchema, TripSummarySchema
from app.simulator.vehicle_simulator import vehicle_simulator

router = APIRouter(prefix="/telemetry", tags=["Vehicle Telemetry"])

@router.get("/latest", response_model=TelemetryRecordSchema, summary="Get latest telemetry reading")
def get_latest_telemetry(db: Session = Depends(get_db)):
    """
    Returns the most recent vehicle telemetry frame from the live simulator stream,
    or falls back to the latest record in SQLite.
    """
    live = vehicle_simulator.latest_telemetry
    if live:
        return live

    record = db.query(TelemetryRecord).order_by(TelemetryRecord.timestamp.desc()).first()
    if not record:
        raise HTTPException(
            status_code=404,
            detail="No telemetry records found. Start the simulator or seed demo data."
        )
    return record.to_dict()

@router.get("/history", summary="Query historical telemetry records")
def get_historical_telemetry(
    start_time: Optional[datetime] = Query(None, description="ISO format start datetime"),
    end_time: Optional[datetime] = Query(None, description="ISO format end datetime"),
    driving_condition: Optional[str] = Query(None, description="CITY, HIGHWAY, IDLE, CHARGING"),
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Parameterized and indexed query for historical EV telemetry records.
    """
    query = db.query(TelemetryRecord)
    if start_time:
        query = query.filter(TelemetryRecord.timestamp >= start_time)
    if end_time:
        query = query.filter(TelemetryRecord.timestamp <= end_time)
    if driving_condition:
        query = query.filter(TelemetryRecord.driving_condition == driving_condition.upper())

    total_matched = query.count()
    records = query.order_by(TelemetryRecord.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "is_simulated": True,
        "total_matched": total_matched,
        "limit": limit,
        "offset": offset,
        "records": [r.to_dict() for r in records]
    }

@router.get("/trips", summary="Get historical trip summaries")
def get_trips(
    limit: int = Query(50, ge=1, le=500),
    driving_condition: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(TripSummary)
    if driving_condition:
        query = query.filter(TripSummary.driving_condition == driving_condition.upper())

    trips = query.order_by(TripSummary.start_time.desc()).limit(limit).all()
    return {
        "is_simulated": True,
        "count": len(trips),
        "trips": [t.to_dict() for t in trips]
    }

@router.get("/export", summary="Export historical telemetry data as CSV or JSON")
def export_telemetry(
    format: str = Query("csv", description="csv or json"),
    limit: int = Query(2000, ge=1, le=10000),
    db: Session = Depends(get_db)
):
    import io
    import csv
    from fastapi.responses import Response

    records = db.query(TelemetryRecord).order_by(TelemetryRecord.timestamp.desc()).limit(limit).all()
    dicts = [r.to_dict() for r in records]

    if format.lower() == "json":
        import json
        content = json.dumps(dicts, indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=vehicle_telemetry.json"}
        )

    # CSV Format
    output = io.StringIO()
    if dicts:
        fieldnames = list(dicts[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(dicts)
    else:
        output.write("timestamp,speed_kmh,battery_soc_pct,energy_consumption_wh_km\n")

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vehicle_telemetry.csv"}
    )

@router.post("/import", summary="Import telemetry records into SQLite database")
def import_telemetry(
    records_data: List[TelemetryRecordSchema],
    db: Session = Depends(get_db)
):
    """
    Imports an array of telemetry records, persisting them into SQLite.
    """
    imported = []
    for r in records_data:
        obj = TelemetryRecord(
            vehicle_id=r.vehicle_id,
            timestamp=r.timestamp,
            speed_kmh=r.speed_kmh,
            battery_soc_pct=r.battery_soc_pct,
            battery_voltage_v=r.battery_voltage_v,
            battery_current_a=r.battery_current_a,
            battery_temp_c=r.battery_temp_c,
            motor_temp_c=r.motor_temp_c,
            energy_consumption_wh_km=r.energy_consumption_wh_km,
            estimated_range_km=r.estimated_range_km,
            odometer_km=r.odometer_km,
            driving_mode=r.driving_mode,
            driving_condition=r.driving_condition,
            ambient_temp_c=r.ambient_temp_c,
            is_charging=r.is_charging,
            is_simulated=True
        )
        imported.append(obj)
    db.bulk_save_objects(imported)
    db.commit()
    return {
        "status": "success",
        "imported_count": len(imported),
        "message": f"Successfully imported {len(imported)} telemetry records."
    }

