/**
 * DiagnosticPanel — wires fault injection/clear to the real backend REST API.
 */
import {
  ChevronRight, ChevronDown, AlertTriangle, CheckCircle, XCircle,
  Flame, Zap, Thermometer, Radio, Loader2
} from "lucide-react";
import type { PCBComponent } from "./PCBViewer";
import { useState, useCallback } from "react";
import { useFaultControl } from "@/hooks/useBackend";
import { motion, AnimatePresence } from "framer-motion";

const analysisItems = [
  { label: "Power Rail Analysis", icon: Zap, description: "Checks all voltage rails for ripple, dropout, and regulation" },
  { label: "Signal Integrity", icon: Radio, description: "Validates signal rise/fall times and crosstalk margins" },
  { label: "Thermal Map", icon: Thermometer, description: "Infrared thermal distribution across all components" },
  { label: "Clock Domain", icon: Radio, description: "Clock tree analysis for jitter and skew" },
  { label: "Solder Joint Integrity", icon: CheckCircle, description: "CV Scan: 0-100% health score for soldering joints" },
];

const analysisResults: Record<string, { checks: { name: string; status: "pass" | "warn" | "fail"; value: string }[] }> = {
  "Power Rail Analysis": {
    checks: [
      { name: "3.3V Rail Regulation", status: "pass", value: "3.31V ±0.3%" },
      { name: "5V USB Bus", status: "pass", value: "5.02V ±0.4%" },
      { name: "2.5V Ref Ripple", status: "warn", value: "18mV p-p" },
      { name: "Decoupling Caps ESR", status: "pass", value: "0.48Ω" },
    ],
  },
  "Signal Integrity": {
    checks: [
      { name: "SPI CLK Rise Time", status: "pass", value: "2.1ns" },
      { name: "ADC Input Crosstalk", status: "warn", value: "-32dB" },
      { name: "I2C Bus Capacitance", status: "pass", value: "185pF" },
      { name: "UART TX Eye Diagram", status: "pass", value: "Open" },
    ],
  },
  "Thermal Map": {
    checks: [
      { name: "MCU Junction Temp", status: "pass", value: "47°C" },
      { name: "ADC Thermal Drift", status: "warn", value: "±2.1 LSB/°C" },
      { name: "R2 Power Dissipation", status: "fail", value: "0.21W / 0.25W" },
      { name: "L1 Core Saturation", status: "warn", value: "82% Isat" },
    ],
  },
  "Clock Domain": {
    checks: [
      { name: "HSE 8MHz Accuracy", status: "pass", value: "±12ppm" },
      { name: "PLL Lock Status", status: "pass", value: "Locked" },
      { name: "Clock Jitter (RMS)", status: "warn", value: "45ps" },
      { name: "CDC Sync Paths", status: "pass", value: "2-FF sync" },
    ],
  },
  "Solder Joint Integrity": {
    checks: [
      { name: "U1 BGA Balls", status: "pass", value: "98% (No voids)" },
      { name: "J1 USB Shield", status: "warn", value: "72% (Micro-crack)" },
      { name: "R2 Tombstone Check", status: "pass", value: "100% (Flat)" },
      { name: "C5 Solder Fillet", status: "fail", value: "45% (Insufficient)" },
    ],
  },
};

interface Props {
  selectedComponent: PCBComponent | null;
  activeAnalysis: string | null;
  onAnalysisChange: (a: string | null) => void;
  faultedComponents: Set<string>;
  onToggleFault: (id: string) => void;
  powerOn: boolean;
}

export default function DiagnosticPanel({
  selectedComponent, activeAnalysis, onAnalysisChange,
  faultedComponents, onToggleFault, powerOn
}: Props) {
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const { inject, clear, injecting, error: faultError } = useFaultControl();

  const handleAnalysisClick = (label: string) => {
    if (expandedAnalysis === label) { setExpandedAnalysis(null); onAnalysisChange(null); }
    else { setExpandedAnalysis(label); onAnalysisChange(label); }
  };

  const handleToggleFault = useCallback(async () => {
    if (!selectedComponent) return;
    const id = selectedComponent.id;
    const isFaulted = faultedComponents.has(id);
    if (isFaulted) { await clear(id); onToggleFault(id); }
    else { await inject({ component: id, fault_type: "short" }); onToggleFault(id); }
  }, [selectedComponent, faultedComponents, inject, clear, onToggleFault]);

  const statusIcon = (status: "pass" | "warn" | "fail") => {
    if (status === "pass") return <CheckCircle className="w-3 h-3 text-success" />;
    if (status === "warn") return <AlertTriangle className="w-3 h-3 text-warning" />;
    return <XCircle className="w-3 h-3 text-destructive" />;
  };

  if (!selectedComponent) {
    return (
      <div className="h-full flex flex-col">
        <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-4 text-glow-cyan">
          Explainable AI — Diagnostic Tree
        </h3>
        {!powerOn && (
          <div className="glass-panel p-3 mb-4 border-destructive/30">
            <p className="text-[10px] font-mono text-destructive uppercase">
              System powered off — diagnostics unavailable
            </p>
          </div>
        )}
        <div className="space-y-1">
          {analysisItems.map((item, idx) => {
            const isExpanded = expandedAnalysis === item.label;
            const results = analysisResults[item.label];
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <button
                  onClick={() => powerOn && handleAnalysisClick(item.label)}
                  disabled={!powerOn}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded text-xs font-mono transition-all ${isExpanded
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : powerOn
                      ? "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      : "text-muted-foreground/40 cursor-not-allowed"
                    }`}
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <item.icon className="w-3 h-3" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {powerOn && <CheckCircle className="w-3 h-3 text-success" />}
                </button>
                <AnimatePresence>
                  {isExpanded && results && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-5 mt-1 mb-2 space-y-1 overflow-hidden"
                    >
                      <p className="text-[9px] font-mono text-muted-foreground px-2 mb-2">{item.description}</p>
                      {results.checks.map((check) => (
                        <div key={check.name} className="glass-panel px-2 py-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {statusIcon(check.status)}
                            <span className="text-[10px] font-mono text-foreground truncate">{check.name}</span>
                          </div>
                          <span className={`text-[10px] font-mono whitespace-nowrap ${check.status === "pass" ? "text-success" :
                            check.status === "warn" ? "text-warning" : "text-destructive"
                            }`}>
                            {check.value}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-auto pt-4">
          <p className="text-[9px] text-muted-foreground font-mono text-center px-4">
            Click an analysis to highlight components on PCB. Select a component for details.
          </p>
        </div>
      </div>
    );
  }

  const isFaulted = faultedComponents.has(selectedComponent.id);

  return (
    <motion.div
      className="h-full flex flex-col"
      key={selectedComponent.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-3 text-glow-cyan">
        Component Diagnostics
      </h3>

      <div className={`glass-panel p-3 mb-3 ${isFaulted ? "border-destructive/50 glow-red" : ""}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-mono text-sm font-semibold text-foreground">{selectedComponent.label}</div>
          {isFaulted && <Flame className="w-4 h-4 text-destructive animate-pulse" />}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground uppercase">{selectedComponent.type}</div>
        {isFaulted && (
          <div className="mt-2 text-[10px] font-mono text-destructive uppercase">⚠ FAULT INJECTED — SHORT TO GND</div>
        )}

        {/* Supply Chain "Red-Flag" Feature */}
        {selectedComponent.id === "U1" || selectedComponent.id === "C5" ? (
          <div className="mt-2 p-1.5 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-[9px] font-mono text-destructive">
              <strong className="block">Supply Chain Red-Flag</strong>
              Component {selectedComponent.id} is from a batch (Coimbatore facility) with a 12% failure rate in the field.
            </div>
          </div>
        ) : null}
      </div>

      {faultError && (
        <div className="mb-2 px-2 py-1 rounded text-[10px] font-mono text-warning bg-warning/10 border border-warning/20">
          API: {faultError}
        </div>
      )}

      <button
        onClick={handleToggleFault}
        disabled={injecting || !powerOn}
        className={`w-full mb-3 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono transition-all ${isFaulted
          ? "bg-destructive/20 text-destructive border border-destructive/30 glow-red"
          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          } disabled:opacity-40`}
      >
        {injecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
        {injecting ? "Calling backend…" : isFaulted ? "Clear Fault" : "Inject Fault (Short to GND)"}
      </button>

      <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2 px-1 flex justify-between">
        <span>Parameter</span>
        <span className="flex gap-6"><span>Nominal</span><span>Live</span></span>
      </div>
      <div className="space-y-1 mb-4">
        {selectedComponent.specs.map((spec) => {
          const isMatch = spec.nominal.replace(/[^\d.]/g, "") === spec.live.replace(/[^\d.]/g, "");
          return (
            <div key={spec.param} className="glass-panel px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-mono text-foreground">{spec.param}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-muted-foreground">{spec.nominal}</span>
                <span className={`text-xs font-mono ${isFaulted ? "text-destructive" : isMatch ? "text-success" : "text-warning"}`}>
                  {isFaulted ? "ERR" : spec.live}
                </span>
                {isFaulted
                  ? <XCircle className="w-3 h-3 text-destructive" />
                  : isMatch
                    ? <CheckCircle className="w-3 h-3 text-success" />
                    : <AlertTriangle className="w-3 h-3 text-warning" />
                }
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2 px-1">Logic Chain</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-foreground">
          <ChevronRight className="w-3 h-3 text-primary" />
          <span>V=IR Check</span>
          {isFaulted ? <XCircle className="w-3 h-3 text-destructive ml-auto" /> : <CheckCircle className="w-3 h-3 text-success ml-auto" />}
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-foreground pl-6">
          <ChevronRight className="w-3 h-3 text-primary" />
          <span>Tolerance ±5%</span>
          {isFaulted || selectedComponent.threshold > 0.5
            ? <XCircle className="w-3 h-3 text-destructive ml-auto" />
            : <CheckCircle className="w-3 h-3 text-success ml-auto" />
          }
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-foreground pl-10">
          <ChevronRight className="w-3 h-3 text-primary" />
          <span>Thermal Rating</span>
          <span className={`ml-auto text-[10px] ${isFaulted || selectedComponent.threshold > 0.6 ? "text-destructive" : "text-success"}`}>
            {isFaulted ? "BURN" : selectedComponent.threshold > 0.6 ? "WARN" : "PASS"}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {/* BOM Cost-Impact Analysis */}
        {isFaulted && (
          <div className="glass-panel p-2 border-warning/30 bg-warning/5">
            <div className="text-[10px] font-mono uppercase text-warning mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> BOM Cost-Impact Analysis
            </div>
            <div className="text-[9px] font-mono text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Cost to Repair (Labor+Part):</span> <span>$18.50</span></div>
              <div className="flex justify-between"><span>Cost of Board Scrap:</span> <span>$245.00</span></div>
              <div className="mt-1 text-primary text-[10px]">AI Recommendation: REWORK/REPAIR</div>
            </div>
          </div>
        )}

        {/* Component Aging Predictor */}
        {selectedComponent.type === "capacitor" && (
          <div className="glass-panel p-2">
            <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Component Aging Predictor</div>
            <div className="text-[9px] font-mono text-muted-foreground">
              Mathematical ESR degradation model (5 years):
              <div className="flex justify-between mt-1"><span className="text-foreground">Year 1:</span> 0.50Ω</div>
              <div className="flex justify-between"><span className="text-foreground">Year 3:</span> 0.72Ω</div>
              <div className="flex justify-between"><span className="text-warning">Year 5:</span> 1.15Ω (Out of Spec)</div>
            </div>
          </div>
        )}

        {/* Automated SCPI Script Writer */}
        <div className="glass-panel p-2">
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Automated SCPI Script Writer</div>
          <div className="text-[9px] font-mono text-muted-foreground mb-1">Generated test script for {selectedComponent.id}:</div>
          <div className="bg-background/80 p-1.5 rounded font-mono text-[9px] text-green-400 select-all border border-border/50">
            CONF:VOLT:DC 10,0.001<br />
            ROUT:CLOS (@{selectedComponent.id})<br />
            MEAS:VOLT? (@{selectedComponent.id})
          </div>
        </div>
      </div>
    </motion.div>
  );
}
