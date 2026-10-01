/**
 * Deterministic Training Policy Layer for Verblyn AI (Phase 3: User-Controlled Personalization)
 * 
 * CORE PRINCIPLE:
 * VERBLYN decides WHAT the user should practice (Context, Category, Target Skill, Weakness, Difficulty, Objective).
 * GEMINI decides HOW to naturally phrase the exercise.
 * 
 * POLICY HIERARCHY:
 * GOAL -> PRACTICE CONTEXT -> TARGET ROLE -> EXPERIENCE LEVEL -> CURRENT WEAKNESS -> TARGET SKILL -> QUESTION CATEGORY -> TRAINING OBJECTIVE -> DIFFICULTY -> ANTI-REPETITION -> GEMINI
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
  ExperienceLevel,
  EXPERIENCE_LEVEL_OPTIONS,
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
   * Resolves a user-friendly label for experience level.
   */
  resolveExperienceLabel(level?: ExperienceLevel): string {
    const found = EXPERIENCE_LEVEL_OPTIONS.find((opt) => opt.id === level);
    return found ? found.label : '0–2 Years';
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
   * Generates a deterministic training objective given the complete context,
   * target role, experience level, category, and target weakness.
   */
  synthesizeTrainingObjective(
    context: PracticeContext,
    targetRole: string,
    experienceLevel: ExperienceLevel,
    category: QuestionCategory,
    targetWeakness?: string,
    targetDomain?: string
  ): { trainingObjective: string; whyThisQuestion: string } {
    const weaknessLabel = targetWeakness ? targetWeakness.replace(/_/g, ' ') : 'unclear structure';
    const isFresher = experienceLevel === 'fresher';
    const isSenior = experienceLevel === '5+';
    const roleLower = targetRole.toLowerCase();

    let trainingObjective = `Practice concise, structured communication for ${targetRole}.`;
    let whyThisQuestion = `Designed to strengthen your professional speaking stamina and clarity.`;

    if (context === 'interview') {
      if (roleLower.includes('data analyst') || roleLower.includes('analytics')) {
        if (category === 'project_deep_dive') {
          trainingObjective = isFresher
            ? `Explain a data analysis project or coursework using STAR framing: highlight the business question, your SQL/data approach, and key insights to overcome ${weaknessLabel}.`
            : `Walk through a key data analytics project or dashboard turnaround, detailing data methodology, stakeholder impact, and metric outcomes to overcome ${weaknessLabel}.`;
          whyThisQuestion = `Data analyst interviewers test your ability to connect raw data transformations to tangible business insights without getting lost in technical trivia.`;
        } else if (category === 'technical_explanation') {
          trainingObjective = `Explain an analytical metric or statistical concept (e.g. churn, retention, A/B test significance) clearly to a non-technical stakeholder.`;
          whyThisQuestion = `Assesses data storytelling and how clearly you can explain complex analytical findings to business partners.`;
        } else if (category === 'behavioral') {
          trainingObjective = isFresher
            ? `Describe how you solved an analytical challenge or handled missing data under project deadline pressure.`
            : `Explain a time you identified conflicting metrics or defended data insights to skeptical stakeholders.`;
          whyThisQuestion = `Evaluates analytical rigor, composure under scrutiny, and structured decision-making for ${targetRole}.`;
        } else {
          trainingObjective = `Deliver a structured, insight-driven response tailored to ${targetRole} interview preparation.`;
          whyThisQuestion = `Helps you articulate your value as a ${targetRole} with crisp, evidence-backed delivery.`;
        }
      } else if (roleLower.includes('software engineer') || roleLower.includes('developer')) {
        if (category === 'project_deep_dive') {
          trainingObjective = isFresher
            ? `Explain an academic or internship software project using STAR framing: outline the problem, your architecture/code contributions, and outcome to overcome ${weaknessLabel}.`
            : `Walk through a major feature, service, or refactor you led, emphasizing system architecture tradeoffs and reliability to overcome ${weaknessLabel}.`;
          whyThisQuestion = `Software engineering interviewers evaluate how clearly you articulate architectural decisions and technical ownership.`;
        } else if (category === 'technical_explanation') {
          trainingObjective = `Break down a core software engineering concept (e.g. caching, concurrency, indexing, or API design) crisply and accurately.`;
          whyThisQuestion = `Tests conceptual mastery and ability to communicate technical tradeoffs without filler words.`;
        } else if (category === 'behavioral') {
          trainingObjective = isFresher
            ? `Describe a time you debugged a tricky code issue or collaborated on a team project under pressure.`
            : `Describe a technical disagreement during code review or a production incident turnaround.`;
          whyThisQuestion = `Evaluates problem-solving composure and engineering collaboration under real-world conditions.`;
        } else {
          trainingObjective = `Deliver a structured, technical interview answer tailored to ${targetRole}.`;
          whyThisQuestion = `Tailored for ${targetRole} interview preparation to build conversational precision.`;
        }
      } else if (roleLower.includes('product manager') || roleLower.includes('product lead')) {
        if (category === 'project_deep_dive' || category === 'role_specific') {
          trainingObjective = `Walk through a product initiative from user problem definition, trade-off prioritization, to measured product outcome to target ${weaknessLabel}.`;
          whyThisQuestion = `Product management interviews demand crisp problem definition and clear prioritization logic.`;
        } else if (category === 'behavioral' || category === 'situational') {
          trainingObjective = `Explain how you handled competing cross-functional stakeholder requests or made a tough roadmap trade-off.`;
          whyThisQuestion = `Tests stakeholder diplomacy, product vision, and structured communication under pressure.`;
        } else {
          trainingObjective = `Articulate a structured product perspective with clear user empathy and business metrics for ${targetRole}.`;
          whyThisQuestion = `Strengthens product sense delivery and structured answer frameworks.`;
        }
      } else if (roleLower.includes('business analyst')) {
        if (category === 'project_deep_dive' || category === 'role_specific') {
          trainingObjective = `Explain a process optimization or requirements gathering initiative, detailing gap analysis and measurable business gains to fix ${weaknessLabel}.`;
          whyThisQuestion = `Tests your ability to bridge business requirements and technical execution with crisp clarity.`;
        } else {
          trainingObjective = `Communicate business requirements and process tradeoffs clearly for a ${targetRole} scenario.`;
          whyThisQuestion = `Builds confidence in leading requirements discussions and executive walkthroughs.`;
        }
      } else if (roleLower.includes('consultant')) {
        trainingObjective = `Deliver a structured, top-down recommendation (MECE principle) answering a client challenge crisply to target ${weaknessLabel}.`;
        whyThisQuestion = `Consulting interviews reward pyramid-principle structure and concise, impactful synthesis.`;
      } else {
        // Generic / Other custom role
        if (category === 'project_deep_dive') {
          trainingObjective = isFresher
            ? `Explain a project or achievement with structured problem-action-result (STAR) framing to overcome ${weaknessLabel}.`
            : `Walk through a high-impact initiative you delivered, detailing personal contributions and outcomes to overcome ${weaknessLabel}.`;
          whyThisQuestion = `Interviewers evaluate your ability to articulate accomplishments crisply without rambling. This drill targets ${weaknessLabel}.`;
        } else if (category === 'behavioral') {
          trainingObjective = isSenior
            ? `Demonstrate strategic organizational leadership and decision-making under high-stakes pressure.`
            : `Demonstrate teamwork, problem-solving, and adaptability under pressure without filler pauses.`;
          whyThisQuestion = `Behavioral questions test how you structure stories of past actions to demonstrate leadership for ${targetRole}.`;
        } else if (category === 'hr' || category === 'resume') {
          trainingObjective = `Deliver a high-impact, crisp career summary or self-introduction tailored to ${targetRole} without filler.`;
          whyThisQuestion = `First impressions set the tone for the entire interview. This drill ensures strong opening clarity.`;
        } else {
          trainingObjective = `Deliver a crisp, authoritative interview response tailored to ${targetRole}.`;
          whyThisQuestion = `Tailored for ${targetRole} interview preparation to build conversational reflexes.`;
        }
      }
    } else if (context === 'workplace') {
      if (category === 'status_update') {
        trainingObjective = isSenior
          ? `Deliver a high-level executive briefing summarizing strategic milestones, key risks, and resource decisions in under 60 seconds.`
          : `Deliver a crisp status update covering progress, blockers, and next steps for ${targetRole} in under 60 seconds.`;
        whyThisQuestion = `Team leads and executives look for concise, structured status briefings without unneeded details.`;
      } else if (category === 'client_communication') {
        trainingObjective = `Explain a recommendation or project update with diplomatic authority and high clarity as a ${targetRole}.`;
        whyThisQuestion = `Builds credibility and prevents miscommunication with clients and external partners.`;
      } else if (category === 'disagreement' || category === 'feedback') {
        trainingObjective = `Express a constructive dissenting viewpoint or peer feedback with professional composure.`;
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

    // Secondary signal: Domain enrichment
    if (targetDomain && targetDomain.toLowerCase() !== 'other') {
      trainingObjective += ` [Domain context: ${targetDomain}]`;
    }

    return { trainingObjective, whyThisQuestion };
  },

  /**
   * Evaluates user personalization state and produces an authoritative TrainingPlan.
   */
  generateTrainingPlan(state: UserPersonalizationState): TrainingPlan {
    // 1. Resolve Practice Context
    const practiceContext = this.resolvePracticeContext(state.primaryGoal);

    // 2. Identify Target Role (fallback cleanly if unspecified)
    let targetRole = state.targetRole;
    if (targetRole === 'Other' && state.customTargetRole?.trim()) {
      targetRole = state.customTargetRole.trim();
    }
    if (!targetRole) {
      targetRole =
        state.profession === 'student' ? 'Campus Placement Candidate' : state.profession || 'Working Professional';
    }

    // 3. Identify Experience Level
    const experienceLevel: ExperienceLevel =
      state.experienceLevel || (state.profession === 'student' ? 'fresher' : '0-2');
    const experienceLevelLabel = this.resolveExperienceLabel(experienceLevel);

    // 4. Identify Target Domain
    const targetDomain = state.targetDomain || undefined;

    // 5. Identify Primary Weakness & Target Skill
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

    // 6. Determine Difficulty from Skill Ratings & Experience Level (1 to 5)
    const currentSkillScore = state.skills[targetSkill] || 70;
    let difficulty = 2;
    let difficultyLabel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';

    if (experienceLevel === 'fresher') {
      if (currentSkillScore >= 85) {
        difficulty = 3;
        difficultyLabel = 'Intermediate';
      } else if (currentSkillScore <= 60) {
        difficulty = 1;
        difficultyLabel = 'Beginner';
      } else {
        difficulty = 2;
        difficultyLabel = 'Intermediate';
      }
    } else if (experienceLevel === '5+') {
      if (currentSkillScore >= 75) {
        difficulty = 4;
        difficultyLabel = 'Advanced';
      } else {
        difficulty = 3;
        difficultyLabel = 'Intermediate';
      }
    } else {
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
    }

    // 7. Select Question Category using Context-Aware Mapping + Anti-Repetition
    const recentCategories = state.recentAttempts
      .map((a) => a.category || '')
      .filter(Boolean);

    const questionCategory = this.selectCategory(
      practiceContext,
      targetWeakness,
      recentCategories
    );

    // 8. Synthesize Concrete Objective & Why
    const { trainingObjective } = this.synthesizeTrainingObjective(
      practiceContext,
      targetRole,
      experienceLevel,
      questionCategory,
      targetWeakness,
      targetDomain
    );

    // 9. Time limit based on difficulty & category
    const timeLimitSeconds = questionCategory === 'status_update' ? 45 : difficulty >= 4 ? 90 : 60;

    // 10. Ring buffer of recent prompts to avoid
    const avoidRecentPrompts = state.recentAttempts
      .slice(0, 5)
      .map((a) => a.title)
      .filter(Boolean);

    return {
      practiceContext,
      targetRole,
      experienceLevel,
      experienceLevelLabel,
      targetDomain,
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

