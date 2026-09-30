/**
 * Deterministic Training Policy Layer for Verblyn AI
 * 
 * CORE PRINCIPLE:
 * VERBLYN decides WHAT the user should practice (Context, Category, Target Skill, Weakness, Difficulty, Objective).
 * GEMINI decides HOW to naturally phrase the exercise.
 * 
 * CONTEXT-AWARE MAPPING:
 * GOAL -> CONTEXT -> TARGET ROLE -> WEAKNESS -> CATEGORY -> TRAINING OBJECTIVE
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
   * Resolves practice context from explicit goal or defaults to interview.
   */
  resolvePracticeContext(goal?: string): PracticeContext {
    if (!goal) return 'interview';
    return CONTEXT_MAP[goal] || 'everyday';
  },

  /**
   * Context-aware category selection:
   * Maps (Context, Weakness, TargetRole) to targeted category pools,
   * rotating away from recently completed categories to ensure variety.
   */
  selectCategory(
    context: PracticeContext,
    targetWeakness?: string,
    recentCategories: string[] = []
  ): QuestionCategory {
    let pool: QuestionCategory[];

    switch (context) {
      case 'interview':
        if (targetWeakness === 'unclear_structure' || targetWeakness === 'overlong_answers') {
          pool = ['project_deep_dive', 'behavioral', 'situational', 'technical_explanation'];
        } else if (targetWeakness === 'weak_opening' || targetWeakness === 'weak_conclusion') {
          pool = ['hr', 'resume', 'role_specific'];
        } else if (targetWeakness === 'insufficient_detail' || targetWeakness === 'vague_explanation') {
          pool = ['project_deep_dive', 'technical_explanation', 'follow_up'];
        } else if (targetWeakness === 'filler_dependency' || targetWeakness === 'slow_delivery' || targetWeakness === 'rushed_delivery') {
          pool = ['behavioral', 'role_specific', 'situational'];
        } else {
          pool = INTERVIEW_CATEGORIES;
        }
        break;

      case 'workplace':
        if (targetWeakness === 'unclear_structure' || targetWeakness === 'overlong_answers') {
          pool = ['status_update', 'explanation', 'meeting', 'presentation'];
        } else if (targetWeakness === 'weak_opening' || targetWeakness === 'weak_conclusion') {
          pool = ['presentation', 'client_communication', 'feedback'];
        } else if (targetWeakness === 'filler_dependency' || targetWeakness === 'rushed_delivery') {
          pool = ['status_update', 'client_communication', 'disagreement'];
        } else {
          pool = WORKPLACE_CATEGORIES;
        }
        break;

      case 'public_speaking':
        if (targetWeakness === 'unclear_structure' || targetWeakness === 'overlong_answers') {
          pool = ['persuasive', 'presentation', 'storytelling'];
        } else if (targetWeakness === 'weak_opening' || targetWeakness === 'weak_conclusion') {
          pool = ['impromptu', 'persuasive', 'storytelling'];
        } else if (targetWeakness === 'filler_dependency' || targetWeakness === 'rushed_delivery') {
          pool = ['persuasive', 'presentation', 'impromptu'];
        } else {
          pool = PUBLIC_SPEAKING_CATEGORIES;
        }
        break;

      case 'everyday':
      default:
        if (targetWeakness === 'unclear_structure' || targetWeakness === 'overlong_answers') {
          pool = ['storytelling', 'explanation', 'opinion'];
        } else if (targetWeakness === 'filler_dependency') {
          pool = ['conversation', 'experience', 'opinion'];
        } else {
          pool = EVERYDAY_CATEGORIES;
        }
        break;
    }

    // Anti-repetition: Filter out categories used in the last 2 attempts
    const recentSet = new Set(recentCategories.slice(0, 2).map((c) => c.toLowerCase()));
    const available = pool.filter((cat) => !recentSet.has(cat.toLowerCase()));

    return available.length > 0 ? available[0] : pool[0];
  },

  /**
   * Generates a deterministic training objective given the complete context.
   */
  synthesizeTrainingObjective(
    context: PracticeContext,
    targetRole: string,
    category: QuestionCategory,
    targetWeakness?: string
  ): { trainingObjective: string; whyThisQuestion: string } {
    const weaknessLabel = targetWeakness ? targetWeakness.replace(/_/g, ' ') : 'conversational delivery';

    let trainingObjective = `Practice concise, structured communication for ${targetRole}.`;
    let whyThisQuestion = `Designed to strengthen your professional speaking stamina and clarity.`;

    if (context === 'interview') {
      if (category === 'project_deep_dive') {
        trainingObjective = `Explain a technical or project achievement with structured problem-action-result (STAR) framing to overcome ${weaknessLabel}.`;
        whyThisQuestion = `Interviewers evaluate your ability to articulate technical contributions crisply without rambling. This drill targets ${weaknessLabel}.`;
      } else if (category === 'behavioral') {
        trainingObjective = `Demonstrate leadership or conflict resolution under pressure without hesitation or filler pauses.`;
        whyThisQuestion = `Behavioral questions test how you structure stories of past actions to demonstrate leadership for ${targetRole}.`;
      } else if (category === 'technical_explanation') {
        trainingObjective = `Break down a complex technical concept simply and accurately for an interviewer.`;
        whyThisQuestion = `Assesses clarity and precision when communicating domain concepts to non-technical stakeholders.`;
      } else if (category === 'hr' || category === 'resume') {
        trainingObjective = `Deliver a high-impact, crisp career summary or self-introduction without generic filler.`;
        whyThisQuestion = `First impressions set the tone for the entire interview. This drill ensures strong opening clarity.`;
      } else {
        trainingObjective = `Deliver a crisp, authoritative interview response tailored to ${targetRole}.`;
        whyThisQuestion = `Tailored for ${targetRole} interview preparation to build conversational reflexes.`;
      }
    } else if (context === 'workplace') {
      if (category === 'status_update') {
        trainingObjective = `Deliver an executive project update highlighting progress, blockers, and next steps in under 60 seconds.`;
        whyThisQuestion = `Execs and team leads look for concise, structured status briefings without unneeded details.`;
      } else if (category === 'client_communication') {
        trainingObjective = `Explain a recommendation or update with diplomatic authority and high clarity.`;
        whyThisQuestion = `Builds credibility and prevents miscommunication with external clients and partners.`;
      } else if (category === 'disagreement' || category === 'feedback') {
        trainingObjective = `Express a constructive dissenting opinion or feedback with professional composure.`;
        whyThisQuestion = `Crucial for cross-functional collaboration and leadership communication.`;
      } else {
        trainingObjective = `Communicate workplace reasoning clearly and persuasively for ${targetRole}.`;
        whyThisQuestion = `Strengthens everyday workplace alignment and meeting participation.`;
      }
    } else if (context === 'public_speaking') {
      if (category === 'persuasive') {
        trainingObjective = `Hook listener attention and deliver a compelling persuasive argument with steady pacing.`;
        whyThisQuestion = `Persuasive speaking demands steady cadence and crisp framing to convince an audience.`;
      } else if (category === 'impromptu') {
        trainingObjective = `Organize spontaneous thoughts rapidly using point-reason-example framing.`;
        whyThisQuestion = `Builds mental agility so you never freeze when called on spontaneously.`;
      } else {
        trainingObjective = `Deliver an engaging story with clear narrative tension and strong conclusion.`;
        whyThisQuestion = `Storytelling hooks human attention and makes communication memorable.`;
      }
    } else {
      trainingObjective = `Express a spontaneous, natural viewpoint with fluid conversational cadence.`;
      whyThisQuestion = `Deliberate practice to build everyday social fluency and confidence.`;
    }

    return { trainingObjective, whyThisQuestion };
  },

  /**
   * Evaluates user personalization state and produces an authoritative TrainingPlan.
   */
  generateTrainingPlan(state: UserPersonalizationState): TrainingPlan {
    // 1. Resolve Practice Context
    const practiceContext = this.resolvePracticeContext(state.primaryGoal);

    // 2. Identify Target Role & Domain (fallback cleanly if unspecified)
    const targetRole =
      state.targetRole ||
      (state.profession === 'student' ? 'Campus Placement Candidate' : state.profession || 'Working Professional');

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

    // 5. Select Question Category using Context-Aware Mapping + Anti-Repetition
    const recentCategories = state.recentAttempts
      .map((a) => a.category || '')
      .filter(Boolean);

    const questionCategory = this.selectCategory(
      practiceContext,
      targetWeakness,
      recentCategories
    );

    // 6. Synthesize Concrete Objective & Why
    const { trainingObjective } = this.synthesizeTrainingObjective(
      practiceContext,
      targetRole,
      questionCategory,
      targetWeakness
    );

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
