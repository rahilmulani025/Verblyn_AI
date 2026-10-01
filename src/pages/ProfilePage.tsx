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
import { useGeminiKey } from '@/context/GeminiKeyContext';
import { GeminiKeyModal } from '@/components/settings/GeminiKeyModal';
import {
  TargetRole,
  StandardTargetRole,
  ExperienceLevel,
  TargetDomain,
  STANDARD_TARGET_ROLES,
  EXPERIENCE_LEVEL_OPTIONS,
  STANDARD_TARGET_DOMAINS,
} from '@/features/personalization/personalization.types';
import { User, LogOut, Save, Target, Flame, Award, Clock, Bot, KeyRound, Briefcase, GraduationCap, Compass, Sparkles } from 'lucide-react';

const COMMITMENT_OPTIONS = [5, 10, 15, 20];

export const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { hasGeminiKey, clearGeminiApiKey } = useGeminiKey();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState<UserProfession>('student');
  const [institution, setInstitution] = useState('');
  const [goal, setGoal] = useState('JOB_INTERVIEWS');
  const [dailyMinutes, setDailyMinutes] = useState<number>(10);
  const [targetRole, setTargetRole] = useState<TargetRole>('Data Analyst');
  const [customTargetRole, setCustomTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('fresher');
  const [targetDomain, setTargetDomain] = useState<TargetDomain>('Technology');
  const [streak, setStreak] = useState<number>(1);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(50);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);

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
            if (profData.targetRole) {
              if (STANDARD_TARGET_ROLES.includes(profData.targetRole as StandardTargetRole)) {
                setTargetRole(profData.targetRole);
              } else {
                setTargetRole('Other');
                setCustomTargetRole(profData.targetRole);
              }
            }
            if (profData.customTargetRole) {
              setCustomTargetRole(profData.customTargetRole);
            }
            if (profData.experienceLevel) {
              setExperienceLevel(profData.experienceLevel);
            } else if (profData.profession === 'student') {
              setExperienceLevel('fresher');
            } else {
              setExperienceLevel('0-2');
            }
            if (profData.targetDomain) {
              setTargetDomain(profData.targetDomain);
            }
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
      const finalRole =
        targetRole === 'Other' && customTargetRole.trim()
          ? customTargetRole.trim()
          : targetRole;

      const ok = await profileApi.updateProfile({
        fullName: fullName.trim(),
        profession,
        institution: institution.trim(),
        primaryGoal: goal,
        dailyGoalMinutes: dailyMinutes,
        targetRole: finalRole,
        customTargetRole: targetRole === 'Other' ? customTargetRole.trim() : undefined,
        experienceLevel,
        targetDomain: targetDomain || undefined,
      });

      if (ok) {
        invalidateProfileCache();
        toast({
          title: 'Profile & Target Role Saved',
          description: 'Future personalized practice drills will now reflect your updated target role and experience level.',
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

        {/* Target Role & Personalization Engine Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> Target Role & Personalization
            </h3>
            <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              Active Engine
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Verblyn automatically calibrates your daily speaking scenarios, evaluation depth, and training difficulty around these settings.
          </p>

          <Card className="border border-border/80 bg-card">
            <CardContent className="p-4 space-y-4">
              {/* Target Role */}
              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" /> Target Role
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STANDARD_TARGET_ROLES.map((role) => {
                    const isSelected = targetRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setTargetRole(role)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                          isSelected
                            ? 'bg-primary/15 border-primary text-primary shadow-sm'
                            : 'bg-secondary/40 border-border/70 hover:border-border text-foreground/80'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>

                {targetRole === 'Other' && (
                  <div className="pt-1">
                    <Input
                      id="prof-custom-role"
                      value={customTargetRole}
                      onChange={(e) => setCustomTargetRole(e.target.value)}
                      placeholder="Specify your custom role (e.g. UX Designer)"
                      className="bg-card border-border/80 min-h-[44px]"
                    />
                  </div>
                )}
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" /> Experience Level
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPERIENCE_LEVEL_OPTIONS.map((lvl) => {
                    const isSelected = experienceLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setExperienceLevel(lvl.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          isSelected
                            ? 'bg-primary/15 border-primary shadow-sm'
                            : 'bg-secondary/40 border-border/70 hover:border-border'
                        }`}
                      >
                        <div className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {lvl.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1">
                          {lvl.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Target Domain / Industry */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-domain" className="text-xs text-foreground font-medium flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-primary" /> Target Domain / Industry <span className="text-muted-foreground text-[10px]">(optional)</span>
                </Label>
                <select
                  id="prof-domain"
                  value={targetDomain}
                  onChange={(e) => setTargetDomain(e.target.value as TargetDomain)}
                  className="w-full min-h-[44px] px-3 rounded-md bg-card border border-border/80 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {STANDARD_TARGET_DOMAINS.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goal & Settings Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">General Preferences</h3>

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
                Current Background / Status
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
                Institution / Organization <span className="text-muted-foreground text-[10px]">(optional)</span>
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

        {/* AI COACH SETTINGS (BYOK) */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-primary" /> Gemini AI (BYOK)
          </h3>
          <Card className="border border-border/80 bg-card">
            <CardContent className="p-4 space-y-3">
              {hasGeminiKey ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium">Status</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-400">Connected</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium">API key</span>
                      <p className="text-xs font-mono text-foreground mt-0.5 tracking-widest select-none">
                        ••••••••••••••••••••
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setKeyModalOpen(true)}
                      className="text-xs font-medium gap-1.5 border-border"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-primary" /> Change key
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => clearGeminiApiKey()}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      Remove key
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">Status</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                      <span className="text-xs font-medium text-muted-foreground">Not connected</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect your Gemini API key to enable AI-powered personalized practice and communication analysis.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setKeyModalOpen(true)}
                    className="text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Add Gemini key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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

        <GeminiKeyModal open={keyModalOpen} onOpenChange={setKeyModalOpen} />

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

