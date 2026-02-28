import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";
import { Globe, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

const sites = [
  { id: "MCU", name: "S3-Pico Core", lat: 55, lng: 75, failureRate: 0.1, status: "nominal" },
  { id: "GSM", name: "SIM800L Module", lat: 45, lng: 18, failureRate: 1.4, status: "nominal" },
  { id: "TMP", name: "DS18B20 Temp", lat: 38, lng: 48, failureRate: 4.8, status: "warning" },
  { id: "PHS", name: "pH Sensor BNC", lat: 58, lng: 78, failureRate: 1.8, status: "nominal" },
  { id: "PWR", name: "Buck Converter", lat: 50, lng: 22, failureRate: 3.2, status: "warning" },
  { id: "BAT", name: "LiPo Mgmt", lat: 42, lng: 82, failureRate: 0.9, status: "nominal" },
];

const batchData = [
  { batch: "MCU-B2", rate: 0.2, supplier: "Espressif" },
  { batch: "GSM-B4", rate: 3.8, supplier: "SIMCom" },
  { batch: "TMP-B1", rate: 0.9, supplier: "Maxim" },
  { batch: "PHS-B3", rate: 5.1, supplier: "Atlas" },
  { batch: "PWR-B5", rate: 2.3, supplier: "TI" },
  { batch: "BAT-B2", rate: 1.1, supplier: "BQ" },
];

const fpyData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  fpy: 94 + Math.random() * 4 + (i > 6 ? 1 : 0),
  target: 97,
}));

const tooltipStyle = {
  contentStyle: {
    background: "hsl(222, 47%, 7%)",
    border: "1px solid hsl(222, 30%, 18%)",
    borderRadius: "6px",
    fontSize: "11px",
    fontFamily: "JetBrains Mono",
  },
  labelStyle: { color: "hsl(210, 40%, 55%)" },
};

export default function FleetIntelligence() {
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setTime(Date.now()), 2000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Tracked Components", value: "6", icon: Globe, color: "text-primary" },
          { label: "Avg Supply Yield", value: "96.4%", icon: TrendingUp, color: "text-success" },
          { label: "Warnings", value: "2", icon: AlertTriangle, color: "text-warning" },
          { label: "All Clear", value: "4", icon: CheckCircle, color: "text-success" },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-4 flex items-center gap-3">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <div className="text-lg font-mono font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Global Map */}
        <div className="flex-1 glass-panel p-4">
          <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-4 text-glow-cyan">
            Component Supply Chain Vector Map
          </h3>
          <div className="relative w-full h-64 bg-background/50 rounded-lg overflow-hidden border border-primary/20">
            {/* Component Layout Visual Outline */}
            <svg viewBox="0 0 100 60" className="w-full h-full">
              <defs>
                <radialGradient id="pulse-nominal">
                  <stop offset="0%" stopColor="hsl(142, 76%, 45%)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="hsl(142, 76%, 45%)" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="pulse-warning">
                  <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* Abstract PCB layout traces instead of world map */}
              <path d="M10,30 L90,30 M50,10 L50,50 M30,10 L30,50 M70,10 L70,50" fill="none" stroke="rgba(0,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2,2" />
              <rect x="35" y="20" width="30" height="20" fill="hsl(222, 30%, 12%)" stroke="hsl(222, 30%, 25%)" strokeWidth="0.5" rx="2" />


              {/* Site markers */}
              {sites.map((site) => {
                const pulsePhase = Math.sin(time / 1000 + sites.indexOf(site)) * 0.5 + 0.5;
                return (
                  <g key={site.id}>
                    <circle cx={site.lng} cy={site.lat} r={3 + pulsePhase * 2}
                      fill={`url(#pulse-${site.status})`} opacity={0.4 + pulsePhase * 0.3}
                    />
                    <circle cx={site.lng} cy={site.lat} r={2}
                      fill={site.status === "nominal" ? "hsl(142, 76%, 45%)" : "hsl(38, 92%, 50%)"}
                    />
                    <text x={site.lng} y={site.lat - 4} textAnchor="middle" fontSize="3"
                      fill="hsl(210, 40%, 85%)" fontFamily="JetBrains Mono"
                    >
                      {site.name}
                    </text>
                    <text x={site.lng} y={site.lat + 6} textAnchor="middle" fontSize="2.5"
                      fill="hsl(210, 40%, 55%)" fontFamily="JetBrains Mono"
                    >
                      {site.failureRate}% fail
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right column charts */}
        <div className="w-80 flex flex-col gap-4">
          {/* Failure Rate */}
          <div className="glass-panel p-4 flex-1">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-3 text-glow-cyan">
              Failure Rate by Batch
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={batchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 15%)" />
                <XAxis dataKey="batch" tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(210, 40%, 55%)" }} />
                <YAxis tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(210, 40%, 55%)" }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="rate" fill="hsl(187, 94%, 53%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* FPY Trend */}
          <div className="glass-panel p-4 flex-1">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-3 text-glow-cyan">
              First-Pass Yield Trend
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={fpyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 15%)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(210, 40%, 55%)" }} />
                <YAxis domain={[92, 100]} tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(210, 40%, 55%)" }} />
                <Tooltip {...tooltipStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "10px", fontFamily: "JetBrains Mono" }} />
                <Line type="monotone" dataKey="fpy" stroke="hsl(162, 95%, 45%)" strokeWidth={2} dot={{ r: 2 }} name="FPY %" />
                <Line type="monotone" dataKey="target" stroke="hsl(0, 72%, 51%)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
