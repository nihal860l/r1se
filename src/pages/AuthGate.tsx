import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { R1SELogo } from '@/components/R1SELogo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowUpRight } from 'lucide-react';

const GoogleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function AuthGate() {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleAuth = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        toast({ title: 'Authentication failed', description: result.error.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Authentication failed', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-primary/[0.07] blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[420px] h-[420px] rounded-full bg-primary/[0.05] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
          <span className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground font-medium">R1SE</span>
        </div>
        <span className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground/70 font-medium">v1.0</span>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6">
        <div className="w-full max-w-sm mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-8">
            <span className="h-px w-8 bg-border" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-medium">
              Performance Training
            </span>
          </div>

          {/* Wordmark */}
          <div className="mb-3">
            <R1SELogo className="text-[88px] leading-none text-foreground" />
          </div>

          {/* Motto */}
          <h1 className="text-xl font-light text-foreground/90 leading-snug tracking-tight mb-2">
            Train Smart,{' '}
            <span className="font-semibold text-primary">R1SE</span> Harder.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-10 max-w-[19rem]">
            Your training, sharpened. Sign in to sync workouts across every device.
          </p>

          {/* Auth card */}
          <div className="relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/30 via-border to-transparent opacity-60" />
            <div className="relative rounded-2xl bg-card/60 backdrop-blur-xl border border-border/60 p-5 space-y-3">
              <Button
                size="lg"
                onClick={handleAuth}
                disabled={loading}
                className="w-full h-12 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 hover:shadow-[0_8px_28px_hsl(var(--primary)/0.25)] gap-3"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GoogleIcon className="w-[18px] h-[18px]" />
                )}
                <span>Continue with Google</span>
                <ArrowUpRight className="w-4 h-4 ml-auto opacity-60" />
              </Button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-border/60" />
                <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/70 font-medium">
                  Secure auth
                </span>
                <span className="h-px flex-1 bg-border/60" />
              </div>

              <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
                By continuing you agree to our{' '}
                <span className="text-foreground/80 underline underline-offset-2">Terms</span> and{' '}
                <span className="text-foreground/80 underline underline-offset-2">Privacy Policy</span>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 pb-6 pt-8">
        <div className="max-w-sm mx-auto flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 font-medium">
          <span>Built for athletes</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            Online
          </span>
        </div>
      </footer>
    </div>
  );
}
