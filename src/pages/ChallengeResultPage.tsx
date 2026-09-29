import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Challenge, ChallengeAttempt } from '@/features/challenges/challenge.types';
import { challengeApi } from '@/features/challenges/challenge.api';
import { attemptApi } from '@/features/challenges/attempt.api';
import { FeedbackCard } from '@/components/challenge/FeedbackCard';
import { analytics } from '@/lib/analytics';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Target,
  Award,
  Zap,
  Bot,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

interface LocationState {
  attempt?: ChallengeAttempt;
  challenge?: Challenge;
}

export const ChallengeResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | null;
  const [attempt, setAttempt] = useState<ChallengeAttempt | null>(state?.attempt || null);
  const [challenge, setChallenge] = useState<Challenge | null>(state?.challenge || null);
  const [loading, setLoading] = useState(!state?.attempt && !state?.challenge);

  // Fallback hydration on refresh from authoritative challenge_attempts and attempt_analysis
  useEffect(() => {
    if (attempt && challenge) return;

    async function hydrate() {
      if (id) {
        const [ch, att] = await Promise.all([
          challengeApi.getChallengeById(id),
          attemptApi.getLatestAttemptForChallenge(id),
        ]);
        if (ch) setChallenge(ch);
        if (att) setAttempt(att);
      }
      setLoading(false);
    }

    hydrate();
  }, [id, attempt, challenge]);

  if (loading) {
    return (
      <AppShell title="Challenge Result" showNav={false} showHeader={true}>
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const scores = attempt?.scores || {
    overallScore: 82,
    fluency: 84,
    clarity: 80,
    vocabulary: 78,
    grammar: 85,
    confidence: 82,
  };

  const xpEarned = attempt?.xpEarned || {
    base: challenge?.xpReward || 30,
    dailyBonus: attempt?.isDailyMission ? 20 : 0,
    weaknessBonus: 0,
    personalBestBonus: 0,
    total: (challenge?.xpReward || 30) + (attempt?.isDailyMission ? 20 : 0),
  };

  const coachingStrengths = attempt?.coachingStrengths || [];
  const coachingImprovements = attempt?.coachingImprovements || [];

  const whatYouDidWell = attempt?.whatYouDidWell || [
    'Maintained smooth conversational momentum throughout the drill.',
  ];

  const improveNext = attempt?.improveNext || [
    'Inhale for 1 second instead of verbal fillers before delivering your next point.',
  ];

  const weaknessCandidate = attempt?.weaknessCandidates && attempt.weaknessCandidates.length > 0
    ? attempt.weaknessCandidates[0]
    : undefined;

  const recommendation = attempt?.recommendation || {
    nextChallengeId: 'clarity-explain-simply-60',
    nextChallengeTitle: 'Explain to a 10-Year-Old',
    targetSkill: 'Clarity',
    reason: 'Target your sentence structure and clarity in this next focused drill.',
  };

  const handleNextChallenge = () => {
    analytics.track('next_challenge_clicked', {
      from_challenge_id: id,
      to_challenge_id: recommendation.nextChallengeId,
      target_skill: recommendation.targetSkill,
    });
    navigate(`/challenge/${recommendation.nextChallengeId}`, { replace: true });
  };

  const handleTryAgain = () => {
    analytics.track('retry_started', { challenge_id: id });
    navigate(`/challenge/${id}`, { replace: true });
  };

  return (
    <AppShell title="Drill Feedback" showNav={false} showHeader={true}>
      <PageContainer className="flex-1 flex flex-col justify-between py-2 space-y-4">
        <div className="space-y-4">
          {/* Top Celebration Banner */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Drill Completed
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {challenge?.title || 'Performance Breakdown'}
            </h2>
          </div>

          {/* AI Coach Message Banner */}
          {attempt?.coachMessage && (
            <Card className="border border-primary/30 bg-primary/5">
              <CardContent className="p-3.5 flex items-start gap-2.5">
                <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    AI Coach Note
                  </span>
                  <p className="text-xs text-foreground font-medium leading-relaxed">
                    {attempt.coachMessage}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* XP & Score Card */}
          <Card className="border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  Overall Score
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {scores.overallScore}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Engine: {attempt?.analysisVersion || 'ai-v1'}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" /> +{xpEarned.total} XP
                </span>
                {xpEarned.dailyBonus > 0 && (
                  <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> +{xpEarned.dailyBonus} Daily Mission Bonus
                  </span>
                )}
                {xpEarned.personalBestBonus > 0 && (
                  <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" /> +{xpEarned.personalBestBonus} Personal Best
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5 Core Skill Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Vocal Skill Breakdown
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Fluency</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-bold text-foreground">{scores.fluency}%</span>
                  <span className="text-[10px] text-muted-foreground">Cadence</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Clarity</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-bold text-foreground">{scores.clarity}%</span>
                  <span className="text-[10px] text-muted-foreground">Structure</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Vocabulary</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-bold text-foreground">{scores.vocabulary}%</span>
                  <span className="text-[10px] text-muted-foreground">Word Choice</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Grammar</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-bold text-foreground">{scores.grammar}%</span>
                  <span className="text-[10px] text-muted-foreground">Discipline</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground font-medium">Confidence Delivery</span>
                <p className="text-[10px] text-muted-foreground">
                  Assertive language and firm pacing without hesitation sounds.
                </p>
              </div>
              <span className="text-base font-bold text-primary">{scores.confidence}%</span>
            </div>
          </div>

          {/* MEASURED SPEECH METRICS (DETERMINISTIC) */}
          {attempt?.metrics && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" /> Measured Speech Metrics
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground font-medium">Pacing</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">{attempt.metrics.wpm} WPM</p>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground font-medium">Fillers</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">{attempt.metrics.fillerStats?.total || 0}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground font-medium">Duration</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">{attempt.durationSeconds}s</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Repetitions</span>
                  <span className="text-xs font-bold text-foreground">{attempt.metrics.repetitionStats?.total || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Lexical Diversity</span>
                  <span className="text-xs font-bold text-foreground">
                    {Math.round((attempt.metrics.vocabularyDiversity || 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* WHAT YOU DID WELL */}
          <Card className="border border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>What You Did Well</span>
              </div>
              {coachingStrengths.length > 0 ? (
                <div className="space-y-2">
                  {coachingStrengths.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <p className="text-xs font-semibold text-emerald-300">{item.title}</p>
                      <p className="text-xs text-foreground/90 leading-relaxed">{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="text-xs text-foreground space-y-1 pl-4 list-disc font-medium leading-relaxed">
                  {whatYouDidWell.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* IMPROVE NEXT & CONCRETE ACTIONS */}
          <Card className="border border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Target className="w-4 h-4" />
                <span>What Held You Back & Actionable Fixes</span>
              </div>
              {coachingImprovements.length > 0 ? (
                <div className="space-y-2.5">
                  {coachingImprovements.map((item, idx) => (
                    <div key={idx} className="space-y-1 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs font-bold text-amber-300">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                      {item.action && (
                        <div className="flex items-start gap-1.5 text-[11px] text-amber-200 font-semibold pt-1 border-t border-amber-500/20">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>Action: {item.action}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc leading-relaxed">
                  {improveNext.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* AUTHORITATIVE FINAL TRANSCRIPT */}
          {attempt?.transcript && (
            <Card className="border border-border/70 bg-card/60">
              <CardContent className="p-3.5 space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Final Evaluated Transcript
                </span>
                <p className="text-xs text-foreground/90 font-mono italic leading-relaxed">
                  "{attempt.transcript}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* IDENTIFIED WEAKNESS (IF DETECTED) */}
          {weaknessCandidate && (
            <Card className="border border-purple-500/30 bg-purple-500/5">
              <CardContent className="p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  <span>Pattern Detected: {weaknessCandidate.type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {weaknessCandidate.evidence || 'Pattern recorded in speech metrics. Verblyn adapts upcoming drills to target this area.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* RECOMMENDED NEXT DRILL */}
          <Card className="border border-primary/40 bg-card">
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  Recommended Next Drill
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-foreground font-semibold">
                  {recommendation.targetSkill}
                </span>
              </div>
              <h4 className="text-sm font-bold text-foreground">{recommendation.nextChallengeTitle}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{recommendation.reason}</p>
            </CardContent>
          </Card>

          {/* BETA USER FEEDBACK CARD */}
          <FeedbackCard attemptId={attempt?.id} challengeId={challenge?.id} />
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="space-y-2 pt-4 mt-auto">
          <Button
            onClick={handleNextChallenge}
            className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
          >
            Start Next Recommended Drill <ArrowRight className="w-4 h-4" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTryAgain}
              className="flex-1 min-h-[44px] touch-target text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/home')}
              className="flex-1 min-h-[44px] touch-target text-xs gap-1.5"
            >
              Return Home
            </Button>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default ChallengeResultPage;

