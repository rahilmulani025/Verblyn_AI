import { ChevronDown, Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react';
import ScoreRing from './ScoreRing';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface AnalysisResultProps {
  analysis: {
    grammar_score: number;
    fluency_score: number;
    vocabulary_score: number;
    confidence_score: number;
    feedback: {
      overall: string;
      grammar: string[];
      fluency: string[];
      vocabulary: string[];
      confidence: string[];
      tips: string[];
    };
  };
}

const AnalysisResult = ({ analysis }: AnalysisResultProps) => {
  const scores = [
    { key: 'grammar', label: 'Grammar', score: analysis.grammar_score, feedback: analysis.feedback.grammar },
    { key: 'fluency', label: 'Fluency', score: analysis.fluency_score, feedback: analysis.feedback.fluency },
    { key: 'vocabulary', label: 'Vocabulary', score: analysis.vocabulary_score, feedback: analysis.feedback.vocabulary },
    { key: 'confidence', label: 'Confidence', score: analysis.confidence_score, feedback: analysis.feedback.confidence },
  ];

  const averageScore = Math.round(
    (analysis.grammar_score + analysis.fluency_score + analysis.vocabulary_score + analysis.confidence_score) / 4
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overall summary */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-6">
          <ScoreRing score={averageScore} label="Overall" size="lg" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Session Summary</h3>
            <p className="text-muted-foreground">{analysis.feedback.overall}</p>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {scores.map((item) => (
          <div key={item.key} className="glass-card p-4 rounded-xl flex flex-col items-center">
            <ScoreRing score={item.score} label={item.label} size="sm" />
          </div>
        ))}
      </div>

      {/* Detailed feedback accordion */}
      <Accordion type="single" collapsible className="space-y-2">
        {scores.map((item) => (
          <AccordionItem
            key={item.key}
            value={item.key}
            className="glass-card rounded-xl border-0 overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  item.score >= 80 ? "bg-green-500" :
                  item.score >= 60 ? "bg-accent" :
                  item.score >= 40 ? "bg-yellow-500" : "bg-red-500"
                )} />
                <span className="font-medium">{item.label} Feedback</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {item.feedback.length > 0 ? (
                <ul className="space-y-2">
                  {item.feedback.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No specific feedback for this category.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Tips section */}
      {analysis.feedback.tips.length > 0 && (
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Tips for Improvement</h3>
          </div>
          <ul className="space-y-3">
            {analysis.feedback.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium shrink-0">
                  {idx + 1}
                </span>
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnalysisResult;
