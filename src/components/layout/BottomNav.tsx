import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Mic, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavTabItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: readonly NavTabItem[] = [
  { label: 'Home', to: '/home', icon: Home },
  { label: 'Practice', to: '/practice', icon: Mic },
  { label: 'Progress', to: '/progress', icon: TrendingUp },
  { label: 'Me', to: '/profile', icon: User },
] as const;

export const BottomNav: React.FC = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 safe-bottom"
      aria-label="Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors select-none',
                isActive
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground active:text-primary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'p-1 rounded-xl transition-all',
                    isActive ? 'bg-primary/15 text-primary scale-105' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
