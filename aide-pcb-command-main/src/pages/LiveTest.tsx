/**
 * LiveTest – Real-time test-point monitoring.
 * Data source priority:
 *  1. Backend WebSocket (/ws/telemetry)
 *  2. REST /api/circuit/verify (click to verify)
 *  3. Synthetic fallback when offline
 */
import { useState, useEffect, useCallback } from "react";
import { Activity, Zap, Thermometer, Clock, Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, XCircle, Share2, Cpu } from "lucide-react";
import { useTelemetry, useVerifyTestPoint } from "@/hooks/useBackend";
import type { TelemetryPacket } from "@/services/api";

const TP_META: Record<string, { label: string; defaultV: number; defaultI: number }> = {
  "TP-1": { label: "VCC Rail", defaultV: 3.3, defaultI: 0.45 },
  "TP-2": { label: "GND Reference", defaultV: 0.002, defaultI: 0 },
  "TP-3": { label: "ADC Input", defaultV: 2.48, defaultI: 0.01 },
  "TP-4": { label: "Clock Output", defaultV: 3.28, defaultI: 0.12 },
  "TP-5": { label: "Power Stage", defaultV: 5.02, defaultI: 1.2 },
  "TP-6": { label: "USB VBUS", defaultV: 4.98, defaultI: 0.8 },
};

interface DisplayPoint {
  id: string;
  label: string;
  voltage: number;
  current: number;
  temp: number;
  status: "pass" | "warn" | "fail";
  source: "live" | "sim";
}

function packetToDisplay(p: TelemetryPacket): DisplayPoint {
  return {
    id: p.test_point,
    label: TP_META[p.test_point]?.label ?? p.test_point,
    voltage: p.voltage,
    current: p.current,
    temp: p.temperature,
    status: p.fault_status === "nominal" ? "pass" : p.fault_status === "warning" ? "warn" : "fail",
    source: "live",
  };
}

function syntheticPoints(): DisplayPoint[] {
  return Object.entries(TP_META).map(([id, meta]) => ({
    id,
    label: meta.label,
    voltage: meta.defaultV + (Math.random() - 0.5) * 0.05,
    current: Math.max(0, meta.defaultI + (Math.random() - 0.5) * 0.02),
    temp: 43 + Math.random() * 8,
    status: "pass" as const,
    source: "sim" as const,
  }));
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle className="w-3.5 h-3.5 text-success" />;
  if (status === "warn") return <AlertTriangle className="w-3.5 h-3.5 text-warning" />;
  return <XCircle className="w-3.5 h-3.5 text-destructive" />;
}

export default function LiveTest() {
  const [displayPoints, setDisplayPoints] = useState<DisplayPoint[]>(syntheticPoints());
  const [selectedTP, setSelectedTP] = useState<string | null>(null);

  const [telState] = useTelemetry();
  const { results: verifyResults, loading: verifying, verify } = useVerifyTestPoint();
  const isLive = telState.wsStatus === "connected";

  // Merge live telemetry into display state
  useEffect(() => {
    if (!isLive || telState.packets.length === 0) return;
    setDisplayPoints((prev) => {
      const liveMap = new Map(telState.packets.map((p) => [p.test_point, p]));
      return prev.map((dp) => {
        const pkt = liveMap.get(dp.id);
        return pkt ? packetToDisplay(pkt) : dp;
      });
    });
  }, [telState.packets, isLive]);

  // Synthetic update when offline
  useEffect(() => {
    if (isLive) return;
    const id = setInterval(() => {
      setDisplayPoints((prev) =>
        prev.map((dp) => ({
          ...dp,
          voltage: dp.voltage + (Math.random() - 0.5) * 0.04,
          current: Math.max(0, dp.current + (Math.random() - 0.5) * 0.015),
          temp: dp.temp + (Math.random() - 0.5) * 0.4,
        }))
      );
    }, 2000);
    return () => clearInterval(id);
  }, [isLive]);

  const handleVerify = useCallback(
    async (dp: DisplayPoint) => {
      setSelectedTP(dp.id);
      await verify(dp.id, parseFloat(dp.voltage.toFixed(3)), parseFloat(dp.current.toFixed(3)));
    },
    [verify]
  );

  const verifyFor = (id: string) => verifyResults.find((r) => r.test_point === id) ?? null;
  const activeCount = displayPoints.filter((dp) => dp.status !== "fail").length;

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono text-primary uppercase tracking-widest text-glow-cyan">
          Live Test Monitoring
        </h2>
        <div className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-full border ${isLive
          ? "text-success border-success/30 bg-success/10"
          : "text-muted-foreground border-border/30 bg-secondary/50"
          }`}>
          {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isLive ? "BACKEND LIVE" : "SIMULATED"}
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">

        {/* Schematic View embedded directly here */}
        <div className="flex-1 glass-panel relative overflow-hidden flex flex-col p-4">
          <h3 className="text-xs font-mono text-primary uppercase tracking-widest text-glow-cyan mb-2">High-Fidelity Schematic view</h3>
          <div className="flex-1 relative bg-black/40 border border-primary/20 rounded shadow-2xl overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

            <svg className="w-full h-full min-w-[600px] min-h-[400px] absolute inset-0 text-primary/40 pointer-events-none stroke-current" strokeWidth="2" fill="none">
              <path d="M 100 150 L 200 150 L 200 100 L 300 100" className={displayPoints[0]?.status === 'fail' ? "stroke-destructive" : ""} />
              <path d="M 100 250 L 250 250 L 250 180 L 400 180" className={displayPoints[2]?.status === 'fail' ? "stroke-destructive" : ""} />
              <path d="M 300 100 L 400 100 L 400 180" />
              <path d="M 400 180 L 500 180 L 500 250 L 600 250" strokeDasharray="5,5" className={displayPoints[4]?.status === 'fail' ? "stroke-destructive" : "stroke-accent/50"} />
              <path d="M 200 150 L 200 350 L 450 350 L 450 250" className={displayPoints[1]?.status === 'fail' ? "stroke-destructive" : ""} />
            </svg>

            <div className="absolute top-[80px] left-[280px] bg-background border-2 border-primary w-20 h-12 rounded-md flex flex-col items-center justify-center gap-1 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              <span className="text-[10px] font-mono text-primary text-glow-cyan">MCU_ESP32</span>
            </div>

            <div className="absolute top-[130px] left-[80px] bg-background border border-muted-foreground w-14 h-10 flex flex-col items-center justify-center">
              <Zap className={`w-3 h-3 ${displayPoints[0]?.status === 'fail' ? 'text-destructive' : 'text-warning'}`} />
              <span className="text-[9px] font-mono text-muted-foreground">TP-1</span>
            </div>

            <div className="absolute top-[230px] left-[80px] bg-background border border-muted-foreground w-14 h-10 flex flex-col items-center justify-center">
              <Activity className={`w-3 h-3 ${displayPoints[2]?.status === 'fail' ? 'text-destructive' : 'text-accent'}`} />
              <span className="text-[9px] font-mono text-muted-foreground">TP-3</span>
            </div>

            <div className="absolute top-[160px] left-[380px] bg-background border-2 border-accent w-20 h-14 rounded-md flex flex-col items-center justify-center shadow-[0_0_15px_rgba(138,43,226,0.3)]">
              <Cpu className="w-4 h-4 text-accent" />
              <span className="text-[9px] font-mono text-accent">SIM800L</span>
            </div>

            <div className="absolute top-[230px] left-[580px] bg-background border border-success/50 w-16 h-8 flex flex-col items-center justify-center">
              <span className="text-[9px] font-mono text-success">TP-5 OUT</span>
            </div>

            <div className="absolute top-[330px] left-[430px] bg-background border border-border w-12 h-12 rounded-full flex items-center justify-center">
              <span className="text-[9px] font-mono text-muted-foreground">TP-2 GND</span>
            </div>
          </div>
        </div>

        {/* Live Test Points Overlay */}
        <div className="w-[380px] flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
          {displayPoints.map((tp) => {
            const vr = verifyFor(tp.id);
            const isSelected = selectedTP === tp.id;
            return (
              <div
                key={tp.id}
                onClick={() => handleVerify(tp)}
                className={`glass-panel p-3 cursor-pointer transition-all ${tp.status === "fail" ? "glow-red border-destructive/30 bg-destructive/5" :
                  tp.status === "warn" ? "border-warning/30" : ""
                  } ${isSelected ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-foreground">{tp.id}</span>
                  <div className="flex items-center gap-1">
                    <StatusIcon status={vr?.status ?? tp.status} />
                    <span className="text-[10px] font-mono text-muted-foreground">{tp.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <Zap className={`w-3.5 h-3.5 mx-auto mb-1 ${tp.status === 'fail' ? 'text-destructive' : 'text-primary'}`} />
                    <div className={`text-xs font-mono ${tp.status === 'fail' ? 'text-destructive' : 'text-primary'}`}>{tp.voltage.toFixed(2)}V</div>
                  </div>
                  <div className="text-center">
                    <Activity className={`w-3.5 h-3.5 mx-auto mb-1 ${tp.status === 'fail' ? 'text-destructive' : 'text-accent'}`} />
                    <div className={`text-xs font-mono ${tp.status === 'fail' ? 'text-destructive' : 'text-accent'}`}>{tp.current.toFixed(3)}A</div>
                  </div>
                  <div className="text-center">
                    <Thermometer className="w-3.5 h-3.5 text-warning mx-auto mb-1" />
                    <div className="text-xs font-mono text-warning">{tp.temp.toFixed(1)}°C</div>
                  </div>
                </div>

                {vr && (
                  <div className={`mt-2 text-[10px] font-mono rounded px-2 py-1 ${vr.status === "pass" ? "bg-success/10 text-success" :
                    vr.status === "warn" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    }`}>
                    {vr.message}
                  </div>
                )}
                {!vr && (
                  <div className="mt-2 text-[9px] font-mono text-muted-foreground/60 text-center">
                    click to verify
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel p-4 flex items-center gap-3">
        <Clock className="w-4 h-4 text-primary animate-pulse-slow" />
        <span className="text-xs font-mono text-muted-foreground">
          {isLive ? "Live data streaming from backend every 2s" : "Simulated data — backend offline"}
        </span>
        {verifying && (
          <div className="flex items-center gap-1.5 ml-2">
            <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
            <span className="text-xs font-mono text-primary">Verifying…</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse-slow ${isLive ? "bg-success" : "bg-warning"}`} />
          <span className={`text-xs font-mono ${isLive ? "text-success" : "text-warning"}`}>
            {activeCount} channels active
          </span>
        </div>
      </div>
    </div>
  );
}
