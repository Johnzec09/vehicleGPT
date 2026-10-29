import React from "react";
import { TelemetryRecord } from "../types/vehicle";
import { BatteryCharging, Cpu, ShieldCheck, Zap } from "lucide-react";

interface VehicleVisualizerProps {
  telemetry: TelemetryRecord | null;
}

export const VehicleVisualizer: React.FC<VehicleVisualizerProps> = ({ telemetry }) => {
  const soc = telemetry?.battery_soc_pct ?? 85;
  const bTemp = telemetry?.battery_temp_c ?? 26;
  const mTemp = telemetry?.motor_temp_c ?? 38;
  const isCharging = telemetry?.is_charging ?? false;
  const speed = telemetry?.speed_kmh ?? 0;

  // Thermal color helpers
  const getBatteryColor = (temp: number) => {
    if (temp >= 50) return "#ef4444"; // Red Critical
    if (temp >= 42) return "#f59e0b"; // Amber Warning
    return "#06b6d4"; // Cyan Normal
  };

  const getMotorColor = (temp: number) => {
    if (temp >= 90) return "#ef4444";
    if (temp >= 75) return "#f59e0b";
    return "#3b82f6";
  };

  return (
    <div className="relative bg-slate-900/80 border border-slate-800 rounded-2xl p-6 overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left Specification Specs */}
        <div className="space-y-3 min-w-[200px]">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Sanjo CyberCoupe EV (SDV Platform)
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {speed.toFixed(1)} <span className="text-sm font-semibold text-slate-400">km/h</span>
            </div>
            <div className="text-xs text-slate-400">
              Drive Mode: <span className="text-cyan-400 font-bold">{telemetry?.driving_mode || "NORMAL"}</span> ({telemetry?.driving_condition || "CITY"})
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-400">Battery Voltage</div>
              <div className="text-sm font-bold text-slate-200">{telemetry?.battery_voltage_v.toFixed(1) || "385.0"} V</div>
            </div>
            <div>
              <div className="text-slate-400">Current Flow</div>
              <div className={`text-sm font-bold ${isCharging ? "text-emerald-400" : "text-slate-200"}`}>
                {telemetry?.battery_current_a.toFixed(1) || "0.0"} A
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Safety-Isolated Diagnostic Listener
          </div>
        </div>

        {/* Center Automotive Schematic (SVG) */}
        <div className="w-full max-w-md h-52 flex items-center justify-center">
          <svg viewBox="0 0 500 220" className="w-full h-full drop-shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            {/* Chassis Outline */}
            <path
              d="M 60 70 C 110 50, 160 30, 250 30 C 340 30, 400 50, 440 80 C 460 95, 460 125, 440 140 C 400 170, 340 190, 250 190 C 160 190, 110 170, 60 150 C 40 135, 40 85, 60 70 Z"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="2.5"
            />

            {/* Wheels */}
            <rect x="100" y="15" width="45" height="22" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="350" y="15" width="45" height="22" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="100" y="183" width="45" height="22" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="350" y="183" width="45" height="22" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />

            {/* Front Electric Drive Motor */}
            <rect
              x="125"
              y="85"
              width="50"
              height="50"
              rx="8"
              fill="#1e293b"
              stroke={getMotorColor(mTemp)}
              strokeWidth="2.5"
            />
            <text x="150" y="112" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
              MOTOR
            </text>
            <text x="150" y="126" fill={getMotorColor(mTemp)} fontSize="10" fontWeight="bold" textAnchor="middle">
              {mTemp.toFixed(0)}°C
            </text>

            {/* High Voltage Battery Pack (Floor Assembly) */}
            <rect
              x="200"
              y="65"
              width="140"
              height="90"
              rx="10"
              fill="#090d16"
              stroke={getBatteryColor(bTemp)}
              strokeWidth="2.5"
            />
            {/* Battery Level Fill */}
            <rect
              x="205"
              y="70"
              width={Math.max(5, (130 * soc) / 100)}
              height="80"
              rx="6"
              fill={getBatteryColor(bTemp)}
              fillOpacity="0.25"
            />
            <text x="270" y="105" fill="#f8fafc" fontSize="14" fontWeight="800" textAnchor="middle">
              {soc.toFixed(1)}% SOC
            </text>
            <text x="270" y="122" fill={getBatteryColor(bTemp)} fontSize="11" fontWeight="bold" textAnchor="middle">
              PACK: {bTemp.toFixed(1)}°C
            </text>

            {/* Rear Inverter & Powertrain */}
            <rect
              x="365"
              y="90"
              width="40"
              height="40"
              rx="6"
              fill="#1e293b"
              stroke="#64748b"
              strokeWidth="2"
            />
            <text x="385" y="114" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
              INV
            </text>

            {/* High Voltage Bus Cables */}
            <line x1="175" y1="110" x2="200" y2="110" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 2" />
            <line x1="340" y1="110" x2="365" y2="110" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 2" />

            {/* ADAS Forward Vision Radar */}
            <path d="M 50 110 L 25 95 M 50 110 L 25 125" stroke="#06b6d4" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="50" cy="110" r="4" fill="#06b6d4" />
          </svg>
        </div>

        {/* Right Status Indicators */}
        <div className="space-y-2.5 min-w-[190px]">
          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Est. Range</span>
            </div>
            <span className="text-sm font-bold text-white">{telemetry?.estimated_range_km.toFixed(0) || "360"} km</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <BatteryCharging className={`w-4 h-4 ${isCharging ? "text-emerald-400 animate-bounce" : "text-slate-400"}`} />
              <span>Charging</span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCharging ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40" : "bg-slate-700/40 text-slate-400"}`}>
              {isCharging ? "PLUGGED IN" : "DISCHARGING"}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Efficiency</span>
            </div>
            <span className="text-sm font-bold text-slate-200">
              {((telemetry?.energy_consumption_wh_km || 160) / 10).toFixed(1)} <span className="text-[10px] text-slate-400">kWh/100km</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
