import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { achievementsApi } from '@/features/achievements/achievements.api';
import { Achievement } from '@/features/achievements/achievements.types';
import { Award, CheckCircle2, Flame, Lock, Sparkles, Trophy, Zap } from 'lucide-react';

export const AchievementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    achievementsApi.getAchievements().then((data) => {
      if (isMounted) {
        setAchievements(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5" />;
      case 'Zap':
        return <Zap className="w-5 h-5" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <AppShell title="Achievements" showBack={true} onBack={() => navigate('/progress')}>
      <PageContainer className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Milestones & Badges
          </h2>
          <p className="text-xs text-muted-foreground">
            Earn vocal mastery badges as you log drills and maintain your daily streak.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {achievements.map((item) => (
              <Card
                key={item.id}
                className={`border transition-all ${
                  item.unlocked
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-border/60 bg-card/60 opacity-80'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          item.unlocked
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {item.unlocked ? getIcon(item.icon) : <Lock className="w-5 h-5" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                          {item.unlocked && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!item.unlocked && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {item.currentValue} / {item.targetValue}
                        </span>
                      </div>
                      <Progress value={item.progress} className="h-1.5 bg-secondary" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default AchievementsPage;
