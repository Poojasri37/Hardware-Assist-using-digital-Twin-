import { useState } from "react";
import PCBViewer, { type PCBComponent } from "@/components/PCBViewer";
import SimulationControls from "@/components/SimulationControls";
import { Maximize, Camera, Zap, ShieldAlert, Cpu, Activity } from "lucide-react";
import VoiceAssistant from "@/components/VoiceAssistant";

export default function ArVision() {
    const [powerOn, setPowerOn] = useState(true);
    const [stressLevel, setStressLevel] = useState(0.5);
    const [signalFlow, setSignalFlow] = useState(true);
    const [logicProbe, setLogicProbe] = useState(false);
    const [goldenDiff, setGoldenDiff] = useState(false);

    return (
        <div className="flex flex-col gap-4 relative bg-[#020204] overflow-y-auto overflow-x-hidden h-full lg:h-auto min-h-full p-2 pb-10">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.07)_0%,transparent_70%)] pointer-events-none" />

            <div className="flex items-center justify-between mb-2 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-mono font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                            <Camera className="w-5 h-5 text-cyan-400" />
                            Full-Spectrum AR Overlay
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-[10px] font-mono text-cyan-400/70 uppercase font-bold tracking-widest">Neural Logic Stream Online</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Hardware Signature</span>
                        <span className="text-xs font-mono text-white/80 font-bold tracking-widest">SOIC8-DEW-2026</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                        <Maximize className="w-4 h-4 text-white/40" />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col xl:flex-row gap-6 lg:min-h-[600px] relative z-20">
                {/* Left: Main Optical Feed Area */}
                <div className="flex-[1.5] flex flex-col gap-4 min-h-[400px]">
                    <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#050508] group">
                        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-none">
                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                            <span className="text-[10px] font-mono text-white/50 uppercase font-black tracking-widest">OPTICAL_FEED_01</span>
                        </div>
                        <PCBViewer
                            onSelectComponent={() => { }}
                            selectedId={null}
                            stressLevel={stressLevel}
                            arMode={true}
                            faultedComponents={new Set()}
                            heatMapMode={false}
                            signalFlowActive={signalFlow}
                            powerOn={powerOn}
                            activeAnalysis={null}
                            logicProbeActive={logicProbe}
                            goldenDiffActive={goldenDiff}
                            showOnlyBackground={true}
                        />
                    </div>
                </div>

                {/* Right: Technical Intelligence Stack */}
                <div className="flex-1 flex flex-col gap-6 w-full xl:w-[450px]">
                    {/* 3D Spatial Reconstruction Box */}
                    <div className="h-[320px] relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 shadow-xl group">
                        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-none">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400 opacity-50" />
                            <span className="text-[10px] font-mono text-white/40 uppercase font-black tracking-widest">SPATIAL_XRAY_VIEW</span>
                        </div>
                        <div className="absolute top-4 right-4 z-30 pointer-events-none">
                            <div className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                                <span className="text-[9px] font-mono text-cyan-400 font-bold tracking-tighter uppercase">AR v4.20_READY</span>
                            </div>
                        </div>
                        <PCBViewer
                            onSelectComponent={() => { }}
                            selectedId={null}
                            stressLevel={stressLevel}
                            arMode={true}
                            faultedComponents={new Set()}
                            heatMapMode={false}
                            signalFlowActive={signalFlow}
                            powerOn={powerOn}
                            activeAnalysis={null}
                            logicProbeActive={logicProbe}
                            goldenDiffActive={goldenDiff}
                            showOnlyModel={true}
                        />
                        {/* Overlay decoration */}
                        <div className="absolute inset-0 border border-cyan-500/5 pointer-events-none group-hover:border-cyan-500/20 transition-colors duration-500" />
                    </div>

                    {/* Simulation Config & Intel */}
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                        <div className="glass-panel p-6 flex flex-col gap-5 border border-white/10 bg-[#0a0a0c]/60 backdrop-blur-3xl rounded-3xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                                    <h3 className="text-[11px] font-mono text-white/90 uppercase font-black tracking-tighter">Logic Injection Cluster</h3>
                                </div>
                                <Activity className="w-4 h-4 text-cyan-500/40" />
                            </div>

                            <SimulationControls
                                stressLevel={stressLevel}
                                onStressChange={setStressLevel}
                                arMode={true}
                                onArToggle={() => { }}
                                powerOn={powerOn}
                                onPowerToggle={() => setPowerOn(!powerOn)}
                                heatMapMode={false}
                                onHeatMapToggle={() => { }}
                                signalFlowActive={signalFlow}
                                onSignalFlowToggle={() => setSignalFlow(!signalFlow)}
                                logicProbeActive={logicProbe}
                                onLogicProbeToggle={() => { setLogicProbe(!logicProbe); setGoldenDiff(false); }}
                                goldenDiffActive={goldenDiff}
                                onGoldenDiffToggle={() => { setGoldenDiff(!goldenDiff); setLogicProbe(false); }}
                            />
                        </div>

                        {/* Diagnostics Log */}
                        <div className="flex-1 glass-panel p-6 overflow-y-auto border border-white/10 bg-[#0a0a0c]/40 backdrop-blur-2xl rounded-3xl min-h-0">
                            <div className="flex items-center gap-2 mb-5">
                                <Zap className="w-4 h-4 text-cyan-500/50" />
                                <h3 className="text-[10px] font-mono text-white/40 uppercase font-black tracking-widest">Hardware Signal Analytics</h3>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { t: "05:21:48", m: "Mesh reconstruction: SUCCESS" },
                                    { t: "05:21:52", m: "SOIC-8 anchors at P=(0,0,0)" },
                                    { t: "05:21:55", m: "Injecting jumper wire netlist" },
                                    { t: "05:21:58", m: "Thermal signature: CLAMPED" },
                                    { t: "05:22:04", m: "Logic probe: SYNCED" },
                                ].map((log, i) => (
                                    <div key={i} className="flex gap-4 border-l-2 border-cyan-500/10 pl-4 group/log hover:border-cyan-500/40 transition-colors">
                                        <span className="text-[9px] font-mono text-white/20 group-hover/log:text-cyan-400 transition-colors whitespace-nowrap">{log.t}</span>
                                        <span className="text-[10px] font-mono text-white/40 group-hover/log:text-white/80 transition-colors leading-relaxed tracking-tighter">{log.m}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Voice Assistant Integration */}
            <div className="relative z-20 mt-4">
                <VoiceAssistant
                    continuousGuide={[
                        "Welcome to the AR Vision Model.",
                        "Here is a step by step guide to connect your ESP32 with a temperature sensor.",
                        "Step 1: Locate the 3.3V pin on the ESP32 and connect it to the VCC wire of the temperature sensor.",
                        "Step 2: Connect the Ground pin on the ESP32 to the GND wire of the sensor.",
                        "Step 3: Route the data wire from the sensor to GPIO PIN 4 on the ESP32.",
                        "Step 4: Verify all connections are secure. I am now continuously monitoring the impedance on GPIO 4."
                    ]}
                />
            </div>
        </div>
    );
}
