import { ReactNode } from 'react';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

// This component initializes cloud sync when user is logged in
export function CloudSyncProvider({ children }: { children: ReactNode }) {
  // Initialize cloud sync hooks
  const { pushWorkoutPlan } = useCloudSync();
  const { user } = useAuth();
  const setSyncCallbacks = useWorkoutStore((state) => state.setSyncCallbacks);
  
  // Set up sync callbacks for plan updates
  useEffect(() => {
    if (user) {
      setSyncCallbacks({
        onPlanUpdated: pushWorkoutPlan,
      });
    }
  }, [user, pushWorkoutPlan, setSyncCallbacks]);

  return <>{children}</>;
}
