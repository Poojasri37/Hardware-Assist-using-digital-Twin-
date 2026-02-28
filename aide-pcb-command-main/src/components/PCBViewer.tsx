import React, { useState, useCallback, useEffect, Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, Html, Float, PerspectiveCamera, ContactShadows, useProgress, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { Camera, Upload, Zap, Activity, Maximize2, ShieldCheck, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface PCBComponent {
  id: string;
  label: string;
  type: "resistor" | "capacitor" | "ic" | "connector" | "inductor";
  x: number;
  y: number;
  width: number;
  height: number;
  specs: { param: string; nominal: string; live: string }[];
  threshold: number;
}

const pcbComponents: PCBComponent[] = [
  { id: "U1", label: "U1 - MCU", type: "ic", x: 200, y: 140, width: 80, height: 60, threshold: 0.3, specs: [{ param: "Vcc", nominal: "3.3V", live: "3.31V" }, { param: "Temp", nominal: "45°C", live: "47°C" }, { param: "Clock", nominal: "168MHz", live: "168MHz" }] },
  { id: "U2", label: "U2 - ADC", type: "ic", x: 360, y: 100, width: 60, height: 50, threshold: 0.5, specs: [{ param: "Vref", nominal: "2.5V", live: "2.48V" }, { param: "Resolution", nominal: "16-bit", live: "16-bit" }] },
  { id: "R1", label: "R1 - 10kΩ", type: "resistor", x: 120, y: 100, width: 50, height: 20, threshold: 0.2, specs: [{ param: "Resistance", nominal: "10kΩ", live: "9.97kΩ" }, { param: "Power", nominal: "0.25W", live: "0.12W" }] },
  { id: "R2", label: "R2 - 4.7kΩ", type: "resistor", x: 120, y: 220, width: 50, height: 20, threshold: 0.7, specs: [{ param: "Resistance", nominal: "4.7kΩ", live: "4.82kΩ" }, { param: "Power", nominal: "0.25W", live: "0.21W" }] },
  { id: "C1", label: "C1 - 100nF", type: "capacitor", x: 310, y: 200, width: 30, height: 40, threshold: 0.15, specs: [{ param: "Capacitance", nominal: "100nF", live: "98nF" }, { param: "ESR", nominal: "0.5Ω", live: "0.48Ω" }] },
  { id: "C5", label: "C5 - 10µF", type: "capacitor", x: 440, y: 180, width: 35, height: 45, threshold: 0.4, specs: [{ param: "Capacitance", nominal: "10µF", live: "9.8µF" }, { param: "Voltage", nominal: "16V", live: "5.1V" }] },
  { id: "L1", label: "L1 - 10µH", type: "inductor", x: 160, y: 280, width: 45, height: 25, threshold: 0.6, specs: [{ param: "Inductance", nominal: "10µH", live: "9.9µH" }, { param: "DCR", nominal: "0.1Ω", live: "0.11Ω" }] },
  { id: "J1", label: "J1 - USB-C", type: "connector", x: 40, y: 170, width: 30, height: 50, threshold: 0.1, specs: [{ param: "Vbus", nominal: "5V", live: "5.02V" }, { param: "Current", nominal: "3A", live: "1.2A" }] },
];

const traces = [
  { d: "M 70 195 L 120 195 L 120 110 L 120 110", from: "J1", to: "R1" },
  { d: "M 170 110 L 200 110 L 200 140", from: "R1", to: "U1" },
  { d: "M 280 170 L 310 200", from: "U1", to: "C1" },
  { d: "M 170 230 L 200 200 L 200 200", from: "R2", to: "U1" },
  { d: "M 240 200 L 310 220", from: "U1", to: "C1" },
  { d: "M 340 220 L 440 200", from: "C1", to: "C5" },
  { d: "M 420 125 L 440 180", from: "U2", to: "C5" },
  { d: "M 280 170 L 360 125", from: "U1", to: "U2" },
  { d: "M 160 290 L 200 290 L 200 200", from: "L1", to: "U1" },
  { d: "M 205 290 L 310 220", from: "L1", to: "C1" },
];

const powerRails = {
  "3.3V": ["U1", "R1", "R2"],
  "5V": ["J1", "C5"],
  "2.5V": ["U2", "C1"],
};

interface Props {
  onSelectComponent: (comp: PCBComponent | null) => void;
  selectedId: string | null;
  stressLevel: number;
  arMode: boolean;
  faultedComponents: Set<string>;
  heatMapMode: boolean;
  signalFlowActive: boolean;
  powerOn: boolean;
  activeAnalysis: string | null;
  logicProbeActive?: boolean;
  goldenDiffActive?: boolean;
  showOnlyBackground?: boolean;
  showOnlyModel?: boolean;
}

// Custom hook for model progress
function Loader() {
  return (
    <Html center>
      <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse p-4 bg-black/80 rounded-xl backdrop-blur-md">
        Spatial Recon: In Progress...
      </div>
    </Html>
  );
}

// Simple Error Boundary Component
class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error("3D Render Error caught:", error, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Realistic Neon Jumper with glowing particles
const NeoJumper = ({ start, end, color, powerOn }: any) => {
  const curve = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dist = s.distanceTo(e);
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    mid.y += dist * 0.7;

    return new THREE.CatmullRomCurve3([
      s,
      new THREE.Vector3(s.x, s.y + 0.5, s.z),
      mid,
      new THREE.Vector3(e.x, e.y + 0.5, e.z),
      e
    ]);
  }, [start, end]);

  const tubeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (powerOn && tubeRef.current) {
      const t = state.clock.getElapsedTime();
      (tubeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + Math.sin(t * 4) * 0.5;
    }
  });

  return (
    <mesh ref={tubeRef}>
      <tubeGeometry args={[curve, 64, 0.04, 12, false]} />
      <meshStandardMaterial
        color={powerOn ? color : "#222"}
        emissive={powerOn ? color : "#000"}
        emissiveIntensity={2}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};

// Since hooks can't be in try-catch, we use a separate component
const SafeModel = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={[8, 8, 8]} position={[0, -2, 0]} />;
};

const GenericChip = () => (
  <group position={[0, -1.8, 0]}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[5, 0.8, 4]} />
      <meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} />
    </mesh>
    {[-2.2, -1.1, 0, 1.1, 2.2].map((x) => (
      <group key={x}>
        <mesh position={[x, -0.4, 2.2]} castShadow>
          <boxGeometry args={[0.3, 0.1, 0.8]} />
          <meshStandardMaterial color="#aaa" metalness={1} roughness={0} />
        </mesh>
        <mesh position={[x, -0.4, -2.2]} castShadow>
          <boxGeometry args={[0.3, 0.1, 0.8]} />
          <meshStandardMaterial color="#aaa" metalness={1} roughness={0} />
        </mesh>
      </group>
    ))}
  </group>
);

const HardwareModel = ({ url }: { url: string }) => {
  return (
    <Suspense fallback={<Loader />}>
      <ErrorBoundary fallback={<GenericChip />}>
        <SafeModel url={url} />
      </ErrorBoundary>
    </Suspense>
  );
};

export default function PCBViewer({
  onSelectComponent, selectedId, stressLevel, arMode,
  faultedComponents, heatMapMode, signalFlowActive, powerOn, activeAnalysis,
  logicProbeActive, goldenDiffActive, showOnlyBackground, showOnlyModel
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [electronOffset, setElectronOffset] = useState(0);

  const [bgImage, setBgImage] = useState<string | null>(null);
  // Default to public root pcb_model.glb
  const [modelUrl, setModelUrl] = useState<string>("/pcb_model.glb");

  const [scanPos, setScanPos] = useState(0);
  useEffect(() => {
    if (arMode) {
      const id = setInterval(() => setScanPos(p => (p + 1) % 100), 50);
      return () => clearInterval(id);
    }
  }, [arMode]);

  useEffect(() => {
    if (!signalFlowActive || !powerOn) return;
    const interval = setInterval(() => {
      setElectronOffset((prev) => (prev + 2) % 20);
    }, 50);
    return () => clearInterval(interval);
  }, [signalFlowActive, powerOn]);

  const getComponentColor = useCallback((comp: PCBComponent) => {
    if (!powerOn) return "hsl(222, 30%, 25%)";
    if (faultedComponents.has(comp.id)) return "hsl(0, 90%, 50%)";
    if (heatMapMode) {
      const heat = Math.min(comp.threshold + stressLevel * 0.5, 1);
      if (heat < 0.3) return "hsl(220, 70%, 50%)";
      if (heat < 0.5) return "hsl(142, 76%, 45%)";
      if (heat < 0.7) return "hsl(38, 92%, 50%)";
      return "hsl(0, 72%, 51%)";
    }
    const stress = Math.min(comp.threshold + stressLevel * 0.5, 1);
    if (stress < 0.3) return "hsl(142, 76%, 45%)";
    if (stress < 0.6) return "hsl(38, 92%, 50%)";
    return "hsl(0, 72%, 51%)";
  }, [stressLevel, faultedComponents, heatMapMode, powerOn]);

  const isHighlightedByAnalysis = useCallback((compId: string) => {
    if (!activeAnalysis) return false;
    if (activeAnalysis === "Power Rail Analysis") return Object.values(powerRails).some(ids => ids.includes(compId));
    if (activeAnalysis === "Signal Integrity") return ["U1", "U2", "R1", "R2"].includes(compId);
    if (activeAnalysis === "Thermal Map") return true;
    if (activeAnalysis === "Clock Domain") return ["U1", "U2"].includes(compId);
    return false;
  }, [activeAnalysis]);

  const getTraceColor = useCallback((trace: typeof traces[0]) => {
    if (!powerOn) return "hsl(222, 30%, 15%)";
    if (faultedComponents.has(trace.from) || faultedComponents.has(trace.to)) return "hsl(0, 72%, 40%)";
    if (activeAnalysis === "Power Rail Analysis") return "hsl(38, 92%, 50%)";
    if (activeAnalysis === "Signal Integrity") return "hsl(187, 94%, 53%)";
    return "hsl(187, 94%, 53%)";
  }, [powerOn, faultedComponents, activeAnalysis]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(3, z - e.deltaY * 0.001)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setDragging(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setBgImage(url);
    }
  };

  if (arMode) {
    return (
      <div className="w-full h-full relative overflow-hidden rounded-xl bg-[#020204] flex flex-col items-center justify-center p-0 group">
        {/* Optical Background / Background UI */}
        {!showOnlyModel && (
          <>
            {bgImage ? (
              <div className="absolute inset-0 z-0">
                <img src={bgImage} className="w-full h-full object-cover opacity-60 brightness-75 contrast-125 saturate-50" alt="Hardware View" />
                <div className="absolute w-full h-[2px] bg-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.8)] z-10" style={{ top: `${scanPos}%` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 z-5" />
              </div>
            ) : (
              <div className="absolute inset-0 z-0 flex items-center justify-center p-8 bg-[#050508]">
                <div className="relative group/upload cursor-pointer max-w-sm w-full" onClick={() => (document.getElementById('ar-photo-in') as HTMLInputElement)?.click()}>
                  <input type="file" id="ar-photo-in" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-3xl blur opacity-20 group-hover/upload:opacity-40 transition" />
                  <div className="relative border border-white/5 bg-white/[0.02] rounded-3xl p-8 flex flex-col items-center gap-4 text-center backdrop-blur-3xl transition-all group-hover/upload:border-cyan-500/30">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/5 flex items-center justify-center border border-cyan-500/10">
                      <Upload className="w-6 h-6 text-cyan-500/50" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white/50 mb-1">Optical Source Required</h3>
                      <p className="text-[10px] text-white/20 font-mono">Upload hardware image for spatial mapping</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 3D Hardware Injection Layer */}
        {!showOnlyBackground && (
          <div className={cn(
            "absolute inset-0 z-10",
            !showOnlyModel && "pointer-events-none" // If background is shown, 3D is a transparent overlay
          )}>
            <Canvas shadows dpr={[1, 2]}>
              <PerspectiveCamera makeDefault position={[0, 8, 12]} fov={35} />
              <Suspense fallback={<Loader />}>
                <Environment preset="night" />
                <ambientLight intensity={0.2} />
                <spotLight position={[5, 10, 5]} angle={0.25} penumbra={1} intensity={2} color="#00ccff" castShadow />
                <pointLight position={[-5, 5, -5]} intensity={1} color="#ff0088" />
                <group>
                  <HardwareModel url={modelUrl} />
                  {powerOn && (
                    <group>
                      <NeoJumper start={[-2.5, 0.5, 1.2]} end={[1.8, 0.5, -0.5]} color="#00ffcc" powerOn={powerOn} />
                      <NeoJumper start={[2.2, 0.5, 2]} end={[-3, 0.5, -2.5]} color="#ff0066" powerOn={powerOn} />
                      <NeoJumper start={[-0.8, 0.5, 3]} end={[1.5, 0.5, 2.5]} color="#ffaa00" powerOn={powerOn} />
                    </group>
                  )}
                </group>
                <ContactShadows opacity={0.4} scale={15} blur={2.5} far={10} resolution={256} color="#000000" />
                <OrbitControls makeDefault minDistance={5} maxDistance={25} enablePan={showOnlyModel} enableZoom={showOnlyModel} />
              </Suspense>
            </Canvas>
          </div>
        )}

        {/* HUD Elements - Only show in combined view or background view */}
        {!showOnlyModel && (
          <div className="absolute inset-x-0 top-0 z-30 p-6 pointer-events-none flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h2 className="text-[10px] font-black font-mono text-white/50 uppercase tracking-widest">
                  Live Feed <span className="text-cyan-500/50">Channel_01</span>
                </h2>
              </div>
            </div>

            <div className="flex gap-2 pointer-events-auto">
              <label className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer transition-all backdrop-blur-xl group/btn">
                <Upload className="w-3 h-3 text-cyan-400 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[9px] font-mono text-white/50 uppercase">Update Feed</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden rounded-lg bg-background/50" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${powerOn ? "bg-success animate-pulse" : "bg-destructive"}`} />
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{powerOn ? "POWERED" : "OFF"}</span>
      </div>
      <svg width="100%" height="100%" viewBox="0 0 540 360" className={`${dragging ? "cursor-grabbing" : "cursor-grab"}`} style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}>
        <defs>
          <pattern id="grid-3d" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke={"hsl(222, 30%, 15%)"} strokeWidth="0.5" opacity={0.5} /></pattern>
          <filter id="glow-svg">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="540" height="360" fill="url(#grid-3d)" />

        {/* Traces */}
        {traces.map((trace, i) => (
          <path
            key={`trace-${i}`}
            d={trace.d}
            fill="none"
            stroke={getTraceColor(trace)}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={powerOn ? 0.6 : 0.1}
            className="transition-colors duration-500"
          />
        ))}

        {/* Electrons Animation */}
        {signalFlowActive && powerOn && traces.map((trace, i) => (
          <circle key={`electron-${i}`} r="2" fill={getTraceColor(trace)} filter="url(#glow-svg)">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={trace.d}
              begin={`${i * 0.2}s`}
            />
          </circle>
        ))}

        {/* Components */}
        {pcbComponents.map((comp) => {
          const color = getComponentColor(comp);
          const isHighlighted = isHighlightedByAnalysis(comp.id);

          return (
            <g
              key={comp.id}
              onClick={(e) => { e.stopPropagation(); onSelectComponent(selectedId === comp.id ? null : comp); }}
              className="cursor-pointer group"
            >
              {/* Thermal Glow in HeatMap Mode */}
              {heatMapMode && powerOn && (
                <rect
                  x={comp.x - 4}
                  y={comp.y - 4}
                  width={comp.width + 8}
                  height={comp.height + 8}
                  rx={6}
                  fill={color}
                  opacity={0.15}
                  className="animate-pulse"
                />
              )}

              <rect
                x={comp.x}
                y={comp.y}
                width={comp.width}
                height={comp.height}
                rx={4}
                fill={`${color}20`}
                stroke={color}
                strokeWidth={selectedId === comp.id || isHighlighted ? 2.5 : 1.5}
                opacity={powerOn ? 0.8 : 0.3}
                className={cn(
                  "transition-all duration-300",
                  isHighlighted && "stroke-[3px]"
                )}
                style={isHighlighted ? { filter: `drop-shadow(0 0 8px ${color})` } : {}}
              />

              <text
                x={comp.x + comp.width / 2}
                y={comp.y + comp.height / 2 + 4}
                textAnchor="middle"
                fontSize="9"
                fill="white"
                fontFamily="JetBrains Mono"
                fontWeight="600"
                className="pointer-events-none opacity-80"
              >
                {comp.id}
              </text>

              {/* Logic Probe Overlay */}
              {logicProbeActive && powerOn && comp.type === "ic" && (
                <g transform={`translate(${comp.x + comp.width + 5}, ${comp.y})`}>
                  <rect width="24" height="12" rx="2" fill="#8b5cf6" opacity="0.9" />
                  <text x="12" y="9" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">
                    {Math.random() > 0.5 ? "HI" : "LO"}
                  </text>
                  <circle cx="-2" cy="6" r="1.5" fill="#a78bfa" className="animate-ping" />
                </g>
              )}

              {/* Golden Diff Overlay */}
              {goldenDiffActive && powerOn && (
                <g transform={`translate(${comp.x}, ${comp.y - 12})`}>
                  <rect width="40" height="10" rx="2" fill="#10b981" opacity="0.9" />
                  <text x="20" y="8" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">
                    Δ +0.{Math.floor(Math.random() * 9)}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export { pcbComponents };
export type { PCBComponent };
