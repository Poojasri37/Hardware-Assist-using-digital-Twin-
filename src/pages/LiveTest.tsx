/**
 * LiveTest – Real-time test-point monitoring.
 *
 * Data source priority:
 *   1. Backend WebSocket (/ws/telemetry) – per-TP voltage, current, temp, status
 *   2. REST /api/circuit/verify          – verify a single TP against Ohm's law
 *   3. Synthetic fallback when offline
 */
import { useState, useEffect, useCallback } from "react";
import { Activity, Zap, Thermometer, Clock, Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useTelemetry, useVerifyTestPoint } from "@/hooks/useBackend";
import type { TelemetryPacket } from "@/services/api";

// ─── Static test-point metadata ───────────────────────────────────────────────

const TP_META: Record<string, { label: string; defaultV: number; defaultI: number }> = {
  "TP-1": { label: "VCC Rail", defaultV: 3.3, defaultI: 0.45 },
  "TP-2": { label: "GND Reference", defaultV: 0.002, defaultI: 0 },
  "TP-3": { label: "ADC Input", defaultV: 2.48, defaultI: 0.01 },
  "TP-4": { label: "Clock Output", defaultV: 3.28, defaultI: 0.12 },
  "TP-5": { label: "Power Stage", defaultV: 5.02, defaultI: 1.2 },
  "TP-6": { label: "USB VBUS", defaultV: 4.98, defaultI: 0.8 },
};

// ─── Types ────────────────────────────────────────────────────────────────────

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
    status: p.fault_status === "nominal" ? "pass"
      : p.fault_status === "warning" ? "warn" : "fail",
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

// ─── Status icon helper ───────────────────────────────────────────────────────

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle className="w-3.5 h-3.5 text-success" />;
  if (status === "warn") return <AlertTriangle className="w-3.5 h-3.5 text-warning" />;
  return <XCircle className="w-3.5 h-3.5 text-destructive" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveTest() {
  const [displayPoints, setDisplayPoints] = useState<DisplayPoint[]>(syntheticPoints());
  const [selectedTP, setSelectedTP] = useState<string | null>(null);

  const [telState] = useTelemetry();
  const { results: verifyResults, loading: verifying, verify } = useVerifyTestPoint();

  const isLive = telState.wsStatus === "connected";

  // ── Merge live telemetry packets into display state ──────────────────────────
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

  // ── Synthetic update when offline ────────────────────────────────────────────
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

  // ── Verify selected TP against Ohm's law ─────────────────────────────────────
  const handleVerify = useCallback(
    async (dp: DisplayPoint) => {
      setSelectedTP(dp.id);
      await verify(dp.id, parseFloat(dp.voltage.toFixed(3)), parseFloat(dp.current.toFixed(3)));
    },
    [verify]
  );

  // ── Find verification result for a TP ────────────────────────────────────────
  const verifyFor = (id: string) => verifyResults.find((r) => r.test_point === id) ?? null;

  const activeChannels = displayPoints.filter((dp) => dp.status !== "fail").length;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
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

      {/* Test-point grid */}
      <div className="grid grid-cols-3 gap-3">
        {displayPoints.map((tp) => {
          const vr = verifyFor(tp.id);
          const isSelected = selectedTP === tp.id;
          return (
            <div
              key={tp.id}
              className={`glass-panel p-4 cursor-pointer transition-all ${tp.status === "fail" ? "glow-red border-destructive/30" :
                tp.status === "warn" ? "border-warning/30" : ""
                } ${isSelected ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
              onClick={() => handleVerify(tp)}
            >
              {/* TP ID + label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-foreground">{tp.id}</span>
                <div className="flex items-center gap-1">
                  <StatusIcon status={vr?.status ?? tp.status} />
                  <span className="text-[10px] font-mono text-muted-foreground mr-2">{tp.label}</span>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${(vr?.status ?? tp.status) === "pass" ? "bg-success/20 text-success" :
                      (vr?.status ?? tp.status) === "warn" ? "bg-warning/20 text-warning" :
                        "bg-destructive/20 text-destructive"
                    }`}>
                    {(vr?.status ?? tp.status) === "pass" ? "Safe Mode" :
                      (vr?.status ?? tp.status) === "warn" ? "Warning Mode" :
                        "Critical Mode"}
                  </span>
                </div>
              </div>

              {/* Readings */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <Zap className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                  <div className="text-sm font-mono text-primary">{tp.voltage.toFixed(2)}V</div>
                </div>
                <div className="text-center">
                  <Activity className="w-3.5 h-3.5 text-accent mx-auto mb-1" />
                  <div className="text-sm font-mono text-accent">{tp.current.toFixed(3)}A</div>
                </div>
                <div className="text-center">
                  <Thermometer className="w-3.5 h-3.5 text-warning mx-auto mb-1" />
                  <div className="text-sm font-mono text-warning">{tp.temp.toFixed(1)}°C</div>
                </div>
              </div>

              {/* Verification result */}
              {vr && (
                <div className={`mt-2 text-[10px] font-mono rounded px-2 py-1 ${vr.status === "pass" ? "bg-success/10 text-success" :
                  vr.status === "warn" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                  }`}>
                  {vr.explanation}
                </div>
              )}
              {/* Verify button hint */}
              {!vr && (
                <div className="mt-2 text-[9px] font-mono text-muted-foreground/60 text-center">
                  click to verify
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status bar */}
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
            {activeChannels} channels active
          </span>
        </div>
      </div>
    </div >
  );
}
