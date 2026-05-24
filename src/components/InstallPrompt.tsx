import { useEffect, useState } from 'react';
import { X, Share, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'r1se-install-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    // Already installed PWA — skip
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      setShowIOS(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="relative rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-[0_10px_40px_hsl(0_0%_0%/0.5)] p-4 pr-10">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded"
        >
          <X className="w-4 h-4" />
        </button>

        {showIOS ? (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Share className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xs leading-relaxed text-foreground">
              <p className="font-semibold text-sm mb-0.5">Install R1SE</p>
              <p className="text-muted-foreground">
                Tap the <span className="text-primary font-medium">Share</span> button, then{' '}
                <span className="text-primary font-medium">"Add to Home Screen"</span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Install R1SE</p>
              <p className="text-[11px] text-muted-foreground">Faster access, full-screen.</p>
            </div>
            <Button size="sm" onClick={install} className="h-8 px-3 text-xs">
              Install
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
