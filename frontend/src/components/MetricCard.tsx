import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "cyan" | "emerald" | "amber" | "rose" | "blue" | "slate";
  trend?: {
    direction: "up" | "down" | "neutral";
    text: string;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  variant = "cyan",
  trend
}) => {
  const variantStyles = {
    cyan: "border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-slate-900/60 text-cyan-400",
    emerald: "border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-slate-900/60 text-emerald-400",
    amber: "border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-900/60 text-amber-400",
    rose: "border-rose-500/20 bg-gradient-to-br from-rose-950/20 to-slate-900/60 text-rose-400",
    blue: "border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-slate-900/60 text-blue-400",
    slate: "border-slate-700/50 bg-slate-900/60 text-slate-300"
  };

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-sm transition-all hover:border-slate-600/80 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded-lg bg-slate-800/80">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
      </div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.direction === "up"
                  ? "text-emerald-400"
                  : trend.direction === "down"
                  ? "text-amber-400"
                  : "text-slate-400"
              }`}
            >
              {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
