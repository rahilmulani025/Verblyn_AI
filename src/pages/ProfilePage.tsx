import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { profileApi } from '@/features/profile/profile.api';
import { homeApi } from '@/features/home/home.api';
import { GOAL_PRESETS } from '@/features/home/goals.api';
import { UserProfile, UserProfession } from '@/features/profile/profile.types';
import { invalidateProfileCache } from '@/app/guards/useProfileState';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Save, Target, Flame, Award, Clock } from 'lucide-react';

const COMMITMENT_OPTIONS = [5, 10, 15, 20];

export const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState<UserProfession>('student');
  const [institution, setInstitution] = useState('');
  const [goal, setGoal] = useState('JOB_INTERVIEWS');
  const [dailyMinutes, setDailyMinutes] = useState<number>(10);
  const [streak, setStreak] = useState<number>(1);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(50);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([profileApi.getProfile(), homeApi.getLearningHomeData()]).then(
      ([profData, homeData]) => {
        if (isMounted) {
          if (profData) {
            setProfile(profData);
            setFullName(profData.fullName || '');
            setProfession(profData.profession || 'student');
            setInstitution(profData.institution || '');
            if (profData.primaryGoal) setGoal(profData.primaryGoal);
            if (profData.dailyGoalMinutes) setDailyMinutes(profData.dailyGoalMinutes);
          }
          if (homeData) {
            setStreak(homeData.streak.currentStreak);
            setLevel(homeData.level.level);
            setXp(homeData.level.currentXp);
          }
          setLoading(false);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await profileApi.updateProfile({
        fullName: fullName.trim(),
        profession,
        institution: institution.trim(),
        primaryGoal: goal,
        dailyGoalMinutes: dailyMinutes,
      });

      if (ok) {
        invalidateProfileCache();
        toast({
          title: 'Profile Saved',
          description: 'Your changes have been updated.',
        });
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast({
        title: 'Update failed',
        description: 'Could not save profile changes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    invalidateProfileCache();
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <AppShell title="Me">
      <PageContainer className="space-y-4">
        {/* User Identity Card */}
        <Card className="border border-border/70 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {fullName ? fullName.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground truncate">
                {fullName || 'Communicator'}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Level & Streak Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="border border-border/70 bg-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-400">
                <Flame className="w-5 h-5 fill-orange-400" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-medium">Daily Streak</span>
                <h4 className="text-base font-extrabold text-foreground">{streak} Days</h4>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-medium">Level {level}</span>
                <h4 className="text-base font-extrabold text-foreground">{xp} XP</h4>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goal & Settings Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Communication Preferences</h3>

          <div className="space-y-3">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-name" className="text-xs text-foreground font-medium">
                Full Name
              </Label>
              <Input
                id="prof-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="bg-card border-border/80 min-h-[44px]"
              />
            </div>

            {/* Primary Goal */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-goal" className="text-xs text-foreground font-medium">
                Primary Goal
              </Label>
              <select
                id="prof-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-md bg-card border border-border/80 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {GOAL_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Daily Commitment */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-commit" className="text-xs text-foreground font-medium">
                Daily Commitment
              </Label>
              <select
                id="prof-commit"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-md bg-card border border-border/80 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {COMMITMENT_OPTIONS.map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} minutes per day
                  </option>
                ))}
              </select>
            </div>

            {/* Role Track */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-role" className="text-xs text-foreground font-medium">
                Current Role / Status
              </Label>
              <select
                id="prof-role"
                value={profession}
                onChange={(e) => setProfession(e.target.value as UserProfession)}
                className="w-full min-h-[44px] px-3 rounded-md bg-card border border-border/80 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="student">Student / Intern</option>
                <option value="professional">Working Professional</option>
                <option value="educator">Educator / Academic</option>
                <option value="entrepreneur">Founder / Entrepreneur</option>
                <option value="freelancer">Freelancer / Creator</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-inst" className="text-xs text-foreground font-medium">
                Institution / Organization
              </Label>
              <Input
                id="prof-inst"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="University or Company"
                className="bg-card border-border/80 min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Primary Save Action */}
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-sm mt-2"
        >
          {saving ? 'Saving...' : 'Save Profile Changes'}
          <Save className="w-4 h-4" />
        </Button>

        {/* Sign Out Button */}
        <div className="pt-4 border-t border-border/40">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full min-h-[44px] touch-target text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default ProfilePage;

