import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { R1SELogo } from '@/components/R1SELogo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
    <div className="dark min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[150px]" />
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-primary/4 blur-[100px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-xs">
        <div className="flex flex-col items-center gap-4">
          <R1SELogo className="text-5xl text-primary" />
          <p className="text-muted-foreground text-sm tracking-widest uppercase font-medium">
            Train Smart, R1SE Harder
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Button size="lg" onClick={handleAuth} disabled={loading} glow className="w-full h-13 text-base font-semibold gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Join with Google
          </Button>
          <Button variant="outline" size="lg" onClick={handleAuth} disabled={loading} className="w-full h-13 text-base font-medium gap-2">
            <GoogleIcon /> Login with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
