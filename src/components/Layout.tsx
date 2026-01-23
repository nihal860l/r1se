import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Dumbbell, Library, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', icon: Dumbbell, label: 'Workouts' },
  { to: '/exercises', icon: Library, label: 'Exercises' },
  { to: '/history', icon: History, label: 'History' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-24">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
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
    </div>
  );
}
