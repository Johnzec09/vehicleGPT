import {
  TelemetryRecord,
  DiagnosticEvent,
  TripSummary,
  SimulatorStatus,
  SystemHealth,
  CityHighwayComparison,
  RangeReductionAnalysis,
  SOCTrends,
  PreIncidentData,
  NLQueryResponse,
  DataSourcesResponse,
  SLMStatus
} from "../types/vehicle";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {})
        }
      });

      if (!response.ok) {
        let errMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
          }
        } catch {
          // fallback to statusText
        }
        throw new Error(errMessage);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        throw new Error("Unable to reach VehicleGPT edge backend. Ensure the server is running on http://127.0.0.1:8000.");
      }
      throw err;
    }
  }

  // System & Health
  async getHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>("/health");
  }

  // Telemetry
  async getLatestTelemetry(): Promise<TelemetryRecord> {
    return this.request<TelemetryRecord>("/telemetry/latest");
  }

  async getHistoricalTelemetry(params?: {
    start_time?: string;
    end_time?: string;
    driving_condition?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ is_simulated: boolean; total_matched: number; records: TelemetryRecord[] }> {
    const query = new URLSearchParams();
    if (params?.start_time) query.append("start_time", params.start_time);
    if (params?.end_time) query.append("end_time", params.end_time);
    if (params?.driving_condition) query.append("driving_condition", params.driving_condition);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset !== undefined) query.append("offset", params.offset.toString());

    return this.request<{ is_simulated: boolean; total_matched: number; records: TelemetryRecord[] }>(
      `/telemetry/history?${query.toString()}`
    );
  }

  async getTrips(params?: { limit?: number; driving_condition?: string }): Promise<{ count: number; trips: TripSummary[] }> {
    const query = new URLSearchParams();
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.driving_condition) query.append("driving_condition", params.driving_condition);
    return this.request<{ count: number; trips: TripSummary[] }>(`/telemetry/trips?${query.toString()}`);
  }

  // Events & DTCs
  async getEvents(params?: {
    event_type?: string;
    severity?: string;
    limit?: number;
  }): Promise<{ count: number; events: DiagnosticEvent[] }> {
    const query = new URLSearchParams();
    if (params?.event_type) query.append("event_type", params.event_type);
    if (params?.severity) query.append("severity", params.severity);
    if (params?.limit) query.append("limit", params.limit.toString());
    return this.request<{ count: number; events: DiagnosticEvent[] }>(`/events?${query.toString()}`);
  }

  async getDTCs(): Promise<{ count: number; dtcs: DiagnosticEvent[] }> {
    return this.request<{ count: number; dtcs: DiagnosticEvent[] }>("/events/dtcs");
  }

  // Analytics
  async getCityVsHighway(days: number = 30): Promise<CityHighwayComparison> {
    return this.request<CityHighwayComparison>(`/analytics/city-vs-highway?days=${days}`);
  }

  async getRangeReduction(windowDays: number = 14): Promise<RangeReductionAnalysis> {
    return this.request<RangeReductionAnalysis>(`/analytics/range-reduction?window_days=${windowDays}`);
  }

  async getLargestEfficiencyDrop(days: number = 30): Promise<any> {
    return this.request<any>(`/analytics/efficiency-drop?days=${days}`);
  }

  async getPreIncidentTelemetry(windowMinutes: number = 15): Promise<PreIncidentData> {
    return this.request<PreIncidentData>(`/analytics/pre-incident?window_minutes=${windowMinutes}`);
  }

  async getSOCTrends(days: number = 30): Promise<SOCTrends> {
    return this.request<SOCTrends>(`/analytics/soc-trends?days=${days}`);
  }

  async getAnomalies(days: number = 30): Promise<any> {
    return this.request<any>(`/analytics/anomalies?days=${days}`);
  }

  // Simulator Controls
  async getSimulatorStatus(): Promise<SimulatorStatus> {
    return this.request<SimulatorStatus>("/simulator/status");
  }

  async controlSimulator(command: "start" | "pause" | "resume" | "reset", profile: string = "city_commute"): Promise<any> {
    return this.request<any>("/simulator/control", {
      method: "POST",
      body: JSON.stringify({ command, profile })
    });
  }

  async injectAnomaly(anomalyType: string, severity: string = "WARNING", durationSec: number = 30): Promise<any> {
    return this.request<any>("/simulator/inject-anomaly", {
      method: "POST",
      body: JSON.stringify({
        anomaly_type: anomalyType,
        severity,
        duration_seconds: durationSec
      })
    });
  }

  // Assistant Query
  async askAssistant(query: string): Promise<{ data: NLQueryResponse; latencyMs: number }> {
    const t0 = performance.now();
    const data = await this.request<NLQueryResponse>("/assistant/query", {
      method: "POST",
      body: JSON.stringify({ query })
    });
    const latencyMs = Math.round(performance.now() - t0);
    return { data, latencyMs };
  }

  // Data Sources
  async getDataSources(): Promise<DataSourcesResponse> {
    return this.request<DataSourcesResponse>("/sources");
  }

  // Local SLM
  async getSLMStatus(): Promise<SLMStatus> {
    return this.request<SLMStatus>("/slm/status");
  }

  async scanSLMModels(): Promise<SLMStatus> {
    return this.request<SLMStatus>("/slm/scan", { method: "POST" });
  }

  async toggleSLM(enabled: boolean): Promise<SLMStatus> {
    return this.request<SLMStatus>(`/slm/toggle?enabled=${enabled}`, { method: "POST" });
  }

  // Demo Data Reset
  async generateDemoData(force: boolean = true, days: number = 30): Promise<any> {
    return this.request<any>(`/demo/generate?force=${force}&days=${days}`, {
      method: "POST"
    });
  }

  // Export
  getExportUrl(format: "csv" | "json" = "csv", limit: number = 2000): string {
    return `${this.baseUrl}/telemetry/export?format=${format}&limit=${limit}`;
  }

  // Import
  async importTelemetry(records: TelemetryRecord[]): Promise<any> {
    return this.request<any>("/telemetry/import", {
      method: "POST",
      body: JSON.stringify(records)
    });
  }
}

export const api = new ApiService(API_BASE_URL);
