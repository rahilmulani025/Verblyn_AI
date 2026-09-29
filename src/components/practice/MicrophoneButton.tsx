import { Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicrophoneButtonProps {
  isListening: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

const MicrophoneButton = ({ isListening, isDisabled, onClick }: MicrophoneButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
        "border-2 backdrop-blur-xl",
        isListening 
          ? "bg-red-500/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]" 
          : "bg-accent/20 border-accent hover:bg-accent/30 hover:shadow-[0_0_30px_rgba(var(--accent),0.4)]",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Pulsing ring animation when recording */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />
          <span className="absolute inset-0 rounded-full animate-pulse bg-red-500/10" />
        </>
      )}
      
      {/* Icon */}
      {isListening ? (
        <Square className="w-8 h-8 text-red-500 relative z-10" />
      ) : (
        <Mic className="w-8 h-8 text-accent relative z-10" />
      )}
    </button>
  );
};

export default MicrophoneButton;
