import { Mic, Camera, Settings, Cpu } from "lucide-react";
import VoiceAssistant from "@/components/VoiceAssistant";
import { ESP32System3D } from "@/components/ESP32System3D";

export default function VoiceAssistantARTab() {
    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-primary uppercase tracking-widest text-glow-cyan flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Augmented Reality Overlay
                </h2>
                <div className="flex gap-2 text-xs font-mono">
                    <button className="bg-secondary hover:bg-secondary/70 text-secondary-foreground px-3 py-1.5 rounded transition-colors flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5" /> AR Settings
                    </button>
                </div>
            </div>

            <div className="flex-1 glass-panel relative overflow-hidden flex flex-col p-4">
                {/* AR Camera Mock Overlay with Interactive 3D Assembly */}
                <div className="flex-1 border border-primary/30 rounded-lg relative overflow-hidden bg-background">
                    {/* Background grid scanning effect */}
                    <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-20 animate-scan pointer-events-none" />

                    {/* High-Fidelity Photorealistic Render Overlay */}
                    <div className="absolute inset-0 bg-black flex items-center justify-center p-8">
                        <img
                            src="/esp32_ar_render.png"
                            alt="3D ESP32 Photorealistic Render"
                            className="w-full h-full object-contain filter contrast-125 brightness-110 shadow-[0_0_50px_rgba(0,255,255,0.1)] relative z-10"
                        />
                    </div>

                    <div className="absolute inset-4 border border-dashed border-primary/50 rounded flex flex-col items-center justify-center relative">
                        <div className="absolute top-1/2 left-[15%] -translate-y-1/2 bg-background/80 border border-primary p-3 rounded backdrop-blur-md shadow-lg shadow-primary/20 animate-fade-in text-[10px] font-mono">
                            <div className="text-primary font-bold mb-1 flex items-center gap-1"><Cpu className="w-3 h-3" /> Target Acquired</div>
                            <div className="text-foreground">MCU: ESP32-S3-Pico Dew Module</div>
                            <div className="text-muted-foreground mt-1 text-[8px] uppercase">Awaiting DS18B20 Temp Sensor Connection</div>
                        </div>

                        <div className="absolute top-[30%] right-[20%] bg-background/80 border border-warning p-3 rounded backdrop-blur-md shadow-lg shadow-warning/20 animate-fade-in text-[10px] font-mono">
                            <div className="text-warning font-bold mb-1 flex items-center gap-1">⚠ Action Required</div>
                            <div className="text-foreground">Connect GPIO 4</div>
                            <div className="text-warning mt-1 text-[8px] uppercase">Route data pin from Temperature Sensor</div>
                        </div>

                        <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-mono text-primary bg-background/60 px-3 py-1.5 rounded animate-pulse">
                            <span>FOV: 42°</span>
                            <span>DEP: 1.2m</span>
                            <span>REC: Active</span>
                        </div>
                    </div>
                </div>

                {/* Integrated Voice Assistant */}
                <div className="h-32 mt-4 bg-background/50 border border-border/40 rounded flex flex-col overflow-hidden relative">
                    <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px]" />
                    <div className="relative z-10 w-full h-full p-2">
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
            </div>
        </div>
    );
}
