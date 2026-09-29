import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  Sparkles,
  Mic,
  Target,
  TrendingUp,
  CheckCircle2,
  Zap,
  Award,
  BookOpen,
  Users,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Flame,
} from 'lucide-react';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartPracticing = () => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/auth');
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="hover:opacity-90 transition-opacity">
              <Logo />
            </button>
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
              <button
                onClick={() => scrollToSection('product-preview')}
                className="hover:text-foreground transition-colors"
              >
                Product
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-foreground transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('challenges')}
                className="hover:text-foreground transition-colors"
              >
                Challenges
              </button>
              <button
                onClick={() => scrollToSection('who-its-for')}
                className="hover:text-foreground transition-colors"
              >
                Who It's For
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Button
                onClick={() => navigate('/home')}
                className="text-xs font-semibold px-4 min-h-[38px] gap-1.5"
              >
                Go to App <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth')}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                >
                  Sign In
                </Button>
                <Button
                  onClick={handleStartPracticing}
                  className="text-xs font-semibold px-4 min-h-[38px] gap-1.5 shadow-sm"
                >
                  Start Practicing <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gamified Spoken Communication Coach</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15]">
            Speak better. <br className="hidden sm:inline" />
            <span className="text-primary">One challenge at a time.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Verblyn helps you practice real spoken communication, pinpoints recurring weaknesses like filler words and rushed pacing, and delivers a focused daily challenge to build lasting vocal authority.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={handleStartPracticing}
              size="lg"
              className="w-full sm:w-auto min-h-[48px] px-8 text-sm font-semibold gap-2 shadow-md touch-target"
            >
              <Mic className="w-4 h-4" /> Start Your First Challenge
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToSection('how-it-works')}
              className="w-full sm:w-auto min-h-[48px] px-6 text-sm font-semibold touch-target"
            >
              See How It Works
            </Button>
          </div>

          {/* Trust points */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Calibrated baseline assessment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Deterministic speech metrics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Actionable coaching tips</span>
            </div>
          </div>
        </div>

        {/* 3. PRODUCT PREVIEW MOCKUP (Mobile Shell Loop) */}
        <div id="product-preview" className="max-w-4xl mx-auto px-4 sm:px-6 pt-12">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-semibold text-muted-foreground ml-2">
                  Verblyn Learning Engine
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3" /> 5 Day Streak
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> 340 XP
                </span>
              </div>
            </div>

            {/* Grid preview of the real mobile experience */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Today's Mission */}
              <div className="p-4 rounded-xl bg-background border border-border/70 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary uppercase tracking-wider text-[10px]">
                      Today's Mission
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      Target: Fluency
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground">45-Second Filler Detox</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Speak continuously without verbal pauses. Replace "um" with 1-second deliberate silence.
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 text-muted-foreground">
                  <span>Duration: 45s</span>
                  <span className="font-semibold text-primary">+30 XP</span>
                </div>
              </div>

              {/* Card 2: Voice Attempt & Metric Engine */}
              <div className="p-4 rounded-xl bg-background border border-border/70 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                    Live Speech Capture
                  </span>
                  <div className="p-3 rounded-lg bg-card border border-border/60 text-xs font-mono text-muted-foreground">
                    "Our goal was to eliminate latency by re-architecting the API gateway..."
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-card border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">Pacing</span>
                      <span className="font-bold text-emerald-400">138 WPM</span>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">Fillers</span>
                      <span className="font-bold text-foreground">0 Detected</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground text-center">
                  Deterministic metrics calculated instantly
                </div>
              </div>

              {/* Card 3: Adaptive AI Coaching */}
              <div className="p-4 rounded-xl bg-background border border-border/70 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                      Coach Feedback
                    </span>
                    <span className="text-xs font-bold text-primary">Score: 88/100</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                    <span className="font-bold block text-[11px] mb-0.5">Strength:</span>
                    Optimal pacing rhythm with zero verbal filler sounds.
                  </div>
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
                    <span className="font-bold block text-[11px] mb-0.5">Next Recommended:</span>
                    STAR Conflict Resolution (Clarity Focus)
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground text-right font-medium">
                  Loop completed in 2 minutes
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-16 md:py-20 border-t border-border bg-card/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              The 4-Step Training Loop
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              How Verblyn transforms your communication
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              No generic theory or passive video lectures. Verblyn is built around deliberate speaking practice and rapid feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                01
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Find Your Baseline</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Complete a 60-second speech benchmark to calibrate your fluency, clarity, vocabulary, grammar, and confidence.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                02
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Daily Micro-Challenge</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tackle 1 personalized challenge per day (30s–90s) targeted directly at your goal and current weaknesses.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                03
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Actionable AI Coaching</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Get deterministic metrics (WPM, fillers, sentence length) combined with targeted coaching feedback.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                04
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Track Real Progress</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Watch recurring weaknesses resolve over time and compare your skill growth directly against your baseline.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY VERBLYN (Differentiation) */}
      <section className="py-16 md:py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Why Verblyn
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for real-world speaking, not test memorization
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-destructive uppercase tracking-wider">
                <span>✕ Traditional Apps</span>
              </div>
              <ul className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Endless passive grammar drills that don't translate to real conversations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Opaque scores with no explanation of how to actually improve.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Generic curriculums that ignore your individual career goals.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 bg-primary/5 space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <span>✓ The Verblyn Approach</span>
              </div>
              <ul className="space-y-2.5 text-xs text-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Active voice practice</strong>: Speak into the mic for 45–90 seconds every day.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Actionable coaching</strong>: Specific pointers on filler pauses, sentence framing, and pacing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Adaptive library</strong>: Challenges tailored for placements, interviews, standups, and leadership.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CURATED CHALLENGE LIBRARY PREVIEW */}
      <section id="challenges" className="py-16 md:py-20 border-t border-border bg-card/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Challenge Library
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                38 Targeted Spoken Drills
              </h2>
              <p className="text-xs text-muted-foreground">
                Spanning 5 primary pillars: Fluency, Clarity, Vocabulary, Grammar, and Confidence.
              </p>
            </div>
            <Button
              onClick={handleStartPracticing}
              variant="outline"
              className="text-xs font-semibold gap-1.5 self-start md:self-auto"
            >
              Explore All Challenges <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border border-border bg-card hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Interview Practice
                  </span>
                  <span className="text-muted-foreground">60s</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">The "Tell Me About Yourself" Hook</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Structure your professional introduction in 3 compelling sentences without rambling.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Clarity Drill
                  </span>
                  <span className="text-muted-foreground">45s</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">Deconstructing Technical Complexity</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Explain a technical concept (e.g. caching or recursion) simply as if to a non-technical manager.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    Discipline & Fluency
                  </span>
                  <span className="text-muted-foreground">45s</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">45-Second Filler Detox</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Deliver a spontaneous opinion without uttering a single "like", "um", or "you know".
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. PROGRESS DEMONSTRATION (Product Illustration) */}
      <section className="py-16 md:py-20 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Measurable Progress
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Watch your communication skills climb
            </h2>
            <p className="text-xs text-muted-foreground">
              Every challenge updates your skill breakdown and resolves recurring weaknesses.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-semibold text-foreground">Sample 14-Day Growth Curve</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                Product Illustration
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-background border border-border">
                <span className="text-xs text-muted-foreground font-medium block">Starting Baseline</span>
                <span className="text-3xl font-extrabold text-foreground mt-1 block">64</span>
                <span className="text-[10px] text-muted-foreground">Day 1 Calibration</span>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                <span className="text-xs text-primary font-medium block">Current Level</span>
                <span className="text-3xl font-extrabold text-primary mt-1 block">78</span>
                <span className="text-[10px] text-primary font-semibold">+14 Point Improvement</span>
              </div>

              <div className="p-4 rounded-xl bg-background border border-border">
                <span className="text-xs text-muted-foreground font-medium block">Target Weakness</span>
                <span className="text-sm font-bold text-amber-400 mt-2 block">Filler Word Dependency</span>
                <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">85% Resolved</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. WHO IT'S FOR */}
      <section id="who-its-for" className="py-16 md:py-20 border-t border-border bg-card/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Who It's For
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Designed for career-defining conversations
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Students & Graduates</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Build vocal authority for classroom presentations, project defenses, and internship screenings.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Placement & Interview Candidates</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Master concise STAR stories, eliminate filler sounds under pressure, and deliver memorable closing statements.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Young Professionals</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Communicate technical ideas simply in standups, lead client meetings, and present recommendations decisively.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="py-20 border-t border-border bg-gradient-to-b from-background to-card/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Your next conversation starts with practice.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Take your 60-second baseline check today and start your first focused challenge in minutes.
          </p>
          <div className="pt-2">
            <Button
              onClick={handleStartPracticing}
              size="lg"
              className="min-h-[48px] px-8 text-sm font-semibold gap-2 shadow-lg touch-target"
            >
              Start Practicing Free <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* 10. CLEAN MINIMAL FOOTER */}
      <footer className="border-t border-border bg-background py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo />
            <span>— Spoken communication training.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>© {new Date().getFullYear()} Verblyn</span>
            <span>•</span>
            <button onClick={() => navigate('/auth')} className="hover:text-foreground">
              Sign In
            </button>
            <span>•</span>
            <button onClick={() => navigate('/onboarding')} className="hover:text-foreground">
              Onboarding
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
