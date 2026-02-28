import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useAnimation, animate } from "framer-motion";
import { Cpu, Wifi, Activity, Droplet, Thermometer, Radio } from "lucide-react";

export function ESP32System3D() {
    const containerRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const [isInteracting, setIsInteracting] = useState(false);

    // Auto-rotate the whole assembly when not dragged
    useEffect(() => {
        if (isInteracting) return;
        const controls = animate(x, x.get() + 360, {
            duration: 30,
            repeat: Infinity,
            ease: "linear",
        });
        return () => controls.stop();
    }, [x, isInteracting]);

    // Create rotation transforms with a wider range to allow multiple spins
    // wrap values dynamically or simply map large ranges
    const rotateX = useTransform(y, [-1000, 1000], [180, -180]);
    const rotateY = useTransform(x, [-1000, 1000], [-180, 180]);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsInteracting(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsInteracting(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isInteracting) return;
        x.set(x.get() + e.movementX * 1.5);
        y.set(y.get() + e.movementY * 1.5);
    };

    return (
        <div
            className="absolute inset-0 flex items-center justify-center perspective-[800px] cursor-grab active:cursor-grabbing z-10"
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            style={{ touchAction: "none" }}
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="w-48 h-72 relative"
            >
                {/* Main ESP32-S3-Pico Dev Board (Dew Module Form Factor) */}
                <Board depth={4} className="bg-[#1c0f24] border-[#442c54] shadow-[0_0_30px_rgba(28,15,36,0.8)]">
                    <div className="absolute inset-1 border border-purple-500/20 rounded-sm pointer-events-none" />

                    {/* ESP32-S3-Pico Integrated Chip / Shield */}
                    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-16 h-16 bg-[#27272a] rounded shadow-lg flex flex-col items-center justify-center transform translate-z-2 border border-[#3f3f46]">
                        <Cpu className="w-6 h-6 text-zinc-400 mb-1" />
                        <span className="text-[5px] font-mono text-zinc-500 font-bold">ESP32-S3-PICO</span>
                    </div>

                    {/* Integrated Antenna section at top */}
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[80%] h-4 overflow-hidden flex justify-between opacity-80">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-1 h-full bg-[#fcd34d] origin-bottom skew-x-[30deg]" />
                        ))}
                    </div>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-4 bg-zinc-900 rounded-sm" /> {/* Type-C Port */}

                    <div className="absolute top-[40%] left-[80%] w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]" /> {/* Status LED */}

                    {/* Left Castellated Pins / Headers */}
                    <div className="absolute left-0 top-10 bottom-6 w-3 flex flex-col justify-between py-1 border-r border-black/40">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={`l-${i}`} className="w-full h-1.5 bg-yellow-500/90 shadow-sm rounded-r-full" />
                        ))}
                    </div>

                    {/* Right Castellated Pins / Headers */}
                    <div className="absolute right-0 top-10 bottom-6 w-3 flex flex-col justify-between py-1 items-end border-l border-black/40">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={`r-${i}`} className="w-full h-1.5 bg-yellow-500/90 shadow-sm rounded-l-full" />
                        ))}
                    </div>

                    <span className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-purple-300 font-bold whitespace-nowrap">S3-PICO DEW</span>
                </Board>

                {/* GSM Module (SIM800L) */}
                <motion.div
                    className="absolute -right-32 top-8 w-16 h-20"
                    style={{ transformStyle: "preserve-3d", translateZ: 25, rotateY: -15 }}
                >
                    <Board depth={4} className="bg-[#b91c1c] border-[#7f1d1d] shadow-[0_0_20px_rgba(185,28,28,0.4)]">
                        <Radio className="absolute top-2 left-1/2 -translate-x-1/2 w-5 h-5 text-zinc-300" />
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-8 bg-zinc-300 rounded-sm flex items-center justify-center">
                            <span className="text-[6px] font-mono text-zinc-800 font-bold">SIM800L</span>
                        </div>
                        <div className="absolute bottom-1 left-2 w-2 h-2 bg-green-400 rounded-full animate-[ping_2s_infinite]" />
                        {/* Antenna sticking out */}
                        <div className="absolute -top-12 right-2 w-1 h-12 bg-zinc-600 rounded-t-full origin-bottom rotate-12" />
                    </Board>

                    {/* Virtual Wires */}
                    <Wire color="border-red-500" style={{ top: 20 }} />
                    <Wire color="border-black" style={{ top: 30 }} />
                    <Wire color="border-green-500" style={{ top: 40 }} />
                    <Wire color="border-yellow-500" style={{ top: 50 }} />
                </motion.div>

                {/* pH Sensor Interface Board */}
                <motion.div
                    className="absolute -left-28 bottom-24 w-16 h-20"
                    style={{ transformStyle: "preserve-3d", translateZ: -15, rotateY: 15 }}
                >
                    <Board depth={4} className="bg-[#312e81] border-[#1e1b4b] shadow-[0_0_20px_rgba(49,46,129,0.5)]">
                        <Droplet className="absolute top-2 left-1/2 -translate-x-1/2 w-5 h-5 text-indigo-300" />
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-12 h-6 bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center rounded">
                            <span className="text-[8px] font-mono text-cyan-400 font-bold">pH: 7.21</span>
                        </div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-zinc-300 rounded border border-zinc-400" /> {/* BNC Connector */}
                    </Board>
                    {/* Probe Wire down */}
                    <div className="absolute -bottom-24 left-1/2 w-1.5 h-24 bg-zinc-800/80 -translate-x-1/2 rounded" />
                    <div className="absolute -bottom-36 left-1/2 w-4 h-12 bg-cyan-700 -translate-x-1/2 rounded-full border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-end justify-center pb-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-300" />
                    </div>

                    <Wire color="border-red-500" style={{ top: 20, right: -40 }} />
                    <Wire color="border-purple-500" style={{ top: 40, right: -40 }} />
                    <Wire color="border-black" style={{ top: 60, right: -40 }} />
                </motion.div>

                {/* Temperature Sensor (DS18B20 style on small breakout) */}
                <motion.div
                    className="absolute -right-16 bottom-10 w-10 h-14"
                    style={{ transformStyle: "preserve-3d", translateZ: 40, rotateX: -20 }}
                >
                    <Board depth={3} className="bg-[#9a3412] border-[#7c2d12] shadow-[0_0_15px_rgba(154,52,18,0.5)]">
                        <Thermometer className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 text-orange-200" />
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-6 h-4 bg-zinc-900 rounded-sm" /> {/* IC */}
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[6px] font-mono text-orange-300 font-bold">24.5°C</div>
                    </Board>

                    {/* Guided connection wires for Voice Assistant Tutorial */}
                    <GuidedWire color="bg-red-500" top={10} delay={0} label="VCC (3.3V)" />
                    <GuidedWire color="bg-yellow-500" top={20} delay={0.3} label="DATA (GPIO 4)" pulse />
                    <GuidedWire color="bg-black" top={30} delay={0.6} label="GND" />
                </motion.div>

            </motion.div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-mono text-muted-foreground bg-background/80 px-4 py-2 rounded-full backdrop-blur pointer-events-none">
                Drag to rotate 3D Assembly
            </div>
        </div>
    );
}

// Helper to create a 3D rectangular box representing a PCB board
function Board({ children, className, depth }: { children: React.ReactNode, className?: string, depth: number }) {
    return (
        <div className={`absolute inset-0 preserve-3d`}>
            {/* Front Face */}
            <div
                className={`absolute inset-0 ${className} rounded-sm outline outline-1 outline-black/30 flex items-center justify-center`}
                style={{ transform: `translateZ(${depth}px)` }}
            >
                {children}
            </div>

            {/* Back Face */}
            <div
                className={`absolute inset-0 ${className} rounded-sm outline outline-1 outline-black/30 brightness-50`}
                style={{ transform: `translateZ(-${depth}px) rotateY(180deg)` }}
            >
                <div className="w-full h-full opacity-20 bg-black/50" />
            </div>

            {/* Edges */}
            <div
                className={`absolute top-0 left-0 w-full bg-black/50`}
                style={{ height: `${depth * 2}px`, transform: `rotateX(90deg) translateZ(${depth}px)`, transformOrigin: 'top' }}
            />
            <div
                className={`absolute bottom-0 left-0 w-full bg-black/50`}
                style={{ height: `${depth * 2}px`, transform: `rotateX(-90deg) translateZ(${depth}px)`, transformOrigin: 'bottom' }}
            />
            <div
                className={`absolute top-0 left-0 h-full bg-black/50`}
                style={{ width: `${depth * 2}px`, transform: `rotateY(-90deg) translateZ(${depth}px)`, transformOrigin: 'left' }}
            />
            <div
                className={`absolute top-0 right-0 h-full bg-black/50`}
                style={{ width: `${depth * 2}px`, transform: `rotateY(90deg) translateZ(${depth}px)`, transformOrigin: 'right' }}
            />
        </div>
    )
}

function Wire({ style, color }: { style: React.CSSProperties, color: string }) {
    return (
        <div
            className={`absolute w-12 border-t-2 ${color} opacity-80`}
            style={{ ...style, transformStyle: "preserve-3d", left: -30, zIndex: -1, transform: "rotateZ(10deg) translateZ(0px)" }}
        />
    )
}

function GuidedWire({ color, top, delay, label, pulse }: { color: string, top: number, delay: number, label: string, pulse?: boolean }) {
    return (
        <div
            className="absolute h-[2px] w-24 left-[-90px] origin-right flex items-center justify-start"
            style={{ top, transformStyle: "preserve-3d", transform: "rotateZ(15deg) translateZ(5px)" }}
        >
            <motion.div
                className={`h-full w-full ${color} ${pulse ? 'shadow-[0_0_10px_currentColor]' : ''}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", delay, ease: "easeInOut" }}
                style={{ originX: 1, backgroundColor: color.replace('bg-', '') }} // fallback
            />
            {pulse && (
                <motion.div
                    className="absolute left-[-20px] bg-background/90 text-foreground border border-primary/50 text-[6px] font-mono px-1 py-0.5 rounded shadow-lg whitespace-nowrap"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ transform: "rotateZ(-15deg)" }}
                >
                    Connect to {label}
                </motion.div>
            )}
        </div>
    )
}
