import React, { useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Gauge,
  Thermometer,
  Battery,
  AlertTriangle,
  Radio,
  Sliders,
  Flame,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { api } from "../services/api";
import { TelemetryRecord, SimulatorStatus, DiagnosticEvent } from "../types/vehicle";
import { ErrorAlert } from "../components/ErrorAlert";

export const LiveVehicle: React.FC = () => {
  const [status, setStatus] = useState<SimulatorStatus | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRecord | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("city_commute");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchLiveStatus = async () => {
    try {
      const [simStatus, latestTelem, eventsRes] = await Promise.all([
        api.getSimulatorStatus(),
        api.getLatestTelemetry(),
        api.getEvents({ limit: 6 })
      ]);

      setStatus(simStatus);
      setTelemetry(latestTelem);
      setEvents(eventsRes.events);

      // Append to rolling live buffer (keep last 30 frames)
      const nowStr = new Date().toLocaleTimeString();
      setHistory((prev) => [
        ...prev.slice(-29),
        {
          time: nowStr,
          speed: latestTelem.speed_kmh,
          soc: latestTelem.battery_soc_pct,
          batteryTemp: latestTelem.battery_temp_c,
          motorTemp: latestTelem.motor_temp_c,
          current: latestTelem.battery_current_a,
          voltage: latestTelem.battery_voltage_v
        }
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to fetch live vehicle simulator data");
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 2000); // 2-second real-time poll
    return () => clearInterval(interval);
  }, []);

  const handleControl = async (command: "start" | "pause" | "resume" | "reset") => {
    try {
      setLoadingAction(command);
      setError(null);
      const res = await api.controlSimulator(command, selectedProfile);
      setActionMessage(res.message || `Simulator command '${command}' executed.`);
      await fetchLiveStatus();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || `Failed to execute ${command}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInjectAnomaly = async (anomalyType: string) => {
    try {
      setLoadingAction(anomalyType);
      setError(null);
      const res = await api.injectAnomaly(anomalyType, "WARNING", 30);
      setActionMessage(`Injected anomaly: ${anomalyType.toUpperCase()} (Duration: 30s)`);
      await fetchLiveStatus();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to inject anomaly condition");
    } finally {
      setLoadingAction(null);
    }
  };

  const profiles = [
    { id: "city_commute", name: "City Commute", desc: "Stop & go, regenerative braking, 0-50 km/h" },
    { id: "highway_cruise", name: "Highway Cruise", desc: "Sustained high-speed aerodynamic drag, 100-115 km/h" },
    { id: "aggressive", name: "Aggressive Sport", desc: "Rapid acceleration spikes, high current draw, SPORT mode" },
    { id: "rapid_charging", name: "Fast DC Charging", desc: "Stationary fast charge, high pack current (-110A)" }
  ];

  const anomalies = [
    { id: "battery_overheat", name: "Battery Overheat", desc: "Thermal rise towards BMS 50°C limit", icon: Flame },
    { id: "motor_overheat", name: "Motor Inverter Overheat", desc: "Stator temperature surge > 85°C", icon: Thermometer },
    { id: "rapid_discharge", name: "Rapid Discharge Surge", desc: "Surge in Wh/km consumption", icon: Zap },
    { id: "adas_disengage", name: "ADAS Disengagement", desc: "Camera contrast loss & steering tap", icon: AlertTriangle },
    { id: "dtc_fault", name: "Sensor Plausibility DTC", desc: "Log DTC P0A80 diagnostic fault", icon: Sliders }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Simulator Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">Live Vehicle Simulation Control</h1>
            <span
              className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                status?.state === "RUNNING"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                  : status?.state === "PAUSED"
                  ? "bg-amber-950 text-amber-400 border border-amber-500/40"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              <Radio className={`w-3 h-3 ${status?.state === "RUNNING" ? "animate-pulse text-emerald-400" : ""}`} />
              {status?.state || "STOPPED"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Control the real-time on-device CAN-FD powertrain streamer. Live ticks:{" "}
            <span className="font-mono text-cyan-300 font-semibold">{status?.ticks_count || 0}</span>
          </p>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {status?.state !== "RUNNING" ? (
            <button
              onClick={() => handleControl(status?.state === "PAUSED" ? "resume" : "start")}
              disabled={loadingAction !== null}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950"
            >
              <Play className="w-4 h-4 fill-current" />
              {status?.state === "PAUSED" ? "Resume Stream" : "Start Simulator"}
            </button>
          ) : (
            <button
              onClick={() => handleControl("pause")}
              disabled={loadingAction !== null}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-amber-950"
            >
              <Pause className="w-4 h-4 fill-current" />
              Pause Stream
            </button>
          )}

          <button
            onClick={() => handleControl("reset")}
            disabled={loadingAction !== null}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset State
          </button>

          <button
            onClick={fetchLiveStatus}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Manual sync"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionMessage}
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchLiveStatus} />}

      {/* Live Telemetry Gauges Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Live Speed</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{telemetry?.speed_kmh.toFixed(1) || "0.0"} <span className="text-xs text-slate-400 font-normal">km/h</span></div>
          <div className="text-[11px] text-cyan-400 mt-1 font-semibold">{telemetry?.driving_condition || "IDLE"} mode</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Battery State</span>
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{telemetry?.battery_soc_pct.toFixed(1) || "85.0"} <span className="text-xs text-slate-400 font-normal">%</span></div>
          <div className="text-[11px] text-slate-400 mt-1">{telemetry?.battery_voltage_v.toFixed(1) || "388.0"} V | {telemetry?.battery_current_a.toFixed(1) || "0.0"} A</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Battery Cell Temp</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{telemetry?.battery_temp_c.toFixed(1) || "26.0"} <span className="text-xs text-slate-400 font-normal">°C</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Motor: {telemetry?.motor_temp_c.toFixed(1) || "38.0"} °C</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Rolling Range</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{telemetry?.estimated_range_km.toFixed(0) || "360"} <span className="text-xs text-slate-400 font-normal">km</span></div>
          <div className="text-[11px] text-slate-400 mt-1">{telemetry?.energy_consumption_wh_km.toFixed(1) || "150"} Wh/km</div>
        </div>
      </div>

      {/* Scenario Profiles & Dynamic Anomaly Injection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driving Scenarios Selector */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Driving Scenario Profile</h3>
            <p className="text-xs text-slate-400">Select active physics simulation kinematics</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {profiles.map((p) => {
              const isSelected = selectedProfile === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProfile(p.id);
                    api.controlSimulator(status?.state === "RUNNING" ? "start" : "pause", p.id);
                  }}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm"
                      : "bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>{p.name}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Anomaly Injector */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Dynamic Anomaly Injection</h3>
            <p className="text-xs text-slate-400">Inject simulated hardware faults into live stream</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {anomalies.map((anom) => {
              const Icon = anom.icon;
              return (
                <button
                  key={anom.id}
                  onClick={() => handleInjectAnomaly(anom.id)}
                  disabled={loadingAction !== null}
                  className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-rose-950/30 border border-slate-700/50 hover:border-rose-500/40 text-left transition flex items-start gap-2.5"
                >
                  <Icon className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">{anom.name}</div>
                    <div className="text-[10px] text-slate-400">{anom.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Oscilloscope Chart */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Real-Time Telemetry Stream (Live Buffer)</h3>
            <p className="text-xs text-slate-400">Continuous sampling from internal virtual CAN bus</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-cyan-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Speed (km/h)
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> SOC (%)
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Battery °C
            </span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} domain={[0, 140]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
              />
              <Line type="monotone" dataKey="speed" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="soc" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="batteryTemp" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Event Stream Table */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-white tracking-wide">Recent Injected / Simulated Diagnostic Events</h3>
        <div className="space-y-2">
          {events.map((ev, i) => (
            <div
              key={ev.id || i}
              className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    ev.severity === "CRITICAL"
                      ? "bg-red-950 text-red-400 border border-red-500/40"
                      : "bg-amber-950 text-amber-400 border border-amber-500/40"
                  }`}
                >
                  {ev.severity}
                </span>
                <span className="font-semibold text-white">{ev.title}</span>
                <span className="text-slate-400 truncate max-w-md hidden sm:inline">{ev.description}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                {ev.timestamp ? ev.timestamp.replace("T", " ").substring(0, 19) : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
