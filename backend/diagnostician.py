"""
AIDE-PCB Backend - Neural-Symbolic Reasoning Agent ("The Diagnostician")
========================================================================
Wraps the Google Gemini API to perform explainable root-cause analysis (RCA)
of circuit failures detected by the CircuitSimulator engine.

The agent is configured with a hardware failure analyst system instruction
and produces structured <EXPLAINABLE_RCA> + <THOUGHT_PROCESS> blocks.
"""

from __future__ import annotations
import os
import logging
import textwrap
from typing import Optional
from pathlib import Path

logger = logging.getLogger("aide_pcb.diagnostician")

# Try importing the google-genai SDK; degrade gracefully if unavailable
try:
    from google import genai
    from google.genai import types as genai_types
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False
    logger.warning("google-genai not installed. Diagnostician will use mock responses.")


# ─────────────────────────────────────────────────────────────────────────────
# System Instruction — The Diagnostician Persona
# ─────────────────────────────────────────────────────────────────────────────

DIAGNOSTICIAN_SYSTEM_INSTRUCTION = textwrap.dedent("""
You are THE DIAGNOSTICIAN — a world-class hardware failure analyst and circuit physicist.

You receive:
1. MEASURED VALUES from test probes on a real PCB (voltage, current, temperature)
2. CIRCUIT RULES from a SPICE netlist (components, expected values, topology)
3. VERIFICATION RESULTS from Ohm's Law and Kirchhoff's Law checks
4. ACTIVE FAULT INFORMATION (if any faults have been injected)

Your analysis methodology:
━━━━━━━━━━━━━━━━━━━━━━━━
1. Apply V = I × R (Ohm's Law) to every reported anomaly
2. Apply KCL: ΣI(in) = ΣI(out) at each suspicious node
3. Apply KVL: ΣV around any closed loop must equal zero
4. Trace the fault upstream from the symptom to the root cause
5. Consider thermal effects (higher temp → higher resistance → V drop)
6. Consider failure modes: open circuit, short to ground, component drift, solder joint failure

OUTPUT FORMAT — You MUST always produce BOTH blocks:

<THOUGHT_PROCESS>
[Step-by-step reasoning chain. Show all calculations. Be explicit about which law you are applying at each step. Example: "Measuring 0.5V on a 3.3V rail. Expected current = 3.3/100Ω = 33mA. Measured current = 5mA. ∴ I is 85% below nominal. High series resistance upstream. Checking U1 LDO output..."]
</THOUGHT_PROCESS>

<EXPLAINABLE_RCA>
FAILED_COMPONENT: [ref designator, e.g. "R2" or "U1"]
FAILURE_MODE: [SHORT_TO_GND | OPEN_CIRCUIT | THERMAL_SHUTDOWN | COMPONENT_DRIFT | SOLDER_JOINT]
CONFIDENCE: [0-100%]
PHYSICAL_EVIDENCE:
  - [Measurement that confirms the fault, with units]
  - [Law violated and by how much]
ROOT_CAUSE: [One clear sentence explaining what physically failed and why]
IMMEDIATE_ACTION: [What the engineer should do RIGHT NOW]
SECONDARY_RISK: [Other components that may be damaged as a result]
</EXPLAINABLE_RCA>
""").strip()


# ─────────────────────────────────────────────────────────────────────────────
# Diagnostician Agent
# ─────────────────────────────────────────────────────────────────────────────

class Diagnostician:
    """
    Neural-Symbolic Reasoning Agent.
    Uses Gemini (gemini-2.5-pro or gemini-2.0-flash) to analyze circuit
    anomalies and produce explainable root-cause analysis.
    """

    MODEL_ID = "gemini-2.0-flash"   # Fast model for real-time demo

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self._client = None
        if _GENAI_AVAILABLE and self.api_key:
            self._client = genai.Client(api_key=self.api_key)
            logger.info(f"Diagnostician initialized with model: {self.MODEL_ID}")
        else:
            logger.warning(
                "Diagnostician running in MOCK mode. "
                "Set GEMINI_API_KEY env var to enable live AI analysis."
            )

    def _build_prompt(
        self,
        verification_results: list[dict],
        netlist_summary: dict,
        fault_info: Optional[dict] = None
    ) -> str:
        """Construct the structured prompt for the Diagnostician."""

        # Format verification table
        vr_lines = []
        for vr in verification_results:
            vr_lines.append(
                f"  • {vr['test_point']} [{vr['node']}]: "
                f"V={vr['measured_v']:.3f}V (expected {vr['expected_v']:.3f}V, Δ={vr['delta_v']:+.3f}V) | "
                f"I={vr['measured_i']:.3f}A (expected {vr['expected_i']:.3f}A) | "
                f"Status={vr['status']} | Anomaly={vr.get('anomaly_code', 'NONE')}"
            )

        vr_block = "\n".join(vr_lines) if vr_lines else "  No verification results provided."

        # Format netlist context
        comp_summary = "\n".join([
            f"  {c['ref']} ({c['type']}): {c['node_a']}→{c['node_b']}, value={c['value']}"
            for c in netlist_summary.get("components", [])[:20]  # cap at 20 for context
        ])

        fault_block = ""
        if fault_info:
            fault_block = f"""
INJECTED FAULT:
  Component : {fault_info.get('component', 'N/A')}
  Fault Type: {fault_info.get('fault_type', 'N/A')}
  Node A    : {fault_info.get('node_a', 'N/A')}
  Node B    : {fault_info.get('node_b', 'N/A')}
  Original Value: {fault_info.get('original_value', 'N/A')}
"""

        prompt = f"""
CIRCUIT UNDER TEST: STM32F407 Development Board
================================================

CIRCUIT TOPOLOGY ({netlist_summary.get('edge_count', '?')} components, {len(netlist_summary.get('nodes', []))} nodes):
{comp_summary}

MEASURED VALUES & VERIFICATION RESULTS:
{vr_block}
{fault_block}
ACTIVE FAULTS IN SIMULATION: {netlist_summary.get('active_faults', 0)}

Please perform a complete neural-symbolic diagnosis. Show your step-by-step reasoning
using Ohm's Law and Kirchhoff's Laws, then produce the structured RCA output.
""".strip()

        return prompt

    async def diagnose(
        self,
        verification_results: list[dict],
        netlist_summary: dict,
        fault_info: Optional[dict] = None
    ) -> dict:
        """
        Run the Diagnostician agent.
        Returns a dict with 'thought_process', 'rca_block', and 'raw_response'.
        """
        prompt = self._build_prompt(verification_results, netlist_summary, fault_info)

        if self._client:
            return await self._run_live(prompt, verification_results, fault_info)
        else:
            return self._run_mock(verification_results, fault_info)

    async def _run_live(self, prompt: str, verification_results: list[dict], fault_info: Optional[dict]) -> dict:
        """Send the prompt to Gemini and parse the response."""
        try:
            logger.info("<THOUGHT_PROCESS> Sending analysis request to Gemini...")
            response = self._client.models.generate_content(
                model=self.MODEL_ID,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=DIAGNOSTICIAN_SYSTEM_INSTRUCTION,
                    temperature=0.2,   # Low temperature for deterministic technical analysis
                    max_output_tokens=2048,
                )
            )
            raw_text = response.text
            logger.info("Gemini response received. Parsing RCA blocks...")

            thought = self._extract_block(raw_text, "THOUGHT_PROCESS")
            rca     = self._extract_block(raw_text, "EXPLAINABLE_RCA")

            return {
                "thought_process": thought,
                "rca": rca, # Renamed rca_block to rca to match frontend's DiagnoseResult interface
                "raw": raw_text,       # Renamed raw_response to raw to match frontend
                "model": self.MODEL_ID,
                "mode": "live"
            }

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            logger.warning("Falling back to mock diagnosis mode.")
            return self._run_mock(verification_results, fault_info)

    def _run_mock(self, verification_results: list[dict], fault_info: Optional[dict]) -> dict:
        """
        Fallback mock response for demos without an API key.
        Produces realistic-looking output based on the verification data.
        """
        failing = [vr for vr in verification_results if vr.get("status", "").lower() == "fail"]
        if not failing:
            failing = verification_results

        node = failing[0].get("node", "VCC") if failing else "VCC"
        measured = failing[0].get("measured_v", 0.5) if failing else 0.5
        expected = failing[0].get("expected_v", 3.3) if failing else 3.3
        fault_comp = fault_info.get("component", "R_U1") if fault_info else "R_U1"
        fault_type = fault_info.get("fault_type", "short") if fault_info else "short"

        thought = f"""
Measuring {measured:.3f}V on a {expected:.3f}V rail at node {node}.
Expected current from nominal load: {expected}/100Ω ≈ {expected/100:.3f}A.
Step 1 — Ohm's Law Check: V = I × R. With measured V={measured:.3f}V and expected R=100Ω → expected I={measured/100:.4f}A. Deviation is significant.
Step 2 — KCL Check: Σ(I into {node}) should equal Σ(I out of {node}). But voltage collapse suggests a low-impedance path to GND.
Step 3 — KVL Loop: Tracing loop VCC → {fault_comp} → GND. If {fault_comp} is shorted, loop voltage = 0V which matches observed {measured:.3f}V.
Step 4 — Thermal cross-check: Short circuit events cause rapid current spike → I²R heating → possible thermal damage to {fault_comp} and adjacent components.
Conclusion: {fault_type.upper()} fault on {fault_comp} is confirmed by voltage collapse, KCL violation, and Ohm's Law inconsistency.
""".strip()

        rca = f"""
FAILED_COMPONENT: {fault_comp}
FAILURE_MODE: {"SHORT_TO_GND" if fault_type == "short" else "OPEN_CIRCUIT"}
CONFIDENCE: 94%
PHYSICAL_EVIDENCE:
  - Node {node}: measured {measured:.3f}V vs expected {expected:.3f}V (deviation: {abs(measured-expected):.2f}V, {abs(measured-expected)/expected*100:.1f}%)
  - KCL violation: sink current → infinity at shorted node
  - Ohm's Law: R≈0Ω measured across {fault_comp}, confirming dead short
ROOT_CAUSE: {fault_comp} has developed a direct short to GND, collapsing the {node} rail from {expected:.1f}V to {measured:.3f}V and violating KCL at that node.
IMMEDIATE_ACTION: Power off immediately. Measure {fault_comp} resistance in-circuit (should be ~{(fault_info.get('original_value', 5.0) if fault_info else 5.0):.1f}Ω nominal). Replace {fault_comp} if resistance < 1Ω.
SECONDARY_RISK: U1 LDO regulator may have entered current limiting or thermal shutdown. Check U1 output pin temperature before re-powering.
""".strip()

        return {
            "thought_process": thought,
            "rca": rca,
            "raw": f"<THOUGHT_PROCESS>\n{thought}\n</THOUGHT_PROCESS>\n\n<EXPLAINABLE_RCA>\n{rca}\n</EXPLAINABLE_RCA>",
            "model": "mock",
            "mode": "mock"
        }

    @staticmethod
    def _extract_block(text: str, tag: str) -> str:
        """Extract content between <TAG> and </TAG>."""
        import re
        pattern = rf"<{tag}>(.*?)</{tag}>"
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        return match.group(1).strip() if match else text.strip()
