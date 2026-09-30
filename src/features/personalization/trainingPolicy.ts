/**
 * Deterministic Training Policy Layer for Verblyn AI
 * 
 * CORE PRINCIPLE:
 * VERBLYN decides WHAT the user should practice (Context, Category, Target Skill, Weakness, Difficulty, Objective).
 * GEMINI decides HOW to naturally phrase the exercise.
 */

import { TargetSkill } from '@/features/challenges/challenge.types';
import {
  PracticeContext,
  QuestionCategory,
  TrainingPlan,
  UserPersonalizationState,
  InterviewCategory,
  WorkplaceCategory,
  PublicSpeakingCategory,
  EverydayCategory,
} from './personalization.types';

const CONTEXT_MAP: Record<string, PracticeContext> = {
  JOB_INTERVIEWS: 'interview',
  CAMPUS_PLACEMENTS: 'interview',
  WORKPLACE_COMMUNICATION: 'workplace',
  GROUP_DISCUSSIONS: 'workplace',
  PUBLIC_SPEAKING: 'public_speaking',
  EVERYDAY_COMMUNICATION: 'everyday',
};

const INTERVIEW_CATEGORIES: InterviewCategory[] = [
  'project_deep_dive',
  'behavioral',
  'role_specific',
  'situational',
  'technical_explanation',
  'hr',
  'resume',
  'follow_up',
];

const WORKPLACE_CATEGORIES: WorkplaceCategory[] = [
  'status_update',
  'explanation',
  'client_communication',
  'presentation',
  'disagreement',
  'feedback',
  'meeting',
];

const PUBLIC_SPEAKING_CATEGORIES: PublicSpeakingCategory[] = [
  'persuasive',
  'storytelling',
  'impromptu',
  'explanation',
  'presentation',
];

const EVERYDAY_CATEGORIES: EverydayCategory[] = [
  'conversation',
  'opinion',
  'experience',
  'explanation',
  'storytelling',
];

export const trainingPolicy = {
  /**
   * Resolves practice context from explicit goal or defaults to everyday.
   */
  resolvePracticeContext(goal?: string): PracticeContext {
    if (!goal) return 'interview';
    return CONTEXT_MAP[goal] || 'everyday';
  },

  /**
   * Selects the next appropriate question category in the controlled taxonomy,
   * rotating away from recently completed categories.
   */
  selectCategory(
    context: PracticeContext,
    targetWeakness?: string,
    recentCategories: string[] = []
  ): QuestionCategory {
    let pool: QuestionCategory[];

    switch (context) {
      case 'interview':
        // If weakness is structure, prefer project deep dive or behavioral
        if (targetWeakness === 'unclear_structure' || targetWeakness === 'overlong_answers') {
          pool = ['project_deep_dive', 'behavioral', 'situational', 'technical_explanation'];
        } else if (targetWeakness === 'weak_opening' || targetWeakness === 'weak_conclusion') {
          pool = ['hr', 'resume', 'role_specific'];
        } else {
          pool = INTERVIEW_CATEGORIES;
        }
        break;

      case 'workplace':
        if (targetWeakness === 'unclear_structure' || targetWeakness === 'overlong_answers') {
          pool = ['status_update', 'presentation', 'meeting'];
        } else {
          pool = WORKPLACE_CATEGORIES;
        }
        break;

      case 'public_speaking':
        if (targetWeakness === 'filler_dependency' || targetWeakness === 'rushed_delivery') {
          pool = ['persuasive', 'presentation', 'storytelling'];
        } else {
          pool = PUBLIC_SPEAKING_CATEGORIES;
        }
        break;

      case 'everyday':
      default:
        pool = EVERYDAY_CATEGORIES;
        break;
    }

    // Filter out categories used in the last 2 attempts to ensure variety
    const recentSet = new Set(recentCategories.slice(0, 2).map((c) => c.toLowerCase()));
    const available = pool.filter((cat) => !recentSet.has(cat.toLowerCase()));

    return available.length > 0 ? available[0] : pool[0];
  },

  /**
   * Evaluates the user state and produces a deterministic training plan.
   */
  generateTrainingPlan(state: UserPersonalizationState): TrainingPlan {
    // 1. Resolve Practice Context
    const practiceContext = this.resolvePracticeContext(state.primaryGoal);

    // 2. Identify Target Role & Domain
    const targetRole =
      state.targetRole ||
      (state.profession === 'student' ? 'Fresher / Entry-Level Candidate' : state.profession || 'Working Professional');

    // 3. Identify Primary Weakness & Target Skill
    const activeWeakness = state.activeWeaknesses[0];
    const targetWeakness: string | undefined = activeWeakness?.type;
    let targetSkill: TargetSkill = 'Clarity';

    if (activeWeakness && activeWeakness.skillName) {
      targetSkill = activeWeakness.skillName as TargetSkill;
    } else {
      // Find lowest score among all 5 skills
      let lowestScore = 100;
      const skillsEntries = Object.entries(state.skills) as Array<[TargetSkill, number]>;
      for (const [skill, score] of skillsEntries) {
        if (score < lowestScore) {
          lowestScore = score;
          targetSkill = skill;
        }
      }
    }

    // 4. Determine Difficulty from Skill Ratings (1 to 5)
    const currentSkillScore = state.skills[targetSkill] || 70;
    let difficulty = 2;
    let difficultyLabel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';

    if (currentSkillScore >= 85) {
      difficulty = 4;
      difficultyLabel = 'Advanced';
    } else if (currentSkillScore <= 55) {
      difficulty = 1;
      difficultyLabel = 'Beginner';
    } else if (currentSkillScore <= 70) {
      difficulty = 2;
      difficultyLabel = 'Intermediate';
    } else {
      difficulty = 3;
      difficultyLabel = 'Intermediate';
    }

    // 5. Select Question Category from Controlled Taxonomy with anti-repetition rotation
    const recentCategories = state.recentAttempts
      .map((a) => a.category || '')
      .filter(Boolean);

    const questionCategory = this.selectCategory(
      practiceContext,
      targetWeakness,
      recentCategories
    );

    // 6. Formulate Deterministic Training Objective
    const weaknessLabel = targetWeakness ? targetWeakness.replace(/_/g, ' ') : 'conversational flow';
    let trainingObjective = `Practice concise, structured communication for ${targetRole}.`;

    if (practiceContext === 'interview') {
      if (questionCategory === 'project_deep_dive') {
        trainingObjective = `Explain a technical or project achievement with structured problem-action-result (STAR) framing to overcome ${weaknessLabel}.`;
      } else if (questionCategory === 'behavioral') {
        trainingObjective = `Demonstrate leadership or conflict resolution under pressure without rambling or filler pauses.`;
      } else if (questionCategory === 'technical_explanation') {
        trainingObjective = `Break down a complex technical concept simply and accurately for an interviewer.`;
      } else {
        trainingObjective = `Deliver a crisp, authoritative interview response tailored to ${targetRole}.`;
      }
    } else if (practiceContext === 'workplace') {
      if (questionCategory === 'status_update') {
        trainingObjective = `Deliver an executive project update highlighting progress, blockers, and next steps in under 60 seconds.`;
      } else {
        trainingObjective = `Communicate workplace reasoning clearly and persuasively.`;
      }
    } else if (practiceContext === 'public_speaking') {
      trainingObjective = `Hook listener attention and deliver a compelling persuasive argument with steady pacing.`;
    } else {
      trainingObjective = `Express a spontaneous, natural viewpoint with fluid conversational cadence.`;
    }

    // 7. Time limit based on difficulty & category
    const timeLimitSeconds = questionCategory === 'status_update' ? 45 : difficulty >= 4 ? 90 : 60;

    // 8. Ring buffer of recent prompts to avoid
    const avoidRecentPrompts = state.recentAttempts
      .slice(0, 5)
      .map((a) => a.title)
      .filter(Boolean);

    return {
      practiceContext,
      targetRole,
      targetSkill,
      targetWeakness,
      questionCategory,
      trainingObjective,
      difficulty,
      difficultyLabel,
      timeLimitSeconds,
      avoidRecentPrompts,
      avoidRecentCategories: recentCategories.slice(0, 3),
    };
  },
};
