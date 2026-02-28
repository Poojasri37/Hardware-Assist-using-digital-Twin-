/**
 * AIDE-PCB Backend API Service
 * ─────────────────────────────
 * Provides typed wrappers around every backend endpoint:
 *  REST  : http://localhost:8000/api/*
 *  WS    : ws://localhost:8000/ws/telemetry
 */

export const API_BASE = "http://localhost:8000";
export const WS_URL = "ws://localhost:8000/ws/telemetry";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CircuitSummary {
    num_nodes: number;
    num_edges: number;
    components: Array<{
        ref: string; type: string; value: string; node_a: string; node_b: string;
    }>;
    test_points: Array<{
        ref: string; nominal_v: number; tolerance: number; node: string;
    }>;
    active_faults: Record<string, { type: string; factor: number }>;
}

export interface VerifyResult {
    test_point: string;
    status: "pass" | "warn" | "fail";
    measured_v: number;
    measured_i: number;
    expected_v: number;
    deviation: number;
    message: string;
}

export interface FaultRequest {
    component: string;
    fault_type: "open" | "short" | "drift";
    drift_factor?: number;
}

export interface DiagnoseRequest {
    verification_results: VerifyResult[];
    fault_info?: Record<string, unknown> | null;
}

export interface DiagnoseResult {
    mode: string;
    model?: string;
    thought_process: string;
    rca: string;
    raw?: string;
}

export interface TelemetryPacket {
    test_point: string;
    voltage: number;
    current: number;
    temperature: number;
    fault_status: "nominal" | "warning" | "critical";
    anomaly_code: string;
    timestamp: number;
    ar_coords?: { x: number; y: number; z?: number };
}

export interface TelemetryFrame {
    type: "telemetry";
    packets: TelemetryPacket[];
}

export interface HealthStatus {
    status: string;
    circuit_nodes: number;
    circuit_edges: number;
    active_faults: number;
    telemetry_faults: number;
}

// ─── REST Helpers ─────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
    /** GET /api/health */
    health(): Promise<HealthStatus> {
        return request("/api/health");
    },

    /** GET /api/circuit/summary */
    circuitSummary(): Promise<CircuitSummary> {
        return request("/api/circuit/summary");
    },

    /** GET /api/circuit/nodes/:node */
    nodeNeighbors(node: string): Promise<{ node: string; neighbors: string[]; ar_coords: Record<string, number> }> {
        return request(`/api/circuit/nodes/${node}`);
    },

    /** POST /api/circuit/verify */
    verifyTestPoint(test_point: string, measured_v: number, measured_i: number): Promise<VerifyResult> {
        return request("/api/circuit/verify", {
            method: "POST",
            body: JSON.stringify({ test_point, measured_v, measured_i }),
        });
    },

    /** POST /api/circuit/fault */
    injectFault(req: FaultRequest): Promise<{ status: string; detail: unknown }> {
        return request("/api/circuit/fault", {
            method: "POST",
            body: JSON.stringify(req),
        });
    },

    /** DELETE /api/circuit/fault/:component */
    clearFault(component: string): Promise<{ status: string; component: string }> {
        return request(`/api/circuit/fault/${component}`, { method: "DELETE" });
    },

    /** POST /api/diagnose */
    diagnose(req: DiagnoseRequest): Promise<DiagnoseResult> {
        return request("/api/diagnose", {
            method: "POST",
            body: JSON.stringify(req),
        });
    },

    /** GET /api/ar-coords */
    arCoords(): Promise<Record<string, { x: number; y: number; z?: number }>> {
        return request("/api/ar-coords");
    },
};

// ─── WebSocket Manager ────────────────────────────────────────────────────────

type TelemetryCallback = (frame: TelemetryFrame) => void;
type StatusCallback = (status: "connected" | "disconnected" | "error") => void;

export class TelemetrySocket {
    private ws: WebSocket | null = null;
    private onFrame: TelemetryCallback;
    private onStatus: StatusCallback;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private destroyed = false;

    constructor(onFrame: TelemetryCallback, onStatus: StatusCallback) {
        this.onFrame = onFrame;
        this.onStatus = onStatus;
        this.connect();
    }

    private connect() {
        if (this.destroyed) return;
        try {
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                this.onStatus("connected");
            };

            this.ws.onmessage = (ev) => {
                try {
                    const frame: TelemetryFrame = JSON.parse(ev.data as string);
                    this.onFrame(frame);
                } catch {/* ignore parse errors */ }
            };

            this.ws.onerror = () => {
                this.onStatus("error");
            };

            this.ws.onclose = () => {
                if (!this.destroyed) {
                    this.onStatus("disconnected");
                    // Attempt reconnect after 3 s
                    this.retryTimer = setTimeout(() => this.connect(), 3000);
                }
            };
        } catch {
            this.onStatus("error");
            this.retryTimer = setTimeout(() => this.connect(), 3000);
        }
    }

    /** Send a command to the backend via the WebSocket. */
    send(payload: Record<string, unknown>) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        }
    }

    /** Gracefully close and stop reconnect attempts. */
    destroy() {
        this.destroyed = true;
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.ws?.close();
    }
}
