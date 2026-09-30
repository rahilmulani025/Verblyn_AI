import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { invalidateProfileCache } from '@/app/guards/useProfileState';
import { analytics } from '@/lib/analytics';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(100, { message: 'Name must be less than 100 characters' }),
    email: z.string().trim().email({ message: 'Please enter a valid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address' }),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

type AuthMode = 'login' | 'signup' | 'forgot-password';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode: AuthMode = searchParams.get('mode') === 'reset' ? 'forgot-password' : 'login';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [authNotice, setAuthNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      invalidateProfileCache();
    }
  }, [user, loading]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthNotice(null);
    const { error } = await signIn(data.email, data.password);
    setIsSubmitting(false);

    if (error) {
      let normalizedMessage = error.message;
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        normalizedMessage = 'Incorrect email or password. Please try again.';
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        normalizedMessage = 'Please verify your email address before signing in.';
      }

      setAuthNotice({ type: 'error', message: normalizedMessage });
      toast({
        title: 'Login failed',
        description: normalizedMessage,
        variant: 'destructive',
      });
    } else {
      invalidateProfileCache();
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    setAuthNotice(null);
    const { isEmailConfirmationRequired, error } = await signUp(data.email, data.password, data.fullName);
    setIsSubmitting(false);

    if (error) {
      let message = error.message;
      if (error.message.toLowerCase().includes('already registered')) {
        message = 'This email is already registered. Please sign in instead.';
      }
      setAuthNotice({ type: 'error', message });
      toast({
        title: 'Sign up failed',
        description: message,
        variant: 'destructive',
      });
    } else if (isEmailConfirmationRequired) {
      setAuthNotice({
        type: 'info',
        message: 'Account created! Please check your inbox and click the verification link to complete sign up.',
      });
      toast({
        title: 'Check your email',
        description: 'A verification link has been sent to your email address.',
      });
    } else {
      analytics.track('signup_completed');
      invalidateProfileCache();
      toast({
        title: 'Account created!',
        description: 'Welcome to Verblyn. Setting up your onboarding...',
      });
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setAuthNotice(null);

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;

      await supabase.auth.resetPasswordForEmail(data.email.trim(), {
        redirectTo: redirectUrl,
      });

      // Always show generic success state to prevent email enumeration attacks
      setResetEmailSent(true);
      toast({
        title: 'Reset instructions sent',
        description: "If an account exists for this email, we've sent password reset instructions.",
      });
    } catch {
      // Even on error, render generic success state
      setResetEmailSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
          {/* Mode: Forgot Password Confirmation */}
          {mode === 'forgot-password' && resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">CHECK YOUR EMAIL</h1>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  If an account exists for this email, we've sent password reset instructions.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetEmailSent(false);
                  forgotForm.reset();
                }}
                className="w-full min-h-[44px] text-xs font-semibold gap-1.5 mt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </Button>
            </div>
          ) : mode === 'forgot-password' ? (
            /* Mode: Forgot Password Request Form */
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-primary font-semibold">Account Recovery</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">RESET PASSWORD</h1>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Enter the email associated with your Verblyn account.
                </p>
              </div>

              <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="resetEmail" className="text-xs font-semibold text-foreground">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9 text-xs min-h-[44px]"
                      {...forgotForm.register('email')}
                    />
                  </div>
                  {forgotForm.formState.errors.email && (
                    <p className="text-destructive text-[11px] font-medium">
                      {forgotForm.formState.errors.email.message}
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
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending link...
                    </>
                  ) : (
                    <>
                      Send reset link <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setAuthNotice(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to sign in
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Mode: Login or Sign Up */
            <div>
              {/* Card Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-primary font-semibold">
                    {mode === 'login' ? 'Welcome back' : 'Join Verblyn'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {mode === 'login' ? 'Sign in to Verblyn' : 'Create your account'}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {mode === 'login'
                    ? 'Continue your personalized communication training'
                    : '1 focused speaking challenge per day to build vocal authority'}
                </p>
              </div>

              {/* Feedback / Notice Banner */}
              {authNotice && (
                <div
                  className={`p-3.5 rounded-xl text-xs mb-5 flex items-start gap-2.5 ${
                    authNotice.type === 'error'
                      ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                      : authNotice.type === 'info'
                      ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {authNotice.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{authNotice.message}</span>
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9 text-xs min-h-[44px]"
                        {...loginForm.register('email')}
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-destructive text-[11px] font-medium">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot-password');
                          setAuthNotice(null);
                          setResetEmailSent(false);
                        }}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-9 pr-10 text-xs min-h-[44px]"
                        {...loginForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-destructive text-[11px] font-medium">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full min-h-[46px] text-xs font-semibold gap-2 mt-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold text-foreground">
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Your name"
                        className="pl-9 text-xs min-h-[44px]"
                        {...signUpForm.register('fullName')}
                      />
                    </div>
                    {signUpForm.formState.errors.fullName && (
                      <p className="text-destructive text-[11px] font-medium">
                        {signUpForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signupEmail" className="text-xs font-semibold text-foreground">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9 text-xs min-h-[44px]"
                        {...signUpForm.register('email')}
                      />
                    </div>
                    {signUpForm.formState.errors.email && (
                      <p className="text-destructive text-[11px] font-medium">
                        {signUpForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signupPassword" className="text-xs font-semibold text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signupPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-9 pr-10 text-xs min-h-[44px]"
                        {...signUpForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signUpForm.formState.errors.password && (
                      <p className="text-destructive text-[11px] font-medium">
                        {signUpForm.formState.errors.password.message}
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
                        {...signUpForm.register('confirmPassword')}
                      />
                    </div>
                    {signUpForm.formState.errors.confirmPassword && (
                      <p className="text-destructive text-[11px] font-medium">
                        {signUpForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full min-h-[46px] text-xs font-semibold gap-2 mt-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </form>
              )}

              {/* Toggle */}
              <div className="mt-6 text-center border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'signup' : 'login');
                      setAuthNotice(null);
                      loginForm.reset();
                      signUpForm.reset();
                    }}
                    className="ml-1.5 text-primary hover:underline font-semibold"
                  >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
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

export default Auth;
