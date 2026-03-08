import { useRef, useEffect, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface ScrollSnapPickerProps<T> {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel?: (item: T) => string;
  className?: string;
}

const ITEM_WIDTH = 64;
const ITEM_WIDTH_LARGE = 80;

function ScrollSnapPickerInner<T>({
  items,
  value,
  onChange,
  getLabel = (item) => String(item),
  className,
}: ScrollSnapPickerProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const isLargeSet = items.length > 20;
  const itemW = isLargeSet ? ITEM_WIDTH : ITEM_WIDTH_LARGE;

  // Scroll to selected value on mount / external change
  useEffect(() => {
    if (isUserScrolling.current) return;
    const idx = items.indexOf(value);
    if (idx >= 0 && scrollRef.current) {
      const container = scrollRef.current;
      const centerOffset = container.clientWidth / 2 - itemW / 2;
      container.scrollLeft = idx * itemW - centerOffset;
    }
  }, [value, items, itemW]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
      if (!scrollRef.current) return;
      const container = scrollRef.current;
      const centerOffset = container.clientWidth / 2 - itemW / 2;
      const idx = Math.round((container.scrollLeft + centerOffset) / itemW);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (items[clamped] !== value) {
        onChange(items[clamped]);
      }
    }, 80);
  }, [items, itemW, onChange, value]);

  const handleItemClick = useCallback((idx: number) => {
    onChange(items[idx]);
    if (scrollRef.current) {
      const centerOffset = scrollRef.current.clientWidth / 2 - itemW / 2;
      scrollRef.current.scrollTo({ left: idx * itemW - centerOffset, behavior: 'smooth' });
    }
  }, [items, itemW, onChange]);

  return (
    <div className={cn('relative overflow-hidden select-none', className)} style={{ height: 56 }}>
      {/* Gradient edges */}
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-popover to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-popover to-transparent pointer-events-none z-10" />

      {/* Center highlight */}
      <div
        className="absolute top-1 bottom-1 bg-primary/15 border border-primary/30 rounded-lg pointer-events-none z-0"
        style={{
          left: '50%',
          width: itemW,
          transform: 'translateX(-50%)',
        }}
      />

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="relative z-[1] overflow-x-auto h-full flex items-center scrollbar-none"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        {/* Left spacer */}
        <div className="shrink-0" style={{ width: `calc(50% - ${itemW / 2}px)` }} />

        {items.map((item, i) => {
          const isSelected = item === value;
          return (
            <div
              key={i}
              className={cn(
                'shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150',
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              )}
              style={{
                width: itemW,
                height: '100%',
                scrollSnapAlign: 'center',
              }}
              onClick={() => handleItemClick(i)}
            >
              <span
                className={cn(
                  'transition-all duration-150 text-center leading-tight',
                  isSelected ? 'font-bold text-lg text-primary' : 'font-normal text-sm opacity-50'
                )}
              >
                {getLabel(item)}
              </span>
            </div>
          );
        })}

        {/* Right spacer */}
        <div className="shrink-0" style={{ width: `calc(50% - ${itemW / 2}px)` }} />
      </div>
    </div>
  );
}

export const ScrollSnapPicker = memo(ScrollSnapPickerInner) as typeof ScrollSnapPickerInner;
