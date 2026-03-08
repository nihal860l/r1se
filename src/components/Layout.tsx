import { ReactNode, createContext, useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, ClipboardList, History, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleAuthButton } from './GoogleAuthButton';
import { SettingsDialog } from './SettingsDialog';
import { useAuth } from '@/hooks/useAuth';
import { R1SELogo } from './R1SELogo';
import { useGlowStore } from '@/store/glowStore';

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
  { to: '/workouts', icon: Dumbbell, label: 'Workouts' },
  { to: '/plan', icon: ClipboardList, label: 'Plan' },
  { to: '/history', icon: History, label: 'History' },
];

export function Layout({ children, hideNav = false }: LayoutProps) {
  const location = useLocation();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const { user } = useAuth();

  return (
    <HeaderContext.Provider value={{ isOverlayOpen, setIsOverlayOpen }}>
      <div className="min-h-screen bg-background">
        {/* Fixed Header */}
        <header 
          className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-colors duration-200",
            isOverlayOpen ? "bg-popover" : "bg-background"
          )}
        >
          <div className="container max-w-lg mx-auto py-4 px-4 flex items-center justify-between">
            <h1 
              className={cn(
                "text-2xl font-black tracking-tight transition-colors duration-200",
                isOverlayOpen ? "text-foreground" : "text-primary"
              )}
            >
              R1SE
            </h1>
            <div className="flex items-center gap-2">
              <GoogleAuthButton />
              {user && <SettingsDialog />}
            </div>
          </div>
        </header>

        <main className={cn("pt-16", !hideNav && "pb-24")}>
          {children}
        </main>
        
        {/* Bottom Navigation */}
        {!hideNav && (
          <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
            <div className="container max-w-lg mx-auto">
              <div className="flex justify-around items-center py-2">
                {navItems.map(({ to, icon: Icon, label }) => {
                  const isActive = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className={cn(
                        'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                        isActive 
                          ? 'text-primary' 
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className={cn('w-5 h-5', isActive && 'glow')} />
                      <span className="text-xs font-medium">{label}</span>
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
