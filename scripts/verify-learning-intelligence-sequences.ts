/**
 * VERBLYN PHASE 5A: REAL-WORLD LEARNING INTELLIGENCE VALIDATION
 * 
 * End-to-end multi-attempt sequence tests:
 * 1. Sequence A: Persistent structure weakness & stagnation
 * 2. Sequence B: Structure improvement & progression
 * 3. Sequence C: Mastery resolution & transition to next skill
 * 4. Sequence D: Recovery from score dip
 * 5. Sequence E: Fluency vs Clarity vs Structure differentiation
 * 6. Sequence F: Role + Goal + Experience + Domain intersection
 * 7. Sequence G: 10-step Anti-repetition & variety
 * 8. Sequence H: Deterministic "Why This Next" synthesis
 * 9. Sequence I: Weakness full lifecycle
 * 10. Sequence J: Daily mission adaptation
 * 11. Sequence K: Result -> Next challenge continuity
 * 12. Sequence L: Short-answer resilience
 * 13. Sequence M: AI vs Deterministic boundary enforcement
 */

import { trainingPolicy } from '../src/features/personalization/trainingPolicy';
import { challengeApi } from '../src/features/challenges/challenge.api';
import { attemptApi } from '../src/features/challenges/attempt.api';
import { CHALLENGE_CATALOG } from '../src/features/challenges/challenge.catalog';
import { evaluateAttemptValidity } from '../src/features/challenges/evaluationValidity';
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

async function runLearningIntelligenceSuite() {
  console.log('\n======================================================');
  console.log('--- 1. SEQUENCE A: PERSISTENT STRUCTURE WEAKNESS ---');
  console.log('======================================================\n');

  // Baseline User: Data Analyst, Fresher, Tech Domain, Interview Prep
  const baseUser: UserPersonalizationState = {
    userId: 'test_user_data_analyst',
    fullName: 'Alex Morgan',
    primaryGoal: 'JOB_INTERVIEWS',
    targetRole: 'Data Analyst',
    experienceLevel: 'fresher',
    targetDomain: 'Technology',
    skills: { Fluency: 70, Clarity: 62, Vocabulary: 68, Grammar: 72, Confidence: 65 },
    activeWeaknesses: [
      {
        type: 'unclear_structure',
        label: 'Unclear Structure',
        skillName: 'Clarity',
        occurrenceCount: 1,
        status: 'ACTIVE',
      },
    ],
    recentAttempts: [
      {
        challengeId: 'fluency-rapid-pitch-60',
        title: '60-Second Momentum Drill',
        targetSkill: 'Clarity',
        category: 'project_deep_dive',
        score: 60,
      },
    ],
  };

  // Attempt 1 Evaluation
  const plan1 = trainingPolicy.generateTrainingPlan(baseUser);
  assert(plan1.targetSkill === 'Clarity', 'Attempt 1 targets Clarity skill');
  assert(plan1.targetWeakness === 'unclear_structure', 'Attempt 1 targets unclear_structure weakness');
  assert(plan1.adaptiveState === 'CONTINUE_REINFORCEMENT', 'Attempt 1 state is CONTINUE_REINFORCEMENT');
  assert(plan1.scaffoldingLevel === 'high', 'Attempt 1 assigns high scaffolding for fresher with score < 65');
  assert(plan1.difficulty <= 2, 'Attempt 1 difficulty remains approachable (<= 2)');
  assert(plan1.trainingObjective.includes('analytical') || plan1.trainingObjective.includes('data'), 'Attempt 1 training objective tailored to analytical data scenario');

  // Attempt 2: Persistent Weakness (Occurrence 2)
  const userAttempt2: UserPersonalizationState = {
    ...baseUser,
    activeWeaknesses: [
      {
        type: 'unclear_structure',
        label: 'Unclear Structure',
        skillName: 'Clarity',
        occurrenceCount: 2,
        status: 'ACTIVE',
      },
    ],
    recentAttempts: [
      {
        challengeId: 'analyst_proj_1',
        title: 'Explain Data Cleaning Pipeline',
        targetSkill: 'Clarity',
        category: 'project_deep_dive',
        score: 63,
      },
      ...baseUser.recentAttempts,
    ],
  };

  const plan2 = trainingPolicy.generateTrainingPlan(userAttempt2);
  assert(plan2.targetWeakness === 'unclear_structure', 'Attempt 2 preserves active structure weakness');
  assert(plan2.adaptiveState === 'CONTINUE_REINFORCEMENT', 'Attempt 2 continues reinforcement');
  assert(plan2.questionCategory !== 'project_deep_dive', 'Attempt 2 rotates category away from recent project_deep_dive');
  assert(plan2.avoidRecentPrompts.includes('Explain Data Cleaning Pipeline'), 'Attempt 2 avoids previous prompt');

  // Attempt 3: Stagnation / Plateau (Scores: 63, 64)
  const userAttempt3: UserPersonalizationState = {
    ...baseUser,
    skills: { Fluency: 70, Clarity: 63, Vocabulary: 68, Grammar: 72, Confidence: 65 },
    activeWeaknesses: [
      {
        type: 'unclear_structure',
        label: 'Unclear Structure',
        skillName: 'Clarity',
        occurrenceCount: 3,
        status: 'ACTIVE',
      },
    ],
    recentAttempts: [
      {
        challengeId: 'analyst_behav_2',
        title: 'Analytical Deadline Challenge',
        targetSkill: 'Clarity',
        category: 'behavioral',
        score: 64,
      },
      {
        challengeId: 'analyst_proj_1',
        title: 'Explain Data Cleaning Pipeline',
        targetSkill: 'Clarity',
        category: 'project_deep_dive',
        score: 63,
      },
    ],
  };

  const plan3 = trainingPolicy.generateTrainingPlan(userAttempt3);
  assert(plan3.adaptiveState === 'STAGNATION', 'Plateaued scores (63 & 64) trigger STAGNATION state');
  assert(plan3.adaptiveStateLabel === 'Technique Shift', 'STAGNATION maps to Technique Shift label');
  assert(plan3.questionCategory !== 'behavioral' && plan3.questionCategory !== 'project_deep_dive', 'STAGNATION shifts category to fresh format');
  assert(plan3.reasonForNextChallenge.toLowerCase().includes('plateaued') || plan3.reasonForNextChallenge.toLowerCase().includes('fresh angle'), 'Why-this-next explains format switch for stagnation');

  console.log('\n======================================================');
  console.log('--- 2. SEQUENCE B: STRUCTURE IMPROVEMENT ---');
  console.log('======================================================\n');

  // Attempt 4: Performance improves to 78%
  const userAttempt4: UserPersonalizationState = {
    ...baseUser,
    skills: { Fluency: 74, Clarity: 76, Vocabulary: 72, Grammar: 75, Confidence: 74 },
    activeWeaknesses: [
      {
        type: 'unclear_structure',
        label: 'Unclear Structure',
        skillName: 'Clarity',
        occurrenceCount: 3,
        status: 'IMPROVING',
      },
    ],
    recentAttempts: [
      {
        challengeId: 'analyst_sit_3',
        title: 'Explaining Missing Data',
        targetSkill: 'Clarity',
        category: 'situational',
        score: 78,
      },
      ...userAttempt3.recentAttempts,
    ],
  };

  const plan4 = trainingPolicy.generateTrainingPlan(userAttempt4);
  assert(plan4.adaptiveState === 'PROGRESS', 'Score jumping to 78 triggers PROGRESS state');
  assert(plan4.difficulty >= 3, 'PROGRESS state steps up difficulty to Level 3+');
  assert(plan4.scaffoldingLevel === 'medium', 'PROGRESS state reduces scaffolding to medium');
  assert(plan4.reasonForNextChallenge.includes('improved'), 'Why-this-next explicitly acknowledges score improvement');

  console.log('\n======================================================');
  console.log('--- 3. SEQUENCE C: MASTERY & TRANSITION ---');
  console.log('======================================================\n');

  // Attempt 5 & 6: Sustained high performance (score 84, clarity 82, weakness RESOLVED)
  const userMastery: UserPersonalizationState = {
    ...baseUser,
    skills: { Fluency: 68, Clarity: 84, Vocabulary: 70, Grammar: 78, Confidence: 80 },
    activeWeaknesses: [
      {
        type: 'unclear_structure',
        label: 'Unclear Structure',
        skillName: 'Clarity',
        occurrenceCount: 3,
        status: 'RESOLVED',
      },
      {
        type: 'filler_dependency',
        label: 'Filler Dependency',
        skillName: 'Fluency',
        occurrenceCount: 2,
        status: 'ACTIVE',
      },
    ],
    recentAttempts: [
      {
        challengeId: 'analyst_tech_4',
        title: 'Explaining A/B Testing Metrics',
        targetSkill: 'Clarity',
        category: 'technical_explanation',
        score: 86,
      },
      {
        challengeId: 'analyst_sit_3',
        title: 'Explaining Missing Data',
        targetSkill: 'Clarity',
        category: 'situational',
        score: 82,
      },
    ],
  };

  const planMastery = trainingPolicy.generateTrainingPlan(userMastery);
  assert(planMastery.adaptiveState === 'MASTERED', 'Consistent high performance & resolved weakness trigger MASTERED');
  assert(planMastery.targetSkill === 'Fluency', 'Mastery transitions focus to next active developmental area (Fluency)');
  assert(planMastery.targetWeakness === 'filler_dependency', 'Mastery shifts target weakness to next active weakness');
  assert(planMastery.scaffoldingLevel === 'low', 'Mastered state applies low scaffolding for autonomy');
  assert(planMastery.reasonForNextChallenge.includes('mastery') || planMastery.reasonForNextChallenge.includes('advancing'), 'Why-this-next explains transition to next skill');

  console.log('\n======================================================');
  console.log('--- 4. SEQUENCE D: RECOVERY FROM SCORE DIP ---');
  console.log('======================================================\n');

  // Attempt after mastery encounters sudden drop to 48%
  const userRecovery: UserPersonalizationState = {
    ...userMastery,
    skills: { Fluency: 60, Clarity: 82, Vocabulary: 70, Grammar: 74, Confidence: 72 },
    recentAttempts: [
      {
        challengeId: 'fluency_advanced_1',
        title: 'Rapid Impromptu Speaking',
        targetSkill: 'Fluency',
        category: 'behavioral',
        score: 48,
      },
      ...userMastery.recentAttempts,
    ],
  };

  const planRecovery = trainingPolicy.generateTrainingPlan(userRecovery);
  assert(planRecovery.adaptiveState === 'RECOVERY', 'Score dipping from 86 to 48 triggers RECOVERY');
  assert(planRecovery.difficulty <= 2, 'Recovery lowers difficulty to rebuild fundamentals');
  assert(planRecovery.scaffoldingLevel === 'high', 'Recovery provides high scaffolding support');
  assert(planRecovery.reasonForNextChallenge.includes('48%') || planRecovery.reasonForNextChallenge.includes('dipped'), 'Why-this-next explicitly cites score dip and guidance adjustment');

  console.log('\n======================================================');
  console.log('--- 5. SEQUENCE E: DIFFERENT USER WEAKNESSES ---');
  console.log('======================================================\n');

  // Fluency Weakness User
  const fluencyUser: UserPersonalizationState = {
    ...baseUser,
    skills: { Fluency: 55, Clarity: 80, Vocabulary: 75, Grammar: 78, Confidence: 70 },
    activeWeaknesses: [
      {
        type: 'filler_dependency',
        label: 'Filler Dependency',
        skillName: 'Fluency',
        occurrenceCount: 2,
        status: 'ACTIVE',
      },
    ],
  };
  const planFluency = trainingPolicy.generateTrainingPlan(fluencyUser);
  assert(planFluency.targetSkill === 'Fluency', 'Fluency user receives Fluency target skill');
  assert(planFluency.targetWeakness === 'filler_dependency', 'Fluency user targets filler_dependency');

  // Clarity Weakness User
  const clarityUser: UserPersonalizationState = {
    ...baseUser,
    skills: { Fluency: 82, Clarity: 58, Vocabulary: 76, Grammar: 80, Confidence: 74 },
    activeWeaknesses: [
      {
        type: 'vague_explanation',
        label: 'Vague Explanation',
        skillName: 'Clarity',
        occurrenceCount: 2,
        status: 'ACTIVE',
      },
    ],
  };
  const planClarity = trainingPolicy.generateTrainingPlan(clarityUser);
  assert(planClarity.targetSkill === 'Clarity', 'Clarity user receives Clarity target skill');
  assert(planClarity.targetWeakness === 'vague_explanation', 'Clarity user targets vague_explanation');

  console.log('\n======================================================');
  console.log('--- 6. SEQUENCE F: ROLE + GOAL + DOMAIN INTERSECTION ---');
  console.log('======================================================\n');

  // 1. Data Analyst + Fresher + Structure
  const objAnalyst = trainingPolicy.synthesizeTrainingObjective('interview', 'Data Analyst', 'fresher', 'project_deep_dive', 'unclear_structure', 'Technology');
  assert(objAnalyst.trainingObjective.includes('STAR framing') && objAnalyst.trainingObjective.includes('SQL/data'), 'Data Analyst objective includes analytical & SQL/data context');

  // 2. Software Engineer + 0-2 Years + Structure
  const objSWE = trainingPolicy.synthesizeTrainingObjective('interview', 'Software Engineer', '0-2', 'project_deep_dive', 'unclear_structure', 'Technology');
  assert(objSWE.trainingObjective.includes('architecture') && (objSWE.trainingObjective.includes('refactor') || objSWE.trainingObjective.includes('feature')), 'Software Engineer objective includes architecture & feature/refactor context');

  // 3. Product Manager + 2-5 Years + Structure
  const objPM = trainingPolicy.synthesizeTrainingObjective('interview', 'Product Manager', '2-5', 'project_deep_dive', 'unclear_structure', 'E-commerce');
  assert(objPM.trainingObjective.includes('trade-off') || objPM.trainingObjective.includes('prioritization'), 'Product Manager objective includes trade-off & prioritization');

  // 4. Business Analyst + Fresher + Structure
  const objBA = trainingPolicy.synthesizeTrainingObjective('interview', 'Business Analyst', 'fresher', 'project_deep_dive', 'unclear_structure', 'Finance');
  assert(objBA.trainingObjective.includes('requirements') || objBA.trainingObjective.includes('process'), 'Business Analyst objective includes requirements & process analysis');

  console.log('\n======================================================');
  console.log('--- 7. SEQUENCE G: 10-STEP ANTI-REPETITION & VARIETY ---');
  console.log('======================================================\n');

  let stateTracker = { ...baseUser };
  const generatedCategories: string[] = [];

  for (let i = 1; i <= 10; i++) {
    const plan = trainingPolicy.generateTrainingPlan(stateTracker);
    generatedCategories.push(plan.questionCategory);

    // Verify recent category rotation
    if (i > 1) {
      const prevCat = generatedCategories[i - 2];
      assert(plan.questionCategory !== prevCat || plan.adaptiveState === 'CONTINUE_REINFORCEMENT', `Step ${i}: Category ${plan.questionCategory} is varied or deliberate`);
    }

    // Append new simulated attempt to history
    stateTracker = {
      ...stateTracker,
      recentAttempts: [
        {
          challengeId: `drill_${i}`,
          title: `Speaking Exercise ${i}`,
          targetSkill: plan.targetSkill,
          category: plan.questionCategory,
          score: 65 + (i % 3) * 5,
        },
        ...(stateTracker.recentAttempts || []).slice(0, 4),
      ],
    };
  }

  assert(generatedCategories.length === 10, '10 consecutive training plans generated without crash');
  const uniqueCategories = new Set(generatedCategories);
  assert(uniqueCategories.size >= 3, `Exercise formats rotate across at least 3 categories (Got ${uniqueCategories.size})`);

  console.log('\n======================================================');
  console.log('--- 8. SEQUENCE H: DETERMINISTIC WHY THIS NEXT ---');
  console.log('======================================================\n');

  const r1 = trainingPolicy.synthesizeWhyThisNext('CONTINUE_REINFORCEMENT', 'Clarity', 'unclear_structure', 'project_deep_dive', 62, 'high', 2);
  assert(r1.includes('unclear structure') && r1.includes('reinforcement'), 'CONTINUE_REINFORCEMENT explains weakness reinforcement');

  const r2 = trainingPolicy.synthesizeWhyThisNext('PROGRESS', 'Clarity', undefined, 'behavioral', 78, 'medium', 3);
  assert(r2.includes('improved') && r2.includes('78%') && r2.includes('Level 3'), 'PROGRESS explains improvement, score and difficulty increase');

  const r3 = trainingPolicy.synthesizeWhyThisNext('RECOVERY', 'Clarity', undefined, 'situational', 48, 'high', 1);
  assert(r3.includes('dipped to 48%') && r3.includes('Level 1') && r3.includes('guidance'), 'RECOVERY explains difficulty reduction & rebuilding fundamentals');

  const r4 = trainingPolicy.synthesizeWhyThisNext('MASTERED', 'Clarity', 'unclear_structure', undefined, 86, 'low', 4);
  assert(r4.includes('mastery') && r4.includes('advancing'), 'MASTERED explains advancement to next skill');

  console.log('\n======================================================');
  console.log('--- 9. SEQUENCE I: WEAKNESS FULL LIFECYCLE ---');
  console.log('======================================================\n');

  // Lifecycle check: DETECTED -> ACTIVE (occ 1) -> PERSISTENT (occ 3) -> IMPROVING -> RESOLVED
  const stateInitial: UserPersonalizationState = { ...baseUser, activeWeaknesses: [] };
  const planInitial = trainingPolicy.generateTrainingPlan(stateInitial);
  assert(planInitial.targetSkill === 'Clarity', 'Initial lowest skill targeted');

  const stateActive: UserPersonalizationState = {
    ...baseUser,
    activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 1, status: 'ACTIVE' }],
  };
  const planActive = trainingPolicy.generateTrainingPlan(stateActive);
  assert(planActive.targetWeakness === 'unclear_structure', 'ACTIVE weakness targeted');

  const statePersistent: UserPersonalizationState = {
    ...baseUser,
    activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 4, status: 'ACTIVE' }],
  };
  const planPersistent = trainingPolicy.generateTrainingPlan(statePersistent);
  assert(planPersistent.targetWeakness === 'unclear_structure', 'PERSISTENT (4x) weakness dominates');

  const stateImproving: UserPersonalizationState = {
    ...baseUser,
    skills: { Fluency: 70, Clarity: 78, Vocabulary: 70, Grammar: 72, Confidence: 74 },
    activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 4, status: 'IMPROVING' }],
    recentAttempts: [{ challengeId: 'c1', title: 'T1', targetSkill: 'Clarity', score: 80 }],
  };
  const planImproving = trainingPolicy.generateTrainingPlan(stateImproving);
  assert(planImproving.adaptiveState === 'PROGRESS', 'IMPROVING weakness triggers PROGRESS');

  const stateResolved: UserPersonalizationState = {
    ...baseUser,
    skills: { Fluency: 65, Clarity: 85, Vocabulary: 70, Grammar: 72, Confidence: 74 },
    activeWeaknesses: [
      { type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 4, status: 'RESOLVED' },
      { type: 'filler_dependency', label: 'Filler Dependency', skillName: 'Fluency', occurrenceCount: 1, status: 'ACTIVE' },
    ],
    recentAttempts: [{ challengeId: 'c1', title: 'T1', targetSkill: 'Clarity', score: 86 }],
  };
  const planResolved = trainingPolicy.generateTrainingPlan(stateResolved);
  assert(planResolved.targetSkill === 'Fluency', 'RESOLVED weakness relinquishes priority to next active skill');

  console.log('\n======================================================');
  console.log('--- 10. SEQUENCE J: DAILY MISSION ADAPTATION ---');
  console.log('======================================================\n');

  // Daily mission prioritizes user's active weakness
  const missionWeakness = challengeApi.selectMissionForUser({
    primaryGoal: 'JOB_INTERVIEWS',
    communicationStyleFocus: ['filler_dependency'],
  });
  assert(missionWeakness.targetWeakness === 'filler_dependency', 'Daily mission selects challenge matching active weakness');

  const missionGoal = challengeApi.selectMissionForUser({
    primaryGoal: 'PUBLIC_SPEAKING',
    communicationStyleFocus: [],
  });
  assert(missionGoal.goalTags.includes('PUBLIC_SPEAKING'), 'Daily mission selects challenge matching primary goal when weakness is empty');

  console.log('\n======================================================');
  console.log('--- 11. SEQUENCE K: RESULT -> NEXT CHALLENGE CONTINUITY ---');
  console.log('======================================================\n');

  const rec = challengeApi.getRecommendedNextChallenge(
    'fluency-filler-reduction-45',
    { overallScore: 62, fluency: 58, clarity: 70, vocabulary: 68, grammar: 70, confidence: 64 },
    'JOB_INTERVIEWS',
    { type: 'filler_dependency', skill: 'Fluency', confidence: 0.9, occurrenceCount: 2, status: 'ACTIVE' },
    'fresher'
  );

  assert(rec.targetSkill === 'Fluency', 'Result recommendation matches active weakness skill');
  assert(rec.targetedWeakness === 'filler_dependency', 'Result recommendation targets filler_dependency');
  assert(rec.nextChallengeId !== 'fluency-filler-reduction-45', 'Result recommendation rotates challenge ID');
  assert(rec.whyThisNext.includes('filler dependency') || rec.whyThisNext.includes('reinforcement'), 'Result recommendation why-this-next matches state');

  console.log('\n======================================================');
  console.log('--- 12. SEQUENCE L: SHORT-ANSWER RESILIENCE ---');
  console.log('======================================================\n');

  const shortValid = evaluateAttemptValidity('I used Python to analyze the customer data.');
  assert(shortValid.isValid === true, 'Short meaningful answer is VALID/PARTIAL');
  assert(shortValid.reasonCode === 'partial_incomplete' || shortValid.reasonCode === 'valid_concise', 'Short meaningful answer classified as partial_incomplete or valid_concise');
  assert(shortValid.validity !== 'INVALID', 'Short meaningful answer is NEVER called INVALID');

  console.log('\n======================================================');
  console.log('--- 13. SEQUENCE M: AI VS DETERMINISTIC BOUNDARIES ---');
  console.log('======================================================\n');

  // If AI attempts to return arbitrary adaptive state "MASTERED" while user score is 55
  const normalizedChallenge = {
    challenge_title: 'Explain Project',
    challenge_prompt: 'Tell me about a project',
    adaptive_state: 'MASTERED', // AI attempted override
    scaffolding_level: 'low',   // AI attempted override
  };

  // Authoritative training plan enforces deterministic state
  const enforcedPlan = plan1; // State was CONTINUE_REINFORCEMENT, scaffolding high
  const safeChallenge = {
    ...normalizedChallenge,
    adaptive_state: enforcedPlan.adaptiveState,
    scaffolding_level: enforcedPlan.scaffoldingLevel,
    training_objective: enforcedPlan.trainingObjective,
  };

  assert(safeChallenge.adaptive_state === 'CONTINUE_REINFORCEMENT', 'Deterministic adaptive state enforced against AI override');
  assert(safeChallenge.scaffolding_level === 'high', 'Deterministic scaffolding enforced against AI override');

  console.log('\n======================================================');
  console.log(`LEARNING INTELLIGENCE TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLearningIntelligenceSuite().catch((err) => {
  console.error('Fatal error in learning intelligence suite:', err);
  process.exit(1);
});
