from fastapi import APIRouter, HTTPException
from app.simulator.vehicle_simulator import vehicle_simulator
from app.models.schemas import SimulatorStatusResponse, SimulatorControlRequest, AnomalyInjectionRequest

router = APIRouter(prefix="/simulator", tags=["Vehicle Simulator Controls"])

@router.get("/status", response_model=SimulatorStatusResponse, summary="Get simulator state and live values")
def get_status():
    return vehicle_simulator.get_status()

@router.post("/control", summary="Start, pause, resume, or reset vehicle simulator")
def control_simulator(req: SimulatorControlRequest):
    cmd = req.command.lower()
    if cmd == "start":
        return vehicle_simulator.start(profile=req.profile or "city_commute")
    elif cmd == "pause":
        return vehicle_simulator.pause()
    elif cmd == "resume":
        return vehicle_simulator.resume()
    elif cmd == "reset":
        return vehicle_simulator.reset()
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid simulator command '{req.command}'. Allowed: start, pause, resume, reset."
        )

@router.post("/inject-anomaly", summary="Inject an abnormal event or fault code into the live stream")
def inject_anomaly(req: AnomalyInjectionRequest):
    valid_anomalies = [
        "battery_overheat", "motor_overheat", "rapid_discharge",
        "adas_disengage", "dtc_fault", "charging_surge"
    ]
    if req.anomaly_type not in valid_anomalies:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid anomaly_type '{req.anomaly_type}'. Allowed: {', '.join(valid_anomalies)}"
        )
    return vehicle_simulator.inject_anomaly(
        anomaly_type=req.anomaly_type,
        severity=req.severity or "WARNING",
        duration_sec=req.duration_seconds or 30
    )
