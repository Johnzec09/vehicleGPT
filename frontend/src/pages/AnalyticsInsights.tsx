import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Zap,
  Activity,
  Calendar,
  Flame,
  Thermometer,
  ShieldAlert,
  Car
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { api } from "../services/api";
import {
  CityHighwayComparison,
  RangeReductionAnalysis,
  SOCTrends,
  PreIncidentData
} from "../types/vehicle";
import { ErrorAlert } from "../components/ErrorAlert";

export const AnalyticsInsights: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [cityHighway, setCityHighway] = useState<CityHighwayComparison | null>(null);
  const [rangeReduction, setRangeReduction] = useState<RangeReductionAnalysis | null>(null);
  const [socTrends, setSocTrends] = useState<SOCTrends | null>(null);
  const [worstDrop, setWorstDrop] = useState<any | null>(null);
  const [preIncident, setPreIncident] = useState<PreIncidentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [chData, rrData, socData, dropData, piData] = await Promise.all([
        api.getCityVsHighway(days),
        api.getRangeReduction(14),
        api.getSOCTrends(days),
        api.getLargestEfficiencyDrop(days),
        api.getPreIncidentTelemetry(15)
      ]);

      setCityHighway(chData);
      setRangeReduction(rrData);
      setSocTrends(socData);
      setWorstDrop(dropData);
      setPreIncident(piData);
    } catch (err: any) {
      setError(err.message || "Failed to load analytical metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  // Pre-incident chart formatting
  const preIncidentChartData =
    preIncident?.telemetry_samples?.map((s) => ({
      time: s.timestamp ? s.timestamp.substring(11, 19) : "",
      batteryTemp: s.battery_temp_c,
      motorTemp: s.motor_temp_c,
      current: s.battery_current_a,
      speed: s.speed_kmh
    })) || [];

  return (
    <div className="space-y-6">
      {/* Top Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">Powertrain & Energy Analytics</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              Deterministic Math Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical aggregations, thermodynamic curves, and performance degradation analysis.
          </p>
        </div>

        {/* Date Window Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Analysis Horizon:</span>
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  days === d
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadAnalytics} />}

      {/* City vs Highway Driving Deep Dive */}
      {cityHighway && (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  City vs Highway Energy Consumption Comparison
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">{cityHighway.analysis_summary}</p>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shrink-0">
              +{cityHighway.efficiency_difference_pct}% Higher on Highway
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* City Card */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                  City Driving Profile (Regenerative)
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {cityHighway.city.total_distance_km} km logged
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/50">
                <div>
                  <div className="text-lg font-black text-white">{cityHighway.city.avg_consumption_kwh_100km}</div>
                  <div className="text-[10px] text-slate-400">kWh/100km</div>
                </div>
                <div>
                  <div className="text-lg font-black text-white">{cityHighway.city.avg_speed_kmh}</div>
                  <div className="text-[10px] text-slate-400">Avg km/h</div>
                </div>
                <div>
                  <div className="text-lg font-black text-white">{cityHighway.city.avg_battery_temp_c}°C</div>
                  <div className="text-[10px] text-slate-400">Avg Pack Temp</div>
                </div>
              </div>
            </div>

            {/* Highway Card */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                  Highway Cruising Profile (High Drag)
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {cityHighway.highway.total_distance_km} km logged
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/50">
                <div>
                  <div className="text-lg font-black text-white">{cityHighway.highway.avg_consumption_kwh_100km}</div>
                  <div className="text-[10px] text-slate-400">kWh/100km</div>
                </div>
                <div>
                  <div className="text-lg font-black text-white">{cityHighway.highway.avg_speed_kmh}</div>
                  <div className="text-[10px] text-slate-400">Avg km/h</div>
                </div>
                <div>
                  <div className="text-lg font-black text-white">{cityHighway.highway.avg_battery_temp_c}°C</div>
                  <div className="text-[10px] text-slate-400">Avg Pack Temp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Week Driving Range Reduction Root Cause Breakdown */}
      {rangeReduction && (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Driving Range Degradation Analysis (Last 14 Days)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Mathematical comparison against prior 14-day baseline period.
              </p>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold">
              -{rangeReduction.reduction_km} km ({rangeReduction.reduction_pct}% reduction)
            </div>
          </div>

          {/* Root Causes List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Primary Contributing Factors:</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {rangeReduction.primary_causes.map((cause, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-200 leading-relaxed">
                  <div className="font-bold text-cyan-400 mb-1">Factor {idx + 1}</div>
                  {cause}
                </div>
              ))}
            </div>
          </div>

          {/* Metrics comparison bar */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Baseline Range:</span>
              <div className="text-base font-bold text-white">{rangeReduction.baseline_avg_range_km} km</div>
            </div>
            <div>
              <span className="text-slate-400">Recent Range:</span>
              <div className="text-base font-bold text-rose-400">{rangeReduction.recent_avg_range_km} km</div>
            </div>
            <div>
              <span className="text-slate-400">Ambient Temp Delta:</span>
              <div className="text-base font-bold text-amber-400">-{rangeReduction.supporting_metrics.temperature_drop_c}°C</div>
            </div>
            <div>
              <span className="text-slate-400">Consumption Increase:</span>
              <div className="text-base font-bold text-cyan-400">+{rangeReduction.supporting_metrics.consumption_increase_pct}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Incident Overheat Thermal Trajectory & SOC Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pre-Incident Thermal Trajectory */}
        {preIncident && (
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Pre-Incident Telemetry (Thermal Warning)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  15 minutes lead-in to {preIncident.event?.dtc_code || "P0A7F"} BMS Overheat
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/40">
                +{preIncident.summary_metrics?.temp_rise_delta_c}°C Delta
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
              {preIncident.root_cause_explanation}
            </p>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={preIncidentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="batteryTemp" stroke="#ef4444" strokeWidth={2} name="Battery Cell °C" />
                  <Line type="monotone" dataKey="motorTemp" stroke="#f59e0b" strokeWidth={2} name="Motor °C" />
                  <Line type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Discharge (A)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daily SOC Averages & Charging Session Trends */}
        {socTrends && (
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Daily Battery State of Charge Trends
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Average, minimum, and maximum daily SOC</p>
              </div>
              <span className="text-xs text-slate-400">Total Charged: {socTrends.total_charging_sessions} Sessions</span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={socTrends.daily_soc_averages || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="avg_soc_pct" fill="#06b6d4" name="Avg SOC %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="min_soc_pct" fill="#3b82f6" name="Min SOC %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Worst Efficiency Drop Highlight Card */}
      {worstDrop && worstDrop.status !== "no_data" && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-900 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-amber-400 uppercase tracking-wide">Largest Historic Efficiency Drop</span>
            <div className="text-sm font-semibold text-white">{worstDrop.explanation}</div>
            <div className="text-slate-400 text-[11px]">
              Trip ID: <span className="font-mono text-cyan-300">{worstDrop.trip_id}</span> | Timestamp: {worstDrop.timestamp}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-black text-amber-400">{worstDrop.consumption_wh_km} <span className="text-xs font-normal">Wh/km</span></div>
            <div className="text-slate-400">({worstDrop.consumption_kwh_100km} kWh/100km)</div>
          </div>
        </div>
      )}
    </div>
  );
};
