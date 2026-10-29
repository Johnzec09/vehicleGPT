from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, Index
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_id = Column(String(32), default="SANJO-EV-01", nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    speed_kmh = Column(Float, nullable=False)
    battery_soc_pct = Column(Float, nullable=False)
    battery_voltage_v = Column(Float, nullable=False)
    battery_current_a = Column(Float, nullable=False)
    battery_temp_c = Column(Float, nullable=False)
    motor_temp_c = Column(Float, nullable=False)
    energy_consumption_wh_km = Column(Float, nullable=False)
    estimated_range_km = Column(Float, nullable=False)
    odometer_km = Column(Float, nullable=False)
    driving_mode = Column(String(16), default="NORMAL", nullable=False)  # ECO, NORMAL, SPORT
    driving_condition = Column(String(16), default="CITY", nullable=False)  # CITY, HIGHWAY, IDLE, CHARGING
    ambient_temp_c = Column(Float, default=24.0, nullable=False)
    is_charging = Column(Boolean, default=False, nullable=False)
    is_simulated = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("idx_telemetry_ts_condition", "timestamp", "driving_condition"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else str(self.timestamp),
            "speed_kmh": round(self.speed_kmh, 1),
            "battery_soc_pct": round(self.battery_soc_pct, 1),
            "battery_voltage_v": round(self.battery_voltage_v, 2),
            "battery_current_a": round(self.battery_current_a, 2),
            "battery_temp_c": round(self.battery_temp_c, 1),
            "motor_temp_c": round(self.motor_temp_c, 1),
            "energy_consumption_wh_km": round(self.energy_consumption_wh_km, 1),
            "estimated_range_km": round(self.estimated_range_km, 1),
            "odometer_km": round(self.odometer_km, 2),
            "driving_mode": self.driving_mode,
            "driving_condition": self.driving_condition,
            "ambient_temp_c": round(self.ambient_temp_c, 1),
            "is_charging": self.is_charging,
            "is_simulated": self.is_simulated,
        }


class DiagnosticEvent(Base):
    __tablename__ = "diagnostic_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_id = Column(String(32), default="SANJO-EV-01", nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    severity = Column(String(16), nullable=False)  # INFO, WARNING, CRITICAL
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    source_subsystem = Column(String(32), nullable=False)  # BMS, POWERTRAIN, ADAS, THERMAL, CHARGER
    dtc_code = Column(String(16), nullable=True, index=True)
    supporting_telemetry = Column(Text, nullable=True)  # JSON-encoded snapshot
    is_simulated = Column(Boolean, default=True, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else str(self.timestamp),
            "event_type": self.event_type,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "source_subsystem": self.source_subsystem,
            "dtc_code": self.dtc_code,
            "supporting_telemetry": self.supporting_telemetry,
            "is_simulated": self.is_simulated,
        }


class TripSummary(Base):
    __tablename__ = "trip_summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(String(64), unique=True, nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    distance_km = Column(Float, nullable=False)
    duration_minutes = Column(Float, nullable=False)
    avg_speed_kmh = Column(Float, nullable=False)
    max_speed_kmh = Column(Float, nullable=False)
    avg_consumption_wh_km = Column(Float, nullable=False)
    driving_condition = Column(String(16), nullable=False)  # CITY, HIGHWAY, MIXED
    start_soc_pct = Column(Float, nullable=False)
    end_soc_pct = Column(Float, nullable=False)
    ambient_temp_avg_c = Column(Float, nullable=False)
    is_simulated = Column(Boolean, default=True, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "start_time": self.start_time.isoformat() if isinstance(self.start_time, datetime) else str(self.start_time),
            "end_time": self.end_time.isoformat() if isinstance(self.end_time, datetime) else str(self.end_time),
            "distance_km": round(self.distance_km, 2),
            "duration_minutes": round(self.duration_minutes, 1),
            "avg_speed_kmh": round(self.avg_speed_kmh, 1),
            "max_speed_kmh": round(self.max_speed_kmh, 1),
            "avg_consumption_wh_km": round(self.avg_consumption_wh_km, 1),
            "driving_condition": self.driving_condition,
            "start_soc_pct": round(self.start_soc_pct, 1),
            "end_soc_pct": round(self.end_soc_pct, 1),
            "ambient_temp_avg_c": round(self.ambient_temp_avg_c, 1),
            "is_simulated": self.is_simulated,
        }
