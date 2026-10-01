/**
 * VERBLYN PRODUCTION EVALUATION QUALITY & VALIDITY REGRESSION SUITE
 *
 * Verifies that the evaluation pipeline:
 * 1. Deterministically rejects true non-answers (empty, silence, "hello hello", fillers, single words).
 * 2. Does NOT misclassify short meaningful answers as "no speech recorded".
 * 3. Correctly handles off-topic speech (caps score without claiming no speech).
 * 4. Gates task completion independently from grammar/fluency.
 * 5. Handles partial vs valid vs concise vs strong answers honestly.
 * 6. Strictly protects progression (no unearned XP, no skill inflation for invalid attempts).
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
  expectedTopics: ['project', 'dashboard', 'python', 'analytics', 'team', 'outcome', 'result', 'website', 'internship', 'sql', 'sales'],
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
// CASE 1: Empty Transcript ("")
// ==========================================
console.log('\nCASE 1: Empty Transcript ("")');
const resEmpty = evaluateAttemptValidity('', 0, mockProjectChallenge.prompt);
assert(resEmpty.validity === 'INVALID', 'Empty transcript classified as INVALID');
assert(resEmpty.isValid === false, 'isValid is false for empty transcript');
assert(resEmpty.reasonCode === 'empty_transcript', 'Reason code is empty_transcript');

const evalEmpty = attemptApi.evaluateChallengeMetrics(mockProjectChallenge, { ...mockMetrics, wordCount: 0 }, '');
assert(evalEmpty.scores.overallScore === 0, 'Deterministic overallScore is 0 for empty transcript');
assert(evalEmpty.whatYouDidWell.length === 0, 'No fake strengths generated for empty transcript');
assert(evalEmpty.isValidAttempt === false, 'isValidAttempt is false');

// ==========================================
// CASE 2: Greeting Only ("hello hello")
// ==========================================
console.log('\nCASE 2: Greeting Only ("hello hello")');
const resGreeting = evaluateAttemptValidity('hello hello', 2, mockProjectChallenge.prompt);
assert(resGreeting.validity === 'INVALID', '"hello hello" classified as INVALID');
assert(resGreeting.isValid === false, 'isValid is false for greeting only');
assert(resGreeting.reasonCode === 'greeting_only' || resGreeting.reasonCode === 'repetitive_noise', 'Greeting reason code identified');

const evalGreeting = attemptApi.evaluateChallengeMetrics(mockProjectChallenge, { ...mockMetrics, wordCount: 2 }, 'hello hello');
assert(evalGreeting.scores.overallScore === 0, 'Overall score is 0 for "hello hello"');
assert(evalGreeting.whatYouDidWell.length === 0, 'No strengths awarded for greeting');
assert(evalGreeting.isValidAttempt === false, 'isValidAttempt is false for greeting');

// ==========================================
// CASE 3: Single Word ("hi")
// ==========================================
console.log('\nCASE 3: Single Word ("hi")');
const resHi = evaluateAttemptValidity('hi', 1, mockProjectChallenge.prompt);
assert(resHi.validity === 'INVALID', '"hi" classified as INVALID');
assert(resHi.isValid === false, 'isValid is false for "hi"');

// ==========================================
// CASE 4: Filler Only ("um um uh")
// ==========================================
console.log('\nCASE 4: Filler Only ("um um uh")');
const resFiller = evaluateAttemptValidity('um um uh', 3, mockProjectChallenge.prompt);
assert(resFiller.validity === 'INVALID', '"um um uh" classified as INVALID');
assert(resFiller.isValid === false, 'isValid is false for "um um uh"');
assert(resFiller.reasonCode === 'filler_only', 'Reason code is filler_only');

// ==========================================
// CASE 5: "I built a Power BI dashboard."
// ==========================================
console.log('\nCASE 5: "I built a Power BI dashboard."');
const resCase5 = evaluateAttemptValidity('I built a Power BI dashboard.', 4, mockProjectChallenge.prompt);
assert(resCase5.validity !== 'INVALID', '"I built a Power BI dashboard." is NOT INVALID');
assert(resCase5.isValid === true, 'isValid is true for "I built a Power BI dashboard."');
assert(resCase5.reasonCode !== 'empty_transcript', 'NOT classified as empty_transcript');

const evalCase5 = attemptApi.evaluateChallengeMetrics(mockProjectChallenge, { ...mockMetrics, wordCount: 6 }, 'I built a Power BI dashboard.');
assert(evalCase5.scores.overallScore > 0, 'Receives real evaluation score > 0');
assert(evalCase5.isValidAttempt === true, 'isValidAttempt is true');

// ==========================================
// CASE 6: "I used Python."
// ==========================================
console.log('\nCASE 6: "I used Python."');
const resCase6 = evaluateAttemptValidity('I used Python.', 2, mockProjectChallenge.prompt);
assert(resCase6.validity !== 'INVALID', '"I used Python." is NOT INVALID');
assert(resCase6.isValid === true, 'isValid is true for "I used Python."');
assert(resCase6.reasonCode === 'partial_incomplete', 'Reason code is partial_incomplete');

const evalCase6 = attemptApi.evaluateChallengeMetrics(mockProjectChallenge, { ...mockMetrics, wordCount: 3 }, 'I used Python.');
assert(evalCase6.scores.overallScore > 0, 'Score is > 0');
assert(evalCase6.isValidAttempt === true, 'isValidAttempt is true');

// ==========================================
// CASE 7: "I built a Power BI dashboard for sales analysis."
// ==========================================
console.log('\nCASE 7: "I built a Power BI dashboard for sales analysis."');
const resCase7 = evaluateAttemptValidity('I built a Power BI dashboard for sales analysis.', 6, mockProjectChallenge.prompt);
assert(resCase7.validity === 'VALID', 'Classified as VALID concise answer');
assert(resCase7.isValid === true, 'isValid is true');
assert(resCase7.reasonCode === 'valid_concise', 'Reason code is valid_concise');

const evalCase7 = attemptApi.evaluateChallengeMetrics(mockProjectChallenge, { ...mockMetrics, wordCount: 9 }, 'I built a Power BI dashboard for sales analysis.');
assert(evalCase7.scores.overallScore >= 60, 'Score is substantial (>= 60)');
assert(evalCase7.isValidAttempt === true, 'isValidAttempt is true');

// ==========================================
// CASE 8: "I worked on a website project."
// ==========================================
console.log('\nCASE 8: "I worked on a website project."');
const resCase8 = evaluateAttemptValidity('I worked on a website project.', 4, mockProjectChallenge.prompt);
assert(resCase8.validity === 'VALID' || resCase8.validity === 'PARTIAL', 'Classified as VALID or PARTIAL (NOT INVALID)');
assert(resCase8.isValid === true, 'isValid is true');
assert(resCase8.reasonCode !== 'empty_transcript', 'Never called empty_transcript');

// ==========================================
// CASE 9: "I like cricket." (Off-topic speech)
// ==========================================
console.log('\nCASE 9: "I like cricket." (Off-topic speech)');
const resCase9 = evaluateAttemptValidity('I like cricket.', 3, mockProjectChallenge.prompt);
assert(resCase9.isValid === true, 'Speech IS detected (isValid is true)');
assert(resCase9.reasonCode !== 'empty_transcript', 'NOT classified as empty_transcript');

// When evaluated by Gemini with low task completion:
const offTopicAiResult: AIAnalysisResult = {
  overall_score: 75,
  evaluation_validity: 'valid',
  is_valid_attempt: true,
  task_completion: { score: 15, completed: false, explanation: 'Spoke about cricket instead of a project' },
  skills: { fluency: 80, clarity: 80, structure: 70, vocabulary: 75, grammar: 85, confidence: 80 },
  strengths: [{ title: 'Spoke clearly', evidence: 'I like cricket', impact: 'Fluent delivery' }],
  improvements: [],
  coach_summary: 'You spoke clearly but did not answer the prompt.',
  next_focus: 'Answer Relevance',
  recommended_drill_type: 'retry',
  confidence_in_evaluation: 0.95,
};

const normalizedOffTopic = validateAIAnalysisResult(offTopicAiResult, 'I like cricket.', mockProjectChallenge.prompt);
assert(normalizedOffTopic.overall_score <= 35, 'Overall score capped at <= 35 for off-topic response');
assert(normalizedOffTopic.is_valid_attempt === true, 'is_valid_attempt remains true (NOT no-speech)');
assert(normalizedOffTopic.evaluation_validity === 'PARTIAL', 'evaluation_validity is PARTIAL');
assert(normalizedOffTopic.strengths.length === 0, 'No strengths awarded for off-topic response');

// ==========================================
// CASE 10: Detailed Substantive Answer
// ==========================================
console.log('\nCASE 10: Detailed Substantive Answer');
const detailedTranscript = 'I built a data analytics platform using Python and Power BI. I cleaned datasets, created dashboards, and analyzed trends.';
const resCase10 = evaluateAttemptValidity(detailedTranscript, 18, mockProjectChallenge.prompt);
assert(resCase10.validity === 'VALID', 'Detailed response classified as VALID');
assert(resCase10.isValid === true, 'isValid is true');
assert(resCase10.meaningfulWordCount >= 6, 'Contains 6+ content words');

const detailedAiResult: AIAnalysisResult = {
  overall_score: 90,
  evaluation_validity: 'valid',
  is_valid_attempt: true,
  task_completion: { score: 92, completed: true, explanation: 'Addressed the project prompt clearly' },
  skills: { fluency: 90, clarity: 90, structure: 88, vocabulary: 92, grammar: 90, confidence: 90 },
  strengths: [{ title: 'Structured Tech Stack', evidence: 'I built a data analytics platform using Python and Power BI.', impact: 'Clear technical ownership.' }],
  improvements: [],
  coach_summary: 'Strong structured answer with concrete technical stack.',
  next_focus: 'Executive Communication',
  recommended_drill_type: 'advance_level',
  confidence_in_evaluation: 0.98,
};

const normalizedDetailed = validateAIAnalysisResult(detailedAiResult, detailedTranscript, mockProjectChallenge.prompt);
assert(normalizedDetailed.overall_score >= 88, 'Earned high score retained');
assert(normalizedDetailed.evaluation_validity === 'VALID', 'evaluation_validity is VALID');
assert(normalizedDetailed.strengths.length > 0, 'Strengths preserved with evidence');

// ==========================================
// CASE 11: "During my internship, I cleaned 30,000 records using Python."
// ==========================================
console.log('\nCASE 11: "During my internship, I cleaned 30,000 records using Python."');
const resCase11 = evaluateAttemptValidity('During my internship, I cleaned 30,000 records using Python.', 8, mockProjectChallenge.prompt);
assert(resCase11.validity === 'VALID', 'Classified as VALID');
assert(resCase11.isValid === true, 'isValid is true');
assert(resCase11.reasonCode !== 'empty_transcript', 'Never labeled no-speech');

// ==========================================
// CASE 12: Progression Safety on Invalid Attempt
// ==========================================
console.log('\nCASE 12: Progression Safety on Truly Invalid Attempt');
const invalidResult = createInvalidAnalysisResult(resGreeting, mockProjectChallenge, 'hello hello');
assert(invalidResult.overall_score === 0, 'Invalid result overall_score is 0');
assert(invalidResult.skills.fluency === 0, 'Invalid result fluency is 0');
assert(invalidResult.strengths.length === 0, 'Invalid result strengths is empty array');
assert(invalidResult.improvements.length > 0, 'Invalid result includes actionable improvement');

console.log('\n======================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  console.log('All Evaluation Quality and Validity Gate tests passed successfully!\n');
} else {
  console.error('Some evaluation quality tests failed.\n');
  process.exit(1);
}
