import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Award, Clock, Calendar, Play, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ScoreRing from '@/components/practice/ScoreRing';
import AnimatedBackground from '@/components/AnimatedBackground';
import Leaderboard from '@/components/Leaderboard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

interface UserProgress {
  total_sessions: number;
  avg_grammar_score: number;
  avg_fluency_score: number;
  avg_vocabulary_score: number;
  avg_confidence_score: number;
  current_streak: number;
  best_grammar_score: number;
  best_fluency_score: number;
  best_vocabulary_score: number;
  best_confidence_score: number;
}

interface Session {
  id: string;
  topic: string;
  grammar_score: number | null;
  fluency_score: number | null;
  vocabulary_score: number | null;
  confidence_score: number | null;
  duration_seconds: number | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (progressData) {
        setProgress(progressData);
      }

      // Fetch recent sessions
      const { data: sessionsData } = await supabase
        .from('speaking_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionsData) {
        setSessions(sessionsData);
        
        // Prepare chart data (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          return {
            date: format(date, 'MMM d'),
            fullDate: format(date, 'yyyy-MM-dd'),
          };
        });

        const chartDataWithScores = last7Days.map(day => {
          const daySessions = sessionsData.filter(s => 
            format(parseISO(s.created_at), 'yyyy-MM-dd') === day.fullDate
          );
          
          if (daySessions.length === 0) {
            return { ...day, grammar: null, fluency: null, vocabulary: null, confidence: null };
          }

          const avg = (scores: (number | null)[]) => {
            const valid = scores.filter((s): s is number => s !== null);
            return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
          };

          return {
            ...day,
            grammar: avg(daySessions.map(s => s.grammar_score)),
            fluency: avg(daySessions.map(s => s.fluency_score)),
            vocabulary: avg(daySessions.map(s => s.vocabulary_score)),
            confidence: avg(daySessions.map(s => s.confidence_score)),
          };
        });

        setChartData(chartDataWithScores);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAverageScore = (session: Session) => {
    const scores = [
      session.grammar_score,
      session.fluency_score,
      session.vocabulary_score,
      session.confidence_score
    ].filter((s): s is number => s !== null);
    
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Dashboard</h1>
              <p className="text-sm text-muted-foreground">Track your speaking progress</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/profile')} className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </Button>
            <Button onClick={() => navigate('/practice')} className="gap-2 bg-accent hover:bg-accent/90">
              <Play className="w-4 h-4" />
              Practice Now
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{progress?.total_sessions || 0}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{progress?.current_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {progress ? Math.round((Number(progress.avg_grammar_score) + Number(progress.avg_fluency_score) + Number(progress.avg_vocabulary_score) + Number(progress.avg_confidence_score)) / 4) : 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {sessions.length > 0 
                    ? formatDuration(Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length))
                    : '0:00'}
                </p>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Average Scores */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-6">Average Scores</h2>
            <div className="grid grid-cols-2 gap-6">
              <ScoreRing 
                score={Math.round(Number(progress?.avg_grammar_score) || 0)} 
                label="Grammar" 
                size="md" 
              />
              <ScoreRing 
                score={Math.round(Number(progress?.avg_fluency_score) || 0)} 
                label="Fluency" 
                size="md" 
              />
              <ScoreRing 
                score={Math.round(Number(progress?.avg_vocabulary_score) || 0)} 
                label="Vocabulary" 
                size="md" 
              />
              <ScoreRing 
                score={Math.round(Number(progress?.avg_confidence_score) || 0)} 
                label="Confidence" 
                size="md" 
              />
            </div>
          </div>

          {/* Progress Chart */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Last 7 Days</h2>
            {chartData.some(d => d.grammar !== null) ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="grammar" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--accent))' }}
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="fluency" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e' }}
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="vocabulary" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b' }}
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <p>Complete some practice sessions to see your progress chart</p>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <Leaderboard />
        </div>

        {/* Recent Sessions */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h2>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{session.topic}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(session.created_at), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(session.duration_seconds)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">{getAverageScore(session)}</span>
                      <span className="text-xs text-muted-foreground">avg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No practice sessions yet.</p>
              <Button 
                onClick={() => navigate('/practice')} 
                className="mt-4 gap-2"
              >
                <Play className="w-4 h-4" />
                Start Your First Session
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
