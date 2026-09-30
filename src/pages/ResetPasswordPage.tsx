import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, KeyRound, Loader2 } from 'lucide-react';
import { invalidateProfileCache } from '@/app/guards/useProfileState';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidRecoverySession, setHasValidRecoverySession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    let isMounted = true;

    // Check if recovery event or active session is detected from Supabase URL token
    const checkRecoverySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error || !session) {
          // Check if hash has error or error_description
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const searchParams = new URLSearchParams(window.location.search);
          const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

          if (errorDesc) {
            setErrorMessage(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
          } else {
            setErrorMessage('Your password reset link is invalid or has expired. Please request a new link.');
          }
          setHasValidRecoverySession(false);
        } else {
          setHasValidRecoverySession(true);
          setErrorMessage(null);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage('Unable to verify recovery link. Please request a new password reset.');
          setHasValidRecoverySession(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    // Listen to auth state change in case Supabase exchanges token after render
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasValidRecoverySession(true);
        setErrorMessage(null);
        setIsCheckingSession(false);
      }
    });

    checkRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [location]);

  const handleUpdatePassword = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setErrorMessage(error.message);
        toast({
          title: 'Update failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setIsSuccess(true);
        invalidateProfileCache();
        toast({
          title: 'Password Updated',
          description: 'Your password has been changed successfully.',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setErrorMessage(msg);
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted-foreground">Verifying password recovery session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
          <Logo />
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {isSuccess ? (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">PASSWORD UPDATED</h1>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your password has been changed successfully. You can now continue to Verblyn.
                </p>
              </div>

              <Button
                onClick={() => navigate('/home', { replace: true })}
                className="w-full min-h-[46px] text-xs font-semibold gap-2 mt-4"
              >
                Continue to Verblyn
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : !hasValidRecoverySession ? (
            /* Invalid/Expired Link State */
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground">INVALID OR EXPIRED LINK</h1>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {errorMessage || 'This password reset link is invalid, has expired, or has already been used.'}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full min-h-[44px] text-xs font-semibold"
                >
                  Request New Reset Link
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth')}
                  className="w-full min-h-[40px] text-xs text-muted-foreground"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          ) : (
            /* Create New Password Form */
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-primary font-semibold">Security Update</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">CREATE NEW PASSWORD</h1>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Enter your new password below to secure your Verblyn account.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl text-xs mb-5 flex items-start gap-2.5 bg-destructive/10 border border-destructive/30 text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={form.handleSubmit(handleUpdatePassword)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                    New password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-9 pr-10 text-xs min-h-[44px]"
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-destructive text-[11px] font-medium">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-9 text-xs min-h-[44px]"
                      {...form.register('confirmPassword')}
                    />
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-destructive text-[11px] font-medium">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-[46px] text-xs font-semibold gap-2 mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating password...
                    </>
                  ) : (
                    <>
                      Update password <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer text */}
      <p className="text-center text-muted-foreground text-[11px] pb-2">
        Verblyn — Gamified communication coaching for real conversations.
      </p>
    </div>
  );
};

export default ResetPasswordPage;
