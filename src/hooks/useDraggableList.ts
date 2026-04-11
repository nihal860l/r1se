import { useState, useCallback, useRef } from 'react';

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  style: React.CSSProperties;
}

export function useDraggableList<T>(
  items: T[],
  setItems: (items: T[]) => void
): {
  dragHandleProps: (index: number) => DragHandleProps;
  dragOverIndex: number | null;
  dragIndex: number | null;
} {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startYRef = useRef(0);
  const itemHeightRef = useRef(72);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const handleDragMove = useCallback((clientY: number, startIdx: number) => {
    const delta = clientY - startYRef.current;
    const indexDelta = Math.round(delta / itemHeightRef.current);
    const newIndex = Math.max(0, Math.min(itemsRef.current.length - 1, startIdx + indexDelta));
    setDragOverIndex(newIndex);
  }, []);

  const handleDragEnd = useCallback((startIdx: number) => {
    setDragIndex(null);
    const overIdx = dragOverIndex;
    if (overIdx !== null && overIdx !== startIdx) {
      const newItems = [...itemsRef.current];
      const [moved] = newItems.splice(startIdx, 1);
      newItems.splice(overIdx, 0, moved);
      setItems(newItems);
    }
    setDragOverIndex(null);
  }, [dragOverIndex, setItems]);

  const dragHandleProps = useCallback((index: number): DragHandleProps => ({
    style: { cursor: 'grab', touchAction: 'none' },
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      startYRef.current = e.clientY;
      setDragIndex(index);
      setDragOverIndex(index);

      const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientY, index);
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // Use the latest dragOverIndex from state
        setDragOverIndex(prev => {
          if (prev !== null && prev !== index) {
            const newItems = [...itemsRef.current];
            const [moved] = newItems.splice(index, 1);
            newItems.splice(prev, 0, moved);
            setItems(newItems);
          }
          return null;
        });
        setDragIndex(null);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const startY = touch.clientY;
      startYRef.current = startY;
      
      // Long press to activate
      longPressTimerRef.current = setTimeout(() => {
        setDragIndex(index);
        setDragOverIndex(index);

        const onTouchMove = (ev: TouchEvent) => {
          ev.preventDefault();
          handleDragMove(ev.touches[0].clientY, index);
        };
        const onTouchEnd = () => {
          document.removeEventListener('touchmove', onTouchMove);
          document.removeEventListener('touchend', onTouchEnd);
          setDragOverIndex(prev => {
            if (prev !== null && prev !== index) {
              const newItems = [...itemsRef.current];
              const [moved] = newItems.splice(index, 1);
              newItems.splice(prev, 0, moved);
              setItems(newItems);
            }
            return null;
          });
          setDragIndex(null);
        };
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
      }, 300);

      const cancelLongPress = () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        document.removeEventListener('touchend', cancelLongPress);
        document.removeEventListener('touchmove', cancelOnMove);
      };
      const cancelOnMove = (ev: TouchEvent) => {
        if (Math.abs(ev.touches[0].clientY - startY) > 10) {
          cancelLongPress();
        }
      };
      document.addEventListener('touchend', cancelLongPress, { once: true });
      document.addEventListener('touchmove', cancelOnMove);
    },
  }), [handleDragMove, setItems]);

  return { dragHandleProps, dragOverIndex, dragIndex };
}
