import { useState, useEffect } from "react";
import { Mic } from "lucide-react";

const transcripts = [
  "Checking Power Rail... Status: Nominal",
  "Analyzing TP-5 ripple... 5mV detected",
  "Component U1 temperature within range",
  "Running impedance check on trace R2-C5...",
  "All voltage rails nominal. System healthy.",
  "Detected 2.3% deviation on C5 capacitance",
];

export default function VoiceAssistant() {
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!active) {
      setTranscript("");
      setDisplayedText("");
      return;
    }
    const text = transcripts[Math.floor(Math.random() * transcripts.length)];
    setTranscript(text);
    setDisplayedText("");

    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 40);

    const timeout = setTimeout(() => setActive(false), 4000);
    return () => {
      clearInterval(typeInterval);
      clearTimeout(timeout);
    };
  }, [active]);

  return (
    <div className="glass-panel-strong border-t border-border/40 px-4 py-3 flex items-center gap-4">
      {/* Mic button */}
      <button
        onClick={() => setActive(true)}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          active ? "bg-primary/20 glow-cyan" : "bg-secondary hover:bg-secondary/80"
        }`}
      >
        <Mic className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
        {active && <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />}
      </button>

      {/* Waveform */}
      <div className="flex items-center gap-[3px] h-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full transition-all ${active ? "bg-primary" : "bg-muted"}`}
            style={{
              height: active ? `${4 + Math.sin(Date.now() / 200 + i) * 10 + Math.random() * 8}px` : "4px",
              animation: active ? `waveform ${0.3 + Math.random() * 0.4}s ease-in-out infinite alternate` : "none",
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      {/* Transcript */}
      <div className="flex-1 min-w-0">
        {active && transcript ? (
          <div className="text-xs font-mono text-primary">
            <span className="text-muted-foreground mr-2">AIDE:</span>
            {displayedText}
            <span className="animate-pulse-slow">▊</span>
          </div>
        ) : (
          <span className="text-xs font-mono text-muted-foreground">Click mic to simulate voice command</span>
        )}
      </div>
    </div>
  );
}
