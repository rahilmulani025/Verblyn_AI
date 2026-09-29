import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { GoalOptionCard } from '@/components/onboarding/GoalOptionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GOAL_PRESETS } from '@/features/home/goals.api';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import { profileApi } from '@/features/profile/profile.api';
import { UserGoal, UserProfessionOption } from '@/features/onboarding/onboarding.types';
import { invalidateProfileCache } from '@/app/guards/useProfileState';
import { useAuth } from '@/hooks/useAuth';
import { analytics } from '@/lib/analytics';
import { ArrowRight, Sparkles, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const PROFESSION_OPTIONS: UserProfessionOption[] = [
  'Student',
  'Recent Graduate',
  'Working Professional',
  'Other',
];

const COMMITMENT_OPTIONS = [
  { minutes: 5, label: '5 minutes', desc: 'Quick daily boost' },
  { minutes: 10, label: '10 minutes', desc: 'Recommended steady pace' },
  { minutes: 15, label: '15 minutes', desc: 'Accelerated growth' },
  { minutes: 20, label: '20 minutes', desc: 'Deep mastery focus' },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [selectedGoal, setSelectedGoal] = useState<UserGoal>('JOB_INTERVIEWS');
  const [dailyMinutes, setDailyMinutes] = useState<number>(10);
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [profession, setProfession] = useState<UserProfessionOption>('Student');

  // Validation & Submission State
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load existing profile if returning user
  useEffect(() => {
    analytics.track('onboarding_started');

    profileApi.getProfile().then((data) => {
      if (data) {
        if (data.primaryGoal) {
          const matched = GOAL_PRESETS.find((g) => g.id === data.primaryGoal);
          if (matched) setSelectedGoal(matched.id as UserGoal);
        }
        if (data.dailyGoalMinutes) {
          setDailyMinutes(data.dailyGoalMinutes);
        }
        if (data.fullName) {
          setFullName(data.fullName);
        } else if (user?.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name);
        }
        if (data.institution) {
          setInstitution(data.institution);
        }
        if (data.profession === 'professional') {
          setProfession('Working Professional');
        } else if (data.profession === 'student') {
          setProfession('Student');
        } else if (data.profession === 'other') {
          setProfession('Other');
        }
      } else if (user?.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
      setLoadingInitial(false);
    });
  }, [user]);

  const handleSelectGoal = (goalId: UserGoal) => {
    setSelectedGoal(goalId);
  };

  const handleSelectCommitment = (minutes: number) => {
    setDailyMinutes(minutes);
  };

  const handleNextStep = () => {
    setSubmitError(null);
    if (step === 1) {
      analytics.track('onboarding_step_completed', { step: 1, primary_goal: selectedGoal });
      setStep(2);
    } else if (step === 2) {
      analytics.track('onboarding_step_completed', { step: 2, duration_seconds: dailyMinutes * 60 });
      setStep(3);
    }
  };

  const handleBackStep = () => {
    setSubmitError(null);
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handleComplete = async () => {
    setSubmitError(null);
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setNameError('Please enter your full name');
      return;
    }
    setNameError(null);
    setSubmitting(true);

    try {
      const result = await onboardingApi.submitOnboarding({
        fullName: trimmedName,
        goal: selectedGoal,
        dailyCommitmentMinutes: dailyMinutes,
        institution: institution.trim() || undefined,
        profession,
      });

      if (result.success) {
        analytics.track('onboarding_completed', {
          primary_goal: selectedGoal,
          duration_seconds: dailyMinutes * 60,
        });
        invalidateProfileCache();
        navigate('/assessment', { replace: true });
      } else {
        setSubmitError(result.error || 'Failed to save onboarding. Please check your connection.');
      }
    } catch (err) {
      console.error('Failed to submit onboarding:', err);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <AppShell title="Verblyn Setup" showNav={false} showHeader={true}>
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Verblyn Setup"
      showHeader={true}
      showNav={false}
      showBack={step > 1}
      onBack={handleBackStep}
    >
      <PageContainer className="flex-1 flex flex-col justify-between py-2 space-y-4">
        <div className="space-y-4">
          {/* Step Counter Indicator */}
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="text-xs font-bold text-primary tracking-wide uppercase">
              Step {step} of 3
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step
                      ? 'w-6 bg-primary'
                      : s < step
                      ? 'w-3 bg-primary/50'
                      : 'w-3 bg-secondary'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Submission Error Banner */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Saving failed</span>
                <span>{submitError}</span>
              </div>
            </div>
          )}

          {/* STEP 1: GOAL */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  What is your primary communication goal?
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verblyn customizes your daily speaking drills and feedback around this priority.
                </p>
              </div>

              <div className="space-y-2.5">
                {GOAL_PRESETS.map((preset) => (
                  <GoalOptionCard
                    key={preset.id}
                    id={preset.id}
                    title={preset.title}
                    description={preset.description}
                    category={preset.category}
                    selected={selectedGoal === preset.id}
                    onSelect={(id) => handleSelectGoal(id as UserGoal)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: DAILY COMMITMENT */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  How much time can you realistically practice each day?
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Short, focused daily voice drills build natural conversational confidence.
                </p>
              </div>

              <div className="space-y-2.5">
                {COMMITMENT_OPTIONS.map((opt) => {
                  const isSelected = dailyMinutes === opt.minutes;
                  return (
                    <div
                      key={opt.minutes}
                      onClick={() => handleSelectCommitment(opt.minutes)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between min-h-[56px] touch-target ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-sm'
                          : 'bg-card border-border/70 hover:border-border active:bg-secondary/40'
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{opt.label}</h4>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30 bg-secondary/50'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: BASIC PROFILE */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Complete your profile
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We use this strictly to calibrate relevant communication scenarios for you.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-name" className="text-xs text-foreground font-medium">
                    Full Name <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    id="onboard-name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="e.g. Alex Morgan"
                    className={`bg-card min-h-[44px] ${
                      nameError ? 'border-rose-500 focus-visible:ring-rose-500' : 'border-border/80'
                    }`}
                  />
                  {nameError && (
                    <p className="text-[11px] text-rose-400 font-medium">{nameError}</p>
                  )}
                </div>

                {/* Profession / Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-prof" className="text-xs text-foreground font-medium">
                    Current Status / Profession
                  </Label>
                  <select
                    id="onboard-prof"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value as UserProfessionOption)}
                    className="w-full min-h-[44px] px-3 rounded-md bg-card border border-border/80 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PROFESSION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Institution */}
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-inst" className="text-xs text-foreground font-medium">
                    College / University / Company <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="onboard-inst"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Stanford University or TechCorp"
                    className="bg-card border-border/80 min-h-[44px]"
                  />
                </div>

                <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 text-xs text-muted-foreground space-y-1 mt-2">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Next: Voice Baseline Calibration
                  </div>
                  <p>You will take a single 60-second voice drill to measure your communication starting point.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA Per Step */}
        <div className="pt-4 mt-auto">
          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
            >
              {submitting ? 'Calibrating Profile...' : 'Save & Continue to Baseline'}
              <Sparkles className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default OnboardingPage;
