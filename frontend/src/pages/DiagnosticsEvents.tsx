import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  ShieldAlert,
  Info,
  X,
  FileText,
  Clock,
  Cpu,
  RefreshCw
} from "lucide-react";
import { api } from "../services/api";
import { DiagnosticEvent } from "../types/vehicle";
import { ErrorAlert } from "../components/ErrorAlert";

export const DiagnosticsEvents: React.FC = () => {
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<DiagnosticEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DiagnosticEvent | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [subsystemFilter, setSubsystemFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getEvents({ limit: 200 });
      setEvents(res.events);
      setFilteredEvents(res.events);
    } catch (err: any) {
      setError(err.message || "Failed to load diagnostic events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    let result = [...events];

    if (severityFilter !== "ALL") {
      result = result.filter((e) => e.severity === severityFilter);
    }

    if (subsystemFilter !== "ALL") {
      result = result.filter((e) => e.source_subsystem === subsystemFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.dtc_code && e.dtc_code.toLowerCase().includes(q)) ||
          e.event_type.toLowerCase().includes(q)
      );
    }

    setFilteredEvents(result);
  }, [events, severityFilter, subsystemFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">Diagnostic Events & Trouble Codes</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
              ECU Logs & Alarms
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Searchable event log capturing BMS thermal thresholds, ADAS disengagements, and powertrain DTCs.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Events
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchEvents} />}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-xs">
        {/* Search Input */}
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code (e.g. P0A7F, U0415), title, or keyword..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 shrink-0">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        {/* Subsystem Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 shrink-0">Subsystem:</span>
          <select
            value={subsystemFilter}
            onChange={(e) => setSubsystemFilter(e.target.value)}
            className="bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Subsystems</option>
            <option value="BMS">BMS (Battery)</option>
            <option value="POWERTRAIN">Powertrain</option>
            <option value="ADAS">ADAS Perception</option>
            <option value="THERMAL">Thermal Loop</option>
          </select>
        </div>

        <div className="text-slate-400 shrink-0 text-[11px] self-center">
          Showing <span className="font-bold text-white">{filteredEvents.length}</span> of {events.length}
        </div>
      </div>

      {/* Events Data Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">DTC Code</th>
                <th className="py-3 px-4">Title & Event Description</th>
                <th className="py-3 px-3">Subsystem</th>
                <th className="py-3 px-3 text-center">Telemetry</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No diagnostic events match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {ev.timestamp ? ev.timestamp.replace("T", " ").substring(0, 19) : ""}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          ev.severity === "CRITICAL"
                            ? "bg-red-950 text-red-400 border border-red-500/40"
                            : ev.severity === "WARNING"
                            ? "bg-amber-950 text-amber-400 border border-amber-500/40"
                            : "bg-blue-950 text-blue-400 border border-blue-500/40"
                        }`}
                      >
                        {ev.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                      {ev.dtc_code ? (
                        <span className="text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                          {ev.dtc_code}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-semibold text-white">{ev.title}</div>
                      <div className="text-slate-400 text-[11px] line-clamp-1">{ev.description}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-300 whitespace-nowrap">
                      {ev.source_subsystem}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {ev.supporting_telemetry ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 font-mono">
                          JSON Payload
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    selectedEvent.severity === "CRITICAL"
                      ? "bg-red-950 text-red-400 border border-red-500/40"
                      : "bg-amber-950 text-amber-400 border border-amber-500/40"
                  }`}
                >
                  {selectedEvent.severity}
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">{selectedEvent.title}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Timestamp:</span>
                  <div className="font-mono text-white mt-0.5">{selectedEvent.timestamp}</div>
                </div>
                <div>
                  <span className="text-slate-400">DTC Fault Code:</span>
                  <div className="font-mono font-bold text-cyan-400 mt-0.5">
                    {selectedEvent.dtc_code || "None Logged"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Subsystem:</span>
                  <div className="text-white mt-0.5 font-semibold">{selectedEvent.source_subsystem}</div>
                </div>
                <div>
                  <span className="text-slate-400">Simulation Status:</span>
                  <div className="text-amber-400 mt-0.5 font-semibold">Simulated Telemetry</div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Diagnostic Description:</span>
                <p className="text-slate-200 leading-relaxed p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  {selectedEvent.description}
                </p>
              </div>

              {selectedEvent.supporting_telemetry && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Supporting Telemetry Frame:</span>
                  <pre className="p-3 bg-black/50 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedEvent.supporting_telemetry), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
