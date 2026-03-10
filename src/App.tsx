import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Program from "./pages/Program";
import DayDetail from "./pages/DayDetail";
import Training from "./pages/Training";
import BehaviorLog from "./pages/BehaviorLog";
import Stats from "./pages/Stats";
import Safety from "./pages/Safety";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/program" element={<Program />} />
          <Route path="/day/:dayId" element={<DayDetail />} />
          <Route path="/training/:dayId" element={<Training />} />
          <Route path="/behavior/:dayId" element={<BehaviorLog />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
