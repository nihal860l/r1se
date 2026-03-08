import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SyncQueueItem {
  id: string;
  table: 'workouts' | 'exercises' | 'workout_history' | 'workout_plans' | 'active_sessions';
  operation: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

interface SyncQueueState {
  queue: SyncQueueItem[];
  enqueue: (item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>) => void;
  dequeue: (id: string) => void;
  incrementRetry: (id: string) => void;
  clearQueue: () => void;
}

const MAX_RETRIES = 5;

export const useSyncQueueStore = create<SyncQueueState>()(
  persist(
    (set) => ({
      queue: [],

      enqueue: (item) =>
        set((state) => {
          // Deduplicate: if same table + operation + matching key exists, replace it
          const key = getDedupeKey(item);
          const filtered = state.queue.filter((q) => getDedupeKey(q) !== key);
          return {
            queue: [
              ...filtered,
              {
                ...item,
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                retries: 0,
              },
            ],
          };
        }),

      dequeue: (id) =>
        set((state) => ({
          queue: state.queue.filter((q) => q.id !== id),
        })),

      incrementRetry: (id) =>
        set((state) => ({
          queue: state.queue
            .map((q) => (q.id === id ? { ...q, retries: q.retries + 1 } : q))
            .filter((q) => q.retries <= MAX_RETRIES),
        })),

      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: 'sync-queue-storage',
    }
  )
);

function getDedupeKey(item: Pick<SyncQueueItem, 'table' | 'operation' | 'payload'>): string {
  // Use table + operation + identifying field for deduplication
  const idField =
    item.payload.workout_id ||
    item.payload.exercise_id ||
    item.payload.history_id ||
    item.payload.plan_id ||
    item.payload.user_id ||
    '';
  return `${item.table}:${item.operation}:${idField}`;
}
