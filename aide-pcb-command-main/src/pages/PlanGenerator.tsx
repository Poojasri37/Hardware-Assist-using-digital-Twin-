import { useState } from "react";
import {
    ClipboardList,
    Sparkles,
    ArrowRight,
    Activity,
    ShieldCheck,
    Clock,
    Layers,
    ChevronRight,
    Zap,
    Download
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanTask {
    id: string;
    title: string;
    details: string;
    duration: string;
    priority: "High" | "Medium" | "Low";
    status: "pending" | "optimizing" | "completed";
}

export default function PlanGenerator() {
    const [generating, setGenerating] = useState(false);
    const [planGenerated, setPlanGenerated] = useState(false);
    const [tasks, setTasks] = useState<PlanTask[]>([]);
    const [selectedStep, setSelectedStep] = useState<string | null>(null);

    const handleGeneratePlan = () => {
        setGenerating(true);
        setPlanGenerated(false);
        setSelectedStep(null);

        // Simulate complex AI planning
        setTimeout(() => {
            setTasks([
                { id: "1", title: "Thermal Optimization Sequence", details: "Calibrating thermal headers to minimize latent heat build-up across MCU cores during peak processing.", duration: "1.2ms", priority: "High", status: "completed" },
                { id: "2", title: "Signal Integrity Recalibration", details: "Adjusting impedance matching on primary data lanes to eliminate crosstalk and reflection interference.", duration: "4.5ms", priority: "High", status: "completed" },
                { id: "3", title: "Power Distribution Load Balancing", details: "Dynamically shifting power rails to prioritize stable V_CORE while suppressing ripple effects.", duration: "2.8ms", priority: "Medium", status: "completed" },
                { id: "4", title: "Neuro-Symbolic Logic Verification", details: "Running formal verification proofs against current circuit state using Gemini reasoning engine.", duration: "12ms", priority: "High", status: "completed" },
                { id: "5", title: "EMI Shielding Test", details: "Scanning for electromagnetic interference hotspots and activating localized filtering algorithms.", duration: "8ms", priority: "Low", status: "completed" },
            ]);
            setGenerating(false);
            setPlanGenerated(true);
        }, 2500);
    };

    const handleExportPlan = () => {
        const planText = tasks.map(t => `Step ${t.id}: ${t.title}\nDetail: ${t.details}\nDuration: ${t.duration}\nPriority: ${t.priority}\n---\n`).join("\n");
        const blob = new Blob([planText], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `StrategicPlan_${new Date().toISOString()}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const goals = [
        "Max Performance Efficiency",
        "Thermal Safety Buffer",
        "Minimal Power Footprint",
        "Ultra-Low Latency Flow"
    ];

    const constraints = [
        "Enforce Redundant Paths",
        "Strict EMI Isolation",
        "High-Speed Priority"
    ];

    return (
        <div className="h-full flex flex-col gap-6 p-2">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-mono font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
                        Strategic Plan Generator
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-purple-400/70 uppercase font-bold tracking-widest">Autonomous Intelligence Unit Active</span>
                    </div>
                </div>

                {planGenerated && (
                    <button
                        onClick={handleExportPlan}
                        className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-4 py-2 rounded-xl transition-all group"
                    >
                        <Download className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-mono text-purple-100 uppercase tracking-widest">Export Strategy</span>
                    </button>
                )}
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                <div className="w-80 flex flex-col gap-6">
                    <div className="glass-panel p-6 flex flex-col gap-6 bg-white/5 border-white/10 rounded-3xl backdrop-blur-3xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-purple-400" />
                            <h3 className="text-[11px] font-mono text-white/50 uppercase font-black tracking-widest">Mission Parameters</h3>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-white/30 uppercase font-bold px-1">Optimization Goal</label>
                                <select className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white/80 focus:outline-none focus:border-purple-500/50 transition-colors">
                                    {goals.map(g => <option key={g}>{g}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-white/30 uppercase font-bold px-1">Resource allocation</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Low", "Auto", "Max"].map((opt) => (
                                        <button key={opt} className={cn(
                                            "py-2 rounded-lg text-[10px] font-mono border transition-all",
                                            opt === "Auto" ? "bg-purple-500/20 border-purple-500/40 text-purple-100" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                        )}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-mono text-white/30 uppercase font-bold px-1">Strategy Constraints</label>
                                {constraints.map((c) => (
                                    <label key={c} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="w-4 h-4 rounded border border-white/20 bg-white/5 flex items-center justify-center group-hover:border-purple-500/50 transition-colors">
                                            <div className="w-2 h-2 rounded-sm bg-purple-500 opacity-0 group-hover:opacity-20 translate-scale-50 group-checked:opacity-100 transition-all" />
                                        </div>
                                        <span className="text-[10px] font-mono text-white/60 group-hover:text-white transition-colors">{c}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGeneratePlan}
                            disabled={generating}
                            className={cn(
                                "mt-4 w-full py-4 rounded-2xl font-mono text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all relative overflow-hidden group",
                                generating
                                    ? "bg-purple-500/20 text-purple-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] active:scale-[0.98]"
                            )}
                        >
                            {generating ? (
                                <>
                                    <Activity className="w-4 h-4 animate-pulse" />
                                    <span>Synthesizing...</span>
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    <span>Generate Plan</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="glass-panel p-6 bg-[#0a0a0c]/40 border-white/5 rounded-3xl flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-mono text-white/40 uppercase font-black">Plan Confidence</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-[98%] bg-emerald-500/50" />
                        </div>
                        <p className="text-[9px] font-mono text-white/20 mt-1">AI verified across 10,000 simulations</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-6">
                    <div className="glass-panel-strong p-8 flex-1 bg-black/40 border-white/10 rounded-[2.5rem] relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />

                        {!planGenerated && !generating && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
                                <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center">
                                    <ClipboardList className="w-10 h-10 text-white/10" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white/30 tracking-tight">Strategy Viewport Idle</h4>
                                    <p className="text-[11px] font-mono text-white/10 mt-2 uppercase tracking-widest">Configuration required to initialize AI engine</p>
                                </div>
                            </div>
                        )}

                        {generating && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-8">
                                <div className="relative">
                                    <div className="w-20 h-20 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-sm font-mono text-purple-100 uppercase tracking-[0.3em] animate-pulse">Running Neuro-Synthesizer</span>
                                </div>
                            </div>
                        )}

                        {planGenerated && (
                            <div className="flex-1 flex flex-col gap-8">
                                <div className="flex items-end justify-between border-b border-white/5 pb-8">
                                    <div className="space-y-2">
                                        <h1 className="text-3xl font-black text-white italic tracking-tighter">AI STRATEGIC DEPLOYMENT_ALPHA</h1>
                                        <div className="flex items-center gap-4 text-[10px] font-mono">
                                            <div className="flex items-center gap-2 text-white/40">
                                                <Clock className="w-3 h-3 text-purple-500" />
                                                <span>ESTIMATED DURATION: <span className="text-white">28.5ms</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-white/40">
                                                <Layers className="w-3 h-3 text-purple-500" />
                                                <span>STAGES: <span className="text-white">5</span></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-mono text-white/30 uppercase mb-1">Status</div>
                                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                            <span className="text-xs font-mono font-bold text-emerald-400">OPTIMIZED_PASS</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-mono text-purple-400 uppercase font-bold tracking-[0.2em]">Deployment Sequence</h5>
                                    <div className="grid gap-3">
                                        {tasks.map((task, i) => (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedStep(selectedStep === task.id ? null : task.id)}
                                                className={cn(
                                                    "group relative flex flex-col p-5 rounded-2xl bg-white/[0.02] border transition-all cursor-pointer hover:bg-white/[0.04]",
                                                    selectedStep === task.id ? "border-purple-500/50 bg-white/[0.05]" : "border-white/5"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-[10px] font-mono text-purple-400 border border-purple-500/20">
                                                            0{i + 1}
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{task.title}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[9px] font-mono text-white/30 uppercase">{task.duration}</span>
                                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                <span className={cn(
                                                                    "text-[9px] font-mono uppercase font-bold",
                                                                    task.priority === "High" ? "text-rose-400/60" : "text-amber-400/60"
                                                                )}>
                                                                    {task.priority} Priority
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={cn("w-4 h-4 text-white/20 transition-all", selectedStep === task.id && "rotate-90 text-purple-400")} />
                                                </div>
                                                {selectedStep === task.id && (
                                                    <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <p className="text-[11px] font-mono text-white/60 leading-relaxed italic border-l-2 border-purple-500/30 pl-4 bg-purple-500/5 py-2 rounded-r-lg">
                                                            {task.details}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
