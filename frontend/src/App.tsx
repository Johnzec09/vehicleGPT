import React, { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { OverviewDashboard } from "./pages/OverviewDashboard";
import { LiveVehicle } from "./pages/LiveVehicle";
import { AIAssistant } from "./pages/AIAssistant";
import { AnalyticsInsights } from "./pages/AnalyticsInsights";
import { DiagnosticsEvents } from "./pages/DiagnosticsEvents";
import { HistoricalData } from "./pages/HistoricalData";
import { DataSources } from "./pages/DataSources";
import { SystemPrivacy } from "./pages/SystemPrivacy";
import { api } from "./services/api";
import { SimulatorStatus, SystemHealth } from "./types/vehicle";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [assistantInitialQuery, setAssistantInitialQuery] = useState<string | null>(null);
  const [simulatorStatus, setSimulatorStatus] = useState<SimulatorStatus | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);

  // Poll status every 5 seconds for global topbar indicators
  const pollStatus = async () => {
    try {
      const [simRes, healthRes] = await Promise.all([
        api.getSimulatorStatus(),
        api.getHealth()
      ]);
      setSimulatorStatus(simRes);
      setHealth(healthRes);
      setBackendConnected(true);
    } catch {
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigateToAssistant = (query?: string) => {
    if (query) {
      setAssistantInitialQuery(query);
    }
    setActiveTab("assistant");
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      simulatorStatus={simulatorStatus}
      health={health}
    >
      {!backendConnected && (
        <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span>Backend connection lost. Ensure the FastAPI server is running on http://127.0.0.1:8000.</span>
          </div>
          <button
            onClick={pollStatus}
            className="px-2.5 py-1 bg-red-800 hover:bg-red-700 rounded-lg text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      )}

      {activeTab === "overview" && (
        <OverviewDashboard onNavigateToAssistant={handleNavigateToAssistant} />
      )}
      {activeTab === "live" && <LiveVehicle />}
      {activeTab === "assistant" && (
        <AIAssistant initialQuery={assistantInitialQuery} />
      )}
      {activeTab === "analytics" && <AnalyticsInsights />}
      {activeTab === "diagnostics" && <DiagnosticsEvents />}
      {activeTab === "historical" && <HistoricalData />}
      {activeTab === "sources" && <DataSources />}
      {activeTab === "system" && <SystemPrivacy />}
    </Layout>
  );
}

export default App;
