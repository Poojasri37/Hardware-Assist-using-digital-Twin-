/**
 * Diagnosis – Neural-Symbolic AI Diagnosis page.
 *
 * Flow:
 *  1. Fetch /api/circuit/summary → verify all test points via /api/circuit/verify
 *  2. POST /api/diagnose         → Gemini returns THOUGHT_PROCESS + RCA
 *  3. Show symbolic tree + AI reasoning side-by-side
 */
import {
  CheckCircle, XCircle, AlertTriangle, ChevronRight, ChevronDown,
  Play, RefreshCw, Wifi, WifiOff, Brain, Loader2
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useCircuitSummary, useVerifyTestPoint, useDiagnosis } from "@/hooks/useBackend";
import type { VerifyResult } from "@/services/api";

// ─── Local tree types (for symbolic logic display) ────────────────────────────

interface TreeNode {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail?: string;
  children?: TreeNode[];
}

function buildTree(results: VerifyResult[]): TreeNode[] {
  const byStatus = (s: "pass" | "warn" | "fail") => results.filter((r) => r.status === s);
  const passes = byStatus("pass");
  const warns = byStatus("warn");
  const fails = byStatus("fail");

  const overallStatus = fails.length > 0 ? "fail" : warns.length > 0 ? "warn" : "pass";

  const toNode = (r: VerifyResult): TreeNode => ({
    id: r.test_point,
    label: `${r.test_point}: ${r.measured_v.toFixed(2)}V`,
    status: r.status,
    detail: r.explanation,
  });

  return [
    {
      id: "power",
      label: "Voltage Rail Analysis",
      status: overallStatus,
      children: [
        {
          id: "pass-rail", label: `Nominal (${passes.length} points)`, status: "pass",
          children: passes.map(toNode)
        },
        ...(warns.length > 0
          ? [{
            id: "warn-rail", label: `Warnings (${warns.length})`, status: "warn" as const,
            children: warns.map(toNode)
          }]
          : []),
        ...(fails.length > 0
          ? [{
            id: "fail-rail", label: `Failures (${fails.length})`, status: "fail" as const,
            children: fails.map(toNode)
          }]
          : []),
      ],
    },
    {
      id: "summary",
      label: "V=IR Verification",
      status: overallStatus,
      detail: `${results.length} test points checked`,
    },
  ];
}

// ─── Tree node component ──────────────────────────────────────────────────────

function StatusIcon({ status }: { status: "pass" | "fail" | "warn" }) {
  if (status === "pass") return <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />;
  if (status === "fail") return <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />;
}

function TreeNodeView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(node.status !== "pass");
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={`w-full flex items-center gap-2 py-2 px-3 text-xs font-mono rounded transition-colors hover:bg-secondary/50 ${node.status === "fail"
          ? "text-destructive"
          : node.status === "warn"
            ? "text-warning"
            : "text-foreground"
          }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />
        ) : (
          <span className="w-3" />
        )}
        <StatusIcon status={node.status} />
        <span className="flex-1 text-left">{node.label}</span>
        {node.detail && (
          <span className="text-[10px] text-muted-foreground ml-2 hidden sm:block truncate max-w-[200px]">
            {node.detail}
          </span>
        )}
      </button>
      {open && hasChildren && node.children!.map((child) => (
        <TreeNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Diagnosis() {
  const { summary, loading: summaryLoading, error: summaryError } = useCircuitSummary();
  const { results, loading: verifying, verify } = useVerifyTestPoint();
  const { result: diagResult, loading: diagLoading, error: diagError, run: runDiagnosis } = useDiagnosis();

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const isBackendOnline = !summaryError;

  // ── Step 1: auto-verify all test points once summary loads ─────────────────
  const runVerification = useCallback(async () => {
    if (!summary) return;
    const testPoints = summary.test_points.slice(0, 6);    // TP-1 … TP-6
    for (const tp of testPoints) {
      await verify(tp.ref, tp.nominal_v, 0.4 + Math.random() * 0.2); // simulated measurement
    }
  }, [summary, verify]);

  // ── Step 2: build tree whenever results arrive ─────────────────────────────
  useEffect(() => {
    if (results.length > 0) {
      setTree(buildTree(results));
    }
  }, [results]);

  // ── Step 3: run AI diagnosis ───────────────────────────────────────────────
  const handleRunDiagnosis = useCallback(async () => {
    let r = results;
    if (r.length === 0) {
      // Run verification first
      if (!summary) return;
      const testPoints = summary.test_points.slice(0, 6);
      const fresh: VerifyResult[] = [];
      for (const tp of testPoints) {
        const result = await verify(tp.ref, tp.nominal_v, 0.4 + Math.random() * 0.2);
        if (result) fresh.push(result);
      }
      r = fresh;
    }
    setHasRun(true);
    const activeFaults = summary?.active_faults ?? {};
    await runDiagnosis(r, Object.keys(activeFaults).length > 0 ? activeFaults : null);
  }, [results, summary, verify, runDiagnosis]);

  // Counts
  const passed = results.filter((r) => r.status === "pass").length;
  const warned = results.filter((r) => r.status === "warn").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const total = results.length;

  const isLoading = summaryLoading || verifying || diagLoading;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono text-primary uppercase tracking-widest text-glow-cyan">
          Neural-Symbolic Diagnosis
        </h2>
        <div className="flex items-center gap-3">
          {/* Backend status pill */}
          <div className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full border ${isBackendOnline
            ? "text-success border-success/30 bg-success/10"
            : "text-muted-foreground border-border/30 bg-secondary/50"
            }`}>
            {isBackendOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isBackendOnline ? "BACKEND LIVE" : "DEMO MODE"}
          </div>

          {/* Run verification */}
          <button
            onClick={runVerification}
            disabled={!summary || isLoading}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-40 transition-colors"
          >
            {verifying
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Play className="w-3.5 h-3.5" />
            }
            Verify All
          </button>

          {/* Run Gemini diagnosis */}
          <button
            onClick={handleRunDiagnosis}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-md bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 disabled:opacity-40 transition-colors text-glow-cyan"
          >
            {diagLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Brain className="w-3.5 h-3.5" />
            }
            Run AI Diagnosis
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* ── Left: Symbolic logic tree ──────────────────────────────────────── */}
        <div className="flex-1 glass-panel p-4 overflow-y-auto">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Symbolic Logic Chain
          </h3>

          {summaryError && (
            <div className="glass-panel p-3 mb-3 border-warning/20">
              <p className="text-[10px] font-mono text-warning">
                ⚠ Backend offline — showing demo tree. Start the backend server to enable live analysis.
              </p>
            </div>
          )}

          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              {isLoading
                ? <><RefreshCw className="w-6 h-6 animate-spin text-primary" /><p className="text-xs font-mono">Running verification…</p></>
                : <><Play className="w-6 h-6" /><p className="text-xs font-mono">Press "Verify All" to begin analysis</p></>
              }
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeNodeView key={node.id} node={node} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Summary + AI RCA ────────────────────────────────────────── */}
        <div className="w-80 flex flex-col gap-4">
          {/* Summary counts */}
          <div className="glass-panel p-4">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-4 text-glow-cyan">
              Report Summary
            </h3>
            <div className="space-y-3">
              {[
                { label: "Total Checks", value: total || "—", color: "text-foreground" },
                { label: "Passed", value: passed || "—", color: "text-success" },
                { label: "Warnings", value: warned || "—", color: "text-warning" },
                { label: "Failures", value: failed || "—", color: "text-destructive" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs font-mono text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-mono font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Reasoning output */}
          <div className="glass-panel p-4 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-xs font-mono text-primary uppercase tracking-widest text-glow-cyan">
                Gemini RCA
              </h3>
              {diagLoading && <Loader2 className="w-3 h-3 text-primary animate-spin ml-auto" />}
            </div>

            {diagError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs font-mono text-destructive">
                Error: {diagError}
              </div>
            )}

            {!hasRun && !diagLoading && !diagError && (
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                Click "Run AI Diagnosis" to get Gemini-powered fault root-cause analysis.
              </p>
            )}

            {diagResult && (
              <div className="space-y-3">
                {diagResult.thought_process && (
                  <div>
                    <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">
                      Thought Process
                    </div>
                    <p className="text-[10px] font-mono text-foreground leading-relaxed whitespace-pre-wrap">
                      {diagResult.thought_process}
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="text-xs font-mono text-destructive font-semibold mb-1">Root Cause</div>
                  <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                    {diagResult.rca}
                  </p>
                </div>
                {diagResult.model && (
                  <div className="text-[9px] font-mono text-muted-foreground/50 text-right">
                    powered by {diagResult.model}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
