/**
 * Discrete states of the speaking and microphone interaction workflow.
 */
export type SpeakingState =
  | 'IDLE'
  | 'PERMISSION'
  | 'READY'
  | 'COUNTDOWN'
  | 'LISTENING'
  | 'PAUSED'
  | 'PROCESSING'
  | 'ANALYZING'
  | 'COMPLETE';

export interface SpeakingSessionConfig {
  targetSeconds?: number;
  minSeconds?: number;
  maxSeconds?: number;
  promptText?: string;
  topic?: string;
  keywords?: string[];
}

export interface SpeakingSegment {
  text: string;
  timestampMs: number;
  isFinal: boolean;
}

export interface SpeakingRecorderState {
  state: SpeakingState;
  elapsedSeconds: number;
  transcript: string;
  interimTranscript: string;
  errorMessage: string | null;
  volumeLevel: number; // 0 to 100 for audio meter
}
