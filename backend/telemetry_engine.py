"""
AIDE-PCB Backend - Telemetry Stream Generator
=============================================
Produces realistic, physics-constrained real-time telemetry packets.
Simulates sensor noise, thermal effects, and fault propagation.
"""

from __future__ import annotations
import asyncio
import random
import math
import time
import logging
from typing import Optional
from dataclasses import dataclass, field, asdict

logger = logging.getLogger("aide_pcb.telemetry")


@dataclass
class TelemetryPacket:
    """
    A single real-time telemetry reading sent over WebSocket.
    Contains sensor data + AR overlay coordinates + fault status.
    """
    timestamp:    float
    sequence:     int
    test_point:   str
    node:         str
    voltage:      float
    current:      float
    temperature:  float
    fault_status: str        # "NOMINAL" | "WARNING" | "FAULT"
    anomaly_code: Optional[str]
    AR_Coordinates: dict     # {"x": int, "y": int, "label": str, "color": str}
    signal_quality: float    # 0.0–1.0
    power_watts:  float


class TelemetryEngine:
    """
    Generates a continuous stream of telemetry packets for all test points.
    Applies Gaussian noise, drift, and fault-state voltage collapse.
    """

    # Nominal readings per test point
    NOMINAL = {
        "TP-1": {"node": "VCC",      "v": 3.30, "i": 0.165, "temp": 42.0, "x": 320, "y": 80,  "color": "#22d3ee"},
        "TP-2": {"node": "GND",      "v": 0.00, "i": 0.000, "temp": 35.0, "x": 320, "y": 480, "color": "#64748b"},
        "TP-3": {"node": "ADC_IN",   "v": 2.48, "i": 0.010, "temp": 40.0, "x": 180, "y": 360, "color": "#fbbf24"},
        "TP-4": {"node": "CLK_OUT",  "v": 3.28, "i": 0.120, "temp": 45.0, "x": 500, "y": 150, "color": "#34d399"},
        "TP-5": {"node": "N8",       "v": 5.02, "i": 1.200, "temp": 58.0, "x": 420, "y": 340, "color": "#fb923c"},
        "TP-6": {"node": "USB_VBUS", "v": 5.00, "i": 0.800, "temp": 44.0, "x": 60,  "y": 80,  "color": "#a78bfa"},
    }

    def __init__(self):
        self._sequence   = 0
        self._start_time = time.time()
        self._faults: dict[str, dict] = {}   # node → fault config
        self._time_offsets: dict[str, float] = {
            tp: random.uniform(0, 2 * math.pi) for tp in self.NOMINAL
        }

    def inject_fault(self, node: str, fault_type: str, severity: float = 1.0):
        """Signal a fault to the telemetry engine for a given node."""
        self._faults[node] = {"type": fault_type, "severity": severity}
        logger.warning(f"Telemetry fault active: {fault_type} on {node}")

    def clear_fault(self, node: str):
        """Remove a telemetry fault."""
        self._faults.pop(node, None)

    def generate_packet(self, tp_ref: str) -> TelemetryPacket:
        """Generate a single physics-realistic telemetry packet."""
        self._sequence += 1
        nom  = self.NOMINAL.get(tp_ref, self.NOMINAL["TP-1"])
        node = nom["node"]
        t    = time.time() - self._start_time
        phi  = self._time_offsets.get(tp_ref, 0.0)

        # ── Base sensor simulation with noise ─────────────────────────────
        noise_v   = random.gauss(0, nom["v"] * 0.005 + 0.001)   # 0.5% Gaussian noise
        noise_i   = random.gauss(0, nom["i"] * 0.008 + 0.0001)
        noise_t   = random.gauss(0, 0.3)                         # ±0.3°C thermal noise
        ripple    = math.sin(2 * math.pi * 0.2 * t + phi) * (nom["v"] * 0.002)  # 0.2Hz ripple

        measured_v   = nom["v"] + noise_v + ripple
        measured_i   = max(0.0, nom["i"] + noise_i)
        measured_t   = nom["temp"] + noise_t + (t * 0.01)  # slow thermal rise

        fault_status  = "nominal"
        anomaly_code  = None
        color         = nom["color"]

        # ── Apply active fault ────────────────────────────────────────────
        fault = self._faults.get(node)
        if fault:
            ftype    = fault["type"]
            severity = fault.get("severity", 1.0)

            if ftype == "short":
                # Voltage collapses toward 0 with noise
                measured_v   = random.gauss(0.02, 0.01) * severity
                measured_i   = nom["i"] * 8.0 * severity  # spike current
                measured_t   = nom["temp"] + 40 * severity
                fault_status  = "critical"
                anomaly_code  = "SHORT_TO_GND"
                color         = "#ef4444"  # Red

            elif ftype == "open":
                # Voltage floats, current drops to ~0
                measured_v   = random.gauss(nom["v"] * 0.05, 0.05)
                measured_i   = random.gauss(0.0, 0.0005)
                fault_status  = "critical"
                anomaly_code  = "OPEN_CIRCUIT"
                color         = "#f97316"  # Orange

            elif ftype == "drift":
                # Gradual voltage drop due to increased resistance
                drift_pct = 0.20 * severity  # 20% drift
                measured_v   = nom["v"] * (1.0 - drift_pct) + noise_v
                measured_t   = nom["temp"] + 15 * severity
                fault_status  = "warning"
                anomaly_code  = "COMPONENT_DRIFT"
                color         = "#f59e0b"  # Amber

        elif abs(measured_v - nom["v"]) > nom["v"] * 0.05:
            fault_status = "warning"
            anomaly_code = "THRESHOLD_EXCEEDED"
            color = "#f59e0b"

        power_w = round(abs(measured_v * measured_i), 4)

        return TelemetryPacket(
            timestamp=round(time.time(), 3),
            sequence=self._sequence,
            test_point=tp_ref,
            node=node,
            voltage=round(measured_v, 4),
            current=round(measured_i, 4),
            temperature=round(measured_t, 2),
            fault_status=fault_status,
            anomaly_code=anomaly_code,
            AR_Coordinates={"x": nom["x"], "y": nom["y"], "label": f"{tp_ref} — {node}", "color": color},
            signal_quality=round(1.0 - abs(noise_v / (nom["v"] + 0.001)), 3),
            power_watts=power_w
        )

    async def stream_all(self, interval: float = 2.0):
        """
        Async generator: yields a list of telemetry packets for all test points.
        Use this in the WebSocket handler.
        """
        while True:
            packets = [
                asdict(self.generate_packet(tp))
                for tp in self.NOMINAL.keys()
            ]
            yield packets
            await asyncio.sleep(interval)
