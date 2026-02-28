import { useState, useEffect, useRef } from "react";
import { Mic, Loader2, Play } from "lucide-react";
import { WS_URL } from "@/services/api"; // Reuse WS_URL string logic

interface VoiceAssistantProps {
  continuousGuide?: string[];
}

export default function VoiceAssistant({ continuousGuide }: VoiceAssistantProps) {
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Connect to the voice websocket on mount
  useEffect(() => {
    // If we're in continuous guide mode, don't use WS
    if (continuousGuide && continuousGuide.length > 0) return;

    const ws = new WebSocket(WS_URL.replace("/ws/telemetry", "/ws/voice"));

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "voice_reply" && data.text) {
          setLoading(false);
          setTranscript(data.text);
          speakText(data.text);
          animateText(data.text, () => {
            setTimeout(() => setActive(false), 5000);
          });
        }
      } catch (e) {
        console.error("Failed to parse voice reply", e);
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [continuousGuide]);

  // Helper to animate text
  const animateText = (text: string, onComplete?: () => void) => {
    setDisplayedText("");
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
        if (onComplete) onComplete();
      }
    }, 35);
  };

  // Continuous Guide Mode Logic
  useEffect(() => {
    if (!continuousGuide || continuousGuide.length === 0 || !active) return;

    let isCancelled = false;
    let stepIndex = 0;

    const playNextStep = () => {
      if (isCancelled) return;
      setLoading(false);
      const stepText = continuousGuide[stepIndex];
      setTranscript(stepText);
      speakText(stepText);
      animateText(stepText, () => {
        // Wait 4 seconds between steps
        setTimeout(() => {
          if (!isCancelled) {
            stepIndex = (stepIndex + 1) % continuousGuide.length;
            playNextStep();
          }
        }, 4000);
      });
    };

    playNextStep();

    return () => {
      isCancelled = true;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [continuousGuide, active]);

  const handleSendQuery = (query: string) => {
    setActive(true);
    setLoading(true);
    setTranscript("");
    setDisplayedText("");

    if (continuousGuide && continuousGuide.length > 0) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ query }));
    } else {
      setLoading(false);
      setTranscript("WebSocket offline.");
      setDisplayedText("WebSocket offline. Cannot reach AI.");
      setTimeout(() => setActive(false), 3000);
    }
  };

  const handleClick = () => {
    if (!active) {
      setActive(true);
      if (continuousGuide && continuousGuide.length > 0) {
        setLoading(true);
        // Handled by the continuous guide useEffect
        return;
      }

      const prompts = [
        "What is the system status?",
        "Are there any active faults on the PCB?",
        "What is the LogisticNow Hackathon framework?",
        "Tell me about the Agentic AI phases.",
        "How can AI improve inventory turnover?"
      ];
      handleSendQuery(prompts[Math.floor(Math.random() * prompts.length)]);
    } else {
      setActive(false);
      setTranscript("");
      setDisplayedText("");
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customInput.trim()) {
      handleSendQuery(customInput.trim());
      setCustomInput("");
    }
  };

  return (
    <div className="glass-panel-strong border-t border-border/40 px-4 py-3 flex items-center gap-4">
      {/* Mic button */}
      <button
        onClick={handleClick}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${active ? "bg-primary/20 glow-cyan" : "bg-secondary hover:bg-secondary/80"
          }`}
      >
        {loading && active ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : continuousGuide && continuousGuide.length > 0 && !active ? (
          <Play className="w-5 h-5 text-primary ml-1" />
        ) : (
          <Mic className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
        )}
        {(active && !loading) && <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />}
      </button>

      {/* Waveform */}
      <div className="flex items-center gap-[3px] h-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full transition-all ${active && !loading ? "bg-primary" : "bg-muted"}`}
            style={{
              height: active && !loading ? `${4 + Math.sin(Date.now() / 200 + i) * 10 + Math.random() * 8}px` : "4px",
              animation: active && !loading ? `waveform ${0.3 + Math.random() * 0.4}s ease-in-out infinite alternate` : "none",
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      {/* Transcript or Input */}
      <div className="flex-1 min-w-0 flex items-center">
        {active ? (
          <div className="text-xs font-mono text-primary w-full break-normal text-ellipsis overflow-hidden whitespace-nowrap">
            <span className="text-muted-foreground mr-2">AIDE:</span>
            {loading ? "Listening & analyzing..." : displayedText}
            {(!loading && active) && <span className="animate-pulse-slow">▊</span>}
          </div>
        ) : continuousGuide && continuousGuide.length > 0 ? (
          <span className="text-xs font-mono text-muted-foreground animate-pulse">Click play to start AR Voice Guide for Temp Sensor Connection</span>
        ) : (
          <input
            type="text"
            className="w-full bg-transparent border-none focus:outline-none text-xs font-mono text-foreground placeholder:text-muted-foreground/70"
            placeholder="Type a question (e.g., 'What is the Hackathon framework?') or click mic..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>
    </div>
  );
}
