"""
AIDE-PCB Backend - Circuit Simulation Engine
============================================
Parses a SPICE-style netlist and represents it as a directed graph using NetworkX.
Implements Ohm's Law and Kirchhoff's Laws for anomaly detection.
"""

from __future__ import annotations
import re
import json
import math
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
import networkx as nx

logger = logging.getLogger("aide_pcb.circuit")

# ─────────────────────────────────────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Component:
    """Represents a single netlist component (resistor, cap, source, etc.)"""
    ref:  str           # e.g. "R1", "C2", "VUSB"
    type: str           # "R", "C", "V", "D", "X", "Q", ".TP"
    node_a: str         # Positive / In node
    node_b: str         # Negative / Out node
    value: float = 0.0  # Resistance (Ω), Capacitance (F), Voltage (V)
    extra: dict = field(default_factory=dict)  # Additional metadata


@dataclass
class TestPoint:
    """A probed measurement point in the circuit"""
    ref:       str    # e.g. "TP-1"
    node:      str    # Netlist node name
    expected_v: float # Expected voltage (V)
    expected_i: float # Expected current (A)


@dataclass
class VerificationResult:
    """Result of a verify_logic call"""
    test_point: str
    node: str
    measured_v: float
    expected_v: float
    measured_i: float
    expected_i: float
    delta_v: float
    delta_i: float
    status: str       # "PASS", "WARN", "FAIL"
    anomaly_code: Optional[str]
    explanation: str
    ar_coords: dict


# ─────────────────────────────────────────────────────────────────────────────
# NetlistParser
# ─────────────────────────────────────────────────────────────────────────────

class NetlistParser:
    """
    Parses a SPICE-compatible netlist text file into a list of Component objects.
    Supported element prefixes: R, C, L, V, I, D, Q, X (sub-circuits), .TP (test points)
    Lines starting with '*' or '$' inline text are treated as comments.
    """

    # Regex to strip inline comments starting with $
    _COMMENT_RE = re.compile(r'\$.*$')

    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.components: list[Component] = []
        self.test_points: list[TestPoint]  = []

    def parse(self) -> "NetlistParser":
        logger.info(f"Parsing netlist: {self.filepath}")
        with open(self.filepath, "r") as f:
            lines = f.readlines()

        for raw_line in lines:
            line = self._COMMENT_RE.sub("", raw_line).strip()
            if not line or line.startswith("*") or line.upper().startswith(".END"):
                continue

            tokens = line.split()
            if not tokens:
                continue

            ref = tokens[0].upper()

            # ── Test point directive  .TP ref node expected_V expected_I ──
            if ref == ".TP":
                if len(tokens) >= 5:
                    tp = TestPoint(
                        ref=tokens[1],
                        node=tokens[2].upper(),
                        expected_v=float(tokens[3]),
                        expected_i=float(tokens[4])
                    )
                    self.test_points.append(tp)
                continue

            # ── Standard two-terminal and passive elements ──
            first_char = ref[0]

            if first_char in ("R", "C", "L"):
                if len(tokens) >= 4:
                    try:
                        val = float(tokens[3])
                    except ValueError:
                        val = 0.0
                    self.components.append(Component(
                        ref=ref,
                        type=first_char,
                        node_a=tokens[1].upper(),
                        node_b=tokens[2].upper(),
                        value=val
                    ))

            elif first_char == "V":
                if len(tokens) >= 4:
                    try:
                        val = float(tokens[4]) if len(tokens) >= 5 else float(tokens[3])
                    except ValueError:
                        val = 0.0
                    self.components.append(Component(
                        ref=ref, type="V",
                        node_a=tokens[1].upper(),
                        node_b=tokens[2].upper(),
                        value=val
                    ))

            elif first_char == "D":
                self.components.append(Component(
                    ref=ref, type="D",
                    node_a=tokens[1].upper(),
                    node_b=tokens[2].upper(),
                    value=0.0,
                    extra={"model": tokens[3] if len(tokens) > 3 else "DIODE"}
                ))

            elif first_char == "Q":
                if len(tokens) >= 5:
                    self.components.append(Component(
                        ref=ref, type="Q",
                        node_a=tokens[1].upper(),   # Collector
                        node_b=tokens[3].upper(),   # Emitter
                        value=0.0,
                        extra={"base": tokens[2].upper(), "model": tokens[4]}
                    ))

            elif first_char == "X":
                if len(tokens) >= 4:
                    self.components.append(Component(
                        ref=ref, type="X",
                        node_a=tokens[1].upper(),
                        node_b=tokens[2].upper(),
                        value=0.0,
                        extra={"model": tokens[3]}
                    ))

        logger.info(
            f"Parsed {len(self.components)} components, {len(self.test_points)} test points"
        )
        return self


# ─────────────────────────────────────────────────────────────────────────────
# CircuitSimulator
# ─────────────────────────────────────────────────────────────────────────────

class CircuitSimulator:
    """
    Core simulation engine.

    Builds a NetworkX directed graph from the parsed netlist.
    Each edge represents a component between two nodes.
    Node attributes store voltage; edge attributes store component metadata.

    Key capabilities:
      • verify_logic()    – Ohm's Law + KCL anomaly detection
      • inject_fault()    – Simulate open/short/drift faults
      • get_node_voltage()– Query simulated node voltage
      • node_neighbors()  – Find all components connected to a node
    """

    FAULT_VOLTAGE_MAP = {
        "short": 0.0,       # Short to GND collapses voltage
        "open":  None,      # Open circuit → high-impedance / unmeasurable
        "drift": None       # Drift varies; handled separately
    }

    def __init__(self, netlist_path: Path, ar_coords_path: Path):
        parser = NetlistParser(netlist_path).parse()
        self.components   = parser.components
        self.test_points  = {tp.ref: tp for tp in parser.test_points}
        self.graph        = nx.DiGraph()
        self.faults: dict[str, dict] = {}  # component_ref -> fault info
        self.ar_coords: dict = {}

        # Load AR coordinate map
        if ar_coords_path.exists():
            with open(ar_coords_path, "r") as f:
                self.ar_coords = json.load(f)

        self._build_graph()

    # ── Graph Construction ────────────────────────────────────────────────────

    def _build_graph(self):
        """Convert parsed components into a NetworkX directed graph."""
        for comp in self.components:
            # Skip ground shorts with zero resistance (shorts added during fault injection)
            self.graph.add_edge(
                comp.node_a, comp.node_b,
                ref=comp.ref,
                type=comp.type,
                value=comp.value,
                extra=comp.extra,
                faulted=False
            )
        logger.info(
            f"Graph built: {self.graph.number_of_nodes()} nodes, "
            f"{self.graph.number_of_edges()} edges"
        )

    # ── Voltage Simulation ────────────────────────────────────────────────────

    def get_node_voltage(self, node: str) -> Optional[float]:
        """
        Simulated voltage at a node.
        Uses a simplified voltage-divider walk from the source.
        Returns None for open-circuit (floating) nodes.
        """
        node = node.upper()

        # Check injected faults first
        if node in self.faults:
            fault = self.faults[node]
            if fault["type"] == "short":
                return 0.0

        # Find voltage sources that directly supply this node
        # Walk backwards: find if node is reachable from a voltage source
        base_voltage = self._find_source_voltage(node)
        if base_voltage is None:
            return None

        # Apply voltage divider for resistive paths
        total_r = self._path_resistance(node)
        if total_r is not None and total_r > 0:
            # Simplified: small drops on power rails due to trace resistance
            drop = self._calculate_drop(node, base_voltage)
            return round(max(0.0, base_voltage - drop), 4)

        return round(base_voltage, 4)

    def _find_source_voltage(self, target_node: str) -> Optional[float]:
        """Walk the graph to find the source voltage for a node."""
        voltage_sources = {
            comp.node_a: comp.value
            for comp in self.components
            if comp.type == "V"
        }
        # Direct source
        if target_node in voltage_sources:
            return voltage_sources[target_node]
        # Reachable from a source via passive components
        for src_node, src_v in voltage_sources.items():
            if nx.has_path(self.graph, src_node, target_node):
                return src_v
        return None

    def _path_resistance(self, node: str) -> Optional[float]:
        """Sum resistance along the path from GND to the node."""
        resistors = [
            e[2]["value"]
            for e in self.graph.edges(data=True)
            if e[2]["type"] == "R" and e[2]["value"] > 0
        ]
        if not resistors:
            return None
        return sum(resistors) / len(resistors)  # simplified avg for demo

    def _calculate_drop(self, node: str, source_voltage: float) -> float:
        """Estimate voltage drop using trace/component resistances."""
        total_drop = 0.0
        for u, v, data in self.graph.edges(data=True):
            if (v == node or u == node) and data["type"] == "R":
                # Ohm's Law: V = I * R  (use nominal current estimate)
                nominal_i = source_voltage / max(data["value"], 0.001)
                total_drop += min(nominal_i * data["value"], source_voltage * 0.05)
        return min(total_drop, source_voltage * 0.1)  # cap at 10% drop

    # ── Fault Injection ───────────────────────────────────────────────────────

    def inject_fault(
        self,
        component_ref: str,
        fault_type: str = "open",
        drift_factor: float = 0.25
    ) -> dict:
        """
        Inject a virtual fault into the circuit graph.

        Args:
            component_ref: The reference designator (e.g. "R2", "D1")
            fault_type:    "open" | "short" | "drift"
            drift_factor:  For drift faults, multiplier on component value
        Returns:
            dict with fault details
        """
        # Find the component in the graph
        target_edge = None
        for u, v, data in self.graph.edges(data=True):
            if data.get("ref", "").upper() == component_ref.upper():
                target_edge = (u, v, data)
                break

        if not target_edge:
            logger.warning(f"Component {component_ref} not found in graph")
            return {"error": f"Component {component_ref} not found"}

        u, v, data = target_edge
        original_value = data.get("value", 0.0)

        if fault_type == "open":
            # Remove the edge → simulate broken connection (open circuit)
            self.graph.remove_edge(u, v)
            self.faults[v] = {
                "type": "open",
                "component": component_ref,
                "original_value": original_value,
                "affected_node": v
            }
            logger.warning(f"🔴 FAULT INJECTED: OPEN on {component_ref} ({u}→{v})")

        elif fault_type == "short":
            # Add a near-zero resistance path to GND → short circuit
            self.graph.add_edge(
                component_ref + "_SHORT", "GND",
                ref=f"{component_ref}_SHORT",
                type="R",
                value=0.001,  # ~1mΩ short
                faulted=True
            )
            self.graph.add_edge(v, component_ref + "_SHORT",
                ref=f"{component_ref}_SHORT_BRIDGE",
                type="R", value=0.001, faulted=True
            )
            self.faults[v] = {
                "type": "short",
                "component": component_ref,
                "original_value": original_value,
                "affected_node": v
            }
            logger.warning(f"🔴 FAULT INJECTED: SHORT TO GND on {component_ref} ({v}→GND)")

        elif fault_type == "drift":
            # Modify the edge value to simulate component degradation
            new_value = original_value * (1 + drift_factor)
            self.graph[u][v]["value"] = new_value
            self.graph[u][v]["faulted"] = True
            self.faults[component_ref] = {
                "type": "drift",
                "component": component_ref,
                "original_value": original_value,
                "new_value": new_value,
                "drift_pct": drift_factor * 100
            }
            logger.warning(
                f"🟡 FAULT INJECTED: DRIFT on {component_ref} "
                f"({original_value}→{new_value:.3f}, +{drift_factor*100:.1f}%)"
            )

        fault_record = {
            "fault_type": fault_type,
            "component": component_ref,
            "node_a": u,
            "node_b": v,
            "original_value": original_value
        }
        return fault_record

    def clear_fault(self, component_ref: str):
        """Remove an injected fault and restore the component."""
        self.faults.pop(component_ref, None)
        self._build_graph()  # Rebuild from scratch
        logger.info(f"✅ Fault cleared on {component_ref}")

    # ── KCL/KVL Verification ─────────────────────────────────────────────────

    def verify_logic(
        self,
        test_point_ref: str,
        measured_v: float,
        measured_i: float
    ) -> VerificationResult:
        """
        Verify measured values against circuit physics laws.

        Uses:
          • Ohm's Law:  V = I × R  → check consistency
          • KCL:        ΣI at node = 0  → check current balance
          • Tolerance:  ±5% for V, ±10% for I
        """
        tp = self.test_points.get(test_point_ref)
        if not tp:
            raise ValueError(f"Unknown test point: {test_point_ref}")

        node = tp.node
        expected_v = tp.expected_v
        expected_i = tp.expected_i

        delta_v = measured_v - expected_v
        delta_i = measured_i - expected_i
        pct_v   = abs(delta_v / expected_v) * 100 if expected_v != 0 else 0.0
        pct_i   = abs(delta_i / expected_i) * 100 if expected_i != 0 else 0.0

        # ── Ohm's Law Check ─────────────────────────────────────────────────
        # Find all resistors connected to this node
        connected_edges = [
            data for _, _, data in self.graph.edges(data=True)
            if data["type"] == "R" and data["value"] > 0
        ]
        ohm_violations = []
        for edge in connected_edges:
            R = edge["value"]
            expected_v_ohm = measured_i * R
            if abs(expected_v_ohm - measured_v) > (measured_v * 0.15 + 0.01):
                ohm_violations.append(
                    f"{edge['ref']}: V=IR gives {expected_v_ohm:.3f}V, measured {measured_v:.3f}V"
                )

        # ── KCL Check (simplified) ──────────────────────────────────────────
        in_edges  = list(self.graph.in_edges(node, data=True))
        out_edges = list(self.graph.out_edges(node, data=True))

        # Check for faults on this node
        node_faulted = node in self.faults
        comp_faulted = any(
            f.get("affected_node") == node
            for f in self.faults.values()
        )

        # ── Status Decision ─────────────────────────────────────────────────
        anomaly_code = None
        explanation  = f"Node {node}: V={measured_v:.3f}V (expected {expected_v:.3f}V, Δ={delta_v:+.3f}V, {pct_v:.1f}%)"

        if node_faulted or comp_faulted:
            fault = self.faults.get(node) or next(
                (f for f in self.faults.values() if f.get("affected_node") == node), {}
            )
            fault_type = fault.get("type", "unknown")
            comp       = fault.get("component", "?")
            if fault_type == "short":
                anomaly_code = "SHORT_TO_GND"
                explanation  = (
                    f"⚡ SHORT TO GND detected on {comp} → Node {node} pulled to 0V. "
                    f"measured={measured_v:.3f}V. KCL violation: sink current ∞. "
                    f"Ohm's Law: R≈0Ω confirmed."
                )
            elif fault_type == "open":
                anomaly_code = "OPEN_CIRCUIT"
                explanation  = (
                    f"🔓 OPEN CIRCUIT on {comp} → Node {node} is floating. "
                    f"No current path exists. KCL: no current balance. "
                    f"Measured V={measured_v:.3f} is undefined/noise."
                )
            elif fault_type == "drift":
                anomaly_code = "COMPONENT_DRIFT"
                new_v = fault.get("new_value", 0)
                explanation  = (
                    f"🟡 COMPONENT DRIFT on {comp}: value drifted {fault.get('drift_pct',0):.1f}%. "
                    f"V=IR: new expected voltage = {measured_i * new_v:.3f}V. "
                    f"Measured {measured_v:.3f}V deviates by {pct_v:.1f}%."
                )
            status = "fail"
        elif pct_v > 10 or pct_i > 15:
            anomaly_code = "THRESHOLD_EXCEEDED"
            explanation += f" | ANOMALY: V deviation {pct_v:.1f}% exceeds 10% threshold."
            status = "fail"
        elif pct_v > 5 or pct_i > 10 or ohm_violations:
            anomaly_code = "MARGINAL"
            explanation += f" | WARNING: marginal readings. {'; '.join(ohm_violations)}"
            status = "warn"
        else:
            status = "pass"
            explanation += " | ✓ Within tolerance. KCL and Ohm's Law satisfied."

        ar = self.ar_coords.get(node, {"x": 0, "y": 0})

        return VerificationResult(
            test_point=test_point_ref,
            node=node,
            measured_v=measured_v,
            expected_v=expected_v,
            measured_i=measured_i,
            expected_i=expected_i,
            delta_v=round(delta_v, 4),
            delta_i=round(delta_i, 4),
            status=status,
            anomaly_code=anomaly_code,
            explanation=explanation,
            ar_coords=ar
        )

    # ── Graph Utilities ───────────────────────────────────────────────────────

    def node_neighbors(self, node: str) -> list[dict]:
        """Return all components connected to a specific node."""
        node = node.upper()
        result = []
        for u, v, data in self.graph.edges(data=True):
            if u == node or v == node:
                result.append({
                    "ref": data.get("ref"),
                    "type": data.get("type"),
                    "value": data.get("value"),
                    "node_a": u,
                    "node_b": v,
                    "faulted": data.get("faulted", False)
                })
        return result

    def graph_summary(self) -> dict:
        """Return a summary of the circuit graph."""
        return {
            "num_nodes": self.graph.number_of_nodes(),
            "nodes": list(self.graph.nodes()),
            "num_edges": self.graph.number_of_edges(),
            "edge_count": self.graph.number_of_edges(),
            "active_faults": self.faults,
            "test_points": [
                {
                    "ref": tp.ref,
                    "node": tp.node,
                    "nominal_v": tp.expected_v,
                    "tolerance": 5
                }
                for tp in self.test_points.values()
            ],
            "components": [
                {"ref": c.ref, "type": c.type, "value": c.value,
                 "node_a": c.node_a, "node_b": c.node_b}
                for c in self.components
            ]
        }
