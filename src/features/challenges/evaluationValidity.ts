/**
 * Deterministic Pre-Evaluation Validity Gate for Verblyn AI
 * 
 * CORE PRINCIPLE:
 * The evaluator must distinguish:
 * A. VALID ANSWER: Meaningful, substantive attempt to answer the question.
 * B. PARTIAL / WEAK ANSWER: Attempt made, but incomplete, vague, short, or lacking structure.
 * C. INVALID / NON-ANSWER: Empty, greeting-only ("hello hello"), filler-only ("um um uh"), noise, or zero meaningful substance.
 * 
 * Invalid answers MUST NOT receive high scores, fake strengths, or positive progression.
 */

import { Challenge } from './challenge.types';
import { AIAnalysisResult } from '@/services/gemini/gemini.types';

export type ValidityReasonCode =
  | 'empty_transcript'
  | 'greeting_only'
  | 'filler_only'
  | 'too_short'
  | 'repetitive_noise'
  | 'off_topic_non_answer'
  | 'valid_concise'
  | 'valid_substantive'
  | 'partial_incomplete';

export interface AttemptValidityResult {
  validity: 'VALID' | 'PARTIAL' | 'INVALID';
  isValid: boolean;
  reasonCode: ValidityReasonCode;
  explanation: string;
  totalWordCount: number;
  meaningfulWordCount: number;
}

const GREETINGS_AND_NOISE = new Set([
  'hello',
  'hi',
  'hey',
  'good',
  'morning',
  'afternoon',
  'evening',
  'night',
  'test',
  'testing',
  'check',
  'mic',
  'one',
  'two',
  'three',
  '1',
  '2',
  '3',
  'ok',
  'okay',
  'yes',
  'no',
  'yep',
  'nope',
  'yeah',
  'sure',
  'maybe',
  'bye',
  'thanks',
  'thank',
]);

const PURE_FILLERS = new Set([
  'um',
  'uh',
  'ah',
  'er',
  'like',
  'you know',
  'actually',
  'basically',
  'so',
  'well',
  'hmm',
]);

const COMMON_STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'is',
  'it',
  'this',
  'that',
  'i',
  'me',
  'my',
  'you',
  'your',
  'we',
  'our',
  'he',
  'she',
  'they',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
]);

export function evaluateAttemptValidity(
  transcript: string,
  durationSeconds: number = 0,
  _challengePrompt?: string
): AttemptValidityResult {
  const text = (transcript || '').trim();

  // 1. Empty / Zero text check
  if (!text || text.length === 0) {
    return {
      validity: 'INVALID',
      isValid: false,
      reasonCode: 'empty_transcript',
      explanation: 'No speech was detected in the recording.',
      totalWordCount: 0,
      meaningfulWordCount: 0,
    };
  }

  // Normalize words
  const rawWords = text.split(/\s+/).filter(Boolean);
  const cleanWords = rawWords.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const totalWordCount = cleanWords.length;

  if (totalWordCount === 0) {
    return {
      validity: 'INVALID',
      isValid: false,
      reasonCode: 'empty_transcript',
      explanation: 'No audible speech words were detected.',
      totalWordCount: 0,
      meaningfulWordCount: 0,
    };
  }

  // Count unique words
  const uniqueWords = new Set(cleanWords);

  // Check if ALL words are greetings / noise
  const allGreetings = cleanWords.every((w) => GREETINGS_AND_NOISE.has(w));
  if (allGreetings && totalWordCount <= 4) {
    return {
      validity: 'INVALID',
      isValid: false,
      reasonCode: 'greeting_only',
      explanation: 'Your response consisted only of greetings or brief testing words without answering the question.',
      totalWordCount,
      meaningfulWordCount: 0,
    };
  }

  // Check if ALL words are fillers
  const allFillers = cleanWords.every((w) => PURE_FILLERS.has(w) || GREETINGS_AND_NOISE.has(w));
  if (allFillers && totalWordCount <= 6) {
    return {
      validity: 'INVALID',
      isValid: false,
      reasonCode: 'filler_only',
      explanation: 'Your response contained only filler words without providing an answer.',
      totalWordCount,
      meaningfulWordCount: 0,
    };
  }

  // Check if repetitive single word noise (e.g. "hello hello hello hello", "test test test", "yeah yeah yeah")
  if (uniqueWords.size <= 2 && totalWordCount >= 2 && totalWordCount <= 8) {
    const isGreetingNoise = Array.from(uniqueWords).every(
      (w) => GREETINGS_AND_NOISE.has(w) || PURE_FILLERS.has(w)
    );
    if (isGreetingNoise) {
      return {
        validity: 'INVALID',
        isValid: false,
        reasonCode: 'repetitive_noise',
        explanation: 'Your response consisted of repeated greetings or filler sounds without an answer.',
        totalWordCount,
        meaningfulWordCount: 0,
      };
    }
  }

  // Check single-word responses
  if (totalWordCount <= 1) {
    const isNoise = cleanWords.every((w) => GREETINGS_AND_NOISE.has(w) || PURE_FILLERS.has(w));
    return {
      validity: 'INVALID',
      isValid: false,
      reasonCode: isNoise ? 'greeting_only' : 'too_short',
      explanation: isNoise
        ? 'Only a greeting or non-answer word was detected.'
        : 'A single word is not sufficient to evaluate speech delivery. Please speak in full sentences.',
      totalWordCount,
      meaningfulWordCount: isNoise ? 0 : 1,
    };
  }

  // Count meaningful content words (substantive words outside fillers/greetings/common stop-words)
  const meaningfulWords = cleanWords.filter(
    (w) => !COMMON_STOP_WORDS.has(w) && !PURE_FILLERS.has(w) && !GREETINGS_AND_NOISE.has(w)
  );
  const meaningfulWordCount = meaningfulWords.length;

  // If literally 0 meaningful words across 2-6 words of only stop words (e.g. "it is what it is")
  if (meaningfulWordCount === 0 && totalWordCount <= 4) {
    return {
      validity: 'INVALID',
      isValid: false,
      reasonCode: 'too_short',
      explanation: 'Your response did not contain substantive content words addressing the challenge.',
      totalWordCount,
      meaningfulWordCount: 0,
    };
  }

  // 3. Substantive vs Concise vs Short/Partial distinction
  // A. Developed Substantive Answer (10+ words with 5+ content words)
  if (totalWordCount >= 10 && meaningfulWordCount >= 5) {
    return {
      validity: 'VALID',
      isValid: true,
      reasonCode: 'valid_substantive',
      explanation: 'Response contains substantive and relevant spoken content.',
      totalWordCount,
      meaningfulWordCount,
    };
  }

  // B. Concise Relevant Answer (e.g. "I built a Power BI dashboard for sales analysis." - 9 words, 5 content words)
  if (totalWordCount >= 6 && meaningfulWordCount >= 3) {
    return {
      validity: 'VALID',
      isValid: true,
      reasonCode: 'valid_concise',
      explanation: 'Response is concise but contains meaningful relevant keywords.',
      totalWordCount,
      meaningfulWordCount,
    };
  }

  // C. Meaningful Short Answer (e.g. "I built a Power BI dashboard.", "I used Python.", "I worked on a website.")
  // MUST NOT be classified as INVALID or NO SPEECH.
  return {
    validity: 'PARTIAL',
    isValid: true,
    reasonCode: 'partial_incomplete',
    explanation: 'Response was recorded and attempted, but is brief and lacks structural depth.',
    totalWordCount,
    meaningfulWordCount,
  };
}

/**
 * Produces an honest, deterministic low-score analysis result for truly invalid attempts (no speech, greetings only).
 * Zero fake strengths, zero high scores, clear constructive instruction.
 */
export function createInvalidAnalysisResult(
  validityResult: AttemptValidityResult,
  challenge: Challenge,
  rawTranscript: string = ''
): AIAnalysisResult {
  const isNoSpeech = !rawTranscript || rawTranscript.trim().length === 0;

  return {
    transcription: rawTranscript || undefined,
    overall_score: 0,
    evaluation_validity: 'INVALID',
    is_valid_attempt: false,
    task_completion: {
      score: 0,
      completed: false,
      explanation: validityResult.explanation || (isNoSpeech ? 'No speech was detected in the recording.' : 'The response did not provide a meaningful answer to the challenge.'),
    },
    skills: {
      fluency: 0,
      clarity: 0,
      structure: 0,
      vocabulary: 0,
      grammar: 0,
      confidence: 0,
    },
    strengths: [], // Zero fake praise
    improvements: [
      {
        issue_type: isNoSpeech ? 'no_meaningful_answer' : 'incomplete_response',
        severity: 'high',
        evidence: rawTranscript || '(No speech detected)',
        explanation: validityResult.explanation || (isNoSpeech ? 'No audible speech was captured.' : 'Only greetings or brief non-answer sounds were detected.'),
        action: `Answer the prompt directly: "${challenge.prompt}". State what happened, what action you took, and the outcome.`,
      },
    ],
    coach_summary: isNoSpeech
      ? `No speech was captured for "${challenge.title}". Please check your microphone and speak clearly.`
      : `You did not provide a meaningful answer to the challenge "${challenge.title}". Answer the question directly with at least 1-2 specific details so we can evaluate your communication skills.`,
    next_focus: 'Answer Relevance & Completion',
    recommended_drill_type: 'retry',
    recommendation_reason: 'Practice answering the prompt directly before moving to advanced speech delivery.',
    confidence_in_evaluation: 1.0,
  };
}

/**
 * Post-processes and normalizes Gemini AI analysis output:
 * - Genuinely invalid attempts (empty/greetings) receive 0 score.
 * - Meaningful short/partial attempts receive real evaluation scores.
 * - Off-topic attempts have overall_score capped at 25-35 without being falsely labeled as "no speech".
 * - Ensures scores are bounded within [0, 100].
 */
export function validateAIAnalysisResult(
  rawResult: AIAnalysisResult,
  transcript: string,
  _prompt?: string
): AIAnalysisResult {
  const result = { ...rawResult };
  const validity = evaluateAttemptValidity(transcript);

  // If deterministic gate identified truly INVALID (empty, greeting-only, filler-only)
  if (!validity.isValid || validity.validity === 'INVALID') {
    return {
      ...result,
      overall_score: 0,
      evaluation_validity: 'INVALID',
      is_valid_attempt: false,
      strengths: [],
      skills: {
        fluency: 0,
        clarity: 0,
        structure: 0,
        vocabulary: 0,
        grammar: 0,
        confidence: 0,
      },
    };
  }

  // The user provided real speech
  result.is_valid_attempt = true;
  const taskScore = result.task_completion?.score ?? 50;

  // Off-topic response gating (e.g. speaking about sports for a technical challenge)
  if (taskScore < 30) {
    result.overall_score = Math.min(result.overall_score, Math.max(15, Math.round(taskScore * 1.1)));
    result.evaluation_validity = 'PARTIAL';
    result.strengths = []; // No fake praise on off-topic responses

    if (!result.improvements.some((imp) => imp.issue_type === 'off_topic' || imp.issue_type === 'no_meaningful_answer')) {
      result.improvements.unshift({
        issue_type: 'off_topic',
        severity: 'high',
        evidence: transcript.length > 60 ? transcript.slice(0, 57) + '...' : transcript,
        explanation: 'Your response was recorded, but it did not address the requested challenge topic.',
        action: 'Focus on answering the specific question asked in the prompt.',
      });
    }
  } else if (taskScore < 55) {
    result.overall_score = Math.min(result.overall_score, Math.round(taskScore * 0.7 + 25));
    result.evaluation_validity = 'PARTIAL';
  } else {
    result.evaluation_validity = 'VALID';
  }

  return result;
}

