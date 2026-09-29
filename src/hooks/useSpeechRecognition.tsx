import { useState, useCallback, useRef, useEffect } from 'react';
import { analytics } from '@/lib/analytics';

// Type declarations for Web Speech API
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
    confidence: number;
  };
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
  getAudioBlob?: () => Blob | null;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Core references to decouple user intent from engine lifecycle
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldBeListeningRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>('');
  const lastProcessedFinalIndexRef = useRef<number>(-1);
  const restartAttemptsRef = useRef<number>(0);
  const restartTimerRef = useRef<number | null>(null);

  // Microphone stream & MediaRecorder chunk collection
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioBlobRef = useRef<Blob | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Clean initialization of SpeechRecognition instance
  const initializeRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Reset instance-specific processed final result index
    lastProcessedFinalIndexRef.current = -1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentSessionFinal = '';
      let currentInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          // Process each final index at most ONCE for this instance
          if (i > lastProcessedFinalIndexRef.current) {
            currentSessionFinal += ' ' + res[0].transcript.trim();
            lastProcessedFinalIndexRef.current = i;
          }
        } else {
          currentInterim += ' ' + res[0].transcript;
        }
      }

      if (currentSessionFinal) {
        const trimmed = currentSessionFinal.trim();
        if (trimmed) {
          const currentTotal = accumulatedTranscriptRef.current.trim();
          accumulatedTranscriptRef.current = currentTotal
            ? `${currentTotal} ${trimmed}`
            : trimmed;
          setTranscript(accumulatedTranscriptRef.current);
        }
      }

      setInterimTranscript(currentInterim.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const err = event.error;

      if (process.env.NODE_ENV === 'development') {
        console.warn('[Speech Recognition Event]', err);
      }

      if (err === 'not-allowed' || err === 'service-not-allowed') {
        shouldBeListeningRef.current = false;
        setError('Microphone access denied. Please enable microphone permissions in your browser.');
        setIsListening(false);
        analytics.track('speech_recognition_failed', { reason: err });
      } else if (err === 'no-speech') {
        // Normal silence — do not terminate user recording session
        if (process.env.NODE_ENV === 'development') {
          console.info('[Speech Recognition] No speech detected in segment; continuing active session.');
        }
      } else if (err === 'aborted') {
        // Engine was aborted internally, handled by onend if shouldBeListeningRef is true
      } else {
        setError(`Speech recognition notice: ${err}`);
      }
    };

    recognition.onend = () => {
      setInterimTranscript('');
      lastProcessedFinalIndexRef.current = -1;

      // CRITICAL RECOVERY: If the user is still actively recording, restart recognition
      if (shouldBeListeningRef.current) {
        if (restartAttemptsRef.current < 30) {
          restartAttemptsRef.current += 1;
          analytics.track('speech_recognition_restarted', {
            attempt: restartAttemptsRef.current,
          });

          restartTimerRef.current = window.setTimeout(() => {
            if (shouldBeListeningRef.current) {
              try {
                // Re-instantiate clean instance if needed or start existing
                if (!recognitionRef.current) {
                  recognitionRef.current = initializeRecognition();
                }
                lastProcessedFinalIndexRef.current = -1;
                recognitionRef.current?.start();
                setIsListening(true);
              } catch (startErr) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[Speech Recognition Restart Collision]', startErr);
                }
                // Try fresh instance on collision
                try {
                  recognitionRef.current = initializeRecognition();
                  recognitionRef.current?.start();
                  setIsListening(true);
                } catch {
                  // Wait for next scheduled cycle
                }
              }
            }
          }, 120);
        } else {
          shouldBeListeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [isSupported]);

  // Setup instance
  useEffect(() => {
    if (!isSupported) return;

    recognitionRef.current = initializeRecognition();

    return () => {
      shouldBeListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [isSupported, initializeRecognition]);

  const startListening = useCallback(() => {
    setError(null);
    accumulatedTranscriptRef.current = '';
    lastProcessedFinalIndexRef.current = -1;
    audioChunksRef.current = [];
    recordedAudioBlobRef.current = null;
    setTranscript('');
    setInterimTranscript('');
    shouldBeListeningRef.current = true;
    restartAttemptsRef.current = 0;

    // 1. Start Web Speech recognition
    if (recognitionRef.current) {
      try {
        lastProcessedFinalIndexRef.current = -1;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Speech Start Warning]', err);
        }
        recognitionRef.current = initializeRecognition();
        try {
          lastProcessedFinalIndexRef.current = -1;
          recognitionRef.current?.start();
          setIsListening(true);
        } catch {
          setError('Could not start microphone speech recognition.');
        }
      }
    }

    // 2. Request microphone stream ONCE and feed into MediaRecorder
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      // Clean up previous stream if any
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (typeof MediaRecorder !== 'undefined') {
            try {
              const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';
              const recorder = new MediaRecorder(stream, { mimeType });
              mediaRecorderRef.current = recorder;

              recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                  audioChunksRef.current.push(e.data);
                }
              };

              recorder.onstop = () => {
                if (audioChunksRef.current.length > 0) {
                  recordedAudioBlobRef.current = new Blob(audioChunksRef.current, {
                    type: mimeType,
                  });
                }
              };

              recorder.start(1000); // 1-second chunks
            } catch (recErr) {
              if (process.env.NODE_ENV === 'development') {
                console.info('[MediaRecorder Optional Info]', recErr);
              }
            }
          }
        })
        .catch((micErr) => {
          if (micErr.name === 'NotAllowedError') {
            setError('Microphone permission was denied.');
          }
        });
    }
  }, [initializeRecognition]);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Freeze accumulated transcript
    setTranscript(accumulatedTranscriptRef.current.trim());
  }, []);

  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    lastProcessedFinalIndexRef.current = -1;
    audioChunksRef.current = [];
    recordedAudioBlobRef.current = null;
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const getAudioBlob = useCallback(() => {
    return recordedAudioBlobRef.current;
  }, []);

  return {
    isListening,
    transcript: transcript.trim(),
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
    getAudioBlob,
  };
};

export default useSpeechRecognition;
