import { useGlowStore } from '@/store/glowStore';
import { cn } from '@/lib/utils';

interface R1SELogoProps {
  className?: string;
  overrideColor?: string;
}

export function R1SELogo({ className, overrideColor }: R1SELogoProps) {
  const glowEnabled = useGlowStore((s) => s.glowEnabled);

  return (
    <span
      className={cn(
        'relative inline-flex items-start font-black tracking-tight select-none',
        className
      )}
      style={overrideColor ? { color: overrideColor } : undefined}
    >
      <span className={cn(glowEnabled && !overrideColor && 'text-glow')}>
        R
        <span className="relative" style={{ marginRight: '0.3em' }}>
          1
          <span
            className="absolute font-semibold"
            style={{
              fontSize: '0.32em',
              top: '-0.05em',
              left: '100%',
              marginLeft: '0.05em',
              lineHeight: 1,
              opacity: 0.7,
            }}
          >
            %
          </span>
        </span>
        SE
      </span>
    </span>
  );
}
