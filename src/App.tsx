import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useDogs } from "./hooks/useDogs";

// Eagerly loaded (critical path)
import Auth from "./pages/Auth";

// Lazy loaded pages
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Dogs = lazy(() => import("./pages/Dogs"));
const DogProfile = lazy(() => import("./pages/DogProfile"));
const Evaluation = lazy(() => import("./pages/Evaluation"));
const Problems = lazy(() => import("./pages/Problems"));
const ObjectivesPage = lazy(() => import("./pages/Objectives"));
const PlanPage = lazy(() => import("./pages/Plan"));
const DayDetail = lazy(() => import("./pages/DayDetail"));
const Training = lazy(() => import("./pages/Training"));
const BehaviorLog = lazy(() => import("./pages/BehaviorLog"));
const Journal = lazy(() => import("./pages/Journal"));
const Stats = lazy(() => import("./pages/Stats"));
const Safety = lazy(() => import("./pages/Safety"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const ExerciseLibrary = lazy(() => import("./pages/ExerciseLibrary"));
const ExerciseDetail = lazy(() => import("./pages/ExerciseDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CoachDashboard = lazy(() => import("./pages/CoachDashboard"));
const CoachClients = lazy(() => import("./pages/CoachClients"));
const CoachDogs = lazy(() => import("./pages/CoachDogs"));
const CoachNotes = lazy(() => import("./pages/CoachNotes"));
const CoachDogDetail = lazy(() => import("./pages/CoachDogDetail"));
const CoachStats = lazy(() => import("./pages/CoachStats"));
const CoachCourses = lazy(() => import("./pages/CoachCourses"));
const CoachGuard = lazy(() => import("./components/CoachGuard").then(m => ({ default: m.CoachGuard })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const HelpPage = lazy(() => import("./pages/Help"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Chargement...</div>
  </div>
);

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { data: dogs, isLoading: dogsLoading } = useDogs();

  if (loading || dogsLoading) {
    return <PageLoader />;
  }

  if (!user) return <Auth />;

  const hasDogs = dogs && dogs.length > 0;
  const onboardingInProgress = !hasDogs;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={onboardingInProgress ? <Navigate to="/onboarding" replace /> : <Dashboard />} />
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
        <Route path="/exercises/:slug" element={<ExerciseDetail />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
        {/* Coach / Educator routes — guarded by role */}
        <Route path="/coach" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachDashboard /></CoachGuard></Suspense>} />
        <Route path="/coach/clients" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachClients /></CoachGuard></Suspense>} />
        <Route path="/coach/clients/:clientId" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachClients /></CoachGuard></Suspense>} />
        <Route path="/coach/dogs" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachDogs /></CoachGuard></Suspense>} />
        <Route path="/coach/dog/:dogId" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachDogDetail /></CoachGuard></Suspense>} />
        <Route path="/coach/notes" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachNotes /></CoachGuard></Suspense>} />
        <Route path="/coach/stats" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachStats /></CoachGuard></Suspense>} />
        <Route path="/coach/courses" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachCourses /></CoachGuard></Suspense>} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
