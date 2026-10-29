import React, { useEffect, useState } from "react";
import {
  History,
  Download,
  Upload,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  CheckCircle2
} from "lucide-react";
import { api } from "../services/api";
import { TelemetryRecord } from "../types/vehicle";
import { ErrorAlert } from "../components/ErrorAlert";

export const HistoricalData: React.FC = () => {
  const [records, setRecords] = useState<TelemetryRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [conditionFilter, setConditionFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(0);
  const pageSize = 25;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fetchHistorical = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getHistoricalTelemetry({
        driving_condition: conditionFilter === "ALL" ? undefined : conditionFilter,
        limit: pageSize,
        offset: page * pageSize
      });
      setRecords(res.records);
      setTotalRecords(res.total_matched);
    } catch (err: any) {
      setError(err.message || "Failed to load historical telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorical();
  }, [page, conditionFilter]);

  const totalPages = Math.ceil(totalRecords / pageSize);

  const handleDownloadExport = (format: "csv" | "json") => {
    const url = api.getExportUrl(format, 3000);
    window.open(url, "_blank");
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus("Parsing import file...");
      const text = await file.text();
      let recordsToImport: any[] = [];

      if (file.name.endsWith(".json")) {
        recordsToImport = JSON.parse(text);
      } else {
        setError("Please upload a valid JSON array of telemetry records.");
        setImportStatus(null);
        return;
      }

      if (!Array.isArray(recordsToImport)) {
        throw new Error("Import payload must be a JSON array of telemetry records.");
      }

      const res = await api.importTelemetry(recordsToImport);
      setImportStatus(res.message || `Imported ${res.imported_count} records.`);
      await fetchHistorical();
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
      setImportStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">Historical Telemetry Explorer</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              SQLite WAL Database
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Query, filter, inspect, and export persistent EV sensor frames across historical trips.
          </p>
        </div>

        {/* Export & Import Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDownloadExport("csv")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>

          <button
            onClick={() => handleDownloadExport("json")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            Export JSON
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-500/30 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            Import JSON
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {importStatus}
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchHistorical} />}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Condition Filter:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {["ALL", "CITY", "HIGHWAY", "CHARGING", "IDLE"].map((cond) => (
              <button
                key={cond}
                onClick={() => {
                  setConditionFilter(cond);
                  setPage(0);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  conditionFilter === cond
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
        </div>

        <div className="text-slate-400 text-xs">
          Total Matched: <strong className="text-white font-mono">{totalRecords}</strong> frames
        </div>
      </div>

      {/* Historical Telemetry Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-3">Condition</th>
                <th className="py-3 px-3 text-right">Speed</th>
                <th className="py-3 px-3 text-right">Battery SOC</th>
                <th className="py-3 px-3 text-right">Voltage / Current</th>
                <th className="py-3 px-3 text-right">Battery °C</th>
                <th className="py-3 px-3 text-right">Motor °C</th>
                <th className="py-3 px-3 text-right">Consumption</th>
                <th className="py-3 px-3 text-right">Est. Range</th>
                <th className="py-3 px-4 text-right">Odometer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 font-sans">
                    No historical telemetry records match the filter criteria.
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap">
                      {r.timestamp ? r.timestamp.replace("T", " ").substring(0, 19) : ""}
                    </td>
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.driving_condition === "HIGHWAY"
                            ? "bg-blue-950 text-blue-300 border border-blue-500/30"
                            : r.driving_condition === "CHARGING"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                            : "bg-cyan-950 text-cyan-300 border border-cyan-500/30"
                        }`}
                      >
                        {r.driving_condition}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-white font-bold">{r.speed_kmh.toFixed(1)} km/h</td>
                    <td className="py-2.5 px-3 text-right text-cyan-300 font-bold">{r.battery_soc_pct.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-300 text-[11px]">
                      {r.battery_voltage_v.toFixed(1)}V / {r.battery_current_a.toFixed(1)}A
                    </td>
                    <td className={`py-2.5 px-3 text-right ${r.battery_temp_c >= 45 ? "text-rose-400 font-bold" : "text-slate-300"}`}>
                      {r.battery_temp_c.toFixed(1)}°C
                    </td>
                    <td className={`py-2.5 px-3 text-right ${r.motor_temp_c >= 80 ? "text-rose-400 font-bold" : "text-slate-300"}`}>
                      {r.motor_temp_c.toFixed(1)}°C
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-300">
                      {(r.energy_consumption_wh_km / 10).toFixed(1)} <span className="text-[10px] text-slate-400">kWh/100km</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{r.estimated_range_km.toFixed(0)} km</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{r.odometer_km.toFixed(1)} km</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Page <strong className="text-white">{page + 1}</strong> of{" "}
            <strong className="text-white">{totalPages || 1}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
