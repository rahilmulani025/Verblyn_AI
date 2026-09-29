import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChallengeCard } from '@/components/challenge/ChallengeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { challengeApi } from '@/features/challenges/challenge.api';
import { CHALLENGE_CATALOG } from '@/features/challenges/challenge.catalog';
import { profileApi } from '@/features/profile/profile.api';
import { progressApi } from '@/features/progress/progress.api';
import { Challenge } from '@/features/challenges/challenge.types';
import { analytics } from '@/lib/analytics';
import {
  ArrowRight,
  RotateCcw,
  Zap,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const Practice: React.FC = () => {
  const navigate = useNavigate();
  // Instant seed catalogue — zero wait time for initial render
  const [catalog, setCatalog] = useState<Challenge[]>(CHALLENGE_CATALOG);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge>(CHALLENGE_CATALOG[0]);
  const [showFullLibrary, setShowFullLibrary] = useState(false);
  const candidateIndexRef = useRef<number>(0);

  useEffect(() => {
    analytics.track('quick_practice_opened');

    // Enrich recommendation seamlessly in the background
    async function loadPersonalizedRecommendation() {
      try {
        const [allChallenges, profile, progress] = await Promise.all([
          challengeApi.getChallenges(),
          profileApi.getProfile(),
          progressApi.getProgress(),
        ]);

        if (allChallenges && allChallenges.length > 0) {
          setCatalog(allChallenges);
        }

        const activeWeakness = progress?.activeWeaknesses?.[0];
        const lowestSkill = progress?.skills
          ? [...progress.skills].sort((a, b) => a.currentScore - b.currentScore)[0]
          : undefined;

        let recommended: Challenge | undefined;

        if (activeWeakness) {
          recommended = allChallenges.find(
            (c) =>
              c.targetWeakness?.toLowerCase() === activeWeakness.type.toLowerCase() ||
              c.targetSkill.toLowerCase() === activeWeakness.skillName.toLowerCase()
          );
        }

        if (!recommended && lowestSkill) {
          recommended = allChallenges.find(
            (c) => c.targetSkill.toLowerCase() === lowestSkill.skillName.toLowerCase()
          );
        }

        if (!recommended && profile?.primaryGoal) {
          recommended = allChallenges.find((c) => c.goalTags.includes(profile.primaryGoal!));
        }

        if (recommended) {
          setCurrentChallenge(recommended);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Quick Practice personalization info:', err);
        }
      }
    }

    loadPersonalizedRecommendation();
  }, []);

  const handleNextQuickChallenge = () => {
    if (catalog.length <= 1) return;
    candidateIndexRef.current = (candidateIndexRef.current + 1) % catalog.length;
    let nextCandidate = catalog[candidateIndexRef.current];

    // Ensure we don't return the exact same challenge consecutively if multiple exist
    if (nextCandidate.id === currentChallenge.id && catalog.length > 1) {
      candidateIndexRef.current = (candidateIndexRef.current + 1) % catalog.length;
      nextCandidate = catalog[candidateIndexRef.current];
    }

    setCurrentChallenge(nextCandidate);
  };

  const handleStartPractice = () => {
    if (!currentChallenge) return;
    analytics.track('quick_practice_started', {
      challenge_id: currentChallenge.id,
      target_skill: currentChallenge.targetSkill,
    });
    navigate(`/challenge/${currentChallenge.id}`);
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
            Quick Practice
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            One focused challenge right now to keep your conversational momentum sharp.
          </p>
        </div>

        {/* 1. PRIMARY HERO RECOMMENDED CHALLENGE */}
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
                onClick={handleStartPractice}
                className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
              >
                Start This Drill <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                onClick={handleNextQuickChallenge}
                className="w-full min-h-[42px] touch-target text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Try Another Challenge
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. OPTIONAL FULL 38-CHALLENGE ACCORDION */}
        <div className="pt-2">
          <Button
            variant="ghost"
            onClick={() => setShowFullLibrary(!showFullLibrary)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground p-3 rounded-xl border border-border/60 bg-card/50"
          >
            <span className="flex items-center gap-2 font-semibold">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Browse Full Challenge Library ({catalog.length} Drills)</span>
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
    </AppShell>
  );
};

export default Practice;
