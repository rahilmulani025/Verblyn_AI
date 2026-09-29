import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { progressApi } from '@/features/progress/progress.api';
import { UserProgressMetrics } from '@/features/progress/progress.types';
import {
  Award,
  Flame,
  TrendingUp,
  ChevronRight,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Minus,
} from 'lucide-react';

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<UserProgressMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    progressApi.getProgress().then((res) => {
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <AppShell title="Progress">
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const streak = data?.currentStreak ?? 0;
  const sessions = data?.totalSessions ?? 0;
  const mastery = data?.overallMasteryScore ?? 0;
  const skills = data?.skills || [];
  const activeWeaknesses = data?.activeWeaknesses || [];
  const improvingWeaknesses = data?.improvingWeaknesses || [];
  const currentFocus = data?.currentFocus;

  return (
    <AppShell title="Progress" streakCount={streak}>
      <PageContainer className="space-y-4">
        {/* Top Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border border-border/70 bg-card text-center">
            <CardContent className="p-3">
              <span className="text-[11px] text-muted-foreground font-medium">Streak</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-orange-400 font-bold text-lg">
                <Flame className="w-4 h-4 fill-orange-400" />
                <span>{streak}d</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card text-center">
            <CardContent className="p-3">
              <span className="text-[11px] text-muted-foreground font-medium">Drills</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-primary font-bold text-lg">
                <span>{sessions}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card text-center">
            <CardContent className="p-3">
              <span className="text-[11px] text-muted-foreground font-medium">Mastery</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-emerald-400 font-bold text-lg">
                <span>{mastery > 0 ? `${mastery}%` : '70%'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Focus & Weakness Resolution Card */}
        {currentFocus && (
          <Card className="border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-transparent">
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Your Current Focus
                </span>
                {currentFocus.improvingDelta !== undefined && currentFocus.improvingDelta > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" /> +{currentFocus.improvingDelta} pts
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-foreground">{currentFocus.label}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{currentFocus.reason}</p>

              {/* Active & Improving Weakness Chips */}
              {(activeWeaknesses.length > 0 || improvingWeaknesses.length > 0) && (
                <div className="pt-1.5 flex flex-wrap gap-1.5">
                  {activeWeaknesses.map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300"
                    >
                      <AlertCircle className="w-3 h-3" /> {w.label} ({w.occurrenceCount}x)
                    </span>
                  ))}
                  {improvingWeaknesses.map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    >
                      <CheckCircle2 className="w-3 h-3" /> {w.label} (Improving)
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 5 Core Skills: Baseline vs Current */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Vocal Skill Growth
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">Baseline → Current</span>
          </h3>

          <div className="space-y-2">
            {skills.map((skill) => {
              const delta = skill.improvementDelta;
              return (
                <div
                  key={skill.skillName}
                  className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{skill.skillName}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          skill.trend === 'improving'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {skill.trend.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Baseline: <strong className="text-foreground">{skill.baselineScore}%</strong></span>
                      <span>→</span>
                      <span>Current: <strong className="text-primary">{skill.currentScore}%</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    {delta > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400">
                        <ArrowUpRight className="w-3.5 h-3.5" /> +{delta}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
                        <Minus className="w-3.5 h-3.5" /> {delta}%
                      </span>
                    )}
                    <span className="block text-[10px] text-muted-foreground">Best: {skill.bestScore}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Achievements Entry Card */}
        <Card
          onClick={() => navigate('/progress/achievements')}
          className="border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 active:bg-amber-500/15 transition-colors cursor-pointer"
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Achievements & Milestones</h4>
                <p className="text-xs text-muted-foreground">View unlocked speaking badges</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Recent Session Activity */}
        <div className="space-y-2 pt-1">
          <h3 className="text-sm font-semibold text-foreground">Recent Speaking Drills</h3>
          {data?.recentSessions && data.recentSessions.length > 0 ? (
            <div className="space-y-2">
              {data.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground block truncate max-w-[200px]">
                      {session.topic}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {session.durationSeconds}s ·{' '}
                      {new Date(session.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-bold text-primary">{session.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-card/50 border border-border/40 text-center text-xs text-muted-foreground">
              No practice drills recorded yet. Complete your first challenge to see history.
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default ProgressPage;
