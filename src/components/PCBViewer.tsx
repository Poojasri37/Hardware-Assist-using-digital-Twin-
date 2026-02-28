import { useState, useCallback, useEffect, Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, Html, Float, PerspectiveCamera, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

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
}

// --- Realistic 3D Jumper Wire Component ---
const RealisticJumper = ({ start, end, color, powerOn }: any) => {
  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    const dist = startVec.distanceTo(endVec);
    mid.y += dist * 0.6; // Arched height

    // Control points for a smooth curve
    const cp1 = new THREE.Vector3(startVec.x, startVec.y + dist * 0.2, startVec.z);
    const cp2 = new THREE.Vector3(endVec.x, endVec.y + dist * 0.2, endVec.z);

    return new THREE.CatmullRomCurve3([startVec, cp1, mid, cp2, endVec]);
  }, [start, end]);

  const tubeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (tubeRef.current && powerOn) {
      const time = state.clock.getElapsedTime();
      (tubeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.5;
    }
  });

  return (
    <mesh ref={tubeRef}>
      <tubeGeometry args={[curve, 40, 0.05, 8, false]} />
      <meshStandardMaterial
        color={powerOn ? color : "#333333"}
        emissive={powerOn ? color : "#000000"}
        emissiveIntensity={0.5}
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  );
};

const Model3D = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <primitive object={scene} scale={[5, 5, 5]} position={[0, 0, 0]} />
    </Float>
  );
};

export default function PCBViewer({
  onSelectComponent, selectedId, stressLevel, arMode,
  faultedComponents, heatMapMode, signalFlowActive, powerOn, activeAnalysis
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [electronOffset, setElectronOffset] = useState(0);

  const [bgImage, setBgImage] = useState<string | null>(null);
  // Default to the newly uploaded model
  const [glbUrl, setGlbUrl] = useState<string | null>("/models/pcb_model.glb");

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

  if (arMode) {
    return (
      <div className="w-full h-full relative overflow-hidden rounded-lg bg-[#0a0a0c] flex flex-col items-center justify-center">
        {/* AR UI Headers */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${powerOn ? "bg-cyan-400 animate-pulse" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"}`} />
            <h1 className="text-xs font-mono font-bold text-white tracking-tighter uppercase">AR Diagnostic Vision 2.0</h1>
          </div>
          <p className="text-[9px] font-mono text-white/40 uppercase">Spatial Overlay Enabled</p>
        </div>

        {/* Action Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <label className="group relative flex flex-col items-center">
            <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-400/30 px-3 py-1.5 rounded cursor-pointer hover:bg-cyan-400 hover:text-black transition-all shadow-lg backdrop-blur-md">
              RESCAN PHOTO
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setBgImage(URL.createObjectURL(e.target.files[0]));
              }
            }} />
          </label>
        </div>

        <div
          className="w-full h-full relative transition-all duration-700"
          style={{
            backgroundImage: bgImage ? `url(${bgImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: bgImage ? 'brightness(0.6) contrast(1.1)' : 'none'
          }}
        >
          {!bgImage && (
            <div className="absolute inset-0 flex items-center justify-center cursor-pointer group" onClick={() => document.getElementById('photo-upload')?.click()}>
              <input type="file" id="photo-upload" accept="image/*" className="hidden" onChange={(e) => {
                if (e.target.files && e.target.files[0]) setBgImage(URL.createObjectURL(e.target.files[0]));
              }} />
              <div className="text-center font-mono p-8 rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/5 backdrop-blur group-hover:bg-cyan-500/10 transition-all">
                <p className="text-cyan-400 text-lg mb-2 tracking-widest font-black">UPLOAD HARDWARE PHOTO</p>
                <p className="text-white/40 text-[10px]">TO GENERATE 3D PERSPECTIVE OVERLAY</p>
              </div>
            </div>
          )}

          {glbUrl && (
            <Canvas shadows className="absolute inset-0 z-10" gl={{ antialias: true, alpha: true }}>
              <PerspectiveCamera makeDefault position={[5, 4, 8]} fov={40} />
              <Suspense fallback={<Html center><div className="text-cyan-400 font-mono text-xs animate-pulse">PROCESSING POLYGONS...</div></Html>}>
                <Environment preset="night" />
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#00ffff" castShadow />
                <spotLight position={[-5, 8, 5]} angle={0.25} penumbra={1} intensity={2} color="#ffffff" castShadow />

                <group position={[0, -0.5, 0]}>
                  <Model3D url={glbUrl} />

                  {/* Strategic Jumper Connections generated between components */}
                  <RealisticJumper start={[-1.2, 0.4, 0.5]} end={[1.5, 0.4, -0.8]} color="#ff1100" powerOn={powerOn} />
                  <RealisticJumper start={[2, 0.4, 1]} end={[-2.5, 0.4, -1.5]} color="#00ff88" powerOn={powerOn} />
                  <RealisticJumper start={[-0.5, 0.4, 2]} end={[0.8, 0.4, 1.2]} color="#00ccff" powerOn={powerOn} />
                  <RealisticJumper start={[1.5, 0.4, 1.5]} end={[1.8, 0.4, -2]} color="#ffbb00" powerOn={powerOn} />
                </group>

                <ContactShadows opacity={0.6} scale={10} blur={24} far={10} resolution={256} color="#000000" />
                <OrbitControls makeDefault enablePan enableZoom minDistance={4} maxDistance={20} autoRotate autoRotateSpeed={0.5} />
              </Suspense>
            </Canvas>
          )}

          {/* AR HUD ELEMENTS */}
          {bgImage && (
            <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 font-mono">
              <div className="bg-black/50 backdrop-blur border border-white/10 p-3 rounded-lg shadow-2xl">
                <p className="text-[10px] text-white/40 mb-1">REAL-TIME TELEMETRY OVERLAY</p>
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-cyan-400">V_IN</span>
                    <span className="text-xs text-white">5.02V</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-green-400">I_LOAD</span>
                    <span className="text-xs text-white">1.24A</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-orange-400">TEMP</span>
                    <span className="text-xs text-white">47.2°C</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STANDARD SVG VIEW ---
  return (
    <div
      className="w-full h-full relative overflow-hidden rounded-lg bg-background/50"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Status indicator */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${powerOn ? "bg-success animate-pulse" : "bg-destructive"}`} />
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          {powerOn ? "POWERED" : "OFF"}
        </span>
        {activeAnalysis && (
          <span className="text-[10px] font-mono text-primary uppercase ml-2 px-2 py-0.5 bg-primary/10 rounded border border-primary/20">
            {activeAnalysis}
          </span>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="w-7 h-7 glass-panel flex items-center justify-center text-muted-foreground hover:text-primary text-sm font-mono">+</button>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="w-7 h-7 glass-panel flex items-center justify-center text-muted-foreground hover:text-primary text-sm font-mono">−</button>
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 540 360"
        className={`${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={"hsl(222, 30%, 15%)"} strokeWidth="0.5" opacity={0.5} />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="540" height="360" fill="url(#grid)" />

        {/* Board outline */}
        <rect x="20" y="30" width="500" height="300" rx="8" fill="none"
          stroke={powerOn ? "hsl(187, 94%, 53%)" : "hsl(222, 30%, 20%)"}
          strokeWidth={1} opacity={powerOn ? 0.3 : 0.15}
        />

        {/* Traces */}
        {traces.map((trace, i) => (
          <g key={i}>
            <path d={trace.d} fill="none"
              stroke={getTraceColor(trace)}
              strokeWidth={1}
              opacity={powerOn ? 0.35 : 0.1}
            />
            {signalFlowActive && powerOn && !faultedComponents.has(trace.from) && !faultedComponents.has(trace.to) && (
              <path d={trace.d} fill="none"
                stroke="hsl(187, 94%, 70%)"
                strokeWidth={2}
                strokeDasharray="3 17"
                strokeDashoffset={-electronOffset}
                opacity={0.8}
                filter="url(#glow)"
              />
            )}
          </g>
        ))}

        {/* Components */}
        {pcbComponents.map((comp) => {
          const isSelected = selectedId === comp.id;
          const isFaulted = faultedComponents.has(comp.id);
          const color = getComponentColor(comp);
          const isAnalysisHighlighted = isHighlightedByAnalysis(comp.id);

          return (
            <g
              key={comp.id}
              onClick={(e) => { e.stopPropagation(); onSelectComponent(isSelected ? null : comp); }}
              className="cursor-pointer"
            >
              {isAnalysisHighlighted && powerOn && (
                <rect x={comp.x - 4} y={comp.y - 4} width={comp.width + 8} height={comp.height + 8} rx={6} fill="none" stroke="hsl(187, 94%, 53%)" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} filter="url(#glow)">
                  <animate attributeName="stroke-dashoffset" values="0;8" dur="1s" repeatCount="indefinite" />
                </rect>
              )}
              <rect
                x={comp.x} y={comp.y}
                width={comp.width} height={comp.height}
                rx={comp.type === "ic" ? 4 : 2}
                fill={`${color}20`}
                stroke={color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                opacity={powerOn ? 0.8 : 0.3}
              />
              <text x={comp.x + comp.width / 2} y={comp.y + comp.height / 2 + 4} textAnchor="middle" fontSize="9" fill={isFaulted ? "hsl(0, 90%, 70%)" : "hsl(210, 40%, 92%)"} fontFamily="JetBrains Mono" fontWeight="600" opacity={powerOn ? 1 : 0.4}>
                {comp.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export { pcbComponents };
export type { PCBComponent };
