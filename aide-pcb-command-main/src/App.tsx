import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DigitalTwin from "./pages/DigitalTwin";
import FleetIntelligence from "./pages/FleetIntelligence";
import DesignIngestor from "./pages/DesignIngestor";
import Diagnosis from "./pages/Diagnosis";
import LiveTest from "./pages/LiveTest";
import ArVision from "./pages/ArVision";
import TestReportGenerator from "./pages/TestReportGenerator";
import DataReportGenerator from "./pages/DataReportGenerator";
import PlanGenerator from "./pages/PlanGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DigitalTwin />} />
            <Route path="/ingestor" element={<DesignIngestor />} />
            <Route path="/live-test" element={<LiveTest />} />
            <Route path="/diagnosis" element={<Diagnosis />} />
            <Route path="/fleet" element={<FleetIntelligence />} />
            <Route path="/ar-vision" element={<ArVision />} />
            <Route path="/voice" element={<ArVision />} />
            <Route path="/reports" element={<DataReportGenerator />} />
            <Route path="/planning" element={<PlanGenerator />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
