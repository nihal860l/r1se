import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSyncQueueStore, SyncQueueItem } from '@/store/syncQueueStore';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Processes the offline sync queue when the device comes back online.
 * Runs queued operations in order and removes them on success.
 */
export function useSyncProcessor() {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const queue = useSyncQueueStore((s) => s.queue);
  const dequeue = useSyncQueueStore((s) => s.dequeue);
  const incrementRetry = useSyncQueueStore((s) => s.incrementRetry);
  const processing = useRef(false);

  const processQueue = useCallback(async () => {
    if (!user || !isOnline || processing.current || queue.length === 0) return;

    processing.current = true;

    // Process in order of creation
    const sorted = [...queue].sort((a, b) => a.createdAt - b.createdAt);

    for (const item of sorted) {
      try {
        await processItem(item);
        dequeue(item.id);
      } catch (error) {
        console.error(`Sync queue item failed (${item.table}/${item.operation}):`, error);
        incrementRetry(item.id);
      }
    }

    processing.current = false;
  }, [user, isOnline, queue, dequeue, incrementRetry]);

  // Process when coming back online
  useEffect(() => {
    const handleOnline = () => {
      // Small delay to let the connection stabilize
      setTimeout(() => processQueue(), 1500);
    };

    window.addEventListener('app-online', handleOnline);
    return () => window.removeEventListener('app-online', handleOnline);
  }, [processQueue]);

  // Also process on mount if online and queue has items
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      processQueue();
    }
  }, [isOnline, queue.length, processQueue]);
}

async function processItem(item: SyncQueueItem) {
  const table = item.table as string;
  
  if (item.operation === 'upsert') {
    const { error } = await (supabase as any)
      .from(table)
      .upsert(item.payload);
    if (error) throw error;
  } else if (item.operation === 'delete') {
    let query = (supabase as any).from(table).delete();
    
    for (const [key, value] of Object.entries(item.payload)) {
      query = query.eq(key, value);
    }
    
    const { error } = await query;
    if (error) throw error;
  }
}
