import { useCallback, useRef } from 'react';

export function useUndoHistory<T>(maxHistory = 50) {
  const history = useRef<T[]>([]);
  const canUndo = history.current.length > 0;

  const pushState = useCallback((state: T) => {
    history.current = [...history.current.slice(-(maxHistory - 1)), structuredClone(state)];
  }, [maxHistory]);

  const undo = useCallback((): T | null => {
    if (history.current.length === 0) return null;
    const previous = history.current.pop()!;
    return structuredClone(previous);
  }, []);

  const clear = useCallback(() => {
    history.current = [];
  }, []);

  return { pushState, undo, canUndo, clear, historyLength: history.current.length };
}
