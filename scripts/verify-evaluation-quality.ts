/**
 * VERBLYN PRODUCTION EVALUATION QUALITY VERIFICATION SUITE
 *
 * Verifies that the evaluation pipeline:
 * 1. Deterministically rejects non-answers (empty, silence, "hello hello", fillers, single words).
 * 2. Gates task completion independently from grammar/fluency.
 * 3. Handles partial vs valid vs concise vs strong answers honestly.
 * 4. Strictly protects progression (no unearned XP, no skill inflation).
 * 5. Adapts intelligently toward recovery rather than false advancement.
 */

import {
  evaluateAttemptValidity,
  createInvalidAnalysisResult,
  validateAIAnalysisResult,
} from '../src/features/challenges/evaluationValidity';
import { attemptApi } from '../src/features/challenges/attempt.api';
import { Challenge } from '../src/features/challenges/challenge.types';
import { SpeechMetricsSummary } from '../src/lib/metrics';
import { AIAnalysisResult } from '../src/services/gemini/gemini.types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    process.exitCode = 1;
  }
}

console.log('\n======================================================');
console.log('--- VERBLYN EVALUATION QUALITY & VALIDITY GATE TESTS ---');
console.log('======================================================\n');

// Mock baseline challenge
const mockProjectChallenge: Challenge = {
  id: 'behavioral-project-breakdown-90',
  title: 'Tell Me About a Project You Worked On',
  category: 'Behavioral',
  targetSkill: 'Structure',
  difficulty: 2,
  durationSeconds: 90,
  xpReward: 30,
  prompt: 'Walk through a recent technical or business project you completed. Explain your role and outcome.',
  frameworkHint: 'Use Situation-Task-Action-Result (STAR).',
  expectedTopics: ['project', 'dashboard', 'python', 'analytics', 'team', 'outcome', 'result', 'website', 'internship'],
  rubric: {
    fluency: 'Steady pace',
    clarity: 'Clear structure',
    vocabulary: 'Precise terms',
    grammar: 'Consistent tense',
    confidence: 'Conviction',
  },
  challengeType: 'structured_framework',
};

const mockMetrics: SpeechMetricsSummary = {
  wpm: 130,
  totalWords: 20,
  wordCount: 20,
  fillerStats: { total: 0, fillerPercentage: 0, breakdown: {} },
  repetitionStats: { total: 0, breakdown: {} },
  sentenceCount: 2,
  averageSentenceLength: 10,
  vocabularyDiversity: 0.8,
  confidenceDeliveryScore: 80,
  silenceTotalSeconds: 0,
  cleanPacingRate: 130,
};

// ==========================================
// TEST 1: Empty Transcript
// ==========================================
console.log('\nTest Case 1: Empty Transcript ("")');
const resEmpty = evaluateAttemptValidity('', 0, mockProjectChallenge.prompt);
assert(resEmpty.validity === 'INVALID', 'Empty transcript classified as INVALID');
assert(resEmpty.isValid === false, 'isValid is false for empty transcript');
assert(resEmpty.totalWordCount === 0, 'Word count is 0 for empty transcript');

const mockEmptyMetrics: SpeechMetricsSummary = { ...mockMetrics, wordCount: 0, totalWords: 0, wpm: 0 };
const evalEmpty = attemptApi.evaluateChallengeMetrics(mockProjectChallenge, mockEmptyMetrics, '');
assert(evalEmpty.scores.overallScore === 0, 'Deterministic overallScore is 0 for empty transcript');
assert(evalEmpty.whatYouDidWell.length === 0, 'No fake strengths generated for empty transcript');
assert(evalEmpty.isValidAttempt === false, 'Deterministic isValidAttempt is false');

// ==========================================
// TEST 2: Greeting Only ("hello hello")
// ==========================================
console.log('\nTest Case 2: Greeting Only ("hello hello")');
const resGreeting = evaluateAttemptValidity('hello hello', 2, mockProjectChallenge.prompt);
assert(resGreeting.validity === 'INVALID', '"hello hello" classified as INVALID');
assert(resGreeting.reasonCode === 'greeting_only' || resGreeting.reasonCode === 'repetitive_noise', 'Greeting reason code identified');
assert(resGreeting.explanation.toLowerCase().includes('greeting') || resGreeting.explanation.toLowerCase().includes('speech'), 'Explicit explanation provided for greeting');

const evalGreeting = attemptApi.evaluateChallengeMetrics(mockProjectChallenge, { ...mockMetrics, wordCount: 2 }, 'hello hello');
assert(evalGreeting.scores.overallScore === 0, 'Overall score is 0 for "hello hello"');
assert(evalGreeting.whatYouDidWell.length === 0, 'No strengths awarded for greeting');
assert(evalGreeting.improveNext.length > 0, 'Actionable guidance provided for greeting');

// ==========================================
// TEST 3: Single Word ("hi")
// ==========================================
console.log('\nTest Case 3: Single Word ("hi")');
const resHi = evaluateAttemptValidity('hi', 1, mockProjectChallenge.prompt);
assert(resHi.validity === 'INVALID', '"hi" classified as INVALID');
assert(resHi.totalWordCount === 1, 'Word count accurately counted as 1');

// ==========================================
// TEST 4: Filler Only ("um um uh")
// ==========================================
console.log('\nTest Case 4: Filler Only ("um um uh")');
const resFiller = evaluateAttemptValidity('um um uh', 3, mockProjectChallenge.prompt);
assert(resFiller.validity === 'INVALID', '"um um uh" classified as INVALID');
assert(resFiller.reasonCode === 'filler_only', 'Identified reasonCode as filler_only');

// ==========================================
// TEST 5: Off-topic ("Hello, I am Rahil and I like technology")
// ==========================================
console.log('\nTest Case 5: Off-topic Response & Task Completion Gating');
const offTopicTranscript = 'Hello, I am Rahil and I like technology.';

// If Gemini returns high score on off-topic response, normalize it with validateAIAnalysisResult
const rawGeminiHallucination: AIAnalysisResult = {
  overall_score: 88,
  evaluation_validity: 'valid',
  is_valid_attempt: true,
  task_completion: { score: 15, completed: false, explanation: 'Did not answer project prompt' },
  skills: { fluency: 90, clarity: 90, structure: 85, vocabulary: 80, grammar: 90, confidence: 85 },
  strengths: [{ title: 'Great answer and structure', impact: 'Spoke clearly', evidence: 'Hello I am Rahil' }],
  improvements: [{ issue_type: 'off_topic', severity: 'high', explanation: 'Did not answer project prompt', action: 'Describe a real project', evidence: 'off topic' }],
  coach_summary: 'Good English.',
  next_focus: 'Structure',
  recommended_drill_type: 'retry',
  confidence_in_evaluation: 0.95,
};

const gatedAnalysis = validateAIAnalysisResult(rawGeminiHallucination, offTopicTranscript, mockProjectChallenge.prompt);
assert(gatedAnalysis.overall_score <= 45, 'Task completion gate capped the overall score for off-topic response');
assert(gatedAnalysis.evaluation_validity === 'INVALID' || gatedAnalysis.evaluation_validity === 'PARTIAL', 'Validity adjusted for off-topic answer');

// ==========================================
// TEST 6: Partial / Weak Answer ("I worked on a website project. It was good.")
// ==========================================
console.log('\nTest Case 6: Partial / Weak Answer ("I worked on a website project. It was good.")');
const partialTranscript = 'I worked on a website project. It was good and I learned a lot.';
const resPartial = evaluateAttemptValidity(partialTranscript, 8, mockProjectChallenge.prompt);
assert(resPartial.validity === 'PARTIAL' || resPartial.validity === 'VALID', 'Partial answer classified as PARTIAL or VALID attempt');
assert(resPartial.isValid === true, 'isValid is true for genuine attempt');

const evalPartial = attemptApi.evaluateChallengeMetrics(mockProjectChallenge, { ...mockMetrics, wordCount: 13 }, partialTranscript);
assert(evalPartial.scores.overallScore > 0, 'Partial answer receives measurable score > 0');
assert(evalPartial.isValidAttempt === true, 'Partial answer is marked valid attempt');

// ==========================================
// TEST 7: Strong Substantive Answer
// ==========================================
console.log('\nTest Case 7: Strong Substantive Answer');
const strongTranscript = 'I built a data analytics dashboard during my internship. I cleaned the dataset with Python and created Power BI visualizations. The dashboard helped the team identify the highest-performing regions.';
const resStrong = evaluateAttemptValidity(strongTranscript, 25, mockProjectChallenge.prompt);
assert(resStrong.validity === 'VALID', 'Substantive answer classified as VALID');
assert(resStrong.meaningfulWordCount >= 8, 'Substantive answer has high meaningful content count');
assert(resStrong.isValid === true, 'isValid is true for substantive answer');

const strongAiResult: AIAnalysisResult = {
  overall_score: 92,
  evaluation_validity: 'valid',
  is_valid_attempt: true,
  task_completion: { score: 95, completed: true, explanation: 'Fully answered the project prompt with STAR' },
  skills: { fluency: 92, clarity: 90, structure: 94, vocabulary: 88, grammar: 95, confidence: 90 },
  strengths: [
    {
      title: 'Clear STAR Structure',
      impact: 'Framed the project challenge, action, and business outcome sequentially.',
      evidence: 'I built a data analytics dashboard during my internship... The dashboard helped the team identify the highest-performing regions.',
    },
  ],
  improvements: [],
  coach_summary: 'Outstanding structured delivery with concrete metrics and clear project ownership.',
  next_focus: 'Executive Presence',
  recommended_drill_type: 'advance_level',
  confidence_in_evaluation: 0.98,
};

const validatedStrong = validateAIAnalysisResult(strongAiResult, strongTranscript, mockProjectChallenge.prompt);
assert(validatedStrong.overall_score >= 88, 'Strong answer retains high earned score');
assert(validatedStrong.strengths.length > 0, 'Strengths retained with concrete evidence');

// ==========================================
// TEST 8: Concise But Relevant Answer (Not penalizing concise speech)
// ==========================================
console.log('\nTest Case 8: Concise But Relevant Answer');
const conciseTranscript = 'During my internship, I cleaned 30,000 records using Python and built a Power BI dashboard.';
const resConcise = evaluateAttemptValidity(conciseTranscript, 10, mockProjectChallenge.prompt);
assert(resConcise.validity === 'VALID', 'Short but relevant answer is NOT rejected as invalid');
assert(resConcise.isValid === true, 'isValid is true for concise relevant response');

// ==========================================
// TEST 9: Progression Safety on Invalid Attempt
// ==========================================
console.log('\nTest Case 9: Progression Safety on Invalid Attempt');
const invalidResult = createInvalidAnalysisResult(resGreeting, mockProjectChallenge, 'hello hello');
assert(invalidResult.overall_score === 0, 'Invalid result overall_score is 0');
assert(invalidResult.skills.fluency === 0, 'Invalid result fluency is 0');
assert(invalidResult.strengths.length === 0, 'Invalid result strengths is empty array');
assert(invalidResult.improvements.length > 0, 'Invalid result includes actionable improvement');
assert(invalidResult.recommended_drill_type === 'retry', 'Invalid result directs to retry');

console.log('\n======================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  console.log('All Evaluation Quality and Validity Gate tests passed successfully!\n');
} else {
  console.error('Some evaluation quality tests failed.\n');
  process.exit(1);
}
