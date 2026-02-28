import { useState, useCallback } from "react";
import PCBViewer, { type PCBComponent } from "@/components/PCBViewer";
import TelemetryCharts from "@/components/TelemetryCharts";
import DiagnosticPanel from "@/components/DiagnosticPanel";
import SimulationControls from "@/components/SimulationControls";


export default function DigitalTwin() {
  const [selectedComponent, setSelectedComponent] = useState<PCBComponent | null>(null);
  const [stressLevel, setStressLevel] = useState(0.2);
  const [arMode, setArMode] = useState(false);
  const [faultedComponents, setFaultedComponents] = useState<Set<string>>(new Set());
  const [heatMapMode, setHeatMapMode] = useState(false);
  const [signalFlowActive, setSignalFlowActive] = useState(false);
  const [powerOn, setPowerOn] = useState(true);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);

  const handleToggleFault = useCallback((id: string) => {
    setFaultedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex-1 glass-panel overflow-hidden glow-cyan">
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
            />
          </div>
          <SimulationControls
            stressLevel={stressLevel}
            onStressChange={setStressLevel}
            arMode={arMode}
            onArToggle={() => setArMode(!arMode)}
            powerOn={powerOn}
            onPowerToggle={() => setPowerOn(!powerOn)}
            heatMapMode={heatMapMode}
            onHeatMapToggle={() => setHeatMapMode(!heatMapMode)}
            signalFlowActive={signalFlowActive}
            onSignalFlowToggle={() => setSignalFlowActive(!signalFlowActive)}
          />
        </div>

        {/* Right: Telemetry */}
        <div className="w-72 flex-shrink-0 glass-panel p-4 overflow-y-auto">
          <TelemetryCharts stressLevel={powerOn ? stressLevel : 0} />
        </div>
      </div>

    </div>
  );
}
