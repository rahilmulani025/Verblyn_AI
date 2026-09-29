import React from 'react';
import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNav?: boolean;
  showHeader?: boolean;
  streakCount?: number;
  xpCount?: number;
  headerAction?: React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  showBack = false,
  onBack,
  showNav = true,
  showHeader = true,
  streakCount,
  xpCount,
  headerAction,
  className,
}) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-start w-full overflow-x-hidden">
      <div className="w-full max-w-lg min-h-[100dvh] flex flex-col relative bg-background border-x border-border/20 shadow-2xl">
        {showHeader && (
          <MobileHeader
            title={title}
            showBack={showBack}
            onBack={onBack}
            streakCount={streakCount}
            xpCount={xpCount}
            action={headerAction}
          />
        )}

        <main
          className={cn(
            'flex-1 flex flex-col w-full px-4 py-4',
            showNav ? 'pb-24' : 'pb-8',
            className
          )}
        >
          {children}
        </main>

        {showNav && <BottomNav />}
      </div>
    </div>
  );
};
