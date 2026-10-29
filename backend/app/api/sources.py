from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.db_models import TelemetryRecord, DiagnosticEvent
from app.simulator.vehicle_simulator import vehicle_simulator

router = APIRouter(prefix="/sources", tags=["Data Sources & Protocol Adapters"])

@router.get("", summary="Get status and telemetry statistics for automotive data sources")
def get_data_sources_status(db: Session = Depends(get_db)):
    """
    Returns real-time status of all SDV protocol adapters,
    distinguishing between simulated adapters and physical hardware buses.
    """
    total_telemetry = db.query(func.count(TelemetryRecord.id)).scalar() or 0
    total_events = db.query(func.count(DiagnosticEvent.id)).scalar() or 0

    sources = [
        {
            "id": "sim_powertrain",
            "name": "Vehicle Simulator (Powertrain & Kinematics)",
            "protocol": "Internal Physics Engine",
            "status": "ACTIVE" if vehicle_simulator.state == "RUNNING" else vehicle_simulator.state,
            "is_simulated": True,
            "is_physically_connected": False,
            "packets_received": vehicle_simulator.ticks_count,
            "update_rate_hz": 1.0,
            "bus_type": "Virtual",
            "details": f"Generates dynamic EV kinematics, battery thermodynamics, and SOC depletion. Current state: {vehicle_simulator.state}.",
            "safety_isolated": True
        },
        {
            "id": "can_fd",
            "name": "CAN / CAN-FD Bus Adapter",
            "protocol": "ISO 11898-1:2015 (vcan0 virtual socket)",
            "status": "SIMULATED_LISTENER",
            "is_simulated": True,
            "is_physically_connected": False,
            "packets_received": total_telemetry * 8,  # ~8 CAN frames per telemetry point
            "update_rate_hz": 10.0,
            "bus_type": "vcan0 (Virtual CAN)",
            "details": "Read-only listener on virtual CAN-FD bus. Physical OBD-II/CAN transceiver disconnected; operating in on-edge sandbox mode.",
            "safety_isolated": True
        },
        {
            "id": "some_ip",
            "name": "SOME/IP Automotive Ethernet",
            "protocol": "AUTOSAR SOME/IP (Scalable service-Oriented MiddlewarE over IP)",
            "status": "SIMULATED_SERVICE",
            "is_simulated": True,
            "is_physically_connected": False,
            "packets_received": total_telemetry * 2,
            "update_rate_hz": 2.0,
            "bus_type": "Ethernet / UDP Port 30490",
            "details": "Subscribed to SDV Powertrain and Thermal SOME/IP service offerings. Read-only event consumption.",
            "safety_isolated": True
        },
        {
            "id": "android_vhal",
            "name": "Android Automotive OS (AAOS) Vehicle HAL",
            "protocol": "AIDL IVehicle Interface",
            "status": "SIMULATED_INTERFACE",
            "is_simulated": True,
            "is_physically_connected": False,
            "packets_received": total_telemetry,
            "update_rate_hz": 1.0,
            "bus_type": "Android IPC / Binder",
            "details": "Monitors Android Vehicle Properties: PERF_VEHICLE_SPEED, INFO_EV_BATTERY_CAPACITY, EV_BATTERY_LEVEL.",
            "safety_isolated": True
        },
        {
            "id": "qnx_slog",
            "name": "QNX Neutrino RTOS System Logs",
            "protocol": "QNX slog2 Diagnostic Interface",
            "status": "SIMULATED_LOGGER",
            "is_simulated": True,
            "is_physically_connected": False,
            "packets_received": total_events * 3,
            "update_rate_hz": 0.5,
            "bus_type": "IPC /dev/slog2",
            "details": "Captures low-level safety-critical ECU fault warnings, microkernel diagnostics, and IPC trace frames.",
            "safety_isolated": True
        },
        {
            "id": "adas_perception",
            "name": "ADAS Perception & Vision Stream",
            "protocol": "Vision / Radar Disengagement Feed",
            "status": "SIMULATED_FEED",
            "is_simulated": True,
            "is_physically_connected": False,
            "packets_received": total_events,
            "update_rate_hz": 1.0,
            "bus_type": "High-Speed Vision Serialization",
            "details": "Monitors LKA, ACC, and AEB disengagement triggers, sensor occlusions, and steering torque overrides.",
            "safety_isolated": True
        },
        {
            "id": "file_importer",
            "name": "Diagnostic File Importer / SQLite Storage",
            "protocol": "Local SQLite 3.45 WAL + File Stream",
            "status": "ACTIVE",
            "is_simulated": False,
            "is_physically_connected": True,
            "packets_received": total_telemetry,
            "update_rate_hz": 0.0,
            "bus_type": "Local NVMe / Flash Storage",
            "details": f"Persistent SQLite database on edge storage holding {total_telemetry} telemetry records and {total_events} events.",
            "safety_isolated": True
        }
    ]

    return {
        "is_simulated_environment": True,
        "physical_actuator_isolation": "ENABLED_STRICT_READ_ONLY",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_sources_configured": len(sources),
        "active_simulated_sources": len([s for s in sources if s["is_simulated"]]),
        "physical_adapters_connected": 0,
        "sources": sources
    }
