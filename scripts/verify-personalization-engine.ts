/**
 * Automated Verification Suite for Verblyn Personalization Engine (Phase 1)
 */

import { trainingPolicy } from '../src/features/personalization/trainingPolicy';
import { UserPersonalizationState } from '../src/features/personalization/personalization.types';

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
console.log('--- 1. PRACTICE CONTEXT RESOLUTION ---');
console.log('======================================================\n');

assert(trainingPolicy.resolvePracticeContext('JOB_INTERVIEWS') === 'interview', 'JOB_INTERVIEWS maps to "interview"');
assert(trainingPolicy.resolvePracticeContext('CAMPUS_PLACEMENTS') === 'interview', 'CAMPUS_PLACEMENTS maps to "interview"');
assert(trainingPolicy.resolvePracticeContext('WORKPLACE_COMMUNICATION') === 'workplace', 'WORKPLACE_COMMUNICATION maps to "workplace"');
assert(trainingPolicy.resolvePracticeContext('GROUP_DISCUSSIONS') === 'workplace', 'GROUP_DISCUSSIONS maps to "workplace"');
assert(trainingPolicy.resolvePracticeContext('PUBLIC_SPEAKING') === 'public_speaking', 'PUBLIC_SPEAKING maps to "public_speaking"');
assert(trainingPolicy.resolvePracticeContext('EVERYDAY_COMMUNICATION') === 'everyday', 'EVERYDAY_COMMUNICATION maps to "everyday"');
assert(trainingPolicy.resolvePracticeContext(undefined) === 'interview', 'Undefined goal defaults safely to "interview"');

console.log('\n======================================================');
console.log('--- 2. CATEGORY SELECTION & ANTI-REPETITION ROTATION ---');
console.log('======================================================\n');

// Test: Structure weakness in Interview prefers project_deep_dive or behavioral
const cat1 = trainingPolicy.selectCategory('interview', 'unclear_structure', []);
assert(cat1 === 'project_deep_dive' || cat1 === 'behavioral', 'Structure weakness selects project_deep_dive or behavioral', `Got ${cat1}`);

// Test: Category rotation when project_deep_dive was recently used
const cat2 = trainingPolicy.selectCategory('interview', 'unclear_structure', ['project_deep_dive']);
assert(cat2 !== 'project_deep_dive', 'Rotates away from recently completed project_deep_dive', `Got ${cat2}`);

// Test: Workplace category rotation
const catWp1 = trainingPolicy.selectCategory('workplace', undefined, []);
assert(typeof catWp1 === 'string', `Workplace category selected: ${catWp1}`);
const catWp2 = trainingPolicy.selectCategory('workplace', undefined, [catWp1]);
assert(catWp2 !== catWp1, `Workplace rotates away from recent ${catWp1} to ${catWp2}`);

console.log('\n======================================================');
console.log('--- 3. DETERMINISTIC TRAINING POLICY SCENARIOS ---');
console.log('======================================================\n');

// Scenario 1: Fresher / Campus Placements + Structure Weakness (The Prompt's Key Test Case)
const fresherState: UserPersonalizationState = {
  userId: 'user-fresher-1',
  fullName: 'Alex Student',
  profession: 'student',
  institution: 'Engineering University',
  primaryGoal: 'CAMPUS_PLACEMENTS',
  skills: {
    Fluency: 75,
    Clarity: 55, // Low clarity
    Vocabulary: 70,
    Grammar: 72,
    Confidence: 68,
  },
  activeWeaknesses: [
    {
      type: 'unclear_structure',
      label: 'Unclear Structure',
      skillName: 'Clarity',
      severity: 'high',
      occurrenceCount: 3,
    },
  ],
  recentAttempts: [
    { challengeId: 'c1', title: 'Tell me about yourself', targetSkill: 'Clarity', category: 'hr' },
    { challengeId: 'c2', title: 'Explain your project', targetSkill: 'Clarity', category: 'project_deep_dive' },
  ],
};

const fresherPlan = trainingPolicy.generateTrainingPlan(fresherState);

assert(fresherPlan.practiceContext === 'interview', 'Fresher plan context is "interview"');
assert(fresherPlan.targetSkill === 'Clarity', 'Fresher plan target skill is "Clarity"');
assert(fresherPlan.targetWeakness === 'unclear_structure', 'Fresher plan target weakness is "unclear_structure"');
assert(
  fresherPlan.questionCategory === 'behavioral' || fresherPlan.questionCategory === 'situational',
  'Fresher plan rotates category to behavioral/situational (avoiding recent hr/project_deep_dive)',
  `Got ${fresherPlan.questionCategory}`
);
assert(
  fresherPlan.trainingObjective.toLowerCase().includes('star') ||
    fresherPlan.trainingObjective.toLowerCase().includes('structure') ||
    fresherPlan.trainingObjective.toLowerCase().includes('pressure'),
  'Training objective enforces structured delivery (never generic movie question)',
  `Objective: ${fresherPlan.trainingObjective}`
);
assert(fresherPlan.avoidRecentPrompts.includes('Tell me about yourself'), 'Avoid list contains "Tell me about yourself"');
assert(fresherPlan.avoidRecentPrompts.includes('Explain your project'), 'Avoid list contains "Explain your project"');

// Scenario 2: Working Professional + Filler Dependency
const proState: UserPersonalizationState = {
  userId: 'user-pro-1',
  fullName: 'Sarah Manager',
  profession: 'professional',
  institution: 'Tech Corp',
  primaryGoal: 'WORKPLACE_COMMUNICATION',
  skills: {
    Fluency: 58,
    Clarity: 80,
    Vocabulary: 85,
    Grammar: 80,
    Confidence: 75,
  },
  activeWeaknesses: [
    {
      type: 'filler_dependency',
      label: 'Filler Words',
      skillName: 'Fluency',
      severity: 'medium',
      occurrenceCount: 2,
    },
  ],
  recentAttempts: [],
};

const proPlan = trainingPolicy.generateTrainingPlan(proState);

assert(proPlan.practiceContext === 'workplace', 'Pro plan context is "workplace"');
assert(proPlan.targetSkill === 'Fluency', 'Pro plan target skill is "Fluency"');
assert(proPlan.targetWeakness === 'filler_dependency', 'Pro plan target weakness is "filler_dependency"');
assert(proPlan.difficulty >= 2, `Pro plan difficulty is appropriate: Level ${proPlan.difficulty}`);

console.log('\n======================================================');
console.log(`PERSONALIZATION POLICY VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
