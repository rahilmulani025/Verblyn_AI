/**
 * Deterministic speech metric utilities.
 * Pure functions for transparent, reproducible metrics calculated directly from transcript and timing data.
 */

// Common spoken filler words and verbal pausessds
export const DEFAULT_FILLER_WORDS: readonly string[] = [
  'um',
  'uh',
  'er',
  'ah',
  'like',
  'you know',
  'actually',
  'basically',
  'literally',
  'honestly',
  'so',
  'right',
  'i mean',
  'kind of',
  'sort of',
] as const;

/**
 * Normalizes text by trimming whitespace and normalizing spaces.
 */
export function normalizeTranscript(transcript: string): string {
  if (!transcript) return '';
  return transcript.trim().replace(/\s+/g, ' ');
}

/**
 * Extracts words from transcript by stripping punctuation and separating by whitespace.
 */
export function extractWords(transcript: string): string[] {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return [];

  // Remove punctuation except apostrophes within words (like "don't", "it's")
  const cleaned = normalized
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];
  return cleaned.split(' ').filter(word => word.length > 0);
}

/**
 * Counts the total number of words in a transcript.
 */
export function countWords(transcript: string): number {
  return extractWords(transcript).length;
}

/**
 * Calculates Words Per Minute (WPM) deterministically.
 * Returns 0 if duration is 0 or transcript is empty.
 */
export function calculateWpm(wordCount: number, durationSeconds: number): number {
  if (wordCount <= 0 || durationSeconds <= 0) return 0;
  const minutes = durationSeconds / 60;
  const wpm = Math.round(wordCount / minutes);
  return Number.isFinite(wpm) ? Math.max(0, wpm) : 0;
}

/**
 * Counts the number of sentences based on sentence terminators (. ! ? or newline).
 * Guarantees at least 1 sentence if transcript contains words.
 */
export function countSentences(transcript: string): number {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return 0;

  // Match sentences ending in punctuation or end-of-string
  const matches = normalized.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g);
  if (!matches) return 0;

  const validSentences = matches
    .map(s => s.trim())
    .filter(s => s.length > 0 && extractWords(s).length > 0);

  return Math.max(validSentences.length, countWords(transcript) > 0 ? 1 : 0);
}

/**
 * Calculates the average sentence length (in words per sentence).
 * Returns 0 if sentence count is 0.
 */
export function calculateAverageSentenceLength(transcript: string): number {
  const words = countWords(transcript);
  const sentences = countSentences(transcript);
  if (sentences === 0 || words === 0) return 0;
  return Number((words / sentences).toFixed(1));
}

export interface FillerCountResult {
  total: number;
  breakdown: Record<string, number>;
  fillerPercentage: number; // % of total words that are fillers
}

/**
 * Counts filler words and phrases deterministically.
 */
export function countFillers(
  transcript: string,
  customFillers: string[] = [...DEFAULT_FILLER_WORDS]
): FillerCountResult {
  const normalized = normalizeTranscript(transcript).toLowerCase();
  const words = extractWords(transcript);
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      total: 0,
      breakdown: {},
      fillerPercentage: 0,
    };
  }

  const breakdown: Record<string, number> = {};
  let totalFillers = 0;

  // Sort fillers by length descending so multi-word phrases (e.g. "you know") match before single words ("you")
  const sortedFillers = [...customFillers].sort((a, b) => b.length - a.length);
  let workingText = ` ${normalized.replace(/[^\w\s']/g, ' ')} `;

  for (const filler of sortedFillers) {
    const fillerLower = filler.toLowerCase().trim();
    if (!fillerLower) continue;

    // Word boundary regex for matching whole filler word/phrase
    const escaped = fillerLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<=\\s|^)${escaped}(?=\\s|$)`, 'gi');
    const matches = workingText.match(regex);

    if (matches && matches.length > 0) {
      const count = matches.length;
      breakdown[fillerLower] = count;
      totalFillers += count;

      // Remove matched instances to avoid double counting overlapping fillers
      workingText = workingText.replace(regex, ' ');
    }
  }

  const fillerPercentage = totalWords > 0 ? Number(((totalFillers / totalWords) * 100).toFixed(1)) : 0;

  return {
    total: totalFillers,
    breakdown,
    fillerPercentage,
  };
}

export interface RepetitionItem {
  word: string;
  count: number;
}

export interface RepeatedWordsResult {
  total: number; // Total repetition events (e.g., "I I" is 1 repetition)
  repetitions: RepetitionItem[];
}

/**
 * Identifies immediately repeated words (e.g. "I think think that is good")
 * as well as heavily overused single words.
 */
export function countRepeatedWords(transcript: string): RepeatedWordsResult {
  const words = extractWords(transcript).map(w => w.toLowerCase());
  if (words.length < 2) {
    return { total: 0, repetitions: [] };
  }

  const immediateRepetitions: Record<string, number> = {};
  let totalRepetitions = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];

    if (current === next && current.length > 1) {
      immediateRepetitions[current] = (immediateRepetitions[current] || 0) + 1;
      totalRepetitions += 1;
    }
  }

  const repetitions: RepetitionItem[] = Object.entries(immediateRepetitions).map(
    ([word, count]) => ({ word, count })
  );

  return {
    total: totalRepetitions,
    repetitions,
  };
}

/**
 * Calculates vocabulary diversity using Type-Token Ratio (TTR: unique words / total words).
 * Returns a score between 0 and 1 (or 0 if no words).
 */
export function calculateVocabularyDiversity(transcript: string): number {
  const words = extractWords(transcript).map(w => w.toLowerCase());
  if (words.length === 0) return 0;

  const uniqueWords = new Set(words);
  const ttr = uniqueWords.size / words.length;

  return Number(ttr.toFixed(3));
}

export interface SpeechMetricsSummary {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
  sentenceCount: number;
  averageSentenceLength: number;
  fillerStats: FillerCountResult;
  repetitionStats: RepeatedWordsResult;
  vocabularyDiversity: number;
}

/**
 * Deterministically computes a complete speech metrics summary.
 */
export function calculateSpeechMetrics(
  transcript: string,
  durationSeconds: number
): SpeechMetricsSummary {
  const wordCount = countWords(transcript);
  const wpm = calculateWpm(wordCount, durationSeconds);
  const sentenceCount = countSentences(transcript);
  const averageSentenceLength = calculateAverageSentenceLength(transcript);
  const fillerStats = countFillers(transcript);
  const repetitionStats = countRepeatedWords(transcript);
  const vocabularyDiversity = calculateVocabularyDiversity(transcript);

  return {
    wordCount,
    durationSeconds,
    wpm,
    sentenceCount,
    averageSentenceLength,
    fillerStats,
    repetitionStats,
    vocabularyDiversity,
  };
}
