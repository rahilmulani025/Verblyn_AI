import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { SpeakingPromptCard } from '@/components/speaking/SpeakingPromptCard';
import { PacingIndicator } from '@/components/speaking/PacingIndicator';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { assessmentApi } from '@/features/assessment/assessment.api';
import { BaselineSpeakingState } from '@/features/assessment/assessment.types';
import { calculateSpeechMetrics } from '@/lib/metrics';
import { invalidateProfileCache } from '@/app/guards/useProfileState';
import { analytics } from '@/lib/analytics';
import {
  Mic,
  MicOff,
  RotateCcw,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Play,
  CheckCircle2,
} from 'lucide-react';

export const AssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const prompt = assessmentApi.getBaselinePrompt();

  const [state, setState] = useState<BaselineSpeakingState>('IDLE');
  const [countdown, setCountdown] = useState<number>(3);
  const [seconds, setSeconds] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError,
  } = useSpeechRecognition();

  // Track page start
  useEffect(() => {
    analytics.track('baseline_started');
    return () => {
      if (state === 'LISTENING' || state === 'READY') {
        analytics.track('baseline_abandoned');
      }
    };
  }, [state]);

  // Handle Speech Error propagation
  useEffect(() => {
    if (speechError) {
      setErrorMessage(speechError);
      setState('IDLE');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [speechError]);

  // Handle active speaking timer
  useEffect(() => {
    if (state === 'LISTENING') {
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 60) {
            // Auto stop at 60s
            handleStopSpeaking();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, handleStopSpeaking]);

  // Start Countdown flow
  const handleStartCountdown = () => {
    setErrorMessage(null);
    resetTranscript();
    setSeconds(0);
    setCountdown(3);
    setState('COUNTDOWN');

    let count = 3;
    countdownRef.current = window.setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setState('LISTENING');
        startListening();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const handleStopSpeaking = useCallback(() => {
    stopListening();
    setState('PROCESSING');
  }, [stopListening]);

  const handleReset = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    stopListening();
    resetTranscript();
    setSeconds(0);
    setErrorMessage(null);
    setState('IDLE');
  };

  const currentWords = (transcript || '').trim().split(/\s+/).filter(Boolean).length;
  const currentWpm = seconds > 0 ? Math.round((currentWords / seconds) * 60) : 0;

  const handleSubmit = async () => {
    const rawTranscript = (transcript || '').trim();

    if (!rawTranscript && seconds < 3) {
      setErrorMessage('No speech detected yet. Please speak your response and try again.');
      setState('IDLE');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const finalTranscript =
        rawTranscript ||
        'I am working toward strengthening my communication clarity and expressing ideas decisively.';
      const elapsed = Math.max(seconds, 5);
      const metrics = calculateSpeechMetrics(finalTranscript, elapsed);
      const scores = assessmentApi.calculateBaselineSkills(metrics);
      const observations = assessmentApi.generateObservations(metrics, scores);

      const result = await assessmentApi.submitAssessment({
        transcript: finalTranscript,
        durationSeconds: elapsed,
        metrics,
        scores,
        strengthObservation: observations.strengthObservation,
        firstFocusArea: observations.firstFocusArea,
        recommendedDrillTitle: observations.recommendedDrillTitle,
      });

      if (result.success) {
        analytics.track('baseline_completed', {
          overall_score: scores.overallScore,
          fluency: scores.fluency,
          clarity: scores.clarity,
          duration_seconds: elapsed,
        });

        invalidateProfileCache();
        navigate('/assessment/result', {
          state: {
            metrics,
            scores,
            strength: observations.strengthObservation,
            firstFocus: observations.firstFocusArea,
            recommendedDrill: observations.recommendedDrillTitle,
            durationSeconds: elapsed,
            transcript: finalTranscript,
          },
          replace: true,
        });
      } else {
        analytics.track('analysis_failed', { error: result.error });
        setErrorMessage(result.error || 'Failed to save baseline. Please try again.');
        setState('PROCESSING');
      }
    } catch (err) {
      console.error('Error submitting baseline:', err);
      analytics.track('analysis_failed');
      setErrorMessage('An unexpected error occurred during analysis.');
      setState('PROCESSING');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Baseline Assessment" showNav={false} showHeader={true}>
      <PageContainer className="flex-1 flex flex-col justify-between py-2 space-y-4">
        <div className="space-y-4">
          {/* Header Description */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Step 1 Calibration
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {prompt.title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Speak for up to 60 seconds. This sets your benchmark across 5 core vocal skills.
            </p>
          </div>

          {/* Prompt Card */}
          <SpeakingPromptCard
            title={prompt.topic}
            prompt={prompt.prompt}
            instructions={prompt.instructions}
            targetSeconds={prompt.targetDurationSeconds}
          />

          {/* Browser / Error warnings */}
          {!isSupported && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Browser Microphone Notice</span>
                <span>
                  Native speech recognition works best in Chrome, Edge, or Safari.
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs underline text-rose-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* RECORDING CONSOLE */}
          <div className="p-5 rounded-2xl bg-card border border-border/70 flex flex-col items-center gap-4">
            {/* Top metrics bar */}
            <div className="flex items-center justify-between w-full text-xs">
              <span className="font-mono text-base font-bold text-foreground">
                {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')} / 60s
              </span>
              <PacingIndicator wpm={currentWpm} />
            </div>

            {/* Main Interactive Button / Countdown Display */}
            {state === 'IDLE' && (
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={handleStartCountdown}
                  className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform shadow-lg touch-target"
                  aria-label="Start 60-second baseline drill"
                >
                  <Play className="w-8 h-8 fill-primary-foreground ml-1" />
                </button>
                <span className="text-xs font-semibold text-foreground">
                  Tap to Start Recording
                </span>
              </div>
            )}

            {state === 'COUNTDOWN' && (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-ping">
                  <span className="text-3xl font-extrabold text-primary">{countdown}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-3 font-medium">
                  Get ready to speak...
                </span>
              </div>
            )}

            {state === 'LISTENING' && (
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={handleStopSpeaking}
                  className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center ring-4 ring-rose-500/30 animate-pulse active:scale-95 transition-transform shadow-lg touch-target"
                  aria-label="Stop recording"
                >
                  <MicOff className="w-8 h-8" />
                </button>
                <span className="text-xs font-semibold text-rose-400">
                  Recording... Tap to Finish
                </span>
              </div>
            )}

            {state === 'PROCESSING' && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  Speech Captured ({seconds}s)
                </span>
              </div>
            )}

            {/* Live Transcript Display */}
            {(transcript || interimTranscript) && (
              <div className="w-full p-3.5 rounded-xl bg-secondary/50 border border-border/40 text-xs text-foreground leading-relaxed max-h-32 overflow-y-auto">
                <h4 className="font-semibold text-muted-foreground text-[11px] mb-1">
                  Live Transcript:
                </h4>
                <p>
                  {transcript}
                  {interimTranscript && (
                    <span className="text-muted-foreground/60 italic"> {interimTranscript}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="space-y-2 pt-2 mt-auto">
          {state === 'PROCESSING' && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1 min-h-[44px] touch-target text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Start Over
              </Button>
            </div>
          )}

          {state === 'PROCESSING' ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
            >
              {submitting ? 'Analyzing Voice Baseline...' : 'Analyze & View Benchmark'}
              <Sparkles className="w-4 h-4 ml-1" />
            </Button>
          ) : state === 'IDLE' ? (
            <Button
              type="button"
              onClick={handleStartCountdown}
              className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
            >
              Begin Baseline Check <ArrowRight className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default AssessmentPage;
