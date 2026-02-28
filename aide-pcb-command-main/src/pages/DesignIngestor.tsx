import { useState } from "react";
import { Upload, FileText, CheckCircle, Cpu } from "lucide-react";

const mockProperties = [
  { pin: "VCC", voltage: "3.3V", tolerance: "±5%", type: "Power" },
  { pin: "GND", voltage: "0V", tolerance: "—", type: "Ground" },
  { pin: "D0", voltage: "3.3V", tolerance: "±10%", type: "Digital I/O" },
  { pin: "D1", voltage: "3.3V", tolerance: "±10%", type: "Digital I/O" },
  { pin: "A0", voltage: "0-3.3V", tolerance: "±1%", type: "Analog In" },
  { pin: "CLK", voltage: "3.3V", tolerance: "±50ppm", type: "Clock" },
  { pin: "RST", voltage: "3.3V", tolerance: "±5%", type: "Control" },
  { pin: "TX", voltage: "3.3V", tolerance: "±10%", type: "UART" },
];

export default function DesignIngestor() {
  const [uploaded, setUploaded] = useState(false);
  const [fileData, setFileData] = useState<{ name: string; size: string; content: string | null; type: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    // Format file size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = Number(sizeInMB) > 0 ? `${sizeInMB} MB` : `${(file.size / 1024).toFixed(0)} KB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setTimeout(() => {
        setFileData({
          name: file.name,
          size: sizeStr,
          content: text.slice(0, 5000), // take up to 5000 chars of code
          type: file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT'
        });
        setUploaded(true);
        setIsProcessing(false);
      }, 800);
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <h2 className="text-sm font-mono text-primary uppercase tracking-widest text-glow-cyan">
        Intelligent Design Ingestor
      </h2>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Upload / Preview zone */}
        <div className="flex-1 glass-panel p-4 flex flex-col">
          {!uploaded && !isProcessing ? (
            <label className="flex-1 border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/40 transition-colors">
              <input type="file" className="hidden" accept=".json,.cir,.csv,.txt,.log,.md,.js,.ts" onChange={handleUpload} />
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-mono text-foreground">Click to Drop BOM, Schematic, or Code</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">.json, .cir, .csv, code files supported</p>
              </div>
            </label>
          ) : isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-lg gap-4">
              <Cpu className="w-10 h-10 text-primary animate-pulse" />
              <p className="text-sm font-mono text-primary text-glow-cyan animate-pulse">Ingesting Source Data...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-mono text-foreground">{fileData?.name}</span>
                  <CheckCircle className="w-4 h-4 text-success ml-2" />
                  <span className="text-xs font-mono text-success">Parsed in 0.8s</span>
                </div>
                <button
                  onClick={() => setUploaded(false)}
                  className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer border border-border/30 px-2 py-1 rounded"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 bg-background/80 rounded-lg p-4 flex flex-col items-start border border-border/30 overflow-y-auto">
                {fileData?.content ? (
                  <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground text-left w-full h-full">
                    {fileData.content.length > 3000 ? fileData.content.slice(0, 3000) + "\n... (truncated)" : fileData.content}
                  </pre>
                ) : (
                  <div className="text-center w-full mt-10">
                    <Cpu className="w-16 h-16 text-primary/30 mx-auto mb-3" />
                    <p className="text-xs font-mono text-muted-foreground">Binary Document ingested</p>
                  </div>
                )}
              </div>
              <div className="text-right mt-2 text-[10px] font-mono text-muted-foreground">
                Type: {fileData?.type} • Size: {fileData?.size}
              </div>
            </div>
          )}
        </div>

        {/* AI-extracted properties */}
        <div className="w-96 glass-panel p-4 flex flex-col">
          <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-4 text-glow-cyan">
            AI-Extracted Properties
          </h3>
          {uploaded ? (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground text-[10px] uppercase">
                    <th className="text-left py-2 px-2">Pin</th>
                    <th className="text-left py-2 px-2">Voltage</th>
                    <th className="text-left py-2 px-2">Tolerance</th>
                    <th className="text-left py-2 px-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {mockProperties.map((prop) => (
                    <tr key={prop.pin} className="border-t border-border/30 hover:bg-secondary/30">
                      <td className="py-2 px-2 text-foreground font-semibold">{prop.pin}</td>
                      <td className="py-2 px-2 text-primary">{prop.voltage}</td>
                      <td className="py-2 px-2 text-muted-foreground">{prop.tolerance}</td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground">
                          {prop.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs font-mono text-muted-foreground">Upload a document to extract properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
