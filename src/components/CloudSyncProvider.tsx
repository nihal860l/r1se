import { ReactNode } from 'react';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

// This component initializes cloud sync when user is logged in
export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { pushWorkoutPlan, pushWorkout, pushWorkoutUpdate, pushExercise, pushWorkoutLog, syncDeleteWorkout, syncDeleteExercise, syncDeleteHistory } = useCloudSync();
  const { user } = useAuth();
  const setSyncCallbacks = useWorkoutStore((state) => state.setSyncCallbacks);
  
  useEffect(() => {
    if (user) {
      setSyncCallbacks({
        onPlanUpdated: pushWorkoutPlan,
        onWorkoutAdded: pushWorkout,
        onWorkoutUpdated: pushWorkoutUpdate,
        onWorkoutDeleted: syncDeleteWorkout,
        onExerciseAdded: pushExercise,
        onExerciseDeleted: syncDeleteExercise,
        onHistoryAdded: pushWorkoutLog,
        onHistoryDeleted: syncDeleteHistory,
      });
    }
  }, [user, pushWorkoutPlan, pushWorkout, pushWorkoutUpdate, syncDeleteWorkout, pushExercise, syncDeleteExercise, pushWorkoutLog, syncDeleteHistory, setSyncCallbacks]);

  return <>{children}</>;
}
