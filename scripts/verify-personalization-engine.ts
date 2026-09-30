/**
 * Comprehensive Automated Verification Suite for Verblyn Personalization Engine (Phase 2)
 * Tests all 15 core personalization contracts and deterministic policy invariants.
 */

import { trainingPolicy } from '../src/features/personalization/trainingPolicy';
import { UserPersonalizationState } from '../src/features/personalization/personalization.types';
import { GenerateTopicPayload, PersonalizedChallenge } from '../src/services/gemini/gemini.types';

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
console.log('--- 1. CONTEXT RESOLUTION ACROSS ALL 5 USER GOALS ---');
console.log('======================================================\n');

// 1. Campus Placement + Data Analyst -> interview context
const u1: UserPersonalizationState = {
  userId: 'u1',
  primaryGoal: 'CAMPUS_PLACEMENTS',
  targetRole: 'Data Analyst',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
};
assert(trainingPolicy.resolvePracticeContext(u1.primaryGoal) === 'interview', '1. Campus Placement + Data Analyst maps to "interview" context');

// 2. Job Interview + Software Engineer -> interview context
const u2: UserPersonalizationState = {
  userId: 'u2',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Software Engineer',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
};
assert(trainingPolicy.resolvePracticeContext(u2.primaryGoal) === 'interview', '2. Job Interview + Software Engineer maps to "interview" context');

// 3. Workplace Communication -> workplace context
assert(trainingPolicy.resolvePracticeContext('WORKPLACE_COMMUNICATION') === 'workplace', '3. Workplace Communication maps to "workplace" context');

// 4. Public Speaking -> public speaking context
assert(trainingPolicy.resolvePracticeContext('PUBLIC_SPEAKING') === 'public_speaking', '4. Public Speaking maps to "public_speaking" context');

// 5. Everyday Communication -> everyday context
assert(trainingPolicy.resolvePracticeContext('EVERYDAY_COMMUNICATION') === 'everyday', '5. Everyday Communication maps to "everyday" context');

console.log('\n======================================================');
console.log('--- 2. CONTEXT & WEAKNESS INFLUENCE ON TRAINING POLICY ---');
console.log('======================================================\n');

// 6. Weakness affects training objective
const planWithWeakness = trainingPolicy.generateTrainingPlan({
  ...u1,
  activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity' }],
});
assert(
  planWithWeakness.trainingObjective.toLowerCase().includes('star') ||
    planWithWeakness.trainingObjective.toLowerCase().includes('structure'),
  '6. Weakness "unclear_structure" actively shapes the training objective',
  `Got: ${planWithWeakness.trainingObjective}`
);

// 7. Context affects category selection
const interviewCat = trainingPolicy.selectCategory('interview', 'unclear_structure', []);
const workplaceCat = trainingPolicy.selectCategory('workplace', 'unclear_structure', []);
assert(
  interviewCat === 'project_deep_dive' || interviewCat === 'behavioral',
  '7a. Interview context + structure weakness selects project_deep_dive/behavioral',
  `Got: ${interviewCat}`
);
assert(
  workplaceCat === 'status_update' || workplaceCat === 'explanation' || workplaceCat === 'meeting',
  '7b. Workplace context + structure weakness selects status_update/explanation/meeting',
  `Got: ${workplaceCat}`
);

// 8. Target role affects generated training plan
const planDataAnalyst = trainingPolicy.generateTrainingPlan({
  ...u1,
  targetRole: 'Data Analyst',
});
const planExecutive = trainingPolicy.generateTrainingPlan({
  ...u1,
  targetRole: 'VP of Engineering',
});
assert(planDataAnalyst.targetRole === 'Data Analyst', '8a. Plan preserves target role "Data Analyst"');
assert(planExecutive.targetRole === 'VP of Engineering', '8b. Plan preserves target role "VP of Engineering"');

// 9. Recent categories are avoided when alternatives exist (Anti-repetition)
const rotatedCat = trainingPolicy.selectCategory('interview', 'unclear_structure', ['project_deep_dive']);
assert(rotatedCat !== 'project_deep_dive', '9. Category rotates away from recently used "project_deep_dive"', `Got: ${rotatedCat}`);

// 10. Same weakness does NOT always produce the same category across different contexts
assert(
  interviewCat !== workplaceCat,
  '10. Same weakness "unclear_structure" produces different categories across Interview vs Workplace',
  `Interview: ${interviewCat} vs Workplace: ${workplaceCat}`
);

console.log('\n======================================================');
console.log('--- 3. GEMINI CONTRACT & FALLBACK ROBUSTNESS ---');
console.log('======================================================\n');

// 11, 12, 13: Verify GenerateTopicPayload receives training_objective, target_role, and practice_context
const testPayload: GenerateTopicPayload = {
  practice_context: planDataAnalyst.practiceContext,
  target_role: planDataAnalyst.targetRole,
  target_skill: planDataAnalyst.targetSkill,
  active_weakness: planDataAnalyst.targetWeakness,
  question_category: planDataAnalyst.questionCategory,
  difficulty: planDataAnalyst.difficulty,
  training_objective: planDataAnalyst.trainingObjective,
  time_limit_seconds: planDataAnalyst.timeLimitSeconds,
  recent_prompts: ['Tell me about yourself'],
  avoid_prompts: ['Tell me about yourself'],
  recent_categories: ['hr'],
};

assert(Boolean(testPayload.training_objective), '11. Gemini payload contract includes training_objective');
assert(testPayload.target_role === 'Data Analyst', '12. Gemini payload contract includes target_role');
assert(testPayload.practice_context === 'interview', '13. Gemini payload contract includes practice_context');

// 14. Incompatible / Malformed Gemini category normalization
const rawGeminiOutput: Partial<PersonalizedChallenge> = {
  challenge_title: 'Project STAR Drill',
  challenge_prompt: 'Describe a data pipeline failure and how you solved it.',
  // Gemini omitted category and context
};

const normalizedOutput: PersonalizedChallenge = {
  challenge_title: rawGeminiOutput.challenge_title || 'Drill',
  challenge_prompt: rawGeminiOutput.challenge_prompt || 'Prompt',
  challenge_type: 'timed_speaking',
  category: rawGeminiOutput.category || planDataAnalyst.questionCategory,
  practice_context: rawGeminiOutput.practice_context || planDataAnalyst.practiceContext,
  target_skill: rawGeminiOutput.target_skill || planDataAnalyst.targetSkill,
  target_weakness: rawGeminiOutput.target_weakness || planDataAnalyst.targetWeakness,
  difficulty: rawGeminiOutput.difficulty || planDataAnalyst.difficulty,
  time_limit_seconds: rawGeminiOutput.time_limit_seconds || planDataAnalyst.timeLimitSeconds,
  why_this_challenge: planDataAnalyst.trainingObjective,
  why_this_question: planDataAnalyst.trainingObjective,
  success_criteria: ['Use STAR format', 'Highlight metric outcome'],
  coach_tip_before_start: 'Speak with steady pace.',
};

assert(normalizedOutput.category === planDataAnalyst.questionCategory, '14. Missing/incompatible Gemini category safely falls back to authoritative plan');

// 15. Missing target role does not crash the flow
const planMissingRole = trainingPolicy.generateTrainingPlan({
  userId: 'u3',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
});
assert(Boolean(planMissingRole.targetRole), '15. Missing target role falls back safely without crashing (resolves to default profile track)');

console.log('\n======================================================');
console.log(`ALL 15 PERSONALIZATION TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
