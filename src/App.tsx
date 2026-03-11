import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Dogs from "./pages/Dogs";
import DogProfile from "./pages/DogProfile";
import Evaluation from "./pages/Evaluation";
import Problems from "./pages/Problems";
import ObjectivesPage from "./pages/Objectives";
import PlanPage from "./pages/Plan";
import DayDetail from "./pages/DayDetail";
import Training from "./pages/Training";
import BehaviorLog from "./pages/BehaviorLog";
import Journal from "./pages/Journal";
import Stats from "./pages/Stats";
import Safety from "./pages/Safety";
import ProfilePage from "./pages/Profile";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dogs" element={<Dogs />} />
      <Route path="/dogs/:dogId" element={<DogProfile />} />
      <Route path="/evaluation" element={<Evaluation />} />
      <Route path="/problems" element={<Problems />} />
      <Route path="/objectives" element={<ObjectivesPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/day/:dayId" element={<DayDetail />} />
      <Route path="/training" element={<Training />} />
      <Route path="/training/:dayId" element={<Training />} />
      <Route path="/behavior/:dayId" element={<BehaviorLog />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/exercises" element={<ExerciseLibrary />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
