import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useGlowStore } from "@/store/glowStore";
import Today from "./pages/Today";
import Plan from "./pages/Plan";
import Workouts from "./pages/Workouts";
import WorkoutPlan from "./pages/WorkoutPlan";
import Exercises from "./pages/Exercises";
import History from "./pages/History";
import CreateWorkout from "./pages/CreateWorkout";
import ActiveWorkout from "./pages/ActiveWorkout";
import Progress from "./pages/Progress";
import CoachDashboard from "./pages/CoachDashboard";
import NotFound from "./pages/NotFound";
import AuthGate from "./pages/AuthGate";
import { CloudSyncProvider } from "./components/CloudSyncProvider";
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

const AuthenticatedRoutes = () => (
  <Routes>
    <Route path="/" element={<Today />} />
    <Route path="/plan" element={<Plan />} />
    <Route path="/workouts" element={<Workouts />} />
    <Route path="/workout-plan" element={<WorkoutPlan />} />
    <Route path="/exercises" element={<Exercises />} />
    <Route path="/progress" element={<Progress />} />
    <Route path="/history" element={<History />} />
    <Route path="/create-workout" element={<CreateWorkout />} />
    <Route path="/workout/:workoutId" element={<ActiveWorkout />} />
    <Route path="/coach" element={<CoachDashboard />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const AppInner = () => {
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className={`dark${glowEnabled ? ' glow-enabled' : ''}`}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {user ? <AuthenticatedRoutes /> : <AuthGate />}
      </BrowserRouter>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CloudSyncProvider>
          <AppInner />
        </CloudSyncProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
