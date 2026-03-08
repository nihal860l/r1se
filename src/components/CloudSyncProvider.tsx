import { ReactNode } from 'react';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useSyncProcessor } from '@/hooks/useSyncProcessor';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// This component initializes cloud sync, offline queue processing, and network status
export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { 
    pushWorkoutPlan, pushWorkout, pushWorkoutUpdate, pushExercise, pushWorkoutLog, 
    syncDeleteWorkout, syncDeleteExercise, syncDeleteHistory, syncDeletePlan 
  } = useCloudSync();
  const { user } = useAuth();
  const setSyncCallbacks = useWorkoutStore((state) => state.setSyncCallbacks);

  // Initialize sync queue processor
  useSyncProcessor();
  
  // Track network status (fires app-online/app-offline events)
  useNetworkStatus();
  
  useEffect(() => {
    if (user) {
      setSyncCallbacks({
        onPlanUpdated: pushWorkoutPlan,
        onPlanDeleted: syncDeletePlan,
        onWorkoutAdded: pushWorkout,
        onWorkoutUpdated: pushWorkoutUpdate,
        onWorkoutDeleted: syncDeleteWorkout,
        onExerciseAdded: pushExercise,
        onExerciseDeleted: syncDeleteExercise,
        onHistoryAdded: pushWorkoutLog,
        onHistoryUpdated: pushWorkoutLog, // reuse upsert
        onHistoryDeleted: syncDeleteHistory,
      });
    }
  }, [user, pushWorkoutPlan, syncDeletePlan, pushWorkout, pushWorkoutUpdate, syncDeleteWorkout, pushExercise, syncDeleteExercise, pushWorkoutLog, syncDeleteHistory, setSyncCallbacks]);

  return <>{children}</>;
}
