import { ReactNode } from 'react';
import { useCloudSync } from '@/hooks/useCloudSync';

// This component initializes cloud sync when user is logged in
export function CloudSyncProvider({ children }: { children: ReactNode }) {
  // Initialize cloud sync hooks
  useCloudSync();
  
  return <>{children}</>;
}
