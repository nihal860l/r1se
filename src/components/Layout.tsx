import { ReactNode, createContext, useContext, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, History, TrendingUp, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleAuthButton } from './GoogleAuthButton';
import { SettingsDialog } from './SettingsDialog';
import { useAuth } from '@/hooks/useAuth';
import { R1SELogo } from './R1SELogo';
import { useGlowStore } from '@/store/glowStore';
import { useAppMode } from '@/hooks/useAppMode';
import { useCoachingRelationship } from '@/hooks/useCoachingRelationship';

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

interface HeaderContextType {
  isOverlayOpen: boolean;
  setIsOverlayOpen: (open: boolean) => void;
}

const HeaderContext = createContext<HeaderContextType>({
  isOverlayOpen: false,
  setIsOverlayOpen: () => {},
});

export const useHeaderContext = () => useContext(HeaderContext);

const navItems = [
  { to: '/', icon: Calendar, label: 'Today' },
  { to: '/plan', icon: ClipboardList, label: 'Plan' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/history', icon: History, label: 'History' },
];

export function Layout({ children, hideNav = false }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const { user } = useAuth();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const { mode } = useAppMode();
  const { unreadCount } = useCoachingRelationship();
  const showMessages = mode === 'client' || mode === 'coach';

  return (
    <HeaderContext.Provider value={{ isOverlayOpen, setIsOverlayOpen }}>
      <div className="min-h-screen bg-background">
        {/* Fixed Header */}
        <header 
          className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-colors duration-200 backdrop-blur-xl",
            isOverlayOpen 
              ? "bg-popover/95" 
              : "bg-background/80 border-b border-border/50"
          )}
        >
          <div className="container max-w-lg mx-auto py-4 px-4 flex items-center justify-between">
            <R1SELogo
              className={cn(
                "text-2xl transition-colors duration-200",
                isOverlayOpen ? "text-foreground" : "text-primary"
              )}
              overrideColor={isOverlayOpen ? undefined : undefined}
            />
            <div className="flex items-center gap-2">
              <GoogleAuthButton />
              {showMessages && (
                <button
                  onClick={() => navigate('/messages')}
                  className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Messages"
                >
                  <MessageCircle className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
              {user && <SettingsDialog />}
            </div>
          </div>
        </header>

        <main className={cn("pt-16", !hideNav && "pb-24")}>
          {children}
        </main>
        
        {/* Bottom Navigation */}
        {!hideNav && (
          <nav className={cn(
            "fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t",
            glowEnabled 
              ? "bg-card/80 border-primary/15 shadow-[0_-4px_30px_hsl(189_100%_51%/0.06)]" 
              : "bg-card/90 border-border/50"
          )}>
            <div className="container max-w-lg mx-auto">
              <div className="flex justify-around items-center py-2">
                {navItems.map(({ to, icon: Icon, label }) => {
                  const isActive = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className={cn(
                        'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                        isActive 
                          ? 'text-primary' 
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg transition-all duration-200",
                        isActive && "bg-primary/10"
                      )}>
                        <Icon className={cn('w-5 h-5', isActive && glowEnabled && 'glow')} />
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold tracking-wide uppercase",
                        isActive && "text-primary"
                      )}>{label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </nav>
        )}
      </div>
    </HeaderContext.Provider>
  );
}
