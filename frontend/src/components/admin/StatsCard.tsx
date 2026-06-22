"use client";

interface StatsCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

const accentMap: Record<string, string> = {
  "text-emerald-400": "rgba(16,185,129,0.15)",
  "text-blue-400": "rgba(59,130,246,0.15)",
  "text-red-400": "rgba(239,68,68,0.15)",
  "text-purple-400": "rgba(139,92,246,0.15)",
  "text-amber-400": "rgba(245,158,11,0.15)",
  "text-orange-400": "rgba(249,115,22,0.15)",
  "text-white": "rgba(255,255,255,0.08)",
};

export default function StatsCard({ label, value, color = "text-white", icon }: StatsCardProps) {
  const glowRgba = accentMap[color] || "rgba(255,255,255,0.08)";

  return (
    <div className="stat-card group">
      <div className="stat-glow" style={{ background: `radial-gradient(circle, ${glowRgba} 0%, transparent 70%)` }} />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {icon && <span className="text-lg opacity-60">{icon}</span>}
            <h3 className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-slate-500">{label}</h3>
          </div>
          <p className={`text-3xl font-black tabular-nums tracking-tight ${color}`}>{value}</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
