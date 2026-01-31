import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedWheelPickerProps<T> {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel?: (item: T) => string;
  itemHeight?: number;
  visibleItems?: number;
  className?: string;
}

// Memoized item component for performance
const PickerItem = memo(function PickerItem({
  label,
  height,
  scale,
  opacity,
  onClick,
}: {
  label: string;
  height: number;
  scale: number;
  opacity: number;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center justify-center cursor-pointer text-foreground"
      style={{
        height,
        transform: `scale(${scale})`,
        opacity,
      }}
      onClick={onClick}
    >
      <span className="text-lg font-medium">{label}</span>
    </div>
  );
});

function WheelPickerComponent<T>({
  items,
  value,
  onChange,
  getLabel = (item) => String(item),
  itemHeight = 44,
  visibleItems = 5,
  className,
}: OptimizedWheelPickerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const lastMoveTime = useRef(0);
  const lastMoveY = useRef(0);
  const animationRef = useRef<number>();

  const selectedIndex = items.indexOf(value);
  const centerOffset = Math.floor(visibleItems / 2);
  const containerHeight = itemHeight * visibleItems;

  // Only render visible items + buffer for performance
  const visibleRange = useMemo(() => {
    const currentIndex = Math.round(-scrollOffset / itemHeight);
    const buffer = centerOffset + 2;
    const start = Math.max(0, currentIndex - buffer);
    const end = Math.min(items.length, currentIndex + buffer + 1);
    return { start, end };
  }, [scrollOffset, itemHeight, centerOffset, items.length]);

  // Calculate the target scroll position for the selected item
  const getTargetOffset = useCallback((index: number) => {
    return -index * itemHeight;
  }, [itemHeight]);

  // Initialize scroll position when value changes externally
  useEffect(() => {
    if (!isDragging) {
      setScrollOffset(getTargetOffset(selectedIndex));
    }
  }, [selectedIndex, getTargetOffset, isDragging]);

  // Snap to nearest item
  const snapToItem = useCallback((offset: number) => {
    const index = Math.round(-offset / itemHeight);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    const targetOffset = getTargetOffset(clampedIndex);
    
    // Animate to target
    const animate = () => {
      setScrollOffset((prev) => {
        const diff = targetOffset - prev;
        if (Math.abs(diff) < 1) {
          onChange(items[clampedIndex]);
          return targetOffset;
        }
        return prev + diff * 0.2;
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  }, [itemHeight, items, getTargetOffset, onChange]);

  // Handle momentum scrolling
  useEffect(() => {
    if (!isDragging && Math.abs(velocity) > 0.5) {
      const decelerate = () => {
        setVelocity((v) => {
          const newVelocity = v * 0.92;
          if (Math.abs(newVelocity) < 0.5) {
            snapToItem(scrollOffset);
            return 0;
          }
          setScrollOffset((prev) => {
            const newOffset = prev + newVelocity;
            const maxOffset = 0;
            const minOffset = -(items.length - 1) * itemHeight;
            return Math.max(minOffset, Math.min(maxOffset, newOffset));
          });
          return newVelocity;
        });
        if (Math.abs(velocity) > 0.5) {
          animationRef.current = requestAnimationFrame(decelerate);
        }
      };
      animationRef.current = requestAnimationFrame(decelerate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging, velocity, scrollOffset, items.length, itemHeight, snapToItem]);

  const handleStart = (clientY: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsDragging(true);
    setStartY(clientY - scrollOffset);
    setVelocity(0);
    lastMoveTime.current = Date.now();
    lastMoveY.current = clientY;
  };

  const handleMove = (clientY: number) => {
    if (!isDragging) return;
    
    const newOffset = clientY - startY;
    const maxOffset = 0;
    const minOffset = -(items.length - 1) * itemHeight;
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));
    
    // Calculate velocity
    const now = Date.now();
    const dt = now - lastMoveTime.current;
    if (dt > 0) {
      const dy = clientY - lastMoveY.current;
      setVelocity(dy / dt * 16); // Scale to ~60fps
    }
    lastMoveTime.current = now;
    lastMoveY.current = clientY;
    
    setScrollOffset(clampedOffset);
  };

  const handleEnd = () => {
    setIsDragging(false);
    if (Math.abs(velocity) < 0.5) {
      snapToItem(scrollOffset);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  // Click to select item
  const handleItemClick = useCallback((index: number) => {
    if (!isDragging) {
      setScrollOffset(getTargetOffset(index));
      onChange(items[index]);
    }
  }, [isDragging, getTargetOffset, onChange, items]);

  // Memoized visible items
  const visibleItems$ = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const item = items[i];
      const distance = Math.abs(i - (-scrollOffset / itemHeight));
      const scale = Math.max(0.7, 1 - distance * 0.1);
      const opacity = Math.max(0.3, 1 - distance * 0.25);
      
      result.push(
        <PickerItem
          key={i}
          label={getLabel(item)}
          height={itemHeight}
          scale={scale}
          opacity={opacity}
          onClick={() => handleItemClick(i)}
        />
      );
    }
    return result;
  }, [visibleRange, items, scrollOffset, itemHeight, getLabel, handleItemClick]);

  // Calculate padding for virtualized list
  const topPadding = visibleRange.start * itemHeight;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden select-none touch-none',
        className
      )}
      style={{ height: containerHeight }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
      
      {/* Selection indicator */}
      <div
        className="absolute inset-x-2 bg-secondary/80 rounded-lg pointer-events-none z-0"
        style={{
          top: centerOffset * itemHeight,
          height: itemHeight,
        }}
      />
      
      {/* Items - virtualized */}
      <div
        className="relative z-[1]"
        style={{
          transform: `translateY(${scrollOffset + centerOffset * itemHeight}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          paddingTop: topPadding,
        }}
      >
        {visibleItems$}
      </div>
    </div>
  );
}

export const OptimizedWheelPicker = memo(WheelPickerComponent) as typeof WheelPickerComponent;
