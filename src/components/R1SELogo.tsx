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
      <span className={cn(glowEnabled && !overrideColor && 'text-glow')}>R1SE</span>
      <span
        className="absolute font-bold opacity-60"
        style={{
          fontSize: '0.35em',
          top: '-0.1em',
          right: '-0.65em',
          lineHeight: 1,
        }}
      >
        %
      </span>
    </span>
  );
}
