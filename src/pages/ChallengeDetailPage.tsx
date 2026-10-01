import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { PacingIndicator } from '@/components/speaking/PacingIndicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { challengeApi } from '@/features/challenges/challenge.api';
import { attemptApi } from '@/features/challenges/attempt.api';
import { Challenge, AttemptStatus } from '@/features/challenges/challenge.types';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { calculateSpeechMetrics } from '@/lib/metrics';
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
  Clock,
  Target,
  Zap,
} from 'lucide-react';

import { useGeminiKey } from '@/context/GeminiKeyContext';
import { GeminiKeyModal } from '@/components/settings/GeminiKeyModal';
import { geminiApi } from '@/services/gemini/gemini.api';
import { classifyGeminiError } from '@/services/gemini/gemini.client';
import { AIAnalysisResult, GeminiErrorInfo } from '@/services/gemini/gemini.types';
import { evaluateAttemptValidity, createInvalidAnalysisResult, validateAIAnalysisResult } from '@/features/challenges/evaluationValidity';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const ChallengeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { geminiApiKey } = useGeminiKey();

  const isDailyMission = Boolean((location.state as { isDailyMission?: boolean })?.isDailyMission);
  const personalizedChallenge = (location.state as { personalizedChallenge?: Challenge })?.personalizedChallenge;

  const [challenge, setChallenge] = useState<Challenge | null>(personalizedChallenge || null);
  const [loading, setLoading] = useState(!personalizedChallenge);
  const [status, setStatus] = useState<AttemptStatus>('STARTED');
  const [countdown, setCountdown] = useState<number>(3);
  const [seconds, setSeconds] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<{
    errorInfo: GeminiErrorInfo;
    capturedTranscript: string;
  } | null>(null);
  const [keyModalOpen, setKeyModalOpen] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const submittingRef = useRef<boolean>(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError,
    getAudioBlob,
    getFinalAudioBlob,
  } = useSpeechRecognition();

  // Load challenge metadata if not passed from state
  useEffect(() => {
    if (personalizedChallenge) {
      setChallenge(personalizedChallenge);
      setLoading(false);
      return;
    }

    if (!id) return;
    challengeApi.getChallengeById(id).then((data) => {
      setChallenge(data);
      setLoading(false);
      if (data) {
        analytics.track('challenge_started', {
          challenge_id: data.id,
          target_skill: data.targetSkill,
          challenge_type: data.challengeType,
          is_daily_mission: isDailyMission,
        });
      }
    });

    return () => {
      if (status === 'IN_PROGRESS' || status === 'STARTED') {
        analytics.track('challenge_abandoned', { challenge_id: id });
      }
    };
  }, [id, isDailyMission, status, personalizedChallenge]);

  // Handle speech recognition error
  useEffect(() => {
    if (speechError) {
      setErrorMessage(speechError);
      setStatus('STARTED');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [speechError]);

  // Handle active listening timer
  const handleStopSpeaking = useCallback(async () => {
    await stopListening();
    setStatus('SUBMITTED');
  }, [stopListening]);

  useEffect(() => {
    if (status === 'IN_PROGRESS' && isListening) {
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (challenge && s >= challenge.durationSeconds) {
            handleStopSpeaking();
            return challenge.durationSeconds;
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
  }, [status, isListening, challenge, handleStopSpeaking]);

  // Start 3s countdown
  const handleStartCountdown = () => {
    setErrorMessage(null);
    resetTranscript();
    setSeconds(0);
    setCountdown(3);
    setStatus('IN_PROGRESS');

    let count = 3;
    countdownRef.current = window.setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        startListening();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const handleReset = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    stopListening();
    resetTranscript();
    setSeconds(0);
    setErrorMessage(null);
    setStatus('STARTED');
    analytics.track('retry_started', { challenge_id: id });
  };

  const currentWords = (transcript || '').trim().split(/\s+/).filter(Boolean).length;
  const currentWpm = seconds > 0 ? Math.round((currentWords / seconds) * 60) : 0;

  // Submit attempt with authoritative Gemini transcription pipeline
  const handleSubmit = async () => {
    if (!challenge) return;
    if (submittingRef.current) return; // Prevent double submission

    const rawLiveTranscript = (transcript || '').trim();

    if (!rawLiveTranscript && seconds < 3) {
      setErrorMessage('No speech captured yet. Please speak your answer and submit.');
      setStatus('STARTED');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setStatus('ANALYZING');
    setErrorMessage(null);

    analytics.track('challenge_submitted', {
      challenge_id: challenge.id,
      duration_seconds: seconds,
    });
    analytics.track('analysis_started', {
      challenge_id: challenge.id,
      challenge_type: challenge.challengeType,
      target_skill: challenge.targetSkill,
    });

    try {
      const elapsed = Math.max(seconds, 5);
      let authoritativeTranscript = rawLiveTranscript;
      let calculatedMetrics = calculateSpeechMetrics(authoritativeTranscript, elapsed);

      let aiAnalysis: AIAnalysisResult | undefined;

      // Real Gemini Evaluation & Authoritative Audio Transcription
      if (geminiApiKey) {
        try {
          const audioBlob = await getFinalAudioBlob();
          let audioBase64: string | undefined;

          if (audioBlob && audioBlob.size > 0 && audioBlob.size <= 15 * 1024 * 1024) {
            audioBase64 = await blobToBase64(audioBlob);
          }

          aiAnalysis = await geminiApi.analyzeAttempt(geminiApiKey, {
            challenge_title: challenge.title,
            challenge_prompt: challenge.prompt,
            target_skill: challenge.targetSkill,
            target_weakness: challenge.targetWeakness,
            time_limit_seconds: challenge.durationSeconds,
            success_criteria: challenge.instructions,
            user_goal: 'Professional Speaking',
            transcript: authoritativeTranscript,
            audio_base64: audioBase64,
            audio_mime_type: audioBlob?.type || 'audio/webm',
            deterministic_metrics: {
              durationSeconds: elapsed,
              wordCount: calculatedMetrics.wordCount,
              wordsPerMinute: calculatedMetrics.wpm,
              fillerCount: calculatedMetrics.fillerStats.total,
              repetitionCount: calculatedMetrics.repetitionStats.total,
              sentenceCount: Math.max(1, authoritativeTranscript.split(/[.!?]+/).filter(Boolean).length),
              averageSentenceLength: calculatedMetrics.averageSentenceLength,
              vocabularyDiversity: calculatedMetrics.vocabularyDiversity,
              isComplete: true,
            },
          });

          // If Gemini produced an authoritative audio transcription, update final transcript & metrics
          if (aiAnalysis && aiAnalysis.transcription && aiAnalysis.transcription.trim().length > 0) {
            authoritativeTranscript = aiAnalysis.transcription.trim();
            calculatedMetrics = calculateSpeechMetrics(authoritativeTranscript, elapsed);
          }
        } catch (geminiErr: unknown) {
          const classified = classifyGeminiError(geminiErr);
          if (process.env.NODE_ENV === 'development') {
            console.error('[Gemini AI Evaluation Error Classified]:', classified);
          }

          // A Gemini API failure is a system failure, NOT a user speech failure.
          // DO NOT score as 0, DO NOT mark as invalid/no-speech, and DO NOT mutate DB!
          setAiError({
            errorInfo: classified,
            capturedTranscript: authoritativeTranscript,
          });
          setStatus('SUBMITTED');
          analytics.track('analysis_failed', {
            challenge_id: challenge.id,
            error_code: classified.code,
            error_type: classified.type,
          });
          return;
        }
      }

      // Pre/Post-evaluation Deterministic Validity Gate
      const validityCheck = evaluateAttemptValidity(authoritativeTranscript, elapsed, challenge.prompt);

      if (validityCheck.validity === 'INVALID') {
        aiAnalysis = createInvalidAnalysisResult(validityCheck, challenge, authoritativeTranscript);
      } else if (aiAnalysis) {
        // Enforce task completion gating and normalize with validateAIAnalysisResult
        aiAnalysis = validateAIAnalysisResult(aiAnalysis, authoritativeTranscript, challenge.prompt);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Verblyn Evaluation Pipeline Diagnostic]', {
          challengeId: challenge.id,
          durationSeconds: elapsed,
          rawWordCount: authoritativeTranscript.split(/\s+/).filter(Boolean).length,
          validity: validityCheck.validity,
          reasonCode: validityCheck.reasonCode,
          overallScore: aiAnalysis?.overall_score,
          taskCompletionScore: aiAnalysis?.task_completion?.score,
          evaluationValidity: aiAnalysis?.evaluation_validity,
        });
      }

      const attemptResult = await attemptApi.submitChallengeAttempt({
        challenge,
        transcript: authoritativeTranscript,
        durationSeconds: elapsed,
        metrics: calculatedMetrics,
        isDailyMission,
        aiAnalysis,
      });

      if (attemptResult) {
        analytics.track('analysis_completed', {
          challenge_id: challenge.id,
          challenge_type: challenge.challengeType,
          target_skill: challenge.targetSkill,
          analysis_version: attemptResult.analysisVersion || 'ai-v1',
          overall_score: attemptResult.scores?.overallScore,
        });

        if (attemptResult.weaknessCandidates && attemptResult.weaknessCandidates.length > 0) {
          analytics.track('weakness_detected', {
            weakness_type: attemptResult.weaknessCandidates[0].type,
            target_skill: attemptResult.weaknessCandidates[0].skill,
          });
        }

        analytics.track('challenge_completed', {
          challenge_id: challenge.id,
          xp_earned: attemptResult.xpEarned.total,
        });

        navigate(`/challenge/${challenge.id}/result`, {
          state: {
            attempt: attemptResult,
            challenge,
          },
          replace: true,
        });
      } else {
        analytics.track('analysis_failed', { challenge_id: challenge.id });
        setErrorMessage('Failed to save attempt analysis. You can retry submission below.');
        setStatus('SUBMITTED');
      }
    } catch (err) {
      console.error('Submission error:', err);
      analytics.track('analysis_failed', { challenge_id: challenge.id });
      setErrorMessage('An unexpected error occurred during submission.');
      setStatus('SUBMITTED');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Challenge" showBack={true} showNav={false}>
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!challenge) {
    return (
      <AppShell title="Challenge" showBack={true} showNav={false}>
        <div className="p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Challenge not found in library.</p>
          <Button onClick={() => navigate('/home')}>Return Home</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={challenge.title}
      showBack={true}
      onBack={() => navigate(-1)}
      showNav={false}
      headerAction={
        <div className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
          <Sparkles className="w-3.5 h-3.5" /> +{challenge.xpReward}
          {isDailyMission ? ' (+20 Bonus)' : ' XP'}
        </div>
      }
    >
      <PageContainer className="flex-1 flex flex-col justify-between py-2 space-y-4">
        <div className="space-y-4">
          {/* Daily Mission Banner if applicable */}
          {isDailyMission && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
              <span>Daily Mission Active — Earn +20 Bonus XP on completion!</span>
            </div>
          )}

          {/* WHAT / WHY / SKILL CARD */}
          <Card className="border border-border/80 bg-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> {challenge.targetSkill} Drill
                </span>
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {challenge.durationSeconds}s Time Limit
                </span>
              </div>

              {/* Objective Prompt */}
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/40 text-sm font-bold text-foreground leading-snug">
                "{challenge.prompt}"
              </div>

              {/* Why this matters */}
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Why this matters: </span>
                {challenge.whyItMatters}
              </div>

              {/* Instructions */}
              <div className="space-y-1 pt-1 border-t border-border/30">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  How to approach:
                </span>
                <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                  {challenge.instructions.map((inst, idx) => (
                    <li key={idx}>{inst}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* AI SERVICE / QUOTA ERROR CARD */}
          {aiError && (
            <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-md">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        AI System Notice
                      </span>
                      <h3 className="text-sm font-bold text-foreground">
                        {aiError.errorInfo.userFacingTitle}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-mono">
                    {aiError.errorInfo.code}
                  </span>
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {aiError.errorInfo.userFacingMessage}
                </p>

                {aiError.capturedTranscript && (
                  <div className="p-3 rounded-xl bg-secondary/60 border border-border/70 space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Spoken Response Recorded:
                    </span>
                    <p className="text-xs text-foreground/90 font-mono italic leading-relaxed">
                      "{aiError.capturedTranscript}"
                    </p>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Your speech was NOT marked as failed or scored 0. Progression remains safe.</span>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => setKeyModalOpen(true)}
                    className="w-full min-h-[44px] touch-target text-xs font-semibold gap-2 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" /> Enter New API Key
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAiError(null);
                        handleSubmit();
                      }}
                      className="flex-1 min-h-[40px] touch-target text-xs gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry Evaluation
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate('/home')}
                      className="flex-1 min-h-[40px] touch-target text-xs gap-1.5"
                    >
                      Try Again Later
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message Banner */}
          {errorMessage && !aiError && (
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

          {!isSupported && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Microphone speech recognition is optimal in Chrome, Edge, or Safari.</span>
            </div>
          )}

          {/* SPEAKING CONSOLE */}
          {!aiError && (
            <div className="p-5 rounded-2xl bg-card border border-border/70 flex flex-col items-center gap-4 shadow-sm">
              <div className="flex items-center justify-between w-full text-xs">
                <span className="font-mono text-base font-bold text-foreground">
                  {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')} /{' '}
                  {challenge.durationSeconds}s
                </span>
                <PacingIndicator wpm={currentWpm} />
              </div>

              {/* State Buttons */}
              {status === 'STARTED' && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <button
                    type="button"
                    onClick={handleStartCountdown}
                    className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform shadow-lg touch-target"
                    aria-label="Start recording challenge"
                  >
                    <Play className="w-8 h-8 fill-primary-foreground ml-1" />
                  </button>
                  <span className="text-xs font-semibold text-foreground">Tap to Begin Drill</span>
                </div>
              )}

              {status === 'IN_PROGRESS' && !isListening && (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-ping">
                    <span className="text-3xl font-extrabold text-primary">{countdown}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-3 font-medium">Get ready...</span>
                </div>
              )}

              {status === 'IN_PROGRESS' && isListening && (
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
                    Speaking... Tap when finished
                  </span>
                </div>
              )}

              {status === 'SUBMITTED' && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Spoken Response Ready ({seconds}s)
                  </span>
                </div>
              )}

              {status === 'ANALYZING' && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-foreground">Analyzing Delivery...</span>
                </div>
              )}

              {/* Live Transcript View */}
              {(transcript || interimTranscript) && (
                <div className="w-full p-3.5 rounded-xl bg-secondary/50 border border-border/40 text-xs text-foreground leading-relaxed max-h-32 overflow-y-auto">
                  <h4 className="font-semibold text-muted-foreground text-[11px] mb-1">
                    Live Transcription (Preview):
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
          )}
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        {!aiError && (
          <div className="space-y-2 pt-2 mt-auto">
            {status === 'SUBMITTED' && (
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

            {status === 'SUBMITTED' ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
              >
                {submitting ? 'Analyzing Performance...' : 'Submit & Analyze'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : status === 'STARTED' ? (
              <Button
                type="button"
                onClick={handleStartCountdown}
                className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2 shadow-md"
              >
                Start Challenge <ArrowRight className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        )}

        {/* BYOK Key Management Modal */}
        <GeminiKeyModal open={keyModalOpen} onOpenChange={setKeyModalOpen} />
      </PageContainer>
    </AppShell>
  );
};

export default ChallengeDetailPage;

