AIDE-PCB: 
AI-Integrated Diagnostic Engine for PCBsAIDE-PCB is a Voice-First, AI-Native Business Operating System and Testing Assistant designed to revolutionize electronics manufacturing. It bridges the gap between complex hardware design and shop-floor execution by utilizing Digital Twins, Augmented Reality, and Neural-Symbolic AI to automate fault diagnosis and optimize first-pass yields.
🚀 Key Features
1. 🧠 Intelligent Design Ingestor (RAG-based)No more manual searching through 100-page manuals.
2. Upload your BOM, Netlist, and PDF Datasheets, and our RAG (Retrieval-Augmented Generation) engine instantly extracts pinouts, voltage rails, and component tolerances.
 2. 🌀 Digital Twin & Virtual Test MappingConstructs a functional Knowledge Graph of your PCB.What-if Simulation: Predict how a component failure propagates through the circuit.
 3. Smart Probing: Identifies Critical Test Nodes to ensure 100% test coverage with 50% fewer physical probes.
👓 AR-Guided "X-Ray" ProbingUsing a smartphone or smart glasses, AIDE-PCB overlays the CAD/Gerber layout onto the physical board
4. .Guided Testing: Highlights the exact component to probe in neon green.Safety First: Flashes red warnings when probes approach high-voltage or sensitive nodes.
5.  🎙️ Voice-First "Hands-Free" Lab AssistantOptimized for the noisy workbench environment. Technicians can ask:"Hey AIDE, what's the expected ripple voltage on the 3.3V rail?"The AI responds instantly, keeping the engineer's hands free for tools.
6.  🔬 Neural-Symbolic Failure DiagnosisGoes beyond error codes to provide Explainable AI (XAI) reports.Logic: Combines Deep Learning (pattern matching) with Symbolic Logic (Ohm’s Law & Kirchhoff’s Laws).Result: "Failure detected at IC-2. Input is 5V, Output is 0V, but Enable is High. Conclusion: Internal gate failure."📊
7. Fleet Intelligence & Batch AnalyticsThe strategic layer for factory managers.Batch Correlation: Detects if a specific production lot has a systemic supplier defect.Tool Drift: Monitors test bench accuracy to prevent false rejects.🛠️ Technical StackComponentTechnologyFrontendReact, Tailwind CSS, Lucide-React (via Lovable)BackendPython (Antigravity), FastAPI, NetworkXAI EngineGemini 3 (Flash), RAG (LangChain)AR LayerOpenCV, Web-ARData LogicNeo4j (Graph DB), WebSocket (Real-time Telemetry)
**🏗️ Architecture Overview**
The system follows a three-tier architecture:
Ingestion Layer: Parses hardware design files into a semantic graph.
Simulation Layer: The Antigravity backend runs nodal analysis to create the Digital Twin.
Interaction Layer: The Lovable frontend provides the AR, Voice, and Diagnostic interface.
**🏁 Getting StartedPrerequisites**
Python 3.10+
Node.js 18+
Google Gemini API
** KeyInstallationClone**
 git clone https://github.com/your-username/aide-pcb.git
Setup Backend (Antigravity):cd backend
pip install -r requirements.txt
uvicorn main:app --reload
Setup Frontend (Lovable):Bashcd frontend
npm install
npm run dev
built by 
Poojasri M
poojasrinirmalamanickam@gmail.com
🤝 AcknowledgementsWe express our deepest gratitude to our mentor, Dr. R. Monisha, Ph.D. (AI), for her invaluable guidance in neural-symbolic reasoning and system design. Special thanks to the Department of AI & Data Science at Karpagam College of Engineering and the TN Impact Summit organizers for fostering industrial innovation.📜 LicenseThis project is licensed under the MIT License.
