import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChallengeCard } from '@/components/challenge/ChallengeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { homeApi } from '@/features/home/home.api';
import { HomeLearningPayload } from '@/features/home/home.types';
import { analytics } from '@/lib/analytics';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Sparkles,
  Target,
  Zap,
  Award,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HomeLearningPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analytics.track('home_viewed');
    let isMounted = true;

    homeApi.getLearningHomeData().then((res) => {
      if (isMounted) {
        setData(res);
        setLoading(false);
        if (res.dailyMission) {
          analytics.track('daily_mission_viewed', {
            challenge_id: res.dailyMission.challenge.id,
            target_skill: res.dailyMission.challenge.targetSkill,
          });
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <AppShell title="Verblyn Home">
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const mission = data?.dailyMission;
  const streak = data?.streak;
  const level = data?.level;

  return (
    <AppShell
      title="Verblyn"
      streakCount={streak?.currentStreak ?? 1}
      xpCount={level?.currentXp ?? 0}
    >
      <PageContainer className="space-y-4">
        {/* User Greeting & Focus Header */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {data?.greeting}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {data?.userName}
          </h2>
        </div>

        {/* YOUR FOCUS PILLAR */}
        <Card className="border border-border/70 bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/15 text-primary">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  Your Active Focus
                </span>
                <h4 className="text-sm font-bold text-foreground">{data?.focusSkill}</h4>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {data?.primaryGoalTitle}
            </span>
          </CardContent>
        </Card>

        {/* HERO: TODAY'S MISSION */}
        {mission && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> Today's Mission
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Sparkles className="w-3 h-3" /> +{mission.xpValue} XP
              </span>
            </div>

            <Card
              className={`border transition-all ${
                mission.completed
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-card shadow-md'
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                      {mission.challenge.targetSkill} Drill
                    </span>
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      "{mission.challenge.prompt}"
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-secondary text-foreground shrink-0">
                    {mission.challenge.durationSeconds}s
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {mission.challenge.whyItMatters}
                </p>

                {/* Primary CTA */}
                {mission.completed ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Mission Completed Today!
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/challenge/${mission.challenge.id}`)}
                      className="underline text-emerald-400 hover:text-white"
                    >
                      Re-drill
                    </button>
                  </div>
                ) : (
                  <Button
                    onClick={() =>
                      navigate(`/challenge/${mission.challenge.id}`, {
                        state: { isDailyMission: true },
                      })
                    }
                    className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
                  >
                    Start Daily Mission <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* GAMIFICATION & MOMENTUM STRIP */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Streak Card */}
          <Card className="border border-border/70 bg-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-400">
                <Flame className="w-5 h-5 fill-orange-400" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-medium">Daily Streak</span>
                <h4 className="text-base font-extrabold text-foreground">
                  {streak?.currentStreak ?? 1} {streak?.currentStreak === 1 ? 'Day' : 'Days'}
                </h4>
              </div>
            </CardContent>
          </Card>

          {/* Level & XP Card */}
          <Card className="border border-border/70 bg-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">Level {level?.level}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {level?.currentXp} / {level?.nextLevelXp} XP
                  </span>
                </div>
                <Progress value={level?.progressPercent ?? 30} className="h-1.5 mt-1 bg-secondary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* WEEKLY ACTIVITY DOTS */}
        <Card className="border border-border/70 bg-card">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Weekly Practice Pace</span>
              <span className="text-muted-foreground">
                {data?.weeklyProgress.filter((w) => w.completed).length} / 7 Days Active
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              {data?.weeklyProgress.map((day) => (
                <div key={day.dateString} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      day.completed
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : day.isToday
                        ? 'border-2 border-dashed border-primary text-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {day.completed ? '✓' : day.dayName.charAt(0)}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day.dayName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PRACTICE CATALOG */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Targeted Drills
            </span>
            <span className="text-xs text-muted-foreground">
              {data?.practiceCatalog.length} available
            </span>
          </div>

          <div className="space-y-2.5">
            {data?.practiceCatalog.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onSelect={(id) => navigate(`/challenge/${id}`)}
              />
            ))}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default HomePage;
