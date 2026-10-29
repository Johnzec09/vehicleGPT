from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TelemetryRecordSchema(BaseModel):
    id: Optional[int] = None
    vehicle_id: str = "SANJO-EV-01"
    timestamp: datetime
    speed_kmh: float = Field(..., ge=0, le=250, description="Speed in km/h")
    battery_soc_pct: float = Field(..., ge=0, le=100, description="Battery State of Charge (%)")
    battery_voltage_v: float = Field(..., description="Pack Voltage (V)")
    battery_current_a: float = Field(..., description="Pack Current (A, negative = charging)")
    battery_temp_c: float = Field(..., description="Battery cell temperature (°C)")
    motor_temp_c: float = Field(..., description="Drive motor temperature (°C)")
    energy_consumption_wh_km: float = Field(..., description="Instantaneous/rolling energy consumption (Wh/km)")
    estimated_range_km: float = Field(..., ge=0, description="Remaining driving range (km)")
    odometer_km: float = Field(..., ge=0, description="Cumulative odometer (km)")
    driving_mode: str = Field("NORMAL", description="ECO, NORMAL, or SPORT")
    driving_condition: str = Field("CITY", description="CITY, HIGHWAY, IDLE, CHARGING")
    ambient_temp_c: float = Field(24.0, description="External ambient temperature (°C)")
    is_charging: bool = False
    is_simulated: bool = True

    class Config:
        orm_mode = True


class DiagnosticEventSchema(BaseModel):
    id: Optional[int] = None
    vehicle_id: str = "SANJO-EV-01"
    timestamp: datetime
    event_type: str
    severity: str  # INFO, WARNING, CRITICAL
    title: str
    description: str
    source_subsystem: str
    dtc_code: Optional[str] = None
    supporting_telemetry: Optional[str] = None
    is_simulated: bool = True

    class Config:
        orm_mode = True


class TripSummarySchema(BaseModel):
    id: Optional[int] = None
    trip_id: str
    start_time: datetime
    end_time: datetime
    distance_km: float
    duration_minutes: float
    avg_speed_kmh: float
    max_speed_kmh: float
    avg_consumption_wh_km: float
    driving_condition: str
    start_soc_pct: float
    end_soc_pct: float
    ambient_temp_avg_c: float
    is_simulated: bool = True

    class Config:
        orm_mode = True


class SimulatorStatusResponse(BaseModel):
    state: str  # RUNNING, PAUSED, STOPPED
    vehicle_id: str
    simulation_label: str = "SIMULATED_DATA"
    safety_isolated: bool = True
    ticks_count: int
    last_tick_time: Optional[datetime] = None
    current_telemetry: Optional[TelemetryRecordSchema] = None
    update_interval_sec: float


class SimulatorControlRequest(BaseModel):
    command: str = Field(..., description="start, pause, resume, reset")
    profile: Optional[str] = Field("dynamic", description="dynamic, highway_cruise, city_commute, aggressive, rapid_charging")


class AnomalyInjectionRequest(BaseModel):
    anomaly_type: str = Field(
        ...,
        description="battery_overheat, motor_overheat, rapid_discharge, adas_disengage, dtc_fault, charging_surge"
    )
    severity: Optional[str] = Field("WARNING", description="INFO, WARNING, CRITICAL")
    duration_seconds: Optional[int] = Field(30, description="Duration in seconds for abnormal condition")


class HistoricalTelemetryQuery(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    driving_condition: Optional[str] = None
    limit: int = Field(100, ge=1, le=5000)
    offset: int = Field(0, ge=0)


class CityHighwayComparisonResponse(BaseModel):
    is_simulated: bool = True
    city: Dict[str, Any]
    highway: Dict[str, Any]
    efficiency_difference_pct: float
    analysis_summary: str


class SOCTrendResponse(BaseModel):
    is_simulated: bool = True
    time_window: str
    start_soc_pct: float
    end_soc_pct: float
    net_soc_change_pct: float
    total_charging_sessions: int
    total_discharged_pct: float
    daily_soc_averages: List[Dict[str, Any]]


class RangeDegradationResponse(BaseModel):
    is_simulated: bool = True
    period_analyzed: str
    baseline_avg_range_km: float
    recent_avg_range_km: float
    reduction_km: float
    reduction_pct: float
    primary_causes: List[str]
    supporting_metrics: Dict[str, Any]


class AnomalyReportResponse(BaseModel):
    is_simulated: bool = True
    total_anomalies: int
    battery_temp_anomalies: int
    motor_temp_anomalies: int
    efficiency_spikes: int
    recent_anomalies: List[DiagnosticEventSchema]


class OverallAnalyticsResponse(BaseModel):
    is_simulated: bool = True
    total_telemetry_points: int
    total_trips: int
    total_distance_km: float
    total_energy_kwh: float
    lifetime_avg_consumption_wh_km: float
    city_vs_highway: CityHighwayComparisonResponse
    soc_trends: SOCTrendResponse
    range_analysis: RangeDegradationResponse
    active_dtcs: List[Dict[str, Any]]


class NLQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="User's natural language question about the vehicle")


class EvidencePayload(BaseModel):
    query_intent: str
    time_window_analyzed: str
    numerical_metrics: Dict[str, Any]
    supporting_record_count: int
    sample_records: List[Dict[str, Any]] = []
    database_tables_queried: List[str]


class NLQueryResponse(BaseModel):
    query: str
    intent_detected: str
    answer: str
    confidence: float
    is_simulated_data: bool = True
    evidence: EvidencePayload
    active_ai_mode: str = Field("DETERMINISTIC_FALLBACK", description="LOCAL_SLM or DETERMINISTIC_FALLBACK")
    latency_ms: Optional[float] = None
    safety_disclaimer: str = (
        "VehicleGPT operates as a read-only edge information assistant. "
        "No vehicle control, powertrain actuation, or braking command authority exists."
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    status: str = "healthy"
    project: str
    team: str
    version: str
    safety_isolated: bool = True
    is_simulated: bool = True
    database_connected: bool
    telemetry_records_count: int
    diagnostic_events_count: int
    simulator_running: bool
    offline_ready: bool = True
