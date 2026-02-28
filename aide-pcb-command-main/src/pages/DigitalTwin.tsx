import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PCBViewer, { type PCBComponent } from "@/components/PCBViewer";
import TelemetryCharts from "@/components/TelemetryCharts";
import DiagnosticPanel from "@/components/DiagnosticPanel";
import SimulationControls from "@/components/SimulationControls";
import VoiceAssistant from "@/components/VoiceAssistant";

export default function DigitalTwin() {
  const [selectedComponent, setSelectedComponent] = useState<PCBComponent | null>(null);
  const [stressLevel, setStressLevel] = useState(0.2);
  const [arMode, setArMode] = useState(false);
  const [faultedComponents, setFaultedComponents] = useState<Set<string>>(new Set());
  const [heatMapMode, setHeatMapMode] = useState(false);
  const [signalFlowActive, setSignalFlowActive] = useState(false);
  const [logicProbeActive, setLogicProbeActive] = useState(false);
  const [goldenDiffActive, setGoldenDiffActive] = useState(false);
  const [powerOn, setPowerOn] = useState(true);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const [emergency, setEmergency] = useState(false);

  const handleToggleFault = useCallback((id: string) => {
    setFaultedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Emergency Shutdown Logic
  useEffect(() => {
    if (powerOn && stressLevel > 0.95) {
      setPowerOn(false);
      setEmergency(true);
    }
  }, [stressLevel, powerOn]);

  const handlePowerToggle = () => {
    if (!powerOn && stressLevel > 0.95) {
      return; // Can't power on while stress is strictly critical
    }
    setPowerOn(!powerOn);
    setEmergency(false);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: AI Diagnostic Panel */}
        <div className="w-64 flex-shrink-0 glass-panel p-4 overflow-y-auto">
          <DiagnosticPanel
            selectedComponent={selectedComponent}
            activeAnalysis={activeAnalysis}
            onAnalysisChange={setActiveAnalysis}
            faultedComponents={faultedComponents}
            onToggleFault={handleToggleFault}
            powerOn={powerOn}
          />
        </div>

        {/* Center: PCB Viewer */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 relative">
          <AnimatePresence>
            {emergency && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-md font-mono font-bold text-sm tracking-widest uppercase shadow-lg shadow-destructive/50 border border-destructive flex items-center gap-2 animate-bounce"
              >
                ⚠ EMERGENCY SHUTDOWN TRIGGERED (V≈0, I→∞)
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            layout
            className="flex-1 glass-panel overflow-hidden glow-cyan"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <PCBViewer
              onSelectComponent={setSelectedComponent}
              selectedId={selectedComponent?.id ?? null}
              stressLevel={stressLevel}
              arMode={arMode}
              faultedComponents={faultedComponents}
              heatMapMode={heatMapMode}
              signalFlowActive={signalFlowActive}
              powerOn={powerOn}
              activeAnalysis={activeAnalysis}
              logicProbeActive={logicProbeActive}
              goldenDiffActive={goldenDiffActive}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <SimulationControls
              stressLevel={stressLevel}
              onStressChange={setStressLevel}
              arMode={arMode}
              onArToggle={() => setArMode(!arMode)}
              powerOn={powerOn}
              onPowerToggle={handlePowerToggle}
              heatMapMode={heatMapMode}
              onHeatMapToggle={() => setHeatMapMode(!heatMapMode)}
              signalFlowActive={signalFlowActive}
              onSignalFlowToggle={() => setSignalFlowActive(!signalFlowActive)}
              logicProbeActive={logicProbeActive}
              onLogicProbeToggle={() => { setLogicProbeActive(!logicProbeActive); setGoldenDiffActive(false); }}
              goldenDiffActive={goldenDiffActive}
              onGoldenDiffToggle={() => { setGoldenDiffActive(!goldenDiffActive); setLogicProbeActive(false); }}
            />
          </motion.div>
        </div>

        {/* Right: Telemetry */}
        <div className="w-72 flex-shrink-0 glass-panel p-4 overflow-y-auto">
          <TelemetryCharts stressLevel={powerOn ? stressLevel : 0} />
        </div>
      </div>

      {/* Bottom: Voice Assistant */}
      <VoiceAssistant />
    </div>
  );
}
