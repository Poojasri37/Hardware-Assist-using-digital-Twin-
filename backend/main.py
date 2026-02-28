"""
AIDE-PCB Backend - FastAPI Application
=======================================
Provides:
  • GET  /api/circuit/summary        – Circuit graph topology
  • GET  /api/circuit/nodes/{node}   – Node neighbor information  
  • POST /api/circuit/verify         – Verify test point readings
  • POST /api/circuit/fault          – Inject a fault
  • DELETE /api/circuit/fault/{comp} – Clear a fault
  • POST /api/diagnose               – Run AI Diagnostician
  • GET  /api/ar-coords              – Fetch AR coordinate map
  • WS   /ws/telemetry               – Real-time telemetry stream
"""

from __future__ import annotations
import asyncio
import json
import logging
import os
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Local modules
from circuit_engine import CircuitSimulator
from diagnostician import Diagnostician
from telemetry_engine import TelemetryEngine

# ─────────────────────────────────────────────────────────────────────────────
# Logging setup
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("aide_pcb.api")

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR    = Path(__file__).parent
NETLIST     = BASE_DIR / "netlist" / "stm32_board.cir"
AR_COORDS   = BASE_DIR / "netlist" / "ar_coordinates.json"

# ─────────────────────────────────────────────────────────────────────────────
# App & Service Initialization
# ─────────────────────────────────────────────────────────────────────────────

# Shared service instances
circuit: CircuitSimulator = None
diag:    Diagnostician    = None
tel:     TelemetryEngine  = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global circuit, diag, tel
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("  AIDE-PCB Intelligence Layer — Starting Up")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    circuit = CircuitSimulator(NETLIST, AR_COORDS)
    diag    = Diagnostician(api_key=os.environ.get("GEMINI_API_KEY"))
    tel     = TelemetryEngine()
    logger.info("✅ Circuit engine, Diagnostician, and Telemetry ready.")
    yield

app = FastAPI(
    title       = "AIDE-PCB Intelligence Layer",
    description = "AI-powered PCB diagnostics, fault injection, and real-time telemetry",
    version     = "1.0.0",
    docs_url    = "/api/docs",
    redoc_url   = "/api/redoc",
    lifespan    = lifespan
)

# Allow all origins for local dev (tighten in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins    = ["*"],
    allow_methods    = ["*"],
    allow_headers    = ["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Request/Response Models
# ─────────────────────────────────────────────────────────────────────────────

class VerifyRequest(BaseModel):
    test_point: str      # e.g. "TP-1"
    measured_v: float    # Measured voltage (V)
    measured_i: float    # Measured current (A)

class FaultRequest(BaseModel):
    component:    str             # e.g. "R2" or "R_U1"
    fault_type:   str = "short"   # "open" | "short" | "drift"
    drift_factor: float = 0.25    # Only used for drift faults

class DiagnoseRequest(BaseModel):
    verification_results: list[dict]
    fault_info:           Optional[dict] = None


# ─────────────────────────────────────────────────────────────────────────────
# REST Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/circuit/summary", summary="Circuit graph topology")
def get_circuit_summary():
    """Return the full circuit graph summary including all components and nodes."""
    return circuit.graph_summary()


@app.get("/api/circuit/nodes/{node}", summary="Node neighbor info")
def get_node_neighbors(node: str):
    """List all components connected to a specific netlist node."""
    neighbors = circuit.node_neighbors(node.upper())
    ar        = circuit.ar_coords.get(node.upper(), {})
    return {"node": node.upper(), "neighbors": neighbors, "ar_coords": ar}


@app.post("/api/circuit/verify", summary="Verify test point readings")
def verify_test_point(req: VerifyRequest):
    """
    Apply Ohm's Law + KCL to verify measured values against expected circuit behavior.
    Returns pass/warn/fail status with physical explanation.
    """
    try:
        result = circuit.verify_logic(
            test_point_ref=req.test_point,
            measured_v=req.measured_v,
            measured_i=req.measured_i
        )
        return asdict(result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/circuit/fault", summary="Inject a virtual fault")
def inject_fault(req: FaultRequest):
    """
    Inject a fault into the circuit graph simulation.
    - open: removes the component edge (open circuit)
    - short: connects node to GND with ≈0Ω resistance
    - drift: increases component value by drift_factor
    Also signals the telemetry engine to reflect the fault.
    """
    result = circuit.inject_fault(
        component_ref=req.component,
        fault_type=req.fault_type,
        drift_factor=req.drift_factor
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # Mirror fault to telemetry engine
    affected_node = result.get("node_b", "")
    tel.inject_fault(affected_node, req.fault_type)

    logger.warning(f"API: Fault injected — {req.fault_type.upper()} on {req.component}")
    return {"status": "fault_injected", "detail": result}


@app.delete("/api/circuit/fault/{component}", summary="Clear a fault")
def clear_fault(component: str):
    """Remove an injected fault and restore the component to its nominal state."""
    circuit.clear_fault(component)
    # Clear all telemetry faults on restore
    for node in list(tel._faults.keys()):
        tel.clear_fault(node)
    return {"status": "fault_cleared", "component": component}


@app.post("/api/diagnose", summary="Run AI Diagnostician (RCA)")
async def run_diagnosis(req: DiagnoseRequest):
    """
    Send verification results to The Diagnostician (Gemini).
    Returns THOUGHT_PROCESS and EXPLAINABLE_RCA blocks.
    """
    try:
        summary = circuit.graph_summary()
        result  = await diag.diagnose(
            verification_results=req.verification_results,
            netlist_summary=summary,
            fault_info=req.fault_info
        )
        logger.info(f"Diagnosis complete. Mode: {result.get('mode')}. Model: {result.get('model')}")
        return result
    except Exception as e:
        import traceback
        with open("diag_crash.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ar-coords", summary="Fetch AR coordinate map")
def get_ar_coords():
    """Return the full AR coordinate map for the frontend overlay layer."""
    return circuit.ar_coords


@app.get("/api/health", summary="Health check")
def health_check():
    return {
        "status": "ok",
        "circuit_nodes": circuit.graph.number_of_nodes(),
        "circuit_edges": circuit.graph.number_of_edges(),
        "active_faults": len(circuit.faults),
        "telemetry_faults": len(tel._faults),
    }


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket — Real-Time Telemetry Stream
# ─────────────────────────────────────────────────────────────────────────────

class ConnectionManager:
    """Manages active WebSocket connections."""
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"WebSocket connected. Active clients: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        logger.info(f"WebSocket disconnected. Active clients: {len(self.active)}")

    async def broadcast(self, data: str):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@app.websocket("/ws/telemetry")
async def websocket_telemetry(ws: WebSocket):
    """
    Real-Time Telemetry WebSocket endpoint.

    Streams JSON packets every 2 seconds containing:
    - Voltage, Current, Temperature for all 6 test points
    - Fault_Status and anomaly codes
    - AR_Coordinates for frontend overlay positioning
    """
    await manager.connect(ws)
    try:
        async for packets in tel.stream_all(interval=2.0):
            payload = json.dumps({
                "type":    "telemetry",
                "packets": packets
            })
            await ws.send_text(payload)

            # Also listen for any incoming commands from the frontend
            try:
                # Non-blocking check for incoming messages
                data = await asyncio.wait_for(ws.receive_text(), timeout=0.05)
                cmd  = json.loads(data)
                logger.info(f"WS command received: {cmd}")

                if cmd.get("action") == "inject_fault":
                    node       = cmd.get("node", "")
                    fault_type = cmd.get("fault_type", "short")
                    tel.inject_fault(node, fault_type)
                    circuit.inject_fault(cmd.get("component", "R_U1"), fault_type)

                elif cmd.get("action") == "clear_fault":
                    node = cmd.get("node", "")
                    tel.clear_fault(node)

            except asyncio.TimeoutError:
                pass  # No message from client; continue streaming

    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(ws)


@app.websocket("/ws/voice")
async def websocket_voice(ws: WebSocket):
    """
    Simulated Voice Assistant endpoint.
    Receives text queries, passes them to Gemini with current circuit context,
    and returns textual responses.
    """
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            cmd = json.loads(data)
            query = cmd.get("query", "")
            
            logger.info(f"Voice query received: {query}")
            
            summary = circuit.graph_summary()
            faults = circuit.faults
            fault_list = list(faults.keys()) if faults else "None"
            
            if diag._client:
                prompt = f"""
You are the AIDE-PCB voice assistant interacting with the user verbally. 
Current Circuit State:
- Nodes: {len(summary.get('nodes', []))}
- Active Faults: {len(faults)} ({fault_list})

Additionally, you have access to the Strategic Architecture for Intelligent Logistics: A Framework for Innovation in the LogisticsNow Hackathon 2026.
Knowledge base:
- Indian Logistics Transformation: Moving to reduce logistics costs to 9% of GDP. Market size $484.43B by 2029.
- Agentic AI Framework: Shifting from predictive to autonomous. 4 Phases: First Insights, Parallel Insights, Suggested Execution, Autonomous Execution.
- Multi-Agent Architecture: Logistics Agent (fleet/routing), Inventory Agent (stock/shrinkage), Sourcing Agent (vendors).
- Tech Stack: CrewAI, LangGraph, Microsoft AutoGen, Real-time IoT, ULIP APIs (VAHAN, SARATHI, ICEGATE).
- Objectives: 20% reduction in transport costs, 35% improvement in inventory turnover.

User verbal query: "{query}"

Respond concisely (1-3 sentences max) as a helpful AI assistant. Answer ANY questions about the circuit OR the LogisticsNow Hackathon framework described above. Do not use markdown. Keep it conversational and verbal.
"""
                try:
                    res = diag._client.models.generate_content(
                        model=diag.MODEL_ID,
                        contents=prompt,
                    )
                    reply = res.text.strip()
                except Exception as e:
                    logger.error(f"Voice AI error: {e}")
                    reply = "I'm sorry, my neural link is currently down."
            else:
                reply = "I am in offline mode. Please configure my API key for live analysis."
                
            await ws.send_text(json.dumps({
                "type": "voice_reply",
                "text": reply
            }))
            
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception as e:
        logger.error(f"Voice websocket error: {e}")
        manager.disconnect(ws)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
 
