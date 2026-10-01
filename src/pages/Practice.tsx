import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChallengeCard } from '@/components/challenge/ChallengeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { challengeApi } from '@/features/challenges/challenge.api';
import { CHALLENGE_CATALOG } from '@/features/challenges/challenge.catalog';
import { personalizationApi } from '@/features/personalization/personalization.api';
import { TrainingPlan } from '@/features/personalization/personalization.types';
import { Challenge } from '@/features/challenges/challenge.types';
import { useGeminiKey } from '@/context/GeminiKeyContext';
import { geminiApi } from '@/services/gemini/gemini.api';
import { PersonalizedChallenge } from '@/services/gemini/gemini.types';
import { GeminiKeyModal } from '@/components/settings/GeminiKeyModal';
import { analytics } from '@/lib/analytics';
import {
  ArrowRight,
  RotateCcw,
  Zap,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Bot,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  KeyRound,
  Loader2,
  Briefcase,
  Target,
} from 'lucide-react';

export const Practice: React.FC = () => {
  const navigate = useNavigate();
  const { geminiApiKey, hasGeminiKey } = useGeminiKey();

  // Instant seed catalogue — zero wait time for initial render
  const [catalog, setCatalog] = useState<Challenge[]>(CHALLENGE_CATALOG);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge>(CHALLENGE_CATALOG[0]);
  const [aiChallenge, setAiChallenge] = useState<PersonalizedChallenge | null>(null);
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showFullLibrary, setShowFullLibrary] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const candidateIndexRef = useRef<number>(0);

  const generateAiTopic = useCallback(async (apiKey: string) => {
    setIsGeneratingAi(true);
    try {
      // 1. Get authoritative deterministic training plan from personalization policy
      const plan = await personalizationApi.getActiveTrainingPlan();
      setActivePlan(plan);

      // 2. Invoke Gemini topic generator with full training plan contract
      const generated = await geminiApi.generateTopic(apiKey, {
        user_goal: plan.practiceContext,
        practice_context: plan.practiceContext,
        target_role: plan.targetRole,
        experience_level: plan.experienceLevelLabel,
        target_domain: plan.targetDomain,
        target_skill: plan.targetSkill,
        active_weakness: plan.targetWeakness,
        question_category: plan.questionCategory,
        difficulty: plan.difficulty,
        adaptive_state: plan.adaptiveState,
        scaffolding_level: plan.scaffoldingLevel,
        reason_for_next_challenge: plan.reasonForNextChallenge,
        training_objective: plan.trainingObjective,
        time_limit_seconds: plan.timeLimitSeconds,
        recent_prompts: plan.avoidRecentPrompts,
        avoid_prompts: plan.avoidRecentPrompts,
        recent_categories: plan.avoidRecentCategories,
      });

      if (generated && generated.challenge_prompt) {
        // Normalize returned properties against the authoritative plan for machine-readable integrity
        const normalizedChallenge: PersonalizedChallenge = {
          ...generated,
          category: generated.category || plan.questionCategory,
          practice_context: generated.practice_context || plan.practiceContext,
          target_skill: generated.target_skill || plan.targetSkill,
          target_weakness: generated.target_weakness || plan.targetWeakness,
          difficulty: generated.difficulty || plan.difficulty,
          adaptive_state: generated.adaptive_state || plan.adaptiveState,
          scaffolding_level: generated.scaffolding_level || plan.scaffoldingLevel,
          reason_for_next_challenge: generated.reason_for_next_challenge || plan.reasonForNextChallenge,
          time_limit_seconds: generated.time_limit_seconds || plan.timeLimitSeconds,
          why_this_challenge: generated.why_this_challenge || generated.why_this_question || plan.reasonForNextChallenge || plan.trainingObjective,
          why_this_question: generated.why_this_question || generated.why_this_challenge || plan.reasonForNextChallenge || plan.trainingObjective,
        };
        setAiChallenge(normalizedChallenge);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('AI Topic generation fallback notice:', err);
      }
    } finally {
      setIsGeneratingAi(false);
    }
  }, []);

  useEffect(() => {
    analytics.track('quick_practice_opened');

    async function loadPersonalizedRecommendation() {
      try {
        const [allChallenges, plan] = await Promise.all([
          challengeApi.getChallenges(),
          personalizationApi.getActiveTrainingPlan(),
        ]);

        if (allChallenges && allChallenges.length > 0) {
          setCatalog(allChallenges);
        }
        setActivePlan(plan);

        // Curated recommendation fallback matching the plan's target weakness or skill
        let recommended: Challenge | undefined;

        if (plan.targetWeakness) {
          recommended = allChallenges.find(
            (c) =>
              c.targetWeakness?.toLowerCase() === plan.targetWeakness?.toLowerCase() ||
              c.targetSkill.toLowerCase() === plan.targetWeakness?.toLowerCase()
          );
        }

        if (!recommended && plan.targetSkill) {
          recommended = allChallenges.find(
            (c) => c.targetSkill.toLowerCase() === plan.targetSkill.toLowerCase()
          );
        }

        if (recommended) {
          setCurrentChallenge(recommended);
        }

        // If Gemini BYOK key is connected, generate a live personalized AI challenge
        if (geminiApiKey) {
          generateAiTopic(geminiApiKey);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Quick Practice personalization info:', err);
        }
      }
    }

    loadPersonalizedRecommendation();
  }, [geminiApiKey, generateAiTopic]);

  const handleNextCuratedChallenge = () => {
    if (catalog.length <= 1) return;
    candidateIndexRef.current = (candidateIndexRef.current + 1) % catalog.length;
    let nextCandidate = catalog[candidateIndexRef.current];

    if (nextCandidate.id === currentChallenge.id && catalog.length > 1) {
      candidateIndexRef.current = (candidateIndexRef.current + 1) % catalog.length;
      nextCandidate = catalog[candidateIndexRef.current];
    }

    setCurrentChallenge(nextCandidate);
  };

  const handleStartChallenge = () => {
    if (aiChallenge) {
      // Map AI challenge onto an existing template archetype for persistent schema compatibility
      const baseTemplate = catalog.find((c) => c.targetSkill === aiChallenge.target_skill) || catalog[0];
      const customChallenge: Challenge = {
        ...baseTemplate,
        title: aiChallenge.challenge_title,
        prompt: aiChallenge.challenge_prompt,
        whyItMatters: aiChallenge.why_this_challenge || aiChallenge.why_this_question || baseTemplate.whyItMatters,
        durationSeconds: aiChallenge.time_limit_seconds || 60,
        instructions: aiChallenge.success_criteria || baseTemplate.instructions,
      };

      analytics.track('quick_practice_started', {
        challenge_id: baseTemplate.id,
        target_skill: aiChallenge.target_skill,
        category: aiChallenge.category,
        is_ai_personalized: true,
      });

      navigate(`/challenge/${baseTemplate.id}`, {
        state: { personalizedChallenge: customChallenge },
      });
    } else {
      analytics.track('quick_practice_started', {
        challenge_id: currentChallenge.id,
        target_skill: currentChallenge.targetSkill,
        is_ai_personalized: false,
      });
      navigate(`/challenge/${currentChallenge.id}`);
    }
  };

  const formatCategoryLabel = (cat?: string) => {
    if (!cat) return 'Targeted Drill';
    return cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatContextLabel = (ctx?: string) => {
    if (!ctx) return 'Practice';
    return ctx.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <AppShell title="Quick Practice">
      <PageContainer className="space-y-4">
        {/* Header Intro */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" /> Instant Speaking Drill
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Personalized Practice
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deliberate speaking drills tailored to your specific role, weakness, and communication goals.
          </p>
        </div>

        {/* AI Key Missing Banner */}
        {!hasGeminiKey && (
          <Card className="border border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0 mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">
                    Connect Gemini to Unlock AI Speaking Coach
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Add your free Google Gemini API key to receive AI-personalized drill prompts, audio transcription, and evidence-backed evaluation.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKeyModalOpen(true)}
                className="w-full text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              >
                <KeyRound className="w-3.5 h-3.5" /> Connect Gemini Key
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 1. PRIMARY HERO RECOMMENDED CHALLENGE (AI or Curated) */}
        {hasGeminiKey && aiChallenge ? (
          <Card className="border border-primary/60 bg-gradient-to-br from-primary/20 via-primary/5 to-card shadow-lg">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2.5">
                {/* Taxonomy & Context Meta Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {formatContextLabel(aiChallenge.practice_context)} · {formatCategoryLabel(aiChallenge.category)}
                  </span>

                  {activePlan?.targetRole && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground px-2 py-0.5 rounded bg-secondary/80 border border-border/60">
                      <Briefcase className="w-3 h-3 text-muted-foreground" /> {activePlan.targetRole}
                    </span>
                  )}

                  {activePlan?.adaptiveStateLabel && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/25">
                      {activePlan.adaptiveStateLabel}
                    </span>
                  )}

                  {activePlan?.experienceLevelLabel && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-secondary/80 text-foreground font-medium border border-border/40">
                      {activePlan.experienceLevelLabel}
                    </span>
                  )}

                  {activePlan?.targetDomain && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium border border-primary/20">
                      {activePlan.targetDomain}
                    </span>
                  )}

                  <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
                    Level {aiChallenge.difficulty}/5 · {activePlan?.scaffoldingLevel ? `${activePlan.scaffoldingLevel.toUpperCase()} GUIDANCE` : 'STRUCTURED'}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    "{aiChallenge.challenge_prompt}"
                  </h3>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold shrink-0">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{aiChallenge.time_limit_seconds || 60}s</span>
                  </div>
                </div>
              </div>

              {/* Why this question */}
              <div className="p-3 rounded-xl bg-card/70 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary">
                  <Target className="w-3.5 h-3.5" /> Why You're Practicing This:
                </span>
                <p>{aiChallenge.why_this_question || aiChallenge.why_this_challenge}</p>
              </div>

              {/* Success Criteria */}
              {aiChallenge.success_criteria && aiChallenge.success_criteria.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Success Criteria:
                  </span>
                  <div className="space-y-1">
                    {aiChallenge.success_criteria.map((crit, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coach tip */}
              {aiChallenge.coach_tip_before_start && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Coach Tip: </strong>
                    {aiChallenge.coach_tip_before_start}
                  </span>
                </div>
              )}

              {/* Primary Action Button */}
              <div className="pt-2 space-y-2.5">
                <Button
                  onClick={handleStartChallenge}
                  className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
                >
                  Start This Drill <ArrowRight className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => geminiApiKey && generateAiTopic(geminiApiKey)}
                  disabled={isGeneratingAi}
                  className="w-full min-h-[42px] touch-target text-xs gap-1.5"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Tailoring Next Challenge...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" /> Try Another AI Challenge
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-card shadow-md">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                      {currentChallenge.targetSkill} Focus
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
                      {currentChallenge.difficultyLabel}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    "{currentChallenge.prompt}"
                  </h3>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold shrink-0">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{currentChallenge.durationSeconds}s</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentChallenge.whyItMatters}
              </p>

              {/* Primary Action Button & Try Another */}
              <div className="pt-2 space-y-2.5">
                <Button
                  onClick={handleStartChallenge}
                  className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
                >
                  Start This Drill <ArrowRight className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNextCuratedChallenge}
                  className="w-full min-h-[42px] touch-target text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try Another Challenge
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. OPTIONAL FULL 38-CHALLENGE ACCORDION */}
        <div className="pt-2">
          <Button
            variant="ghost"
            onClick={() => setShowFullLibrary(!showFullLibrary)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground p-3 rounded-xl border border-border/60 bg-card/50"
          >
            <span className="flex items-center gap-2 font-semibold">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Explore Exercise Templates ({catalog.length} Archetypes)</span>
            </span>
            {showFullLibrary ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {showFullLibrary && (
            <div className="space-y-2.5 pt-3">
              {catalog.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  onSelect={(id) => navigate(`/challenge/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      <GeminiKeyModal open={keyModalOpen} onOpenChange={setKeyModalOpen} />
    </AppShell>
  );
};

export default Practice;
