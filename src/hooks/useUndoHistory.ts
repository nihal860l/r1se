import { useState, useCallback, useRef } from 'react';

interface UndoState<T> {
  canUndo: boolean;
  pushState: (state: T) => void;
  undo: () => T | null;
  clear: () => void;
}

export function useUndoHistory<T>(maxHistory = 50): UndoState<T> {
  const historyRef = useRef<T[]>([]);
  const [length, setLength] = useState(0);

  const pushState = useCallback((state: T) => {
    historyRef.current = [
      ...historyRef.current.slice(-(maxHistory - 1)),
      JSON.parse(JSON.stringify(state)),
    ];
    setLength(historyRef.current.length);
  }, [maxHistory]);

  const undo = useCallback((): T | null => {
    if (historyRef.current.length === 0) return null;
    const previous = historyRef.current.pop()!;
    setLength(historyRef.current.length);
    return JSON.parse(JSON.stringify(previous));
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    setLength(0);
  }, []);

  return { canUndo: length > 0, pushState, undo, clear };
}
