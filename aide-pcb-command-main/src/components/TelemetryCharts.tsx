/**
 * TelemetryCharts – Live oscilloscope panels.
 * Uses the backend WebSocket for real streaming data,
 * with synthetic fallback when offline.
 */
import { useEffect, useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useTelemetry } from "@/hooks/useBackend";
import { Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DataPoint {
  time: string;
  voltage: number;
  current: number;
  temperature: number;
}

function syntheticPoint(index: number, stress: number): DataPoint {
  const n = stress * 0.5;
  return {
    time: `${index}s`,
    voltage: 3.3 + Math.sin(index * 0.3) * 0.1 + (Math.random() - 0.5) * n,
    current: 0.5 + Math.sin(index * 0.5 + 1) * 0.05 + (Math.random() - 0.5) * n * 0.3,
    temperature: 45 + Math.sin(index * 0.2 + 2) * 3 + (Math.random() - 0.5) * n * 5,
  };
}

interface Props { stressLevel: number; }

export default function TelemetryCharts({ stressLevel }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const indexRef = useRef(0);
  const [telState] = useTelemetry();
  const isLive = telState.wsStatus === "connected";

  // Seed initial synthetic data
  useEffect(() => {
    const initial = Array.from({ length: 30 }, (_, i) => syntheticPoint(i, stressLevel));
    indexRef.current = 30;
    setData(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real telemetry: average all TP packets → single data point
  useEffect(() => {
    if (!isLive || telState.packets.length === 0) return;
    const pkts = telState.packets;
    const avg = (key: "voltage" | "current" | "temperature") =>
      pkts.reduce((s, p) => s + p[key], 0) / pkts.length;

    indexRef.current++;
    setData((prev) => [...prev.slice(-59), {
      time: `${indexRef.current}s`,
      voltage: avg("voltage"),
      current: avg("current"),
      temperature: avg("temperature"),
    }]);
  }, [telState.packets, isLive]);

  // Synthetic fallback when backend offline
  useEffect(() => {
    if (isLive) return;
    const id = setInterval(() => {
      indexRef.current++;
      setData((prev) => [...prev.slice(-59), syntheticPoint(indexRef.current, stressLevel)]);
    }, 2000);
    return () => clearInterval(id);
  }, [isLive, stressLevel]);

  const chartConfig = [
    { key: "voltage", label: "Voltage (V)", color: "hsl(187, 94%, 53%)", unit: "V" },
    { key: "current", label: "Current (A)", color: "hsl(162, 95%, 45%)", unit: "A" },
    { key: "temperature", label: "Temp (°C)", color: "hsl(38,  92%, 50%)", unit: "°C" },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-primary uppercase tracking-widest text-glow-cyan">
          Live Oscilloscope Streams
        </h3>
        <div className={`flex items-center gap-1 text-[10px] font-mono ${isLive ? "text-success" : "text-muted-foreground"}`}>
          {isLive ? <><Wifi className="w-3 h-3" /> LIVE</> : <><WifiOff className="w-3 h-3" /> SIM</>}
        </div>
      </div>

      <AnimatePresence>
        {chartConfig.map((cfg, index) => (
          <motion.div
            key={cfg.key}
            className="glass-panel p-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{cfg.label}</span>
              <span className="text-xs font-mono" style={{ color: cfg.color }}>
                {data.length > 0
                  ? data[data.length - 1][cfg.key].toFixed(cfg.unit === "°C" ? 1 : 2)
                  : "—"} {cfg.unit}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={70}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 15%)" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222, 47%, 7%)",
                    border: "1px solid hsl(222, 30%, 18%)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontFamily: "JetBrains Mono",
                  }}
                  labelStyle={{ color: "hsl(210, 40%, 55%)" }}
                />
                <Line
                  type="monotone"
                  dataKey={cfg.key}
                  stroke={cfg.color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
