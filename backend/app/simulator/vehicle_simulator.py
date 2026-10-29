import asyncio
import json
import logging
import math
import random
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.config import settings
from app.db.session import SessionLocal
from app.models.db_models import TelemetryRecord, DiagnosticEvent

logger = logging.getLogger("vehicle_simulator")

class VehicleSimulator:
    """
    On-device simulated EV powertrain and CAN bus streamer.
    Maintains realistic kinematic and thermodynamic relationships:
    - Speed fluctuations based on profile (City, Highway, Aggressive, Charging)
    - Power consumption P = (v * F_drag + rolling_resistance + inertia)
    - Battery voltage sag proportional to current draw
    - Battery and motor thermal inertia and passive cooling
    - SOC depletion and remaining range estimation
    """
    def __init__(self):
        self.state: str = "STOPPED"  # RUNNING, PAUSED, STOPPED
        self.profile: str = "city_commute"
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self.ticks_count: int = 0
        self.last_tick_time: Optional[datetime] = None

        # Vehicle physical state
        self.speed_kmh: float = 0.0
        self.battery_soc_pct: float = 84.5
        self.battery_voltage_v: float = 388.0
        self.battery_current_a: float = 0.0
        self.battery_temp_c: float = 27.5
        self.motor_temp_c: float = 38.0
        self.energy_consumption_wh_km: float = 152.0
        self.estimated_range_km: float = 365.0
        self.odometer_km: float = 14850.0
        self.driving_mode: str = "NORMAL"
        self.driving_condition: str = "CITY"
        self.ambient_temp_c: float = 23.5
        self.is_charging: bool = False

        # Active injected anomaly
        self._active_anomaly: Optional[Dict[str, Any]] = None
        self._anomaly_ticks_remaining: int = 0

        # Latest telemetry snapshot cache
        self.latest_telemetry: Optional[Dict[str, Any]] = None

    def start(self, profile: str = "city_commute") -> Dict[str, str]:
        with self._lock:
            if self.state == "RUNNING":
                return {"status": "already_running", "message": "Simulator is already running."}
            
            self.profile = profile
            self.state = "RUNNING"
            self._stop_event.clear()
            self._pause_event.clear()

            if self._thread is None or not self._thread.is_alive():
                self._thread = threading.Thread(target=self._run_loop, daemon=True)
                self._thread.start()

            logger.info("Vehicle simulator started with profile: %s", profile)
            return {"status": "started", "message": f"Simulator started with profile: {profile}"}

    def pause(self) -> Dict[str, str]:
        with self._lock:
            if self.state != "RUNNING":
                return {"status": "not_running", "message": f"Cannot pause: state is {self.state}."}
            self.state = "PAUSED"
            self._pause_event.set()
            return {"status": "paused", "message": "Simulator paused."}

    def resume(self) -> Dict[str, str]:
        with self._lock:
            if self.state != "PAUSED":
                return {"status": "not_paused", "message": f"Cannot resume: state is {self.state}."}
            self.state = "RUNNING"
            self._pause_event.clear()
            return {"status": "resumed", "message": "Simulator resumed."}

    def reset(self, initial_soc: float = 90.0, initial_odometer: float = 14850.0) -> Dict[str, str]:
        with self._lock:
            self.state = "STOPPED"
            self._stop_event.set()
            self._pause_event.clear()

            self.ticks_count = 0
            self.speed_kmh = 0.0
            self.battery_soc_pct = initial_soc
            self.odometer_km = initial_odometer
            self.battery_temp_c = 26.0
            self.motor_temp_c = 32.0
            self.energy_consumption_wh_km = 150.0
            self.estimated_range_km = (initial_soc / 100.0) * settings.MAX_DESIGN_RANGE_KM
            self.battery_voltage_v = settings.NOMINAL_VOLTAGE_V
            self.battery_current_a = 0.0
            self.driving_condition = "IDLE"
            self.is_charging = False
            self._active_anomaly = None
            self._anomaly_ticks_remaining = 0

            return {"status": "reset", "message": "Simulator reset to baseline defaults."}

    def inject_anomaly(self, anomaly_type: str, severity: str = "WARNING", duration_sec: int = 30) -> Dict[str, Any]:
        """
        Injects a physical condition or DTC fault into the simulator stream.
        Supported: battery_overheat, motor_overheat, rapid_discharge, adas_disengage, dtc_fault
        """
        with self._lock:
            self._active_anomaly = {
                "type": anomaly_type,
                "severity": severity,
                "duration": duration_sec,
                "start_tick": self.ticks_count
            }
            self._anomaly_ticks_remaining = duration_sec

            # Create immediate diagnostic event in database
            now = datetime.now(timezone.utc)
            db = SessionLocal()
            try:
                title_map = {
                    "battery_overheat": "Battery Thermal Runaway Risk / High Cell Temp",
                    "motor_overheat": "Drive Motor Inverter Stator Overheating",
                    "rapid_discharge": "Excessive Current Draw / Rapid Capacity Degradation",
                    "adas_disengage": "ADAS Sensor Obstruction / Abrupt Disengagement",
                    "dtc_fault": "BMS Sensor Plausibility Failure",
                    "charging_surge": "DC Fast Charger Voltage Spike"
                }
                dtc_map = {
                    "battery_overheat": "P0A7F",
                    "motor_overheat": "P0A3F",
                    "rapid_discharge": "P1A01",
                    "adas_disengage": "U0415",
                    "dtc_fault": "P0A80",
                    "charging_surge": "P0D56"
                }
                event = DiagnosticEvent(
                    vehicle_id=settings.VEHICLE_ID,
                    timestamp=now,
                    event_type=anomaly_type.upper(),
                    severity=severity,
                    title=title_map.get(anomaly_type, f"Simulated Anomaly: {anomaly_type}"),
                    description=f"Injected anomaly condition '{anomaly_type}' triggered on simulated vehicle bus.",
                    source_subsystem="BMS" if "battery" in anomaly_type else ("ADAS" if "adas" in anomaly_type else "POWERTRAIN"),
                    dtc_code=dtc_map.get(anomaly_type),
                    supporting_telemetry=json.dumps({
                        "speed_kmh": self.speed_kmh,
                        "soc_pct": self.battery_soc_pct,
                        "battery_temp_c": self.battery_temp_c,
                        "motor_temp_c": self.motor_temp_c,
                        "anomaly": anomaly_type
                    }),
                    is_simulated=True
                )
                db.add(event)
                db.commit()
            finally:
                db.close()

            return {
                "status": "injected",
                "anomaly": anomaly_type,
                "severity": severity,
                "duration_seconds": duration_sec
            }

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "state": self.state,
                "vehicle_id": settings.VEHICLE_ID,
                "simulation_label": settings.SIMULATION_LABEL,
                "safety_isolated": settings.SAFETY_ISOLATED,
                "ticks_count": self.ticks_count,
                "last_tick_time": self.last_tick_time,
                "current_telemetry": self.latest_telemetry,
                "update_interval_sec": settings.DEFAULT_TICK_SECONDS,
                "active_anomaly": self._active_anomaly["type"] if self._active_anomaly else None
            }

    def _run_loop(self):
        """Background thread executing 1-second simulation ticks."""
        while not self._stop_event.is_set():
            if self._pause_event.is_set():
                threading.Event().wait(0.5)
                continue

            self._step_simulation()
            threading.Event().wait(settings.DEFAULT_TICK_SECONDS)

    def _step_simulation(self):
        with self._lock:
            now = datetime.now(timezone.utc)
            self.ticks_count += 1
            self.last_tick_time = now

            # Profile physics
            if self.profile == "rapid_charging":
                self.is_charging = True
                self.driving_condition = "CHARGING"
                self.speed_kmh = 0.0
                self.battery_current_a = -110.0  # Fast DC charge
                self.battery_soc_pct = min(100.0, self.battery_soc_pct + 0.12)
                self.battery_temp_c = min(46.0, self.battery_temp_c + 0.05)
                self.motor_temp_c = max(self.ambient_temp_c, self.motor_temp_c - 0.05)
                self.energy_consumption_wh_km = 0.0
            elif self.profile == "highway_cruise":
                self.is_charging = False
                self.driving_condition = "HIGHWAY"
                self.speed_kmh = 105.0 + 8.0 * math.sin(self.ticks_count / 15.0) + random.uniform(-1, 1)
                self.energy_consumption_wh_km = 195.0 + (self.speed_kmh * 0.3)
                self.battery_current_a = 55.0 + random.uniform(-4, 4)
            elif self.profile == "aggressive":
                self.is_charging = False
                self.driving_condition = "HIGHWAY"
                self.driving_mode = "SPORT"
                self.speed_kmh = 125.0 + 15.0 * math.sin(self.ticks_count / 8.0) + random.uniform(-2, 2)
                self.energy_consumption_wh_km = 280.0 + random.uniform(-10, 10)
                self.battery_current_a = 140.0 + random.uniform(-10, 10)
            else:  # default "city_commute"
                self.is_charging = False
                self.driving_condition = "CITY"
                self.driving_mode = "ECO"
                # Stop & go cycle
                cycle = (self.ticks_count % 60)
                if cycle < 15:
                    self.speed_kmh = 0.0
                    self.battery_current_a = 2.0  # Idle
                    self.energy_consumption_wh_km = 135.0
                else:
                    self.speed_kmh = 38.0 + 12.0 * math.sin(cycle / 5.0) + random.uniform(-2, 2)
                    self.energy_consumption_wh_km = 150.0 + (self.speed_kmh * 0.2)
                    self.battery_current_a = 22.0 + random.uniform(-3, 3)

            # Anomaly mutations
            if self._active_anomaly and self._anomaly_ticks_remaining > 0:
                self._anomaly_ticks_remaining -= 1
                anom = self._active_anomaly["type"]
                if anom == "battery_overheat":
                    self.battery_temp_c += 0.8
                elif anom == "motor_overheat":
                    self.motor_temp_c += 1.5
                elif anom == "rapid_discharge":
                    self.battery_current_a += 90.0
                    self.battery_soc_pct = max(0.0, self.battery_soc_pct - 0.25)
                    self.energy_consumption_wh_km += 120.0

                if self._anomaly_ticks_remaining <= 0:
                    self._active_anomaly = None

            # Thermodynamic relaxation
            if not self.is_charging and not (self._active_anomaly and self._active_anomaly["type"] == "battery_overheat"):
                if self.battery_temp_c > 28.0:
                    self.battery_temp_c -= 0.02
                elif self.battery_temp_c < 24.0:
                    self.battery_temp_c += 0.02

            # Odometer and SOC integration
            delta_dist_km = (self.speed_kmh / 3600.0) * settings.DEFAULT_TICK_SECONDS
            self.odometer_km += delta_dist_km

            if not self.is_charging:
                kwh_used = (self.energy_consumption_wh_km * delta_dist_km) / 1000.0
                soc_drop = (kwh_used / settings.BATTERY_CAPACITY_KWH) * 100.0
                self.battery_soc_pct = max(0.5, self.battery_soc_pct - soc_drop)

            # Voltage calculation based on open circuit curve + internal resistance IR drop
            open_circuit_v = 340.0 + (self.battery_soc_pct / 100.0) * 65.0
            self.battery_voltage_v = open_circuit_v - (self.battery_current_a * 0.035)

            # Estimated range
            current_efficiency = max(100.0, self.energy_consumption_wh_km)
            self.estimated_range_km = (self.battery_soc_pct / 100.0) * (settings.BATTERY_CAPACITY_KWH / (current_efficiency / 1000.0))
            self.estimated_range_km = min(settings.MAX_DESIGN_RANGE_KM, max(1.0, self.estimated_range_km))

            record = {
                "vehicle_id": settings.VEHICLE_ID,
                "timestamp": now.isoformat(),
                "speed_kmh": round(self.speed_kmh, 1),
                "battery_soc_pct": round(self.battery_soc_pct, 1),
                "battery_voltage_v": round(self.battery_voltage_v, 2),
                "battery_current_a": round(self.battery_current_a, 2),
                "battery_temp_c": round(self.battery_temp_c, 1),
                "motor_temp_c": round(self.motor_temp_c, 1),
                "energy_consumption_wh_km": round(self.energy_consumption_wh_km, 1),
                "estimated_range_km": round(self.estimated_range_km, 1),
                "odometer_km": round(self.odometer_km, 3),
                "driving_mode": self.driving_mode,
                "driving_condition": self.driving_condition,
                "ambient_temp_c": round(self.ambient_temp_c, 1),
                "is_charging": self.is_charging,
                "is_simulated": True
            }
            self.latest_telemetry = record

            # Commit to DB periodically every 5 ticks to avoid excessive SQLite disk writes while keeping fresh telemetry
            if self.ticks_count % 5 == 0:
                try:
                    db = SessionLocal()
                    db_record = TelemetryRecord(
                        vehicle_id=settings.VEHICLE_ID,
                        timestamp=now,
                        speed_kmh=record["speed_kmh"],
                        battery_soc_pct=record["battery_soc_pct"],
                        battery_voltage_v=record["battery_voltage_v"],
                        battery_current_a=record["battery_current_a"],
                        battery_temp_c=record["battery_temp_c"],
                        motor_temp_c=record["motor_temp_c"],
                        energy_consumption_wh_km=record["energy_consumption_wh_km"],
                        estimated_range_km=record["estimated_range_km"],
                        odometer_km=record["odometer_km"],
                        driving_mode=record["driving_mode"],
                        driving_condition=record["driving_condition"],
                        ambient_temp_c=record["ambient_temp_c"],
                        is_charging=record["is_charging"],
                        is_simulated=True
                    )
                    db.add(db_record)
                    db.commit()
                    db.close()
                except Exception as e:
                    logger.error("Failed to commit live telemetry to SQLite: %s", e)

# Global singleton instance
vehicle_simulator = VehicleSimulator()
