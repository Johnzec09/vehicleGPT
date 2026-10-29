export interface TelemetryRecord {
  id?: number;
  vehicle_id: string;
  timestamp: string;
  speed_kmh: number;
  battery_soc_pct: number;
  battery_voltage_v: number;
  battery_current_a: number;
  battery_temp_c: number;
  motor_temp_c: number;
  energy_consumption_wh_km: number;
  estimated_range_km: number;
  odometer_km: number;
  driving_mode: string;
  driving_condition: string;
  ambient_temp_c: number;
  is_charging: boolean;
  is_simulated: boolean;
}

export interface DiagnosticEvent {
  id?: number;
  vehicle_id: string;
  timestamp: string;
  event_type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  description: string;
  source_subsystem: string;
  dtc_code?: string | null;
  supporting_telemetry?: string | null;
  is_simulated: boolean;
}

export interface TripSummary {
  id?: number;
  trip_id: string;
  start_time: string;
  end_time: string;
  distance_km: number;
  duration_minutes: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  avg_consumption_wh_km: number;
  driving_condition: string;
  start_soc_pct: number;
  end_soc_pct: number;
  ambient_temp_avg_c: number;
  is_simulated: boolean;
}

export interface SimulatorStatus {
  state: "RUNNING" | "PAUSED" | "STOPPED";
  vehicle_id: string;
  simulation_label: string;
  safety_isolated: boolean;
  ticks_count: number;
  last_tick_time: string | null;
  current_telemetry: TelemetryRecord | null;
  update_interval_sec: number;
  active_anomaly?: string | null;
}

export interface SystemHealth {
  status: string;
  project: string;
  team: string;
  version: string;
  safety_isolated: boolean;
  is_simulated: boolean;
  database_connected: boolean;
  telemetry_records_count: number;
  diagnostic_events_count: number;
  simulator_state: string;
  offline_ready: boolean;
  cloud_api_dependencies: boolean;
  edge_system_resources?: {
    ram_total_mb: number;
    ram_used_mb: number;
    ram_percent: number;
  };
}

export interface CityHighwayComparison {
  is_simulated: boolean;
  city: {
    avg_consumption_wh_km: number;
    avg_consumption_kwh_100km: number;
    avg_speed_kmh: number;
    max_consumption_wh_km: number;
    min_consumption_wh_km: number;
    avg_battery_temp_c: number;
    total_distance_km: number;
    data_points: number;
  };
  highway: {
    avg_consumption_wh_km: number;
    avg_consumption_kwh_100km: number;
    avg_speed_kmh: number;
    max_consumption_wh_km: number;
    min_consumption_wh_km: number;
    avg_battery_temp_c: number;
    total_distance_km: number;
    data_points: number;
  };
  efficiency_difference_pct: number;
  analysis_summary: string;
}

export interface RangeReductionAnalysis {
  is_simulated: boolean;
  period_analyzed: string;
  baseline_avg_range_km: number;
  recent_avg_range_km: number;
  reduction_km: number;
  reduction_pct: number;
  primary_causes: string[];
  supporting_metrics: {
    baseline_consumption_wh_km: number;
    recent_consumption_wh_km: number;
    consumption_increase_pct: number;
    baseline_avg_temp_c: number;
    recent_avg_temp_c: number;
    temperature_drop_c: number;
    baseline_highway_pct: number;
    recent_highway_pct: number;
    samples_analyzed: number;
  };
}

export interface SOCTrends {
  is_simulated: boolean;
  time_window: string;
  start_soc_pct: number;
  end_soc_pct: number;
  net_soc_change_pct: number;
  total_charging_sessions: number;
  total_discharged_pct: number;
  daily_soc_averages: Array<{
    date: string;
    avg_soc_pct: number;
    min_soc_pct: number;
    max_soc_pct: number;
  }>;
}

export interface PreIncidentData {
  is_simulated: boolean;
  event: DiagnosticEvent;
  pre_incident_window_minutes: number;
  sample_count: number;
  telemetry_samples: TelemetryRecord[];
  summary_metrics: {
    initial_battery_temp_c: number;
    peak_battery_temp_c: number;
    temp_rise_delta_c: number;
    peak_discharge_current_a: number;
    average_speed_kmh: number;
  };
  root_cause_explanation: string;
}

export interface EvidencePayload {
  query_intent: string;
  time_window_analyzed: string;
  numerical_metrics: Record<string, any>;
  supporting_record_count: number;
  sample_records: any[];
  database_tables_queried: string[];
}

export interface NLQueryResponse {
  query: string;
  intent_detected: string;
  answer: string;
  confidence: number;
  is_simulated_data: boolean;
  evidence: EvidencePayload;
  active_ai_mode?: "LOCAL_SLM" | "DETERMINISTIC_FALLBACK" | "SAFETY_ISOLATION_BARRIER" | string;
  latency_ms?: number;
  safety_disclaimer: string;
  timestamp: string;
}

export interface SLMStatus {
  slm_enabled: boolean;
  model_installed: boolean;
  model_filename: string | null;
  model_name: string;
  model_path: string | null;
  model_size_mb: number;
  quantization: string;
  architecture: string;
  context_length: number;
  runtime_status: string;
  load_error: string | null;
  active_ai_mode: "LOCAL_SLM" | "DETERMINISTIC_FALLBACK";
  inference_count: number;
  last_inference_latency_ms: number;
  memory_usage_mb: number;
  target_edge_budget: {
    target_ram_mb: number;
    target_cpu_cores: number;
    within_budget: boolean;
  };
  offline_operation: boolean;
  cloud_dependencies: boolean;
}

export interface DataSourceAdapter {
  id: string;
  name: string;
  protocol: string;
  status: string;
  is_simulated: boolean;
  is_physically_connected: boolean;
  packets_received: number;
  update_rate_hz: number;
  bus_type: string;
  details: string;
  safety_isolated: boolean;
}

export interface DataSourcesResponse {
  is_simulated_environment: boolean;
  physical_actuator_isolation: string;
  timestamp: string;
  total_sources_configured: number;
  active_simulated_sources: number;
  physical_adapters_connected: number;
  sources: DataSourceAdapter[];
}
