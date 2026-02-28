import { useState } from "react";
import {
    BarChart3,
    Download,
    RefreshCw,
    PieChart,
    TrendingUp,
    Monitor,
    FileText,
    Search,
    Filter,
    MoreVertical,
    Activity,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataReportGenerator() {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1500);
    };

    const handleExport = () => {
        const headers = ["Identifier", "Timestamp", "Health Meta", "Operational Status"];
        const rows = logRows.map(row => [row.id, row.time, row.meta, row.status]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `DataReport_${new Date().toISOString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const stats = [
        { label: "Total Data Nodes", value: "24.8k", change: "+12.4%", icon: Monitor, color: "text-blue-400" },
        { label: "Compliance Score", value: "99.2%", change: "+0.8%", icon: TrendingUp, color: "text-emerald-400" },
        { label: "Active Monitors", value: "142", change: "Stable", icon: Activity, color: "text-orange-400" },
        { label: "Daily Throughput", value: "1.2GB", change: "+4.2%", icon: Zap, color: "text-purple-400" },
    ];

    const logRows = [
        { id: "LOG_8842_A", time: "05:28:12", meta: "V_RAIL_3.3V", status: "STABLE", color: "text-emerald-400" },
        { id: "LOG_8842_B", time: "05:27:55", meta: "SIGNAL_I2C_1", status: "NOISE_WARN", color: "text-amber-400" },
        { id: "LOG_8842_C", time: "05:27:30", meta: "CPU_TEMP", status: "NOMINAL", color: "text-emerald-400" },
        { id: "LOG_8842_D", time: "05:26:45", meta: "V_RAIL_5.0V", status: "STABLE", color: "text-emerald-400" },
        { id: "LOG_8842_E", time: "05:25:20", meta: "NET_LATENCY", status: "PEAK_DETECT", color: "text-blue-400" },
        { id: "LOG_8842_F", time: "05:24:12", meta: "EXT_SENSOR_A", status: "STABLE", color: "text-emerald-400" },
        { id: "LOG_8842_G", time: "05:23:55", meta: "MEM_BW_AVAIL", status: "NOMINAL", color: "text-emerald-400" },
    ];

    const distributions = [
        { label: "Hardware Nodes", val: "72%", color: "bg-blue-400" },
        { label: "AI Reasoning", val: "18%", color: "bg-purple-400" },
        { label: "Network I/O", val: "10%", color: "bg-orange-400" },
    ];

    return (
        <div className="h-full flex flex-col gap-6 p-2">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-mono font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        Intelligence Data Reports
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-emerald-400/70 uppercase font-bold tracking-widest">Real-time Analytics Engine Synced</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                    >
                        <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 rounded-xl transition-all group"
                    >
                        <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-mono text-emerald-100 uppercase font-bold tracking-widest">Master Export</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="glass-panel p-6 bg-white/[0.03] border-white/5 rounded-3xl group hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-2 rounded-lg bg-white/5 border border-white/5", stat.color)}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            <span className={cn(
                                "text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5",
                                stat.change.startsWith("+") ? "text-emerald-400" : "text-white/40"
                            )}>
                                {stat.change}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-mono text-white/30 uppercase font-bold">{stat.label}</p>
                            <h3 className="text-2xl font-black text-white tracking-tight group-hover:scale-105 origin-left transition-transform">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                <div className="flex-[2.5] flex flex-col glass-panel-strong bg-black/40 border-white/10 rounded-[2.5rem] overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <div className="flex items-center gap-6">
                            <h4 className="text-xs font-mono text-white/50 uppercase font-black tracking-widest">Active Data Streams</h4>
                            <div className="relative group/search">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within/search:text-emerald-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH LOGS..."
                                    className="bg-white/5 border border-white/5 rounded-full pl-10 pr-4 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-emerald-500/30 w-64 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg hover:bg-white/5 text-white/20 transition-colors"><Filter className="w-4 h-4" /></button>
                            <button className="p-2 rounded-lg hover:bg-white/5 text-white/20 transition-colors"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <table className="w-full text-left border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-[9px] font-mono text-white/30 uppercase tracking-widest px-4">
                                    <th className="pb-4 pl-6">Identifier</th>
                                    <th className="pb-4">Timestamp</th>
                                    <th className="pb-4">Health Meta</th>
                                    <th className="pb-4 text-right pr-6">Operational Status</th>
                                </tr>
                            </thead>
                            <tbody className="space-y-4">
                                {logRows.map((row, i) => (
                                    <tr key={i} className="group hover:bg-white/[0.03] transition-colors">
                                        <td className="py-4 pl-6 rounded-l-2xl border-l border-t border-b border-white/5 bg-white/[0.01]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                                                <span className="text-xs font-mono font-bold text-white/80">{row.id}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 border-t border-b border-white/5 bg-white/[0.01]">
                                            <span className="text-[10px] font-mono text-white/40">{row.time}</span>
                                        </td>
                                        <td className="py-4 border-t border-b border-white/5 bg-white/[0.01]">
                                            <span className="text-[10px] font-mono text-white/60 font-medium px-2 py-1 rounded-lg bg-white/5">{row.meta}</span>
                                        </td>
                                        <td className="py-4 pr-6 rounded-r-2xl border-r border-t border-b border-white/5 bg-white/[0.01] text-right">
                                            <span className={cn("text-[10px] font-mono font-black uppercase tracking-widest", row.color)}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-6">
                    <div className="glass-panel p-8 bg-white/5 border-white/10 rounded-[2.5rem] flex flex-col gap-8">
                        <h4 className="text-[10px] font-mono text-white/40 uppercase font-black tracking-widest">Network Distribution</h4>

                        <div className="flex-1 flex items-center justify-center p-4">
                            <div className="relative w-32 h-32 rounded-full border-4 border-white/5 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-emerald-500/50 border-t-transparent rounded-full animate-[spin_3s_linear_infinite]" />
                                <div className="absolute inset-2 border-2 border-white/10 rounded-full" />
                                <PieChart className="w-8 h-8 text-emerald-400/50" />
                                <div className="absolute -bottom-10 flex flex-col items-center">
                                    <span className="text-xs font-black text-white italic tracking-tighter">88.4% SCAN coverage</span>
                                    <span className="text-[9px] font-mono text-emerald-400 animate-pulse">OPTIMIZED</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-10">
                            {distributions.map((p) => (
                                <div key={p.label} className="space-y-2">
                                    <div className="flex justify-between text-[9px] font-mono uppercase font-bold tracking-widest">
                                        <span className="text-white/30">{p.label}</span>
                                        <span className="text-white">{p.val}</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full", p.color)} style={{ width: p.val }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel p-6 bg-emerald-500/5 border-emerald-500/20 rounded-3xl flex items-center gap-4 group cursor-pointer hover:bg-emerald-500/10 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-mono text-emerald-400 uppercase font-black">Archive Access</p>
                            <h5 className="text-xs font-bold text-white/80">Retrieve Historical Logs</h5>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
