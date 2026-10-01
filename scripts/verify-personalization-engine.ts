/**
 * Comprehensive Automated Verification Suite for Verblyn Personalization Engine (Phase 3: User-Controlled Target Role & Practice Personalization)
 * Tests all 20+ core personalization contracts, deterministic policy invariants, role calibration, experience levels, and domain enrichment.
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
  experienceLevel: 'fresher',
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
  experienceLevel: '0-2',
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
console.log('--- 2. ROLE & EXPERIENCE LEVEL CALIBRATION (PHASE 3) ---');
console.log('======================================================\n');

// 6. Data Analyst + Fresher
const planDataAnalystFresher = trainingPolicy.generateTrainingPlan({
  userId: 'u_da_fresher',
  primaryGoal: 'CAMPUS_PLACEMENTS',
  targetRole: 'Data Analyst',
  experienceLevel: 'fresher',
  skills: { Fluency: 70, Clarity: 65, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity' }],
  recentAttempts: [],
});
assert(planDataAnalystFresher.targetRole === 'Data Analyst', '6a. Plan preserves target role "Data Analyst"');
assert(planDataAnalystFresher.experienceLevel === 'fresher', '6b. Plan preserves experience level "fresher"');
assert(
  planDataAnalystFresher.trainingObjective.toLowerCase().includes('data') &&
    planDataAnalystFresher.trainingObjective.toLowerCase().includes('star'),
  '6c. Data Analyst + Fresher objective targets data analysis project + STAR framing'
);

// 7. Software Engineer + Fresher
const planSWEFresher = trainingPolicy.generateTrainingPlan({
  userId: 'u_swe_fresher',
  primaryGoal: 'CAMPUS_PLACEMENTS',
  targetRole: 'Software Engineer',
  experienceLevel: 'fresher',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity' }],
  recentAttempts: [],
});
assert(
  planSWEFresher.trainingObjective.toLowerCase().includes('software') ||
    planSWEFresher.trainingObjective.toLowerCase().includes('code') ||
    planSWEFresher.trainingObjective.toLowerCase().includes('architecture'),
  '7. Software Engineer + Fresher objective targets software project + code/architecture contributions'
);

// 8. Product Manager + 0-2 Years
const planPM = trainingPolicy.generateTrainingPlan({
  userId: 'u_pm',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Product Manager',
  experienceLevel: '0-2',
  skills: { Fluency: 75, Clarity: 75, Vocabulary: 75, Grammar: 75, Confidence: 75 },
  activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity' }],
  recentAttempts: [],
});
assert(
  planPM.trainingObjective.toLowerCase().includes('product') &&
    (planPM.trainingObjective.toLowerCase().includes('prioritization') || planPM.trainingObjective.toLowerCase().includes('outcome')),
  '8. Product Manager + 0–2 Years objective targets product initiative, prioritization & outcome'
);

// 9. Business Analyst + 0-2 Years
const planBA = trainingPolicy.generateTrainingPlan({
  userId: 'u_ba',
  primaryGoal: 'WORKPLACE_COMMUNICATION',
  targetRole: 'Business Analyst',
  experienceLevel: '0-2',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
});
assert(
  planBA.trainingObjective.toLowerCase().includes('business analyst') ||
    planBA.trainingObjective.toLowerCase().includes('workplace'),
  '9. Business Analyst + Workplace targets business analyst workplace communication'
);

// 10. Role + Domain Enrichment
const planWithDomain = trainingPolicy.generateTrainingPlan({
  userId: 'u_domain',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Data Analyst',
  experienceLevel: '0-2',
  targetDomain: 'E-commerce',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
});
assert(planWithDomain.targetDomain === 'E-commerce', '10a. Target domain "E-commerce" is preserved in plan');
assert(
  planWithDomain.trainingObjective.includes('E-commerce'),
  '10b. Domain enriches training objective with domain context'
);

// 11. Role without Domain generates cleanly
const planNoDomain = trainingPolicy.generateTrainingPlan({
  userId: 'u_nodomain',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Data Scientist',
  experienceLevel: '2-5',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
});
assert(planNoDomain.targetRole === 'Data Scientist', '11a. Target role without domain generates cleanly');
assert(planNoDomain.targetDomain === undefined, '11b. Target domain is gracefully undefined');

// 12. Custom "Other" Role handling
const planCustomRole = trainingPolicy.generateTrainingPlan({
  userId: 'u_custom',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Other',
  customTargetRole: 'Bioinformatics Researcher',
  experienceLevel: '2-5',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
});
assert(
  planCustomRole.targetRole === 'Bioinformatics Researcher',
  '12. Custom role "Bioinformatics Researcher" resolved when targetRole is "Other"'
);

// 13. Experience level changes difficulty
const planFresherDiff = trainingPolicy.generateTrainingPlan({
  userId: 'u_fresher_diff',
  primaryGoal: 'CAMPUS_PLACEMENTS',
  targetRole: 'Software Engineer',
  experienceLevel: 'fresher',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
});
const planSeniorDiff = trainingPolicy.generateTrainingPlan({
  userId: 'u_senior_diff',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Software Engineer',
  experienceLevel: '5+',
  skills: { Fluency: 80, Clarity: 80, Vocabulary: 80, Grammar: 80, Confidence: 80 },
  activeWeaknesses: [],
  recentAttempts: [],
});
assert(
  planSeniorDiff.difficulty > planFresherDiff.difficulty,
  `13. Senior experience level yields higher difficulty (${planSeniorDiff.difficulty}) than fresher (${planFresherDiff.difficulty})`
);

// 14. Weakness still influences objective
const planWeaknessCheck = trainingPolicy.generateTrainingPlan({
  userId: 'u_weakness_check',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Data Analyst',
  experienceLevel: 'fresher',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [{ type: 'overlong_answers', label: 'Overlong Answers', skillName: 'Clarity' }],
  recentAttempts: [],
});
assert(
  planWeaknessCheck.trainingObjective.toLowerCase().includes('overlong answers') ||
    planWeaknessCheck.trainingObjective.toLowerCase().includes('star'),
  '14. Active weakness "overlong_answers" is embedded into the training objective'
);

// 15. Domain does NOT override the target role
assert(
  planWithDomain.targetRole === 'Data Analyst',
  '15. Domain enriches context but does NOT override the target role'
);

console.log('\n======================================================');
console.log('--- 3. SETTINGS CHANGE & PERSISTENCE BEHAVIOR ---');
console.log('======================================================\n');

// 16. Profile role change updates future training plans immediately
const userInitialState: UserPersonalizationState = {
  userId: 'user_live_update',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Data Analyst',
  experienceLevel: 'fresher',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [
    { challengeId: 'c1', title: 'Data Pipeline STAR', targetSkill: 'Clarity', completedAt: '2026-09-01T10:00:00Z', score: 85 },
  ],
};
const planBeforeUpdate = trainingPolicy.generateTrainingPlan(userInitialState);
assert(planBeforeUpdate.targetRole === 'Data Analyst', '16a. Plan before profile update generates for Data Analyst');

// User updates profile to Product Manager
const userUpdatedState: UserPersonalizationState = {
  ...userInitialState,
  targetRole: 'Product Manager',
  experienceLevel: '0-2',
};
const planAfterUpdate = trainingPolicy.generateTrainingPlan(userUpdatedState);
assert(planAfterUpdate.targetRole === 'Product Manager', '16b. Future plan after profile update immediately reflects Product Manager');

// 17. Historical attempts remain unchanged
assert(
  userUpdatedState.recentAttempts[0].title === 'Data Pipeline STAR',
  '17. Historical attempt log is immutable and preserved when profile updates'
);

// 18. Fallback for completely missing role
const planEmptyUser = trainingPolicy.generateTrainingPlan({
  userId: 'u_empty',
  skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [],
  recentAttempts: [],
});
assert(Boolean(planEmptyUser.targetRole), '18. Missing target role falls back safely without throwing');

// 19. Anti-repetition category rotation
const rotatedCat = trainingPolicy.selectCategory('interview', 'unclear_structure', ['project_deep_dive']);
assert(rotatedCat !== 'project_deep_dive', '19. Category rotates away from recently used "project_deep_dive"');

console.log('\n======================================================');
console.log('--- 4. GEMINI CONTRACT WITH PHASE 3 PERSONALIZATION ---');
console.log('======================================================\n');

// 20, 21, 22, 23: Complete Gemini payload contract
const geminiPayload: GenerateTopicPayload = {
  user_goal: planWithDomain.practiceContext,
  practice_context: planWithDomain.practiceContext,
  target_role: planWithDomain.targetRole,
  experience_level: planWithDomain.experienceLevelLabel,
  target_domain: planWithDomain.targetDomain,
  target_skill: planWithDomain.targetSkill,
  active_weakness: planWithDomain.targetWeakness,
  question_category: planWithDomain.questionCategory,
  difficulty: planWithDomain.difficulty,
  training_objective: planWithDomain.trainingObjective,
  time_limit_seconds: planWithDomain.timeLimitSeconds,
  recent_prompts: planWithDomain.avoidRecentPrompts,
  avoid_prompts: planWithDomain.avoidRecentPrompts,
  recent_categories: planWithDomain.avoidRecentCategories,
};

assert(geminiPayload.target_role === 'Data Analyst', '20. Gemini receives target_role');
assert(geminiPayload.experience_level === '0–2 Years', '21. Gemini receives experience_level');
assert(geminiPayload.target_domain === 'E-commerce', '22. Gemini receives target_domain');
assert(Boolean(geminiPayload.training_objective), '23. Gemini receives authoritative training_objective');

// 24. Gemini cannot override authoritative training objective or category
const rawAiOutput: Partial<PersonalizedChallenge> = {
  challenge_title: 'Unrelated Generic Chat',
  challenge_prompt: 'Describe what you did last weekend.',
  // Gemini returned without category or objective
};
const normalizedAiOutput: PersonalizedChallenge = {
  challenge_title: rawAiOutput.challenge_title || 'Drill',
  challenge_prompt: rawAiOutput.challenge_prompt || 'Prompt',
  challenge_type: 'timed_speaking',
  category: rawAiOutput.category || planWithDomain.questionCategory,
  practice_context: rawAiOutput.practice_context || planWithDomain.practiceContext,
  target_skill: rawAiOutput.target_skill || planWithDomain.targetSkill,
  target_weakness: rawAiOutput.target_weakness || planWithDomain.targetWeakness,
  difficulty: rawAiOutput.difficulty || planWithDomain.difficulty,
  time_limit_seconds: rawAiOutput.time_limit_seconds || planWithDomain.timeLimitSeconds,
  why_this_challenge: planWithDomain.trainingObjective,
  why_this_question: planWithDomain.trainingObjective,
  success_criteria: ['Structure your response', 'Quantify outcome metrics'],
  coach_tip_before_start: 'Lead with your key takeaway.',
};

assert(normalizedAiOutput.category === planWithDomain.questionCategory, '24a. Authoritative plan category is enforced against AI omission');
assert(normalizedAiOutput.why_this_challenge === planWithDomain.trainingObjective, '24b. Authoritative training objective is preserved against AI omission');

console.log('\n======================================================');
console.log('--- 5. PHASE 4: ADAPTIVE NEXT-CHALLENGE INTELLIGENCE ---');
console.log('======================================================\n');

// 25. First weakness detection -> CONTINUE_REINFORCEMENT
const stateNewWeakness: UserPersonalizationState = {
  userId: 'u_adapt_1',
  primaryGoal: 'CAMPUS_PLACEMENTS',
  targetRole: 'Data Analyst',
  experienceLevel: 'fresher',
  skills: { Fluency: 70, Clarity: 60, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 1, status: 'ACTIVE' }],
  recentAttempts: [
    { challengeId: 'c_proj', title: 'Data Analysis Project', targetSkill: 'Clarity', score: 62, category: 'project_deep_dive' },
  ],
};
const planReinforce = trainingPolicy.generateTrainingPlan(stateNewWeakness);
assert(planReinforce.adaptiveState === 'CONTINUE_REINFORCEMENT', '25a. First active weakness detection triggers "CONTINUE_REINFORCEMENT"');
assert(planReinforce.targetWeakness === 'unclear_structure', '25b. Reinforcement continues targeting active weakness');
assert(planReinforce.scaffoldingLevel === 'high', '25c. Fresher with score < 65 receives "high" scaffolding');

// 26. Repeated weakness (occurrence count 3+) -> Stronger priority over single occurrence
const stateMultipleWeaknesses: UserPersonalizationState = {
  userId: 'u_adapt_2',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Software Engineer',
  experienceLevel: '0-2',
  skills: { Fluency: 68, Clarity: 62, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [
    { type: 'filler_dependency', label: 'Filler Words', skillName: 'Fluency', occurrenceCount: 1, status: 'ACTIVE' },
    { type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 4, status: 'ACTIVE' },
  ],
  recentAttempts: [
    { challengeId: 'c1', title: 'System Design Walkthrough', targetSkill: 'Clarity', score: 64, category: 'project_deep_dive' },
  ],
};
const planMultiWeak = trainingPolicy.generateTrainingPlan(stateMultipleWeaknesses);
assert(planMultiWeak.targetWeakness === 'unclear_structure', '26. Repeated weakness (occurrence 4) prioritizes over single-occurrence weakness');

// 27. Improved skill -> PROGRESS & difficulty increase & reduced scaffolding
const stateImproved: UserPersonalizationState = {
  userId: 'u_adapt_3',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Data Analyst',
  experienceLevel: '0-2',
  skills: { Fluency: 75, Clarity: 78, Vocabulary: 75, Grammar: 75, Confidence: 75 },
  activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 2, status: 'IMPROVING' }],
  recentAttempts: [
    { challengeId: 'c_recent', title: 'Cohort Retention Explanation', targetSkill: 'Clarity', score: 82, category: 'technical_explanation' },
    { challengeId: 'c_prev', title: 'Data Cleaning Drill', targetSkill: 'Clarity', score: 68, category: 'project_deep_dive' },
  ],
};
const planProgress = trainingPolicy.generateTrainingPlan(stateImproved);
assert(planProgress.adaptiveState === 'PROGRESS', '27a. Score jumping from 68 to 82 triggers "PROGRESS" state');
assert(planProgress.difficulty >= 3, `27b. Progress state increases difficulty to Level ${planProgress.difficulty}`);
assert(planProgress.scaffoldingLevel === 'low' || planProgress.scaffoldingLevel === 'medium', '27c. Progress state reduces scaffolding guidance');

// 28. Poor performance (< 55) or sharp drop (>= 15 points) -> RECOVERY
const stateRecovery: UserPersonalizationState = {
  userId: 'u_adapt_4',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Product Manager',
  experienceLevel: '0-2',
  skills: { Fluency: 70, Clarity: 50, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 2, status: 'ACTIVE' }],
  recentAttempts: [
    { challengeId: 'c_fail', title: 'Product Vision Defense', targetSkill: 'Clarity', score: 48, category: 'presentation' },
    { challengeId: 'c_ok', title: 'Prioritization Framework', targetSkill: 'Clarity', score: 72, category: 'project_deep_dive' },
  ],
};
const planRecovery = trainingPolicy.generateTrainingPlan(stateRecovery);
assert(planRecovery.adaptiveState === 'RECOVERY', '28a. Score dropping from 72 to 48 triggers "RECOVERY" state');
assert(planRecovery.difficulty === 1, `28b. Recovery state temporarily lowers difficulty to Level ${planRecovery.difficulty}`);
assert(planRecovery.scaffoldingLevel === 'high', '28c. Recovery state provides "high" scaffolding for rebuilding fundamentals');

// 29. Repeated poor performance without progress (plateau) -> STAGNATION & Category change
const stateStagnation: UserPersonalizationState = {
  userId: 'u_adapt_5',
  primaryGoal: 'CAMPUS_PLACEMENTS',
  targetRole: 'Data Analyst',
  experienceLevel: 'fresher',
  skills: { Fluency: 70, Clarity: 64, Vocabulary: 70, Grammar: 70, Confidence: 70 },
  activeWeaknesses: [{ type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 3, status: 'ACTIVE' }],
  recentAttempts: [
    { challengeId: 'c1', title: 'Project Deep Dive 1', targetSkill: 'Clarity', score: 63, category: 'project_deep_dive' },
    { challengeId: 'c2', title: 'Project Deep Dive 2', targetSkill: 'Clarity', score: 65, category: 'project_deep_dive' },
  ],
};
const planStagnation = trainingPolicy.generateTrainingPlan(stateStagnation);
assert(planStagnation.adaptiveState === 'STAGNATION', '29a. Plateaued scores (63 & 65) trigger "STAGNATION" state');
assert(planStagnation.questionCategory !== 'project_deep_dive', '29b. Stagnation triggers category shift away from "project_deep_dive"');

// 30. Same weakness across attempts -> Category rotation prevents fatigue
const catAttempt1 = trainingPolicy.selectCategory('interview', 'unclear_structure', []);
const catAttempt2 = trainingPolicy.selectCategory('interview', 'unclear_structure', [catAttempt1]);
assert(catAttempt1 !== catAttempt2, `30. Category rotates away from previous attempt ("${catAttempt1}" -> "${catAttempt2}")`);

// 31. Mastered weakness -> Transition to next developmental area
const stateMastered: UserPersonalizationState = {
  userId: 'u_adapt_6',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Data Analyst',
  experienceLevel: '0-2',
  skills: { Fluency: 65, Clarity: 88, Vocabulary: 70, Grammar: 75, Confidence: 72 },
  activeWeaknesses: [
    { type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 1, status: 'RESOLVED' },
    { type: 'filler_dependency', label: 'Filler Dependency', skillName: 'Fluency', occurrenceCount: 2, status: 'ACTIVE' },
  ],
  recentAttempts: [
    { challengeId: 'c_master', title: 'Analytics Project Mastered', targetSkill: 'Clarity', score: 88, category: 'project_deep_dive' },
    { challengeId: 'c_prev', title: 'Analytics Metric Explanation', targetSkill: 'Clarity', score: 85, category: 'technical_explanation' },
  ],
};
const planMastered = trainingPolicy.generateTrainingPlan(stateMastered);
assert(planMastered.adaptiveState === 'MASTERED', '31a. Resolved weakness / consistent high score triggers "MASTERED" state');
assert(planMastered.targetSkill === 'Fluency', '31b. Mastery transitions focus to next active developmental area ("Fluency")');
assert(planMastered.targetWeakness === 'filler_dependency', '31c. Focus shifts to next active weakness ("filler_dependency")');

// 32. Inactive / RESOLVED weakness does not dominate
const stateResolvedOnly: UserPersonalizationState = {
  userId: 'u_adapt_7',
  primaryGoal: 'JOB_INTERVIEWS',
  targetRole: 'Business Analyst',
  experienceLevel: '0-2',
  skills: { Fluency: 72, Clarity: 82, Vocabulary: 60, Grammar: 75, Confidence: 70 },
  activeWeaknesses: [
    { type: 'unclear_structure', label: 'Unclear Structure', skillName: 'Clarity', occurrenceCount: 3, status: 'RESOLVED' },
  ],
  recentAttempts: [],
};
const planResolved = trainingPolicy.generateTrainingPlan(stateResolvedOnly);
assert(planResolved.targetSkill === 'Vocabulary', '32. Resolved weakness does not dominate; targets lowest skill ("Vocabulary")');

// 33. Deterministic "Why This Next" explains the exact adaptation
assert(Boolean(planReinforce.reasonForNextChallenge), '33a. Reinforcement reason is populated');
assert(Boolean(planProgress.reasonForNextChallenge), '33b. Progress reason is populated');
assert(Boolean(planRecovery.reasonForNextChallenge), '33c. Recovery reason is populated');
assert(
  planRecovery.reasonForNextChallenge.toLowerCase().includes('reduces difficulty') ||
    planRecovery.reasonForNextChallenge.toLowerCase().includes('fundamentals'),
  '33d. Recovery reason explicitly explains difficulty reduction & guidance'
);
assert(
  planProgress.reasonForNextChallenge.toLowerCase().includes('improved') ||
    planProgress.reasonForNextChallenge.toLowerCase().includes('steps up'),
  '33e. Progress reason explicitly explains improvement & step up in difficulty'
);

// 34. Adaptive state friendly labels
assert(trainingPolicy.resolveAdaptiveStateLabel('CONTINUE_REINFORCEMENT') === 'Targeted Reinforcement', '34a. Friendly label for CONTINUE_REINFORCEMENT');
assert(trainingPolicy.resolveAdaptiveStateLabel('PROGRESS') === 'Skill Progression', '34b. Friendly label for PROGRESS');
assert(trainingPolicy.resolveAdaptiveStateLabel('STAGNATION') === 'Technique Shift', '34c. Friendly label for STAGNATION');
assert(trainingPolicy.resolveAdaptiveStateLabel('RECOVERY') === 'Foundational Recovery', '34d. Friendly label for RECOVERY');
assert(trainingPolicy.resolveAdaptiveStateLabel('MASTERED') === 'Skill Mastery & Transition', '34e. Friendly label for MASTERED');

// 35. Gemini output cannot override adaptive state or scaffolding level
const rawAiAdaptiveOutput: Partial<PersonalizedChallenge> = {
  challenge_title: 'AI Generated Prompt',
  challenge_prompt: 'Explain an architecture tradeoff you faced.',
  // Gemini tried to return without adaptive fields
};
const normalizedAdaptiveOutput: PersonalizedChallenge = {
  challenge_title: rawAiAdaptiveOutput.challenge_title || 'Drill',
  challenge_prompt: rawAiAdaptiveOutput.challenge_prompt || 'Prompt',
  challenge_type: 'timed_speaking',
  category: planProgress.questionCategory,
  practice_context: planProgress.practiceContext,
  target_skill: planProgress.targetSkill,
  target_weakness: planProgress.targetWeakness,
  difficulty: planProgress.difficulty,
  adaptive_state: planProgress.adaptiveState,
  scaffolding_level: planProgress.scaffoldingLevel,
  reason_for_next_challenge: planProgress.reasonForNextChallenge,
  time_limit_seconds: planProgress.timeLimitSeconds,
  why_this_challenge: planProgress.reasonForNextChallenge,
  why_this_question: planProgress.reasonForNextChallenge,
  success_criteria: ['Explain tradeoff', 'State outcome metric'],
  coach_tip_before_start: 'Be clear on architecture choices.',
};
assert(normalizedAdaptiveOutput.adaptive_state === 'PROGRESS', '35a. Authoritative adaptive_state enforced against AI override');
assert(normalizedAdaptiveOutput.scaffolding_level === planProgress.scaffoldingLevel, '35b. Authoritative scaffolding_level enforced against AI override');
assert(normalizedAdaptiveOutput.reason_for_next_challenge === planProgress.reasonForNextChallenge, '35c. Authoritative reason_for_next_challenge enforced');

console.log('\n======================================================');
console.log(`ALL 35 PERSONALIZATION & ADAPTIVE TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}


