import { useRef, useEffect, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface NativePickerProps<T> {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel?: (item: T) => string;
  visibleItems?: number;
  itemHeight?: number;
  className?: string;
}

function NativePickerInner<T>({
  items,
  value,
  onChange,
  getLabel = (item) => String(item),
  visibleItems = 5,
  itemHeight = 44,
  className,
}: NativePickerProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isExternalUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const padding = ((visibleItems - 1) / 2) * itemHeight;
  const containerHeight = visibleItems * itemHeight;

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'instant') => {
    const el = scrollRef.current;
    if (!el) return;
    isExternalUpdate.current = true;
    el.scrollTo({ top: index * itemHeight, behavior });
    // Reset flag after scroll settles
    setTimeout(() => { isExternalUpdate.current = false; }, 100);
  }, [itemHeight]);

  // Scroll to value on mount and when value changes externally
  useEffect(() => {
    const index = items.indexOf(value);
    if (index >= 0) {
      scrollToIndex(index, 'instant');
    }
  }, [value, items, scrollToIndex]);

  const handleScrollEnd = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isExternalUpdate.current) return;
    const index = Math.round(el.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    if (items[clamped] !== value) {
      onChange(items[clamped]);
    }
    // Snap correction
    el.scrollTo({ top: clamped * itemHeight, behavior: 'smooth' });
  }, [items, value, onChange, itemHeight]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Use scrollend if supported, otherwise debounced scroll
    const supportsScrollEnd = 'onscrollend' in window;

    if (supportsScrollEnd) {
      const onScrollEnd = () => handleScrollEnd();
      el.addEventListener('scrollend', onScrollEnd, { passive: true });
      return () => el.removeEventListener('scrollend', onScrollEnd);
    } else {
      const onScroll = () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(handleScrollEnd, 150);
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        el.removeEventListener('scroll', onScroll);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }
  }, [handleScrollEnd]);

  const selectedIndex = items.indexOf(value);

  return (
    <div className={cn('relative select-none', className)} style={{ height: containerHeight }}>
      {/* Center highlight */}
      <div
        className="absolute left-0 right-0 border-t border-b border-primary/40 pointer-events-none z-10"
        style={{ top: padding, height: itemHeight }}
      />

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Hide webkit scrollbar */}
        <style>{`
          .native-picker-scroll::-webkit-scrollbar { display: none; }
        `}</style>
        
        {/* Top spacer */}
        <div style={{ height: padding }} />

        {items.map((item, i) => {
          const distance = Math.abs(i - selectedIndex);
          const scale = Math.max(0.88, 1 - distance * 0.04);
          const opacity = Math.max(0.3, 1 - distance * 0.2);

          return (
            <div
              key={i}
              style={{
                height: itemHeight,
                scrollSnapAlign: 'center',
                transform: `scale(${scale})`,
                opacity,
                transition: 'transform 0.15s, opacity 0.15s',
              }}
              className={cn(
                'flex items-center justify-center text-base',
                i === selectedIndex
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {getLabel(item)}
            </div>
          );
        })}

        {/* Bottom spacer */}
        <div style={{ height: padding }} />
      </div>
    </div>
  );
}

// Add className to scroll container
function NativePickerWithRef<T>(props: NativePickerProps<T>) {
  return <NativePickerInner {...props} />;
}

export const NativePicker = memo(NativePickerWithRef) as typeof NativePickerWithRef;
