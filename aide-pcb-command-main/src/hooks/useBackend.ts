/**
 * useBackend – Custom React hooks that wire components to the AIDE-PCB backend.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
    api,
    TelemetrySocket,
    type HealthStatus,
    type TelemetryPacket,
    type CircuitSummary,
    type VerifyResult,
    type DiagnoseResult,
    type FaultRequest,
} from "@/services/api";

// ─── Connection status types ──────────────────────────────────────────────────

export type BackendStatus = "connected" | "disconnected" | "error" | "checking";

// ─── useHealth ────────────────────────────────────────────────────────────────

export function useHealth(intervalMs = 5000) {
    const [status, setStatus] = useState<BackendStatus>("checking");
    const [health, setHealth] = useState<HealthStatus | null>(null);

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            try {
                const h = await api.health();
                if (!cancelled) { setHealth(h); setStatus("connected"); }
            } catch {
                if (!cancelled) { setHealth(null); setStatus("disconnected"); }
            }
        };

        check();
        const id = setInterval(check, intervalMs);
        return () => { cancelled = true; clearInterval(id); };
    }, [intervalMs]);

    return { status, health };
}

// ─── useTelemetry ─────────────────────────────────────────────────────────────

export interface TelemetryState {
    packets: TelemetryPacket[];
    history: Map<string, TelemetryPacket[]>;
    wsStatus: BackendStatus;
}

const HISTORY_LEN = 60;

export function useTelemetry(): [TelemetryState, TelemetrySocket | null] {
    const [state, setState] = useState<TelemetryState>({
        packets: [],
        history: new Map(),
        wsStatus: "disconnected",
    });

    const socketRef = useRef<TelemetrySocket | null>(null);

    useEffect(() => {
        const socket = new TelemetrySocket(
            (frame) => {
                setState((prev) => {
                    const history = new Map(prev.history);
                    for (const p of frame.packets) {
                        const arr = history.get(p.test_point) ?? [];
                        history.set(p.test_point, [...arr.slice(-(HISTORY_LEN - 1)), p]);
                    }
                    return { ...prev, packets: frame.packets, history };
                });
            },
            (wsStatus) => {
                setState((prev) => ({
                    ...prev,
                    wsStatus: wsStatus === "connected" ? "connected"
                        : wsStatus === "error" ? "error"
                            : "disconnected",
                }));
            }
        );
        socketRef.current = socket;
        return () => { socket.destroy(); socketRef.current = null; };
    }, []);

    return [state, socketRef.current];
}

// ─── useCircuitSummary ────────────────────────────────────────────────────────

export function useCircuitSummary() {
    const [summary, setSummary] = useState<CircuitSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const s = await api.circuitSummary();
            setSummary(s);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    return { summary, loading, error, refresh: fetchSummary };
}

// ─── useVerifyTestPoint ───────────────────────────────────────────────────────

export function useVerifyTestPoint() {
    const [results, setResults] = useState<VerifyResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const verify = useCallback(
        async (testPoint: string, voltage: number, current: number) => {
            setLoading(true);
            setError(null);
            try {
                const r = await api.verifyTestPoint(testPoint, voltage, current);
                setResults((prev) => {
                    const idx = prev.findIndex((x) => x.test_point === r.test_point);
                    if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = r;
                        return next;
                    }
                    return [...prev, r];
                });
                return r;
            } catch (e) {
                setError((e as Error).message);
                return null;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const reset = useCallback(() => setResults([]), []);

    return { results, loading, error, verify, reset };
}

// ─── useFaultControl ──────────────────────────────────────────────────────────

export function useFaultControl() {
    const [injecting, setInjecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inject = useCallback(async (req: FaultRequest) => {
        setInjecting(true);
        setError(null);
        try {
            return await api.injectFault(req);
        } catch (e) {
            setError((e as Error).message);
            return null;
        } finally {
            setInjecting(false);
        }
    }, []);

    const clear = useCallback(async (component: string) => {
        setInjecting(true);
        setError(null);
        try {
            return await api.clearFault(component);
        } catch (e) {
            setError((e as Error).message);
            return null;
        } finally {
            setInjecting(false);
        }
    }, []);

    return { inject, clear, injecting, error };
}

// ─── useDiagnosis ─────────────────────────────────────────────────────────────

export function useDiagnosis() {
    const [result, setResult] = useState<DiagnoseResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(
        async (verificationResults: VerifyResult[], faultInfo?: Record<string, unknown> | null) => {
            setLoading(true);
            setError(null);
            try {
                const r = await api.diagnose({ verification_results: verificationResults, fault_info: faultInfo });
                setResult(r);
                return r;
            } catch (e) {
                setError((e as Error).message);
                return null;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const reset = useCallback(() => { setResult(null); setError(null); }, []);

    return { result, loading, error, run, reset };
}
