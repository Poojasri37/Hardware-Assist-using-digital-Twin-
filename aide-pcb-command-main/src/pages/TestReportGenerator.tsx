import { useState } from "react";
import { FileText, Download, CheckCircle, BarChart, Settings, Play } from "lucide-react";

export default function TestReportGenerator() {
    const [generating, setGenerating] = useState(false);
    const [reportReady, setReportReady] = useState(false);

    const handleGenerate = () => {
        setGenerating(true);
        setReportReady(false);
        setTimeout(() => {
            setGenerating(false);
            setReportReady(true);
        }, 2000);
    };

    const handleDownloadReport = () => {
        const reportData = {
            device: "ESP32-S3-Pico Dew Module",
            date: new Date().toISOString(),
            status: "PASS",
            coverage: "98.4%",
            results: [
                { category: "Power Rails", points: 12, failures: 0 },
                { category: "Signal Integrity", points: 45, failures: 0 },
                { category: "Thermal Stress", points: 5, failures: 0 },
                { category: "Connectivity", points: 128, failures: 0 }
            ],
            metrics: {
                "3.3V Rail": "3.31V",
                "Temp Limit": "47°C",
            }
        };
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `TestReport_ESP32_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <h2 className="text-sm font-mono text-primary uppercase tracking-widest text-glow-cyan">
                Test Report Generator
            </h2>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
                {/* Settings Panel */}
                <div className="glass-panel p-4 flex flex-col gap-4">
                    <h3 className="text-xs font-mono text-foreground uppercase tracking-widest flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" /> Configuration
                    </h3>
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-mono text-muted-foreground block mb-1">Target Device</label>
                            <select className="w-full bg-secondary/50 border border-border/30 rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary">
                                <option>STM32-Nucleo-F4</option>
                                <option>ESP32-WROOM</option>
                                <option>Custom PCB Rev 2.1</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-muted-foreground block mb-1">Test Suite</label>
                            <div className="flex flex-col gap-2 mt-2">
                                {["Power Rails", "Signal Integrity", "Thermal Stress", "Connectivity"].map((test) => (
                                    <label key={test} className="flex items-center gap-2">
                                        <input type="checkbox" defaultChecked className="accent-primary" />
                                        <span className="text-xs font-mono text-foreground">{test}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className={`w-full py-2 rounded font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${generating ? "bg-primary/20 text-primary animate-pulse cursor-not-allowed" : "bg-primary/80 hover:bg-primary text-primary-foreground"
                            }`}
                    >
                        {generating ? (
                            <>
                                <Play className="w-4 h-4 animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4" /> Generate Report
                            </>
                        )}
                    </button>
                </div>

                {/* Report Preview Panel */}
                <div className="md:col-span-2 glass-panel p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-mono text-foreground uppercase tracking-widest flex items-center gap-2">
                            <BarChart className="w-4 h-4 text-primary" /> Report Preview
                        </h3>
                        {reportReady && (
                            <button onClick={handleDownloadReport} className="flex items-center gap-2 text-xs font-mono text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded transition-colors">
                                <Download className="w-3.5 h-3.5" /> Export Report
                            </button>
                        )}
                    </div>

                    <div className="flex-1 bg-background/50 border border-border/30 rounded overflow-y-auto p-6 relative">
                        {!reportReady && !generating && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground">
                                Configure settings and click generate to view report.
                            </div>
                        )}
                        {generating && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                                <span className="text-xs font-mono text-primary animate-pulse">Running Diagnostics...</span>
                            </div>
                        )}
                        {reportReady && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="border-b border-border/30 pb-4">
                                    <h1 className="text-xl font-mono text-foreground mb-2">Automated Test Report: ESP32-S3-Pico Dew Module</h1>
                                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                                        <span>Date: {new Date().toLocaleDateString()}</span>
                                        <span>Status: <span className="text-success font-bold">PASS</span></span>
                                        <span>Coverage: 98.4%</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-mono text-primary mb-3">Executive Summary</h4>
                                    <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                                        All major power rails and signal lines have passed validation criteria. Thermal dissipation remained within safe operating limits during sustained 100% CPU load. Nominal variance observed on AVDD line under dynamic load (-1.2% sag), fully compliant with ±5% specification.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-mono text-primary mb-3">Test Categories</h4>
                                    <table className="w-full text-xs font-mono text-left">
                                        <thead>
                                            <tr className="border-b border-border/30 text-muted-foreground uppercase text-[10px]">
                                                <th className="py-2">Category</th>
                                                <th className="py-2">Points Tested</th>
                                                <th className="py-2">Failures</th>
                                                <th className="py-2">Result</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { cat: "Power Rails", pts: 12, fail: 0 },
                                                { cat: "Signal Integrity", pts: 45, fail: 0 },
                                                { cat: "Thermal Stress", pts: 5, fail: 0 },
                                                { cat: "Connectivity", pts: 128, fail: 0 },
                                            ].map((row, i) => (
                                                <tr key={i} className="border-b border-border/10">
                                                    <td className="py-2 text-foreground">{row.cat}</td>
                                                    <td className="py-2 text-muted-foreground">{row.pts}</td>
                                                    <td className="py-2 text-muted-foreground">{row.fail}</td>
                                                    <td className="py-2">
                                                        <span className="flex items-center gap-1 text-success">
                                                            <CheckCircle className="w-3 h-3" /> PASS
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
