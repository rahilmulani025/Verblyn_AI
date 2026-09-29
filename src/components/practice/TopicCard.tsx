import { RefreshCw, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopicCardProps {
  topic: {
    topic: string;
    description: string;
    keywords: string[];
    structure: {
      intro: string;
      main_points: string[];
      conclusion: string;
    };
    recommended_time: number;
    difficulty: string;
    category: string;
  } | null;
  isLoading: boolean;
  onGenerateNew: () => void;
}

const TopicCard = ({ topic, isLoading, onGenerateNew }: TopicCardProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins} min`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate':
        return 'bg-accent/20 text-accent border-accent/30';
      case 'advanced':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {topic && (
              <>
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full border",
                  getDifficultyColor(topic.difficulty)
                )}>
                  {topic.difficulty}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground border border-border">
                  {topic.category}
                </span>
              </>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-7 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-5 w-full bg-muted animate-pulse rounded" />
            </div>
          ) : topic ? (
            <>
              <h3 className="text-xl font-semibold text-foreground mb-2">{topic.topic}</h3>
              <p className="text-muted-foreground text-sm">{topic.description}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Click "Generate Topic" to get a speaking prompt</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onGenerateNew}
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
        </Button>
      </div>

      {topic && (
        <>
          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatTime(topic.recommended_time)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span>{topic.keywords.length} keywords</span>
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-2">
            {topic.keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-3 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
              >
                {keyword}
              </span>
            ))}
          </div>

          {/* Structure hint */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              View suggested structure
            </summary>
            <div className="mt-3 space-y-2 text-sm pl-4 border-l-2 border-accent/30">
              <div>
                <span className="font-medium text-foreground">Intro:</span>
                <span className="text-muted-foreground ml-2">{topic.structure.intro}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Main Points:</span>
                <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                  {topic.structure.main_points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-foreground">Conclusion:</span>
                <span className="text-muted-foreground ml-2">{topic.structure.conclusion}</span>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
};

export default TopicCard;
