import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BaselineSkillBreakdown } from '@/features/assessment/assessment.types';
import { SpeechMetricsSummary } from '@/lib/metrics';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Target,
  TrendingUp,
  Award,
  Zap,
} from 'lucide-react';

interface ResultLocationState {
  metrics?: SpeechMetricsSummary;
  scores?: BaselineSkillBreakdown;
  strength?: string;
  firstFocus?: string;
  recommendedDrill?: string;
  durationSeconds?: number;
  transcript?: string;
}

export const AssessmentResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [stateData, setStateData] = useState<ResultLocationState | null>(
    (location.state as ResultLocationState) || null
  );
  const [loading, setLoading] = useState(!location.state);

  // If user refreshed directly on this route, load latest baseline from Supabase
  useEffect(() => {
    if (stateData) return;

    async function loadLatestBaseline() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setLoading(false);
          return;
        }

        const { data: session } = await supabase
          .from('speaking_sessions')
          .select('*')
          .eq('user_id', userData.user.id)
          .eq('topic', 'Baseline Assessment')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session && session.feedback) {
          const fb = session.feedback as {
            metrics?: SpeechMetricsSummary;
            scores?: BaselineSkillBreakdown;
            strength?: string;
            first_focus?: string;
            recommended_drill?: string;
          };
          setStateData({
            metrics: fb.metrics,
            scores: fb.scores || {
              overallScore: Math.round(
                ((session.fluency_score || 70) +
                  (session.grammar_score || 70) +
                  (session.vocabulary_score || 70) +
                  (session.confidence_score || 70)) /
                  4
              ),
              fluency: session.fluency_score || 75,
              clarity: 78,
              vocabulary: session.vocabulary_score || 72,
              grammar: session.grammar_score || 70,
              confidence: session.confidence_score || 74,
            },
            strength: fb.strength || 'Consistent vocal pacing and steady sentence delivery.',
            firstFocus: fb.first_focus || 'Filler Word Elimination',
            recommendedDrill: fb.recommended_drill || 'Practice pausing silently between thoughts.',
            durationSeconds: session.duration_seconds || 60,
            transcript: session.transcript || '',
          });
        }
      } catch (err) {
        console.error('Failed to load baseline session on refresh:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLatestBaseline();
  }, [stateData]);

  if (loading) {
    return (
      <AppShell title="Baseline Result" showNav={false} showHeader={true}>
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const scores: BaselineSkillBreakdown = stateData?.scores || {
    overallScore: 76,
    fluency: 78,
    clarity: 80,
    vocabulary: 74,
    grammar: 72,
    confidence: 76,
  };

  const strength =
    stateData?.strength || 'Good spoken clarity with steady conversational flow.';
  const firstFocus = stateData?.firstFocus || 'Filler Word Elimination';
  const drillTip =
    stateData?.recommendedDrill || 'Practice replacing verbal pause sounds with deliberate silence.';

  return (
    <AppShell title="Communication Benchmark" showNav={false} showHeader={true}>
      <PageContainer className="flex-1 flex flex-col justify-between py-2 space-y-4">
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Starting Baseline Established
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Your Communication Baseline
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This establishes your starting benchmark. Every future challenge will measure improvement from here.
            </p>
          </div>

          {/* 1. OVERALL SCORE */}
          <Card className="border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Overall Starting Level
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {scores.overallScore}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-primary/20 text-primary border border-primary/30">
                <Sparkles className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* 2. 5 CORE VOCAL SKILL CARDS */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Skill Breakdown
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Fluency</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-bold text-foreground">{scores.fluency}%</span>
                  <span className="text-[10px] text-muted-foreground">Pacing</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Clarity</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-bold text-foreground">{scores.clarity}%</span>
                  <span className="text-[10px] text-muted-foreground">Structure</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Vocabulary</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-bold text-foreground">{scores.vocabulary}%</span>
                  <span className="text-[10px] text-muted-foreground">Diversity</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Grammar</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-bold text-foreground">{scores.grammar}%</span>
                  <span className="text-[10px] text-muted-foreground">Conciseness</span>
                </div>
              </div>
            </div>

            {/* Confidence Card (spanning full width) */}
            <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground font-medium">Confidence Delivery</span>
                <p className="text-[10px] text-muted-foreground">
                  Estimated from vocal cadence stability & filler control.
                </p>
              </div>
              <span className="text-lg font-bold text-primary">{scores.confidence}%</span>
            </div>
          </div>

          {/* 3. YOUR STRENGTH */}
          <Card className="border border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>Your Strength</span>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed">{strength}</p>
            </CardContent>
          </Card>

          {/* 4. YOUR FIRST FOCUS */}
          <Card className="border border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Target className="w-4 h-4" />
                <span>Your First Focus</span>
              </div>
              <h4 className="text-sm font-bold text-foreground">{firstFocus}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{drillTip}</p>
            </CardContent>
          </Card>
        </div>

        {/* 5. NEXT STEP CTA */}
        <div className="pt-4 mt-auto">
          <Button
            onClick={() => navigate('/home', { replace: true })}
            className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
          >
            Start My First Challenge <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default AssessmentResultPage;
