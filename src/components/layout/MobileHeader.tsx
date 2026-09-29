import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Flame, Sparkles, Bot } from 'lucide-react';
import { useGeminiKey } from '@/context/GeminiKeyContext';
import { GeminiKeyModal } from '@/components/settings/GeminiKeyModal';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  streakCount?: number;
  xpCount?: number;
  action?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = 'Verblyn',
  showBack = false,
  onBack,
  streakCount,
  xpCount,
  action,
}) => {
  const navigate = useNavigate();
  const { hasGeminiKey, connectionStatus } = useGeminiKey();
  const [modalOpen, setModalOpen] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            {showBack ? (
              <button
                type="button"
                onClick={handleBack}
                className="touch-target -ml-2 p-2 rounded-lg text-foreground/80 hover:text-foreground active:scale-95 transition-transform"
                aria-label="Go back"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : null}
            <h1 className="text-base font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {streakCount !== undefined && (
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold"
                title={`${streakCount} Day Streak`}
              >
                <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                <span>{streakCount}</span>
              </div>
            )}

            {xpCount !== undefined && (
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
                title={`${xpCount} XP`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{xpCount}</span>
              </div>
            )}

            {/* AI Coach BYOK Trigger */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                hasGeminiKey
                  ? connectionStatus === 'connected'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-secondary/60 border-border text-muted-foreground hover:text-foreground'
              }`}
              title={hasGeminiKey ? 'Gemini AI Coach Active' : 'Connect Gemini AI Key'}
            >
              <Bot className="w-4 h-4" />
            </button>

            {action}
          </div>
        </div>
      </header>

      <GeminiKeyModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};
