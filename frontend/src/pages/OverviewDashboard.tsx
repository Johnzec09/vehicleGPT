import React, { useEffect, useState } from "react";
import {
  Gauge,
  Battery,
  Thermometer,
  Zap,
  Activity,
  Milestone,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
  Server,
  Cpu
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { api } from "../services/api";
import { TelemetryRecord, DiagnosticEvent, SystemHealth, SimulatorStatus } from "../types/vehicle";
import { MetricCard } from "../components/MetricCard";
import { VehicleVisualizer } from "../components/VehicleVisualizer";
import { ErrorAlert } from "../components/ErrorAlert";

interface OverviewProps {
  onNavigateToAssistant: (query?: string) => void;
}

export const OverviewDashboard: React.FC<OverviewProps> = ({ onNavigateToAssistant }) => {
  const [telemetry, setTelemetry] = useState<TelemetryRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<TelemetryRecord[]>([]);
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [simulator, setSimulator] = useState<SimulatorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [latencyMs, setLatencyMs] = useState<number>(14);

  const fetchData = async () => {
    try {
      setError(null);
      const t0 = performance.now();
      const [latest, histRes, eventsRes, healthRes, simRes] = await Promise.all([
        api.getLatestTelemetry(),
        api.getHistoricalTelemetry({ limit: 40 }),
        api.getEvents({ limit: 5 }),
        api.getHealth(),
        api.getSimulatorStatus()
      ]);
      setLatencyMs(Math.round(performance.now() - t0));

      setTelemetry(latest);
      // Reverse to chronological order for charts
      setRecentRecords([...histRes.records].reverse());
      setEvents(eventsRes.events);
      setHealth(healthRes);
      setSimulator(simRes);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // 4-second refresh
    return () => clearInterval(interval);
  }, []);

  const chartData = recentRecords.map((r, i) => ({
    index: i,
    time: r.timestamp ? r.timestamp.substring(11, 19) : `T-${i}`,
    soc: r.battery_soc_pct,
    speed: r.speed_kmh,
    consumption: (r.energy_consumption_wh_km / 10), // converted to kWh/100km
    batteryTemp: r.battery_temp_c,
    motorTemp: r.motor_temp_c
  }));

  return (
    <div className="space-y-6">
      {/* Top Welcome & System Status Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">Vehicle Intelligence Overview</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
              SIMULATED DATA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time on-device telemetry stream from Sanjo CyberCoupe EV (SDV Platform v2.4).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">DB:</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">AI Mode:</span>
            <span className="font-semibold text-slate-200">On-Device Deterministic</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Latency:</span>
            <span className="font-semibold text-cyan-300">{latencyMs} ms</span>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchData} />}

      {/* Automotive Digital Twin Visualizer */}
      <VehicleVisualizer telemetry={telemetry} />

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Vehicle Speed"
          value={telemetry?.speed_kmh.toFixed(1) || "0.0"}
          unit="km/h"
          subtitle={`Condition: ${telemetry?.driving_condition || "IDLE"}`}
          icon={Gauge}
          variant="cyan"
        />

        <MetricCard
          title="Battery Charge (SOC)"
          value={telemetry?.battery_soc_pct.toFixed(1) || "85.0"}
          unit="%"
          subtitle={`Pack Voltage: ${telemetry?.battery_voltage_v.toFixed(1) || "388.0"} V`}
          icon={Battery}
          variant={
            (telemetry?.battery_soc_pct ?? 100) < 20
              ? "rose"
              : (telemetry?.battery_soc_pct ?? 100) < 35
              ? "amber"
              : "emerald"
          }
        />

        <MetricCard
          title="Estimated Range"
          value={telemetry?.estimated_range_km.toFixed(0) || "360"}
          unit="km"
          subtitle={`Current: ${telemetry?.battery_current_a.toFixed(1) || "0"} A`}
          icon={Zap}
          variant="blue"
        />

        <MetricCard
          title="Energy Consumption"
          value={((telemetry?.energy_consumption_wh_km || 160) / 10).toFixed(1)}
          unit="kWh/100km"
          subtitle={`${telemetry?.energy_consumption_wh_km.toFixed(1) || "160"} Wh/km`}
          icon={Activity}
          variant="amber"
        />

        <MetricCard
          title="Battery Temp"
          value={telemetry?.battery_temp_c.toFixed(1) || "26.0"}
          unit="°C"
          subtitle="Optimal: 20°C - 38°C"
          icon={Thermometer}
          variant={(telemetry?.battery_temp_c ?? 25) >= 45 ? "rose" : "cyan"}
        />

        <MetricCard
          title="Motor Temp"
          value={telemetry?.motor_temp_c.toFixed(1) || "38.0"}
          unit="°C"
          subtitle="Optimal: 30°C - 75°C"
          icon={Thermometer}
          variant={(telemetry?.motor_temp_c ?? 40) >= 80 ? "rose" : "blue"}
        />

        <MetricCard
          title="Cumulative Odometer"
          value={telemetry?.odometer_km.toFixed(1) || "14,850"}
          unit="km"
          subtitle={`Ambient Temp: ${telemetry?.ambient_temp_c.toFixed(1) || "24.0"}°C`}
          icon={Milestone}
          variant="slate"
        />

        <MetricCard
          title="Powertrain Status"
          value={telemetry?.is_charging ? "CHARGING" : "PROPULSION"}
          subtitle={`Mode: ${telemetry?.driving_mode || "NORMAL"}`}
          icon={CheckCircle2}
          variant={telemetry?.is_charging ? "emerald" : "cyan"}
        />
      </div>

      {/* Dual Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOC & Speed Chart */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Battery SOC & Vehicle Speed</h3>
              <p className="text-xs text-slate-400">Chronological telemetry window</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-cyan-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> SOC (%)
              </span>
              <span className="flex items-center gap-1 text-blue-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Speed (km/h)
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 150]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="soc" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#socGrad)" name="SOC %" />
                <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} name="Speed (km/h)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Consumption & Temperatures Chart */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Energy Consumption & Thermal State</h3>
              <p className="text-xs text-slate-400">Drive motor and battery cell temps</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> kWh/100km
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Battery °C
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Motor °C
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="consumption" stroke="#f59e0b" strokeWidth={2} dot={false} name="kWh/100km" />
                <Line type="monotone" dataKey="batteryTemp" stroke="#10b981" strokeWidth={2} dot={false} name="Battery °C" />
                <Line type="monotone" dataKey="motorTemp" stroke="#f43f5e" strokeWidth={2} dot={false} name="Motor °C" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Diagnostic Events & Quick Question Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Diagnostic Events List */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Recent Diagnostic Events & DTCs</h3>
            </div>
            <span className="text-xs text-slate-400">Total Logged: {events.length}</span>
          </div>

          <div className="space-y-2.5">
            {events.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No active diagnostic events.</div>
            ) : (
              events.map((ev, i) => (
                <div
                  key={ev.id || i}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          ev.severity === "CRITICAL"
                            ? "bg-red-950 text-red-400 border border-red-500/40"
                            : ev.severity === "WARNING"
                            ? "bg-amber-950 text-amber-400 border border-amber-500/40"
                            : "bg-blue-950 text-blue-400 border border-blue-500/40"
                        }`}
                      >
                        {ev.severity}
                      </span>
                      {ev.dtc_code && (
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                          {ev.dtc_code}
                        </span>
                      )}
                      <span className="font-semibold text-white">{ev.title}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] line-clamp-1">{ev.description}</p>
                  </div>
                  <div className="text-[11px] text-slate-400 shrink-0 font-mono">
                    {ev.timestamp ? ev.timestamp.replace("T", " ").substring(0, 19) : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Question Prompts Card */}
        <div className="bg-gradient-to-br from-cyan-950/30 via-slate-900/60 to-slate-900 border border-cyan-500/30 p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <Cpu className="w-4 h-4" />
              <h3 className="text-sm font-bold tracking-wide">Ask VehicleGPT</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Query real on-edge vehicle data using natural language. No cloud connection needed.
            </p>

            <div className="space-y-2 pt-2">
              {[
                "Why has my driving range decreased over the last two weeks?",
                "Compare energy consumption between city and highway driving.",
                "What happened before the battery overheating warning?"
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigateToAssistant(q)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-cyan-500/40 text-xs text-slate-200 transition line-clamp-1"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            Powered by local deterministic analytics and on-device SLM logic.
          </div>
        </div>
      </div>
    </div>
  );
};
