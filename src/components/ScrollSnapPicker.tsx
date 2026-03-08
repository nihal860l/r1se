import { useRef, useEffect, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface ScrollSnapPickerProps<T> {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel?: (item: T) => string;
  itemHeight?: number;
  visibleItems?: number;
  className?: string;
}

function ScrollSnapPickerInner<T>({
  items,
  value,
  onChange,
  getLabel = (item) => String(item),
  itemHeight = 44,
  visibleItems = 5,
  className,
}: ScrollSnapPickerProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();
  const centerOffset = Math.floor(visibleItems / 2);
  const containerHeight = itemHeight * visibleItems;

  // Scroll to the selected value when it changes externally
  useEffect(() => {
    if (isUserScrolling.current) return;
    const idx = items.indexOf(value);
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTop = idx * itemHeight;
    }
  }, [value, items, itemHeight]);

  // On scroll end, determine which item is selected
  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
      if (!scrollRef.current) return;
      const scrollTop = scrollRef.current.scrollTop;
      const idx = Math.round(scrollTop / itemHeight);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (items[clamped] !== value) {
        onChange(items[clamped]);
      }
    }, 80);
  }, [items, itemHeight, onChange, value]);

  // Click to select
  const handleItemClick = useCallback((idx: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
    }
    onChange(items[idx]);
  }, [items, itemHeight, onChange]);

  return (
    <div
      className={cn('relative overflow-hidden select-none', className)}
      style={{ height: containerHeight }}
    >
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

      {/* Selection highlight */}
      <div
        className="absolute inset-x-2 bg-secondary/80 rounded-lg pointer-events-none z-0"
        style={{ top: centerOffset * itemHeight, height: itemHeight }}
      />

      {/* Scrollable list with native scroll-snap */}
      <div
        ref={scrollRef}
        className="relative z-[1] overflow-y-auto h-full scrollbar-none"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        {/* Top spacer to center first item */}
        <div style={{ height: centerOffset * itemHeight }} />

        {items.map((item, i) => {
          const isSelected = item === value;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center justify-center cursor-pointer transition-colors',
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              )}
              style={{
                height: itemHeight,
                scrollSnapAlign: 'start',
              }}
              onClick={() => handleItemClick(i)}
            >
              <span
                className={cn(
                  'text-lg transition-all',
                  isSelected ? 'font-semibold scale-105' : 'font-normal scale-90 opacity-60'
                )}
              >
                {getLabel(item)}
              </span>
            </div>
          );
        })}

        {/* Bottom spacer to center last item */}
        <div style={{ height: centerOffset * itemHeight }} />
      </div>
    </div>
  );
}

export const ScrollSnapPicker = memo(ScrollSnapPickerInner) as typeof ScrollSnapPickerInner;
