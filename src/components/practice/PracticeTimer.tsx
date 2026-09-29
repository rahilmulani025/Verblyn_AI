import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PracticeTimerProps {
  isRunning: boolean;
  targetSeconds?: number;
  onTimeUpdate?: (seconds: number) => void;
  className?: string;
}

const PracticeTimer = ({ isRunning, targetSeconds, onTimeUpdate, className }: PracticeTimerProps) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        const newValue = prev + 1;
        onTimeUpdate?.(newValue);
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onTimeUpdate]);

  useEffect(() => {
    if (!isRunning && seconds > 0) {
      // Keep the final time visible
    }
  }, [isRunning, seconds]);

  const reset = () => setSeconds(0);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = targetSeconds ? Math.min((seconds / targetSeconds) * 100, 100) : 0;
  const isOverTime = targetSeconds && seconds > targetSeconds;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <span className={cn(
          "text-4xl font-mono font-bold tabular-nums",
          isOverTime ? "text-red-500" : "text-foreground"
        )}>
          {formatTime(seconds)}
        </span>
        {isRunning && (
          <span className="absolute -right-2 top-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      
      {targetSeconds && (
        <div className="w-full max-w-32 space-y-1">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                isOverTime ? "bg-red-500" : "bg-accent"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Target</span>
            <span>{formatTime(targetSeconds)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeTimer;
