import React, { useEffect, useState } from "react";
import {
  Layers,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Cpu,
  RefreshCw,
  Info,
  Upload,
  FileCode
} from "lucide-react";
import { api } from "../services/api";
import { DataSourcesResponse, DataSourceAdapter } from "../types/vehicle";
import { ErrorAlert } from "../components/ErrorAlert";

export const DataSources: React.FC = () => {
  const [sourcesData, setSourcesData] = useState<DataSourcesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDataSources();
      setSourcesData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load vehicle data sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">Automotive Data Adapters & Ingestion</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              Protocol Abstraction Layer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Status of bus adapters consuming CAN-FD, SOME/IP, Android VHAL, QNX syslog, and ADAS feeds.
          </p>
        </div>

        <button
          onClick={fetchSources}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Adapters
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchSources} />}

      {/* Safety Notice Strip */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3.5 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-white flex items-center gap-2">
            Safety Isolation & Read-Only Tap Architecture (ASIL-D Barrier)
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            VehicleGPT attaches to the vehicle network exclusively via a diode-isolated, read-only hardware tap or virtual
            SocketCAN interface (<code className="text-cyan-400">vcan0</code>). Zero bus write authority or actuation capability
            exists over braking, steering, suspension, or powertrain propulsion ECUs. Physical vehicle buses are currently
            emulated through local edge software simulation.
          </p>
        </div>
      </div>

      {/* Protocol Adapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sourcesData?.sources.map((src) => {
          return (
            <div
              key={src.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white tracking-wide">{src.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      src.status === "ACTIVE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : "bg-cyan-950 text-cyan-400 border border-cyan-500/30"
                    }`}
                  >
                    {src.status}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-cyan-300 bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/60">
                  {src.protocol}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{src.details}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] space-y-1 text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>Physical Hardware:</span>
                  <span className={src.is_physically_connected ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {src.is_physically_connected ? "CONNECTED" : "SIMULATED / DISCONNECTED"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bus Type:</span>
                  <span className="text-slate-300">{src.bus_type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Packets Processed:</span>
                  <span className="text-cyan-300 font-bold">{src.packets_received.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Safety Isolated:</span>
                  <span className="text-emerald-400 font-bold">YES (Read-Only)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Protocol Architecture Ingestion Diagram */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white tracking-wide">Vehicle Intelligence Data Flow Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1.5">
            <div className="font-bold text-cyan-400">1. Automotive Ingestion</div>
            <p className="text-slate-400 text-[11px]">
              CAN-FD frames, SOME/IP services, and Android VHAL properties stream via read-only socket listener.
            </p>
          </div>
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1.5">
            <div className="font-bold text-blue-400">2. Normalization & Persistence</div>
            <p className="text-slate-400 text-[11px]">
              Telemetry is decoded and indexed in SQLite (WAL mode) retaining 30+ days of historical trip frames.
            </p>
          </div>
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1.5">
            <div className="font-bold text-emerald-400">3. Deterministic Analytics</div>
            <p className="text-slate-400 text-[11px]">
              Calculates SOC deltas, city vs highway efficiency gaps, range degradation factors, and pre-incident curves.
            </p>
          </div>
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1.5">
            <div className="font-bold text-purple-400">4. On-Device SLM Assistant</div>
            <p className="text-slate-400 text-[11px]">
              VehicleGPT answers natural language questions locally with exact numerical evidence and database links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
