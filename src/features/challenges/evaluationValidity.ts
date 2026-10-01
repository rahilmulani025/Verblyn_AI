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

  // 2. Extremely short check (< 3 words)
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

  // Check if repetitive single word noise (e.g. "hello hello hello hello", "test test test")
  if (uniqueWords.size <= 2 && totalWordCount >= 2 && totalWordCount <= 8) {
    const isGreetingNoise = Array.from(uniqueWords).every(
      (w) => GREETINGS_AND_NOISE.has(w) || PURE_FILLERS.has(w)
    );
    if (isGreetingNoise) {
      return {
        validity: 'INVALID',
        isValid: false,
        reasonCode: 'repetitive_noise',
        explanation: 'Your response consisted of repeated greetings without an answer.',
        totalWordCount,
        meaningfulWordCount: 0,
      };
    }
  }

  // Check isolated 1-word non-answers (e.g. "yes", "no", "maybe", "okay")
  if (totalWordCount === 1) {
    return {
      validity: 'INVALID',
      isValid: false,
      reasonCode: 'too_short',
      explanation: 'A single word is not sufficient to evaluate speaking and communication skills.',
      totalWordCount: 1,
      meaningfulWordCount: 0,
    };
  }

  // Count meaningful (substantive) content words
  const meaningfulWords = cleanWords.filter(
    (w) => !COMMON_STOP_WORDS.has(w) && !PURE_FILLERS.has(w) && !GREETINGS_AND_NOISE.has(w)
  );
  const meaningfulWordCount = meaningfulWords.length;

  if (meaningfulWordCount === 0 && totalWordCount <= 6) {
    return {
      validity: 'INVALID',
      isValid: false,
      reasonCode: 'too_short',
      explanation: 'Your response did not contain substantive content words addressing the challenge.',
      totalWordCount,
      meaningfulWordCount: 0,
    };
  }

  // 3. Partial vs Valid substantive distinction
  // Short but relevant answers (e.g. "During my internship, I cleaned 30,000 records using Python and built a Power BI dashboard.")
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

  // 4. Very brief attempts (3-5 words with 1-2 content words) -> PARTIAL
  return {
    validity: 'PARTIAL',
    isValid: true,
    reasonCode: 'partial_incomplete',
    explanation: 'Response attempted the question but is very brief and lacks structural depth.',
    totalWordCount,
    meaningfulWordCount,
  };
}

/**
 * Produces an honest, deterministic low-score analysis result for invalid attempts.
 * Zero fake strengths, zero high scores, clear constructive instruction.
 */
export function createInvalidAnalysisResult(
  validityResult: AttemptValidityResult,
  challenge: Challenge,
  rawTranscript: string = ''
): AIAnalysisResult {
  return {
    transcription: rawTranscript || undefined,
    overall_score: 0,
    evaluation_validity: 'INVALID',
    is_valid_attempt: false,
    task_completion: {
      score: 0,
      completed: false,
      explanation: validityResult.explanation || 'The response did not provide a meaningful answer to the challenge.',
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
        issue_type: 'incomplete_response',
        severity: 'high',
        evidence: rawTranscript || '(No speech recorded)',
        explanation: validityResult.explanation || 'No substantive answer was provided to the challenge prompt.',
        action: `Answer the prompt directly: "${challenge.prompt}". State what happened, what action you took, and the outcome.`,
      },
    ],
    coach_summary: `You did not provide a meaningful answer to the challenge "${challenge.title}". Speak clearly and provide at least 1-2 specific details or examples so we can evaluate your communication skills.`,
    next_focus: 'Answer Relevance & Completion',
    recommended_drill_type: 'retry',
    recommendation_reason: 'Practice answering the prompt directly before moving to advanced speech delivery.',
    confidence_in_evaluation: 1.0,
  };
}

/**
 * Post-processes and normalizes Gemini AI analysis output:
 * - Enforces Task Completion gating: if task_completion score is low (e.g. < 40), caps the overall score.
 * - Prevents fake strengths when the attempt was off-topic or invalid.
 * - Ensures scores are within [0, 100].
 */
export function validateAIAnalysisResult(
  rawResult: AIAnalysisResult,
  transcript: string,
  _prompt?: string
): AIAnalysisResult {
  const result = { ...rawResult };
  const validity = evaluateAttemptValidity(transcript);

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

  const taskScore = result.task_completion?.score ?? (result.task_completion?.completed ? 80 : 30);
  
  if (taskScore < 40) {
    // Task completion gate: If the user did not answer the prompt, overall score cannot exceed 45
    result.overall_score = Math.min(result.overall_score, 45);
    result.evaluation_validity = result.overall_score < 30 ? 'INVALID' : 'PARTIAL';
    result.is_valid_attempt = result.evaluation_validity !== 'INVALID';
    // Remove strengths that claim high task achievement
    result.strengths = (result.strengths || []).filter(
      (s) => !s.title.toLowerCase().includes('great answer') && !s.title.toLowerCase().includes('complete response')
    );
  }

  return result;
}

