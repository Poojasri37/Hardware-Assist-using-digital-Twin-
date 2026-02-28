import { useState } from "react";
import { Save, RefreshCw, FileCode } from "lucide-react";

export default function ConfigurationFile() {
    const [yamlConfig, setYamlConfig] = useState(
        `# AIDE-PCB Hardware Configuration

project_name: ESP32-S3-Pico Dew Module
revision: v1.0.2

# Hardware Netlist/BOM References
design_files:
  schematic: "esp32_dew_module_rev1.sch"
  board: "esp32_dew_module_rev1.brd"
  bom: "bom_esp32_dew.csv"
  gerber_dir: "outputs/gerber/"

# Bill of Materials (BOM) Primary Specs
bom:
  MCU: "ESP32-S3R2 (Xtensa Dual-Core 32-bit LX7)"
  RF_Module: "SIM800L (GSM/GPRS)"
  Sensors:
    Temp: "DS18B20 (1-Wire)"
    pH: "Atlas Scientific pH EZO"
  Power: "LM2596 Buck Converter (5V to 3.3V)"

# ESP32 Pin Configuration (Mapping)
pin_configuration:
  I2C_SDA: GPIO8
  I2C_SCL: GPIO9
  SPI_MOSI: GPIO11
  SPI_MISO: GPIO13
  SPI_CLK: GPIO12
  DS18B20_DATA: GPIO4
  SIM800L_TX: GPIO17
  SIM800L_RX: GPIO18
  pH_SENSOR_ANALOG: GPIO3

# Test Limits & Tolerances
test_limits:
  vcc_tolerance_percent: 5.0
  max_current_draw_ma: 600
  thermal_limit_celsius: 65.0
`
    );

    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => setSaving(false), 1000);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-primary uppercase tracking-widest text-glow-cyan flex items-center gap-2">
                    <FileCode className="w-4 h-4" /> Hardware Configuration Files
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs font-mono bg-primary/20 hover:bg-primary/40 text-primary px-4 py-2 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {saving ? "Saving..." : "Save Config"}
                    </button>
                </div>
            </div>

            <div className="flex-1 glass-panel overflow-hidden flex flex-col p-4 relative">
                <textarea
                    className="flex-1 w-full bg-background border border-border/30 rounded p-4 font-mono text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none"
                    value={yamlConfig}
                    onChange={(e) => setYamlConfig(e.target.value)}
                    spellCheck="false"
                />
                {saving && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-primary font-mono text-sm animate-pulse flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Applying Configuration Changes...
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
