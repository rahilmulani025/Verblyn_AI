import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import MicrophoneButton from '@/components/practice/MicrophoneButton';
import TopicCard from '@/components/practice/TopicCard';
import PracticeTimer from '@/components/practice/PracticeTimer';
import AnalysisResult from '@/components/practice/AnalysisResult';

const Practice = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimeRef = useRef(0);
  
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError
  } = useSpeechRecognition();

  const {
    topic,
    analysis,
    isLoadingTopic,
    isAnalyzing,
    generateTopic,
    analyzeTranscript,
    saveSession,
    resetSession
  } = usePracticeSession();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Generate initial topic on mount
  useEffect(() => {
    if (user && !topic) {
      generateTopic();
    }
  }, [user, topic, generateTopic]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      resetSession();
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      startListening();
    }
  };

  const handleTimeUpdate = (seconds: number) => {
    setRecordingTime(seconds);
    recordingTimeRef.current = seconds;
  };

  const handleAnalyze = async () => {
    const result = await analyzeTranscript(transcript);
    if (result && user) {
      await saveSession(transcript, recordingTimeRef.current, result);
    }
  };

  const handleNewSession = () => {
    resetTranscript();
    resetSession();
    setRecordingTime(0);
    recordingTimeRef.current = 0;
  };

  if (authLoading) {
    return (
      <AppShell title="Practice">
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Practice Studio">
      <PageContainer className="space-y-4">
        {/* Header Intro */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Spontaneous Voice Drill
          </h2>
          <p className="text-xs text-muted-foreground">
            Practice speaking on dynamically generated prompts with instant vocal feedback.
          </p>
        </div>

        {/* Browser support warning */}
        {!isSupported && (
          <div className="p-3.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-xs text-foreground">Browser Not Supported</h3>
                <p className="text-xs text-muted-foreground">
                  Speech recognition is best supported in Chrome, Edge, or Safari.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Speech error */}
        {speechError && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-xs text-foreground">Error</h3>
                <p className="text-xs text-muted-foreground">{speechError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Topic Card */}
          <TopicCard
            topic={topic}
            isLoading={isLoadingTopic}
            onGenerateNew={() => generateTopic()}
          />

          {/* Recording Section */}
          {!analysis && (
            <div className="p-5 rounded-2xl bg-card border border-border/70">
              <div className="flex flex-col items-center gap-5">
                <PracticeTimer
                  isRunning={isListening}
                  targetSeconds={topic?.recommended_time}
                  onTimeUpdate={handleTimeUpdate}
                />

                <MicrophoneButton
                  isListening={isListening}
                  isDisabled={!isSupported || isAnalyzing}
                  onClick={handleMicClick}
                />

                <p className="text-xs text-muted-foreground text-center">
                  {isListening 
                    ? "Listening... Tap to stop" 
                    : "Tap the microphone to start recording"}
                </p>

                {/* Transcript display */}
                {(transcript || interimTranscript) && (
                  <div className="w-full mt-2 p-3.5 rounded-xl bg-secondary/50 border border-border/40 text-xs">
                    <h4 className="font-semibold text-foreground mb-1">Live Transcript:</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {transcript}
                      {interimTranscript && (
                        <span className="text-muted-foreground/60 italic"> {interimTranscript}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                {transcript && !isListening && (
                  <div className="flex gap-2 w-full pt-2">
                    <Button
                      variant="outline"
                      onClick={handleNewSession}
                      className="flex-1 min-h-[44px] touch-target text-xs gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Try Again
                    </Button>
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex-1 min-h-[44px] touch-target text-xs gap-1.5 font-semibold"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Analyze & Save
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              <AnalysisResult analysis={analysis} />
              
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleNewSession}
                  className="w-full min-h-[48px] touch-target text-sm font-semibold gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Practice Another Topic
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/progress')}
                  className="w-full min-h-[44px] touch-target text-xs gap-1.5"
                >
                  View Overall Progress
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default Practice;
