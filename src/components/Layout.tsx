import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Cpu, Activity, Zap, FileSearch, Globe, Wifi, WifiOff,
  ChevronLeft, ChevronRight, Radio, Server
} from "lucide-react";
import { useHealth } from "@/hooks/useBackend";

const navItems = [
  { title: "Design Ingestor", path: "/ingestor", icon: FileSearch },
  { title: "Digital Twin", path: "/", icon: Cpu },
  { title: "Live Test", path: "/live-test", icon: Activity },
  { title: "Diagnosis", path: "/diagnosis", icon: Zap },
  { title: "Fleet Analytics", path: "/fleet", icon: Globe },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // ── Real backend health check ──────────────────────────────────────────────
  const { status: backendStatus, health } = useHealth(5000);

  // Live clock
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isOnline = backendStatus === "connected";
  const isChecking = backendStatus === "checking";

  const statusColor = isOnline ? "bg-success animate-pulse-slow"
    : isChecking ? "bg-warning animate-pulse"
      : "bg-destructive";

  const statusLabel = isOnline ? "BACKEND ONLINE"
    : isChecking ? "CONNECTING…"
      : "DISCONNECTED";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background grid-overlay">
      {/* Sidebar */}
      <aside
        className={`glass-panel-strong border-r border-border/40 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-56"
          }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border/40">
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center glow-cyan">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-mono font-bold text-primary text-glow-cyan text-sm tracking-wider">
              AIDE-PCB
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${isActive
                  ? "bg-primary/10 text-primary glow-cyan"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && <span className="font-medium truncate">{item.title}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Backend mini-status at bottom of sidebar */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <div className={`glass-panel px-3 py-2 rounded-lg ${isOnline ? "border-success/20" : "border-border/20"}`}>
              <div className="flex items-center gap-2">
                <Server className={`w-3 h-3 ${isOnline ? "text-success" : "text-muted-foreground"}`} />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Python API</span>
              </div>
              {isOnline && health && (
                <div className="mt-1 space-y-0.5">
                  <div className="text-[9px] font-mono text-muted-foreground/60">
                    Nodes: {health.circuit_nodes} · Edges: {health.circuit_edges}
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground/60">
                    Faults: {health.active_faults}
                  </div>
                </div>
              )}
              {!isOnline && (
                <div className="mt-1 text-[9px] font-mono text-muted-foreground/60">
                  localhost:8000 unreachable
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-2 mb-4 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top status bar */}
        <header className="h-12 glass-panel-strong border-b border-border/40 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              AI STATUS
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-xs font-mono text-muted-foreground">{statusLabel}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-success" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="text-xs font-mono text-muted-foreground">
                {isOnline ? "WebSocket Active" : "WebSocket Offline"}
              </span>
            </div>
            {isOnline && health && (
              <>
                <div className="w-px h-4 bg-border" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {health.active_faults > 0
                    ? <span className="text-warning">⚠ {health.active_faults} fault{health.active_faults !== 1 && "s"} active</span>
                    : <span className="text-success">✓ No active faults</span>
                  }
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-primary animate-pulse-slow" />
              <span className="text-xs font-mono text-muted-foreground">
                {isOnline ? "TELEMETRY LIVE" : "TELEMETRY SIM"}
              </span>
            </div>
            <div className="text-xs font-mono text-primary">
              {time.toLocaleTimeString("en-US", { hour12: false })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
