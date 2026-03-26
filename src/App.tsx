import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { EducatorSubscriptionProvider } from "@/hooks/useEducatorSubscription";
import { PreferencesProvider } from "@/hooks/usePreferences";
import { useDogs } from "./hooks/useDogs";
import { useIsCoach, useIsShelter } from "./hooks/useCoach";
import { supabase } from "@/integrations/supabase/client";
const AIChatBot = lazy(() => import("@/components/AIChatBot").then(m => ({ default: m.AIChatBot })));
const GuidedTour = lazy(() => import("@/components/GuidedTour").then(m => ({ default: m.GuidedTour })));

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
const AdminGuard = lazy(() => import("./components/AdminGuard").then(m => ({ default: m.AdminGuard })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminTreasury = lazy(() => import("./pages/AdminTreasury"));
const HelpPage = lazy(() => import("./pages/Help"));
const SubscriptionPage = lazy(() => import("./pages/Subscription"));
const CoursesPage = lazy(() => import("./pages/Courses"));
const CoachCalendar = lazy(() => import("./pages/CoachCalendar"));
const CoachSubscription = lazy(() => import("./pages/CoachSubscription"));
const CoachShelterAnimals = lazy(() => import("./pages/CoachShelterAnimals"));
const CoachShelterAnimalEval = lazy(() => import("./pages/CoachShelterAnimalEval"));
const MessagesPage = lazy(() => import("./pages/Messages"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const PreferencesPage = lazy(() => import("./pages/Preferences"));
const ShelterGuard = lazy(() => import("./components/ShelterGuard").then(m => ({ default: m.ShelterGuard })));
const ShelterDashboard = lazy(() => import("./pages/ShelterDashboard"));
const ShelterAnimals = lazy(() => import("./pages/ShelterAnimals"));
const ShelterAnimalDetail = lazy(() => import("./pages/ShelterAnimalDetail"));
const ShelterProfile = lazy(() => import("./pages/ShelterProfile"));
const ShelterMessages = lazy(() => import("./pages/ShelterMessages"));
const ShelterSettings = lazy(() => import("./pages/ShelterSettings"));
const ShelterEmployees = lazy(() => import("./pages/ShelterEmployees"));
const ShelterSpaces = lazy(() => import("./pages/ShelterSpaces"));
const ShelterActivityLog = lazy(() => import("./pages/ShelterActivityLog"));
const ShelterStats = lazy(() => import("./pages/ShelterStats"));
const ShelterSubscription = lazy(() => import("./pages/ShelterSubscription"));
const ShelterCoaches = lazy(() => import("./pages/ShelterCoaches"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Chargement...</div>
  </div>
);

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { data: dogs, isLoading: dogsLoading } = useDogs();
  const { data: isCoach, isLoading: coachLoading } = useIsCoach();
  const { data: isShelter, isLoading: shelterLoading } = useIsShelter();
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is_admin_routing", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });

  if (loading || dogsLoading || coachLoading || shelterLoading || adminLoading) {
    return <PageLoader />;
  }

  if (!user) return <Auth />;

  const hasDogs = dogs && dogs.length > 0;
  const onboardingInProgress = !hasDogs && !isCoach && !isShelter && !isAdmin;

  // Shelter users (but NOT admin) get a completely separate route set
  if (isShelter && !isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/shelter" element={<ShelterGuard><ShelterDashboard /></ShelterGuard>} />
          <Route path="/shelter/animals" element={<ShelterGuard><ShelterAnimals /></ShelterGuard>} />
          <Route path="/shelter/animals/:animalId" element={<ShelterGuard><ShelterAnimalDetail /></ShelterGuard>} />
          <Route path="/shelter/profile" element={<ShelterGuard><ShelterProfile /></ShelterGuard>} />
          <Route path="/shelter/messages" element={<ShelterGuard><ShelterMessages /></ShelterGuard>} />
          <Route path="/shelter/settings" element={<ShelterGuard><ShelterSettings /></ShelterGuard>} />
          <Route path="/shelter/employees" element={<ShelterGuard><ShelterEmployees /></ShelterGuard>} />
          <Route path="/shelter/spaces" element={<ShelterGuard><ShelterSpaces /></ShelterGuard>} />
          <Route path="/shelter/activity" element={<ShelterGuard><ShelterActivityLog /></ShelterGuard>} />
          <Route path="/shelter/stats" element={<ShelterGuard><ShelterStats /></ShelterGuard>} />
          <Route path="/shelter/subscription" element={<ShelterGuard><ShelterSubscription /></ShelterGuard>} />
          <Route path="/shelter/coaches" element={<ShelterGuard><ShelterCoaches /></ShelterGuard>} />
          <Route path="*" element={<Navigate to="/shelter" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={
          onboardingInProgress ? <Navigate to="/onboarding" replace /> :
          (isCoach && !hasDogs) ? <Navigate to="/coach" replace /> :
          <Dashboard />
        } />
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
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/program" element={<Navigate to="/plan" replace />} />
        {/* Coach / Educator routes */}
        <Route path="/coach" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachDashboard /></CoachGuard></Suspense>} />
        <Route path="/coach/clients" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachClients /></CoachGuard></Suspense>} />
        <Route path="/coach/clients/:clientId" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachClients /></CoachGuard></Suspense>} />
        <Route path="/coach/dogs" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachDogs /></CoachGuard></Suspense>} />
        <Route path="/coach/dog/:dogId" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachDogDetail /></CoachGuard></Suspense>} />
        <Route path="/coach/notes" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachNotes /></CoachGuard></Suspense>} />
        <Route path="/coach/stats" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachStats /></CoachGuard></Suspense>} />
        <Route path="/coach/courses" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachCourses /></CoachGuard></Suspense>} />
        <Route path="/coach/calendar" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachCalendar /></CoachGuard></Suspense>} />
        <Route path="/coach/subscription" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachSubscription /></CoachGuard></Suspense>} />
        <Route path="/coach/shelter-animals" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachShelterAnimals /></CoachGuard></Suspense>} />
        <Route path="/coach/shelter-animal/:animalId" element={<Suspense fallback={<PageLoader />}><CoachGuard><CoachShelterAnimalEval /></CoachGuard></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminGuard><AdminDashboard /></AdminGuard></Suspense>} />
        <Route path="/admin/treasury" element={<Suspense fallback={<PageLoader />}><AdminGuard><AdminTreasury /></AdminGuard></Suspense>} />
        {/* Shelter routes for admin access (ShelterGuard allows admin) */}
        <Route path="/shelter" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterDashboard /></ShelterGuard></Suspense>} />
        <Route path="/shelter/animals" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterAnimals /></ShelterGuard></Suspense>} />
        <Route path="/shelter/animals/:animalId" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterAnimalDetail /></ShelterGuard></Suspense>} />
        <Route path="/shelter/profile" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterProfile /></ShelterGuard></Suspense>} />
        <Route path="/shelter/messages" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterMessages /></ShelterGuard></Suspense>} />
        <Route path="/shelter/settings" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterSettings /></ShelterGuard></Suspense>} />
        <Route path="/shelter/employees" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterEmployees /></ShelterGuard></Suspense>} />
        <Route path="/shelter/spaces" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterSpaces /></ShelterGuard></Suspense>} />
        <Route path="/shelter/activity" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterActivityLog /></ShelterGuard></Suspense>} />
        <Route path="/shelter/stats" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterStats /></ShelterGuard></Suspense>} />
        <Route path="/shelter/subscription" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterSubscription /></ShelterGuard></Suspense>} />
        <Route path="/shelter/coaches" element={<Suspense fallback={<PageLoader />}><ShelterGuard><ShelterCoaches /></ShelterGuard></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AIChatBot />
    </Suspense>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
        <SubscriptionProvider>
        <EducatorSubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </Suspense>
            <Suspense fallback={null}><GuidedTour /></Suspense>
          </BrowserRouter>
        </TooltipProvider>
        </EducatorSubscriptionProvider>
        </SubscriptionProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
