import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useGlowStore } from "@/store/glowStore";
import { useAuth } from "./hooks/useAuth";
import { CloudSyncProvider } from "./components/CloudSyncProvider";
import React, { Suspense } from "react";

const Today = React.lazy(() => import('./pages/Today'));
const Plan = React.lazy(() => import('./pages/Plan'));
const Workouts = React.lazy(() => import('./pages/Workouts'));
const WorkoutPlan = React.lazy(() => import('./pages/WorkoutPlan'));
const Exercises = React.lazy(() => import('./pages/Exercises'));
const History = React.lazy(() => import('./pages/History'));
const CreateWorkout = React.lazy(() => import('./pages/CreateWorkout'));
const ActiveWorkout = React.lazy(() => import('./pages/ActiveWorkout'));
const Progress = React.lazy(() => import('./pages/Progress'));
const CoachDashboard = React.lazy(() => import('./pages/CoachDashboard'));
const ProgramBuilder = React.lazy(() => import('./pages/ProgramBuilder'));
const Marketplace = React.lazy(() => import('./pages/Marketplace'));
const ProgramDetail = React.lazy(() => import('./pages/ProgramDetail'));
const Messages = React.lazy(() => import('./pages/Messages'));
const CoachPublicProfile = React.lazy(() => import('./pages/CoachPublicProfile'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const AuthGate = React.lazy(() => import('./pages/AuthGate'));

const queryClient = new QueryClient();

const PageSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AuthenticatedRoutes = () => (
  <Suspense fallback={<PageSpinner />}>
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
      <Route path="/coach/program/new" element={<ProgramBuilder />} />
      <Route path="/coach/:coachId" element={<CoachPublicProfile />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/marketplace/:programId" element={<ProgramDetail />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
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
        {user ? <AuthenticatedRoutes /> : (
          <Suspense fallback={<PageSpinner />}>
            <AuthGate />
          </Suspense>
        )}
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
