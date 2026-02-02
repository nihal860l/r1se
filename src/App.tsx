import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Exercises from "./pages/Exercises";
import History from "./pages/History";
import CreateWorkout from "./pages/CreateWorkout";
import ActiveWorkout from "./pages/ActiveWorkout";
import NotFound from "./pages/NotFound";
import { CloudSyncProvider } from "./components/CloudSyncProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CloudSyncProvider>
          <div className="dark">
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/exercises" element={<Exercises />} />
                <Route path="/history" element={<History />} />
                <Route path="/create-workout" element={<CreateWorkout />} />
                <Route path="/workout/:workoutId" element={<ActiveWorkout />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </CloudSyncProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
