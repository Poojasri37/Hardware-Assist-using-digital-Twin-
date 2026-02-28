# AIDE-PCB Intelligence Layer: System Architecture

The Intelligence Layer serves as the backend brain for the AIDE-PCB platform. It parses circuit netlists into mathematical graphs, simulates physical electronic laws (Ohm's, Kirchhoff's) in real-time, injects faults for digital twin scenarios, and uses a Neural-Symbolic AI Agent to perform root cause analysis.

## 🏗️ Core Components

### 1. `circuit_engine.py` (CircuitSimulator)
- **Netlist Parser:** Reads SPICE-style `.cir` files defining the circuit topology, connections, and metadata.
- **Graph Representation:** Uses `networkx` Directed Graphs to track nodes and components.
- **Verification Logic (`verify_logic`):** Probes a given test point and strictly validates the sensor reading against Ohm's Law (V=IR) and Kirchhoff's Current Law (ΣI_in = ΣI_out). Any discrepancy triggers a flag.
- **Fault Injection:** Supports simulating `short`, `open`, and `drift` physical anomalies (e.g., adding a 0.001Ω path to GND for a short circuit).

### 2. `telemetry_engine.py` (TelemetryEngine)
- **Physics Simulation:** Instead of static flat lines, it calculates Gaussian noise (±0.5%), slow thermal drift, and a 0.2Hz baseline voltage ripple for realism.
- **Fault Reflection:** If the `circuit_engine` injects a fault, the telemetry stream mathematically collapses the voltage and spikes the current proportionally to the fault type.
- **AR Coordinate Mapper:** Bundles spatial (x, y) overlay coordinates from `ar_coordinates.json` into each telemetry frame to power the frontend "Augmented Reality" viewer.

### 3. `diagnostician.py` (The Diagnostician)
- **Neural-Symbolic AI Reasoning:** Configured with Google's Gemini SDK. It does not blindly guess; instead, it is explicitly prompted to formulate step-by-step physical reasoning combining sensor telemetry and circuit connectivity.
- **Explainable RCA:** Enforces a rigid `<THOUGHT_PROCESS>` + `<EXPLAINABLE_RCA>` structured output. In cases of quota limits or connectivity drops, smoothly degrades to a highly detailed local mock generator.

### 4. `main.py` (FastAPI Server)
Acts as the central integration layer between the React UI and the Python engine:
- **`WS /ws/telemetry`**: A 2Hz real-time websocket stream pushing telemetry updates to the Lovable React frontend.
- **`POST /api/circuit/fault`**: Exposes manual fault-injection to the user interface.
- **`POST /api/diagnose`**: Orchestrates sending off an anomaly to the Diagnostician agent.

## 🚀 Data Flow (Example: Short to GND on VCC)

1. **User Action:** Clicks "Inject Fault: Short Circuit on U1" in the React UI (`POST /api/circuit/fault`).
2. **Circuit Simulation:** The backend graph engine adds a 0.001Ω edge from VCC to GND.
3. **Telemetry Update:** The Telemetry generator senses the short. The next `WebSocket` frame drops VCC from 3.3V down to ~0.04V and increases current reading to 6.5A.
4. **Validation:** React UI observes the warning and pings `POST /api/circuit/verify`. `circuit_engine` detects a severe KCL anomaly.
5. **AI Root Cause:** The React UI pushes the KCL anomaly to `POST /api/diagnose`. The AI model calculates Ohm's Law manually in its thought process and declares: "FAILED COMPONENT: R_U1. FAILURE MODE: SHORT_TO_GND."
6. **UI Render:** Frontend displays the `<EXPLAINABLE_RCA>` block and marks `AR_Coordinates (320, 80)` with a red failure ring.

## 🛠️ Verification Artifact
The end-to-end trace of a 5V/3.3V "Short to Ground" simulated collapse was verified successfully in `test_simulation.py`, yielding accurate physical behavior and generating `test_report.json`.
