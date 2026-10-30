import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Gauge,
  BotMessageSquare,
  BarChart3,
  AlertTriangle,
  History,
  Layers,
  ShieldAlert,
  Menu,
  X,
  Radio,
  HardDriveDownload,
  Info,
  Sun,
  Moon
} from "lucide-react";
import { SimulatorStatus, SystemHealth } from "../types/vehicle";

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  simulatorStatus: SimulatorStatus | null;
  health: SystemHealth | null;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  simulatorStatus,
  health,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const navItems = [
    { id: "overview", label: "Overview Dashboard", icon: LayoutDashboard },
    { id: "live", label: "Live Vehicle", icon: Gauge },
    { id: "assistant", label: "AI Assistant", icon: BotMessageSquare, badge: "Local AI" },
    { id: "analytics", label: "Analytics & Insights", icon: BarChart3 },
    { id: "diagnostics", label: "Diagnostics & Events", icon: AlertTriangle },
    { id: "historical", label: "Historical Data", icon: History },
    { id: "sources", label: "Data Sources", icon: Layers },
    { id: "system", label: "System & Privacy", icon: ShieldAlert },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0d1424] border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-black">
            V
          </div>
          <div>
            <div className="text-base font-bold text-white tracking-tight">VehicleGPT</div>
            <div className="text-[10px] text-cyan-400 font-semibold">Team SANJO — Case Study 5</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="Toggle Light / Dark Mode"
          >
            {theme === "light" ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-cyan-400" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a101f] border-r border-slate-800/80 flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Banner */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-950 font-black text-xl text-white">
              🚗
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                VehicleGPT
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  SLM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Your Car's Data. In Your Language.</p>
            </div>
          </div>

          <div className="mt-3 py-1.5 px-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Competition:</span>
            <span className="font-semibold text-cyan-300">Team SANJO</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Edge Hardware & Team Details Card */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070b14]/70 space-y-2.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Edge Engine:
            </span>
            <span className="text-emerald-400 font-bold">100% Offline</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Simulator State:</span>
            <span
              className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                simulatorStatus?.state === "RUNNING"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {simulatorStatus?.state || "INITIALIZING"}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Safety Authority:</span>
            <span className="text-cyan-400 font-bold">Read-Only Tap</span>
          </div>

          <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 space-y-0.5">
            <div>Authors: K. John Zechariah & B. Rohan</div>
            <div>TELIPORT Season 4 (Tata Elxsi)</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Status Notification Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-[#0a101f]/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Edge SDV Connected</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
              <Info className="w-3.5 h-3.5" />
              <span>Simulated Vehicle Telemetry</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <HardDriveDownload className="w-3.5 h-3.5 text-cyan-400" />
              <span>SQLite Records:</span>
              <strong className="text-white font-semibold">
                {health?.telemetry_records_count?.toLocaleString() || "750+"}
              </strong>
            </div>

            <div className="h-4 w-[1px] bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Platform:</span>
              <span className="font-semibold text-slate-200">ARM / Edge x86</span>
            </div>

            <div className="h-4 w-[1px] bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-slate-300 font-medium">No Cloud Dependency</span>
            </div>

            <div className="h-4 w-[1px] bg-slate-700" />

            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Toggle Light / Dark Mode"
            >
              {theme === "light" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-slate-800">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-slate-200">Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};
