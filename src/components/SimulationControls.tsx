import { Thermometer, Zap, Eye, EyeOff, Power, Flame, Waves, Map } from "lucide-react";

interface Props {
  stressLevel: number;
  onStressChange: (val: number) => void;
  arMode: boolean;
  onArToggle: () => void;
  powerOn: boolean;
  onPowerToggle: () => void;
  heatMapMode: boolean;
  onHeatMapToggle: () => void;
  signalFlowActive: boolean;
  onSignalFlowToggle: () => void;
}

export default function SimulationControls({
  stressLevel, onStressChange, arMode, onArToggle,
  powerOn, onPowerToggle, heatMapMode, onHeatMapToggle,
  signalFlowActive, onSignalFlowToggle,
}: Props) {
  return (
    <div className="glass-panel p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Simulation Controls</h4>
        {/* Power button */}
        <button
          onClick={onPowerToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
            powerOn
              ? "bg-success/20 text-success border border-success/30 glow-green"
              : "bg-destructive/20 text-destructive border border-destructive/30 glow-red"
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {powerOn ? "ON" : "OFF"}
        </button>
      </div>

      {/* Stress slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-mono text-foreground">Thermal Stress</span>
          </div>
          <span className="text-xs font-mono text-warning">{Math.round(stressLevel * 100)}%</span>
        </div>
        <input
          type="range" min="0" max="100" value={stressLevel * 100}
          onChange={(e) => onStressChange(Number(e.target.value) / 100)}
          disabled={!powerOn}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-30"
          style={{
            background: `linear-gradient(90deg, hsl(142, 76%, 45%) 0%, hsl(38, 92%, 50%) 50%, hsl(0, 72%, 51%) 100%)`,
          }}
        />
      </div>

      {/* Voltage fluctuation */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono text-foreground">Voltage Fluctuation</span>
        </div>
        <div className="flex gap-1">
          {["Low", "Med", "High"].map((l, i) => (
            <button key={l}
              onClick={() => onStressChange(i * 0.4 + 0.1)}
              disabled={!powerOn}
              className={`flex-1 py-1 text-[10px] font-mono rounded transition-colors disabled:opacity-30 ${
                Math.abs(stressLevel - (i * 0.4 + 0.1)) < 0.15
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle buttons row */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* AR toggle */}
        <button
          onClick={onArToggle}
          disabled={!powerOn}
          className={`flex flex-col items-center gap-1 py-2 rounded-md text-[10px] font-mono transition-all disabled:opacity-30 ${
            arMode
              ? "bg-accent/20 text-accent border border-accent/30 glow-green"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          {arMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          X-RAY
        </button>

        {/* Heat map toggle */}
        <button
          onClick={onHeatMapToggle}
          disabled={!powerOn}
          className={`flex flex-col items-center gap-1 py-2 rounded-md text-[10px] font-mono transition-all disabled:opacity-30 ${
            heatMapMode
              ? "bg-warning/20 text-warning border border-warning/30"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          HEAT MAP
        </button>

        {/* Signal flow toggle */}
        <button
          onClick={onSignalFlowToggle}
          disabled={!powerOn}
          className={`flex flex-col items-center gap-1 py-2 rounded-md text-[10px] font-mono transition-all disabled:opacity-30 ${
            signalFlowActive
              ? "bg-primary/20 text-primary border border-primary/30 glow-cyan"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          ELECTRONS
        </button>
      </div>
    </div>
  );
}
