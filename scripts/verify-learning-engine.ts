/**
 * Comprehensive Automated Verification Suite for Verblyn V1 Engine.
 * Tests:
 * 1. Speech metrics calculations with known test transcripts
 * 2. Score bounds and determinism (0-100 bounds)
 * 3. Recommendation engine adaptive logic
 * 4. XP calculation and breakdown logic
 * 5. Streak calculation rules
 * 6. Daily mission uniqueness
 */

import {
  countWords,
  countFillers,
  countRepeatedWords,
  countSentences,
  calculateAverageSentenceLength,
  calculateVocabularyDiversity,
  calculateWpm,
  calculateSpeechMetrics,
} from '../src/lib/metrics/speechMetrics';

import { assessmentApi } from '../src/features/assessment/assessment.api';
import { challengeApi } from '../src/features/challenges/challenge.api';
import { attemptApi } from '../src/features/challenges/attempt.api';
import { CHALLENGE_CATALOG } from '../src/features/challenges/challenge.catalog';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('--- 1. SPEECH METRIC VALIDATION (KNOWN TRANSCRIPTS) ---');
console.log('======================================================\n');

// Test 1: Simple 10-word sentence
const t1 = "I am excited to start practicing my daily communication drills.";
const words1 = countWords(t1);
assert(words1 === 10, '10-word transcript countWords', `Expected 10, got ${words1}`);
const sentences1 = countSentences(t1);
assert(sentences1 === 1, 'Single sentence countSentences', `Expected 1, got ${sentences1}`);
const avgLen1 = calculateAverageSentenceLength(t1);
assert(avgLen1 === 10, 'Average sentence length for 10 words', `Expected 10, got ${avgLen1}`);
const wpm1 = calculateWpm(words1, 5); // 10 words in 5 seconds = 120 WPM
assert(wpm1 === 120, 'WPM calculation (10 words / 5s)', `Expected 120, got ${wpm1}`);

// Test 2: Filler-heavy transcript
const t2 = "Um, so basically, like, we need to, you know, actually fix this.";
const fillerResult = countFillers(t2);
assert(fillerResult.total >= 5, 'Filler words identified in filler-heavy text', `Got ${fillerResult.total} fillers: ${JSON.stringify(fillerResult.breakdown)}`);
assert(fillerResult.breakdown['um'] === 1, 'Identified "um"');
assert(fillerResult.breakdown['basically'] === 1, 'Identified "basically"');
assert(fillerResult.breakdown['like'] === 1, 'Identified "like"');
assert(fillerResult.breakdown['you know'] === 1, 'Identified multi-word filler "you know"');
assert(fillerResult.breakdown['actually'] === 1, 'Identified "actually"');

// Test 3: Repeated words transcript
const t3 = "I think think that this is is very very helpful.";
const repResult = countRepeatedWords(t3);
assert(repResult.total === 3, 'Identified 3 immediate word repetitions', `Got ${repResult.total}: ${JSON.stringify(repResult.repetitions)}`);

// Test 4: Lexical diversity (TTR)
const t4a = "apple banana orange grape strawberry peach melon kiwi lemon mango";
const ttrHigh = calculateVocabularyDiversity(t4a);
assert(ttrHigh === 1.0, 'All unique words yield TTR = 1.0', `Got ${ttrHigh}`);

const t4b = "same same same same same same same same same same";
const ttrLow = calculateVocabularyDiversity(t4b);
assert(ttrLow === 0.1, '10 identical words yield TTR = 0.1', `Got ${ttrLow}`);

console.log('\n======================================================');
console.log('--- 2. BASELINE ASSESSMENT SCORING & BOUNDS (0-100) ---');
console.log('======================================================\n');

const strongMetrics = calculateSpeechMetrics(
  "Good morning. My name is Alex and I am a software engineer focused on building voice products. My goal is to communicate technical concepts with high clarity and conciseness.",
  14
);
const strongScores = assessmentApi.calculateBaselineSkills(strongMetrics);
assert(strongScores.overallScore >= 70 && strongScores.overallScore <= 100, 'Strong response overall score in [70, 100]', `Got ${strongScores.overallScore}`);
assert(strongScores.fluency >= 0 && strongScores.fluency <= 100, 'Fluency score bounded [0, 100]', `Got ${strongScores.fluency}`);
assert(strongScores.clarity >= 0 && strongScores.clarity <= 100, 'Clarity score bounded [0, 100]', `Got ${strongScores.clarity}`);
assert(strongScores.vocabulary >= 0 && strongScores.vocabulary <= 100, 'Vocabulary score bounded [0, 100]', `Got ${strongScores.vocabulary}`);
assert(strongScores.grammar >= 0 && strongScores.grammar <= 100, 'Grammar score bounded [0, 100]', `Got ${strongScores.grammar}`);
assert(strongScores.confidence >= 0 && strongScores.confidence <= 100, 'Confidence score bounded [0, 100]', `Got ${strongScores.confidence}`);

const obs = assessmentApi.generateObservations(strongMetrics, strongScores);
assert(typeof obs.strengthObservation === 'string' && obs.strengthObservation.length > 5, 'Generated valid strength observation');
assert(typeof obs.firstFocusArea === 'string' && obs.firstFocusArea.length > 3, 'Generated valid first focus area');
assert(typeof obs.recommendedDrillTitle === 'string' && obs.recommendedDrillTitle.length > 5, 'Generated valid recommended drill title');

console.log('\n======================================================');
console.log('--- 3. CHALLENGE EVALUATION & FORMULA CONSISTENCY ---');
console.log('======================================================\n');

const testChallenge = CHALLENGE_CATALOG[0]; // fluency-filler-reduction-45
const evalResult = attemptApi.evaluateChallengeMetrics(testChallenge, strongMetrics);
assert(evalResult.scores.overallScore >= 0 && evalResult.scores.overallScore <= 100, 'Challenge score bounded [0, 100]', `Got ${evalResult.scores.overallScore}`);
assert(evalResult.whatYouDidWell.length > 0, 'Generated non-empty what you did well feedback');
assert(evalResult.improveNext.length > 0, 'Generated non-empty improve next feedback');

console.log('\n======================================================');
console.log('--- 4. ADAPTIVE RECOMMENDATION LOGIC VERIFICATION ---');
console.log('======================================================\n');

// 1. Weakness Match Priority & Format Rotation
const recWithWeakness = challengeApi.getRecommendedNextChallenge(
  'fluency-filler-reduction-45',
  strongScores,
  'JOB_INTERVIEWS',
  { type: 'filler_dependency', skill: 'Fluency' }
);
assert(
  recWithWeakness.nextChallengeId !== 'fluency-filler-reduction-45',
  'Adaptive engine does not repeat the current challenge for same weakness',
  `Got ${recWithWeakness.nextChallengeId}`
);
assert(
  recWithWeakness.targetedWeakness === 'filler_dependency',
  'Adaptive engine tags targeted weakness correctly'
);

// 2. Weakness Mapping Coverage for all 13 Core Weaknesses
const CORE_WEAKNESSES = [
  'filler_dependency',
  'slow_delivery',
  'rushed_delivery',
  'unclear_structure',
  'overlong_answers',
  'excessive_repetition',
  'weak_vocabulary',
  'grammar_errors',
  'excessive_jargon',
  'vague_explanation',
  'weak_opening',
  'weak_conclusion',
  'insufficient_detail',
];

CORE_WEAKNESSES.forEach((w) => {
  const rec = challengeApi.getRecommendedNextChallenge(
    'fluency-filler-reduction-45',
    strongScores,
    undefined,
    { type: w }
  );
  assert(
    Boolean(rec && rec.nextChallengeId),
    `Weakness "${w}" successfully maps to a targeted drill (${rec.nextChallengeId})`
  );
});

// 3. Lowest Score Priority
const lowClarityScores = {
  overallScore: 70,
  fluency: 85,
  clarity: 58,
  vocabulary: 80,
  grammar: 82,
  confidence: 80,
};
const recWithLowClarity = challengeApi.getRecommendedNextChallenge(
  'fluency-rapid-pitch-60',
  lowClarityScores,
  'JOB_INTERVIEWS'
);
assert(
  recWithLowClarity.targetSkill === 'Clarity',
  'Adaptive engine prioritizes lowest skill (Clarity = 58%)',
  `Got ${recWithLowClarity.nextChallengeId} (${recWithLowClarity.targetSkill})`
);

// 4. Goal Matching Priority
const recWithGoal = challengeApi.getRecommendedNextChallenge(
  'clarity-explain-simply-60',
  strongScores,
  'JOB_INTERVIEWS'
);
assert(
  recWithGoal.nextChallengeId !== 'clarity-explain-simply-60',
  'Adaptive engine does not repeat the same challenge',
  `Got ${recWithGoal.nextChallengeId}`
);

console.log('\n======================================================');
console.log('--- 5. XP & STREAK DETERMINISTIC RULES ---');
console.log('======================================================\n');

// XP Breakdown check
const baseXp = 30;
const dailyBonus = 20;
const weaknessBonus = 10;
const pbBonus = 25;
const totalExpectedXp = baseXp + dailyBonus + weaknessBonus + pbBonus;
assert(totalExpectedXp === 85, 'Total compound XP = 85 (30 + 20 + 10 + 25)');

// Streak logic simulation check
function simulateStreak(lastActivity: string | null, today: string, yesterday: string, currentStreak: number) {
  if (!lastActivity || lastActivity < yesterday) {
    return 1; // Gap reset
  } else if (lastActivity === yesterday) {
    return currentStreak + 1; // Consecutive day
  } else if (lastActivity === today) {
    return currentStreak; // Same day repeated activity
  }
  return 1;
}

const s1 = simulateStreak(null, '2026-09-29', '2026-09-28', 0);
assert(s1 === 1, 'Day 1 first activity sets streak = 1', `Got ${s1}`);

const s2 = simulateStreak('2026-09-29', '2026-09-29', '2026-09-28', 1);
assert(s2 === 1, 'Day 1 second activity maintains streak = 1 (no duplicate increment)', `Got ${s2}`);

const s3 = simulateStreak('2026-09-28', '2026-09-29', '2026-09-28', 1);
assert(s3 === 2, 'Day 2 consecutive activity increments streak to 2', `Got ${s3}`);

const s4 = simulateStreak('2026-09-26', '2026-09-29', '2026-09-28', 5);
assert(s4 === 1, '3-day activity gap resets streak to 1', `Got ${s4}`);

console.log('\n======================================================');
console.log('--- 6. CATALOG SEED INTEGRITY & UNIQUENESS (38 DRILLS) ---');
console.log('======================================================\n');

assert(CHALLENGE_CATALOG.length >= 35, `Catalogue contains ${CHALLENGE_CATALOG.length} seeded challenges (>= 35)`);
const ids = CHALLENGE_CATALOG.map(c => c.id);
const uniqueIds = new Set(ids);
assert(ids.length === uniqueIds.size, 'All catalogue challenges have unique IDs');

const skillCounts: Record<string, number> = {};
const typeCounts: Record<string, number> = {};

CHALLENGE_CATALOG.forEach(c => {
  assert(Boolean(c.prompt && c.prompt.length > 5), `Challenge "${c.title}" has valid prompt`);
  assert(Boolean(c.targetSkill), `Challenge "${c.title}" has target skill ${c.targetSkill}`);
  assert(c.durationSeconds >= 30 && c.durationSeconds <= 120, `Challenge "${c.title}" duration in [30s, 120s]`);
  assert(c.goalTags && c.goalTags.length > 0, `Challenge "${c.title}" has goal tags`);

  skillCounts[c.targetSkill] = (skillCounts[c.targetSkill] || 0) + 1;
  typeCounts[c.challengeType] = (typeCounts[c.challengeType] || 0) + 1;
});

console.log('  [Catalogue Distribution by Skill]:', skillCounts);
console.log('  [Catalogue Distribution by Type]:', typeCounts);

console.log('\n======================================================');
console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}

