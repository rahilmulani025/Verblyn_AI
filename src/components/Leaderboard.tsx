import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Flame, Medal, Crown } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  current_streak: number | null;
  total_sessions: number | null;
  rank_score: number | null;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from("leaderboard")
          .select("*")
          .limit(10);

        if (error) {
          // Only log in development
          if (import.meta.env.DEV) {
            console.error("Error fetching leaderboard:", error);
          }
          return;
        }

        setEntries(data || []);

        // Find user's rank
        if (user && data) {
          const userIndex = data.findIndex((entry) => entry.user_id === user.id);
          if (userIndex !== -1) {
            setUserRank(userIndex + 1);
          }
        }
      } catch (error) {
        // Only log in development
        if (import.meta.env.DEV) {
          console.error("Error:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground font-bold">{rank}</span>;
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-300/20 to-gray-400/10 border-gray-300/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30";
      default:
        return "bg-muted/10 border-border/50";
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Top Speakers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No rankings yet. Be the first to practice!
          </p>
        ) : (
          entries.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = user?.id === entry.user_id;
            
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getRankStyles(rank)} ${
                  isCurrentUser ? "ring-2 ring-accent/50" : ""
                }`}
              >
                <div className="flex-shrink-0 w-8 flex justify-center">
                  {getRankIcon(rank)}
                </div>
                
                <Avatar className="w-10 h-10 border-2 border-background">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="bg-accent/20 text-accent text-sm">
                    {getInitials(entry.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isCurrentUser ? "text-accent" : ""}`}>
                    {entry.full_name || "Anonymous"}
                    {isCurrentUser && " (You)"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      {entry.current_streak || 0} streak
                    </span>
                    <span>•</span>
                    <span>{entry.total_sessions || 0} sessions</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-accent">
                    {Math.round(entry.rank_score || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            );
          })
        )}

        {userRank && userRank > 10 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              Your rank: <span className="text-accent font-bold">#{userRank}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
