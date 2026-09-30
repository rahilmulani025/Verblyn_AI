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

export interface UseSpeechRecognitionOptions {
  lang?: string; // Default: 'en-IN' for Indian English speakers, fallback 'en-US'
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => Promise<Blob | null>;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
  getAudioBlob: () => Blob | null;
  getFinalAudioBlob: () => Promise<Blob | null>;
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Core references to decouple user intent from engine lifecycle
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldBeListeningRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>('');
  const restartAttemptsRef = useRef<number>(0);
  const restartTimerRef = useRef<number | null>(null);

  // Preferred recognition language (defaults to en-IN for target demographic)
  const recognitionLang = options.lang || 'en-IN';

  // Microphone stream & MediaRecorder chunk collection
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioBlobRef = useRef<Blob | null>(null);
  const recorderStoppedResolverRef = useRef<((blob: Blob | null) => void) | null>(null);

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
    recognition.lang = recognitionLang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newlyFinalized = '';
      let currentInterim = '';

      // Iterate starting strictly from resultIndex to prevent duplicate processing
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const text = res[0]?.transcript?.trim();
          if (text) {
            newlyFinalized += (newlyFinalized ? ' ' : '') + text;
          }
        } else {
          const text = res[0]?.transcript || '';
          currentInterim += (currentInterim ? ' ' : '') + text;
        }
      }

      if (newlyFinalized) {
        const currentTotal = accumulatedTranscriptRef.current.trim();
        accumulatedTranscriptRef.current = currentTotal
          ? `${currentTotal} ${newlyFinalized}`
          : newlyFinalized;
        setTranscript(accumulatedTranscriptRef.current);
      }

      // Interim results remain temporary and replaceable
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
        // Normal silence — continue active listening session
      } else if (err === 'aborted') {
        // Aborted internally, handled safely by onend
      } else if (err === 'language-not-supported' && recognition.lang !== 'en-US') {
        // Fallback to en-US if en-IN is unavailable in older browser engines
        recognition.lang = 'en-US';
      } else {
        // Non-fatal notice — do not break the session if recording continues
        if (process.env.NODE_ENV === 'development') {
          console.info(`[Speech Recognition Notice]: ${err}`);
        }
      }
    };

    recognition.onend = () => {
      setInterimTranscript('');

      // CRITICAL: If the user is still actively recording, safely restart recognition
      if (shouldBeListeningRef.current) {
        if (restartAttemptsRef.current < 30) {
          restartAttemptsRef.current += 1;
          analytics.track('speech_recognition_restarted', {
            attempt: restartAttemptsRef.current,
          });

          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = window.setTimeout(() => {
            if (shouldBeListeningRef.current) {
              try {
                if (!recognitionRef.current) {
                  recognitionRef.current = initializeRecognition();
                }
                recognitionRef.current?.start();
                setIsListening(true);
              } catch (startErr: unknown) {
                // Ignore InvalidStateError if instance is transitioning
                if (startErr instanceof Error && startErr.name !== 'InvalidStateError') {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[Speech Recognition Restart Collision]', startErr);
                  }
                }
              }
            }
          }, 150);
        } else {
          // Bounded recovery limit reached
          shouldBeListeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [isSupported, recognitionLang]);

  // Setup instance lifecycle
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
        recognitionRef.current = null;
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
        mediaRecorderRef.current = null;
      }
    };
  }, [isSupported, initializeRecognition]);

  const startListening = useCallback(() => {
    setError(null);
    accumulatedTranscriptRef.current = '';
    audioChunksRef.current = [];
    recordedAudioBlobRef.current = null;
    recorderStoppedResolverRef.current = null;
    setTranscript('');
    setInterimTranscript('');
    shouldBeListeningRef.current = true;
    restartAttemptsRef.current = 0;

    // 1. Start Web Speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'InvalidStateError') {
          // Already running
          setIsListening(true);
        } else {
          recognitionRef.current = initializeRecognition();
          try {
            recognitionRef.current?.start();
            setIsListening(true);
          } catch {
            // Live transcription non-blocking warning
          }
        }
      }
    }

    // 2. Request microphone stream and start MediaRecorder
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
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
                const finalBlob =
                  audioChunksRef.current.length > 0
                    ? new Blob(audioChunksRef.current, { type: mimeType })
                    : null;
                recordedAudioBlobRef.current = finalBlob;

                if (recorderStoppedResolverRef.current) {
                  recorderStoppedResolverRef.current(finalBlob);
                  recorderStoppedResolverRef.current = null;
                }
              };

              recorder.start(500); // 500ms chunk interval for low latency aggregation
            } catch (recErr) {
              if (process.env.NODE_ENV === 'development') {
                console.info('[MediaRecorder Init]', recErr);
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

  const stopListening = useCallback((): Promise<Blob | null> => {
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

    // Freeze accumulated live transcript
    setTranscript(accumulatedTranscriptRef.current.trim());

    return new Promise<Blob | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorderStoppedResolverRef.current = (blob) => {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          resolve(blob);
        };
        try {
          recorder.stop();
        } catch {
          resolve(recordedAudioBlobRef.current);
        }
      } else {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        resolve(recordedAudioBlobRef.current);
      }
    });
  }, []);

  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    audioChunksRef.current = [];
    recordedAudioBlobRef.current = null;
    recorderStoppedResolverRef.current = null;
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const getAudioBlob = useCallback(() => {
    return recordedAudioBlobRef.current;
  }, []);

  const getFinalAudioBlob = useCallback(async (): Promise<Blob | null> => {
    if (recordedAudioBlobRef.current) {
      return recordedAudioBlobRef.current;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      return new Promise<Blob | null>((resolve) => {
        recorderStoppedResolverRef.current = resolve;
        try {
          recorder.stop();
        } catch {
          resolve(recordedAudioBlobRef.current);
        }
      });
    }
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
    getFinalAudioBlob,
  };
};

export default useSpeechRecognition;
