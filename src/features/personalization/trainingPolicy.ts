/**
 * Deterministic Training Policy Layer for Verblyn AI (Phase 4: Adaptive Training Engine)
 * 
 * CORE PRINCIPLE:
 * VERBLYN decides WHAT the user should practice based on what just happened in their previous attempt.
 * GEMINI decides HOW to naturally phrase the exercise.
 * 
 * ADAPTIVE LOOP:
 * USER PROFILE / STATE -> ATTEMPT ANALYSIS -> ADAPTIVE DECISION (State, Difficulty, Scaffolding, Reason) -> AUTHORITATIVE PLAN -> GEMINI / NEXT CHALLENGE
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
  AdaptiveState,
  ScaffoldingLevel,
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
   * Resolves user-friendly label for an adaptive state.
   */
  resolveAdaptiveStateLabel(state: AdaptiveState): string {
    switch (state) {
      case 'CONTINUE_REINFORCEMENT':
        return 'Targeted Reinforcement';
      case 'PROGRESS':
        return 'Skill Progression';
      case 'STAGNATION':
        return 'Technique Shift';
      case 'RECOVERY':
        return 'Foundational Recovery';
      case 'MASTERED':
        return 'Skill Mastery & Transition';
      default:
        return 'Personalized Focus';
    }
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
   * Evaluates recent performance trend and active weakness persistence
   * to determine the deterministic Adaptive State.
   */
  determineAdaptiveState(
    state: UserPersonalizationState,
    targetSkill: TargetSkill,
    activeWeaknessObj?: { type: string; status?: 'ACTIVE' | 'IMPROVING' | 'RESOLVED'; occurrenceCount?: number }
  ): AdaptiveState {
    const recent = state.recentAttempts || [];
    const latestAttempt = recent[0];
    const previousAttempt = recent[1];

    const latestScore = latestAttempt?.score;
    const previousScore = previousAttempt?.score;
    const currentSkillScore = state.skills[targetSkill] || 70;

    // 1. RECOVERY: Significant score drop (> 15 points) or very low attempt score (< 55)
    if (latestScore !== undefined) {
      if (latestScore < 55) {
        return 'RECOVERY';
      }
      if (previousScore !== undefined && latestScore - previousScore <= -15) {
        return 'RECOVERY';
      }
    }

    // 2. MASTERED: Weakness explicitly RESOLVED, or recent attempt demonstrated mastery (score >= 82, skill >= 80, without active unresolved weakness)
    if (state.activeWeaknesses?.some((w) => w.status === 'RESOLVED')) {
      return 'MASTERED';
    }
    const evaluatedSkill = (latestAttempt?.targetSkill as TargetSkill) || targetSkill;
    const evaluatedSkillScore = state.skills[evaluatedSkill] || currentSkillScore;
    if (
      latestScore !== undefined &&
      latestScore >= 82 &&
      evaluatedSkillScore >= 80 &&
      (!activeWeaknessObj || activeWeaknessObj.status === 'RESOLVED')
    ) {
      return 'MASTERED';
    }

    // 3. PROGRESS: Notable score improvement (>= 75 score or steady upward progression)
    if (latestScore !== undefined && latestScore >= 75) {
      return 'PROGRESS';
    }
    if (
      latestScore !== undefined &&
      previousScore !== undefined &&
      latestScore - previousScore >= 8 &&
      latestScore >= 70
    ) {
      return 'PROGRESS';
    }

    // 4. STAGNATION: 2+ recent attempts on same skill with plateaued scores (< 70, delta < 5)
    if (recent.length >= 2) {
      const sameSkillAttempts = recent.filter(
        (a) => a.targetSkill?.toLowerCase() === targetSkill.toLowerCase() || !a.targetSkill
      );
      if (sameSkillAttempts.length >= 2) {
        const s1 = sameSkillAttempts[0]?.score || 65;
        const s2 = sameSkillAttempts[1]?.score || 65;
        if (s1 < 70 && s2 < 70 && Math.abs(s1 - s2) <= 5) {
          return 'STAGNATION';
        }
      }
    }

    // 5. CONTINUE_REINFORCEMENT: Active weakness remains or user is reinforcing the skill
    return 'CONTINUE_REINFORCEMENT';
  },

  /**
   * Determines the appropriate scaffolding level based on adaptive state,
   * difficulty, and experience level.
   */
  calculateScaffolding(
    adaptiveState: AdaptiveState,
    difficulty: number,
    experienceLevel: ExperienceLevel,
    latestScore?: number
  ): ScaffoldingLevel {
    if (adaptiveState === 'RECOVERY') {
      return 'high';
    }
    if (adaptiveState === 'MASTERED') {
      return 'low';
    }
    if (adaptiveState === 'PROGRESS') {
      return difficulty >= 4 || (latestScore !== undefined && latestScore >= 80) ? 'low' : 'medium';
    }
    if (adaptiveState === 'STAGNATION') {
      return 'medium';
    }

    // CONTINUE_REINFORCEMENT
    if (experienceLevel === 'fresher' || (latestScore !== undefined && latestScore < 65)) {
      return 'high';
    }
    return 'medium';
  },

  /**
   * Adjusts difficulty based on adaptive state while respecting bounds [1, 5].
   */
  adjustDifficulty(
    baseDifficulty: number,
    adaptiveState: AdaptiveState,
    experienceLevel: ExperienceLevel
  ): { difficulty: number; difficultyLabel: 'Beginner' | 'Intermediate' | 'Advanced' } {
    let diff = baseDifficulty;

    switch (adaptiveState) {
      case 'RECOVERY':
        diff = Math.max(1, baseDifficulty - 1);
        break;
      case 'PROGRESS':
        diff = Math.min(5, baseDifficulty + 1);
        break;
      case 'MASTERED':
        diff = experienceLevel === '5+' ? 4 : Math.min(5, Math.max(3, baseDifficulty + 1));
        break;
      case 'STAGNATION':
      case 'CONTINUE_REINFORCEMENT':
      default:
        diff = Math.max(1, Math.min(5, baseDifficulty));
        break;
    }

    let difficultyLabel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
    if (diff <= 1) {
      difficultyLabel = 'Beginner';
    } else if (diff >= 4) {
      difficultyLabel = 'Advanced';
    } else {
      difficultyLabel = 'Intermediate';
    }

    return { difficulty: diff, difficultyLabel };
  },

  /**
   * Deterministically synthesizes an explainable, coach-like reason for the next challenge.
   */
  synthesizeWhyThisNext(
    adaptiveState: AdaptiveState,
    targetSkill: TargetSkill,
    targetWeakness?: string,
    category?: QuestionCategory,
    latestScore?: number,
    scaffoldingLevel: ScaffoldingLevel = 'medium',
    difficulty = 2
  ): string {
    const weaknessLabel = targetWeakness ? targetWeakness.replace(/_/g, ' ') : targetSkill.toLowerCase();
    const categoryLabel = category ? category.replace(/_/g, ' ') : 'targeted drill';

    switch (adaptiveState) {
      case 'RECOVERY':
        return latestScore !== undefined
          ? `Your performance dipped to ${latestScore}% on the last attempt. This exercise temporarily reduces difficulty to Level ${difficulty} with step-by-step guidance to rebuild your core structure.`
          : `This exercise temporarily reduces difficulty to rebuild your fundamentals with high structure guidance.`;

      case 'PROGRESS':
        return `Your ${targetSkill.toLowerCase()} score improved${latestScore ? ` (${latestScore}%)` : ''}. This challenge steps up to Level ${difficulty} with ${scaffoldingLevel} guidance to test your autonomy.`;

      case 'STAGNATION':
        return `Your recent attempts on ${targetSkill.toLowerCase()} plateaued. We're switching to a ${categoryLabel} format to practice the same skill from a fresh angle while keeping difficulty steady.`;

      case 'MASTERED':
        return `You've demonstrated consistent mastery in ${weaknessLabel}${latestScore ? ` (${latestScore}%)` : ''}. We're advancing your focus to the next developmental skill with realistic, unstructured scenarios.`;

      case 'CONTINUE_REINFORCEMENT':
      default:
        return `Your last response showed progress, but ${weaknessLabel} still needs reinforcement. This ${categoryLabel} drill keeps the focus sharp while varying the interview scenario.`;
    }
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
   * Evaluates user personalization state and produces an authoritative, adaptive TrainingPlan.
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

    // 5. Weakness Priority & Persistence Rule:
    // Sort active weaknesses: ACTIVE > IMPROVING > RESOLVED, then by occurrenceCount (3+ highest priority), then severity.
    const sortedWeaknesses = [...(state.activeWeaknesses || [])].sort((a, b) => {
      const statusWeight = (s?: string) => (s === 'ACTIVE' ? 3 : s === 'IMPROVING' ? 2 : 1);
      const wA = statusWeight(a.status);
      const wB = statusWeight(b.status);
      if (wA !== wB) return wB - wA;

      const occA = a.occurrenceCount || 1;
      const occB = b.occurrenceCount || 1;
      if (occA !== occB) return occB - occA;

      const sevWeight = (s?: string) => (s === 'high' ? 3 : s === 'medium' ? 2 : 1);
      return sevWeight(b.severity) - sevWeight(a.severity);
    });

    const activeWeaknessObj = sortedWeaknesses[0];
    let targetWeakness: string | undefined = activeWeaknessObj?.type;
    let targetSkill: TargetSkill = 'Clarity';

    if (activeWeaknessObj && activeWeaknessObj.skillName) {
      targetSkill = activeWeaknessObj.skillName as TargetSkill;
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

    // 6. Deterministic Adaptive State Determination
    const adaptiveState = this.determineAdaptiveState(state, targetSkill, activeWeaknessObj);
    const adaptiveStateLabel = this.resolveAdaptiveStateLabel(adaptiveState);

    // If MASTERED, ensure focus transitions away from resolved/mastered weakness to next active area
    if (adaptiveState === 'MASTERED') {
      const resolvedWeakness = state.activeWeaknesses?.find((w) => w.status === 'RESOLVED');
      if (resolvedWeakness && targetWeakness === resolvedWeakness.type) {
        const nextActive = sortedWeaknesses.find((w) => w.status !== 'RESOLVED');
        if (nextActive && nextActive.skillName) {
          targetWeakness = nextActive.type;
          targetSkill = nextActive.skillName as TargetSkill;
        } else {
          // Target next lowest skill
          let lowestScore = 100;
          const skillsEntries = Object.entries(state.skills) as Array<[TargetSkill, number]>;
          for (const [skill, score] of skillsEntries) {
            if (skill !== targetSkill && score < lowestScore) {
              lowestScore = score;
              targetSkill = skill;
            }
          }
        }
      }
    }

    // 7. Base Difficulty Determination from Skill Ratings & Experience Level
    const currentSkillScore = state.skills[targetSkill] || 70;
    let baseDifficulty = 2;

    if (experienceLevel === 'fresher') {
      if (currentSkillScore >= 85) {
        baseDifficulty = 3;
      } else if (currentSkillScore <= 60) {
        baseDifficulty = 1;
      } else {
        baseDifficulty = 2;
      }
    } else if (experienceLevel === '5+') {
      if (currentSkillScore >= 75) {
        baseDifficulty = 4;
      } else {
        baseDifficulty = 3;
      }
    } else {
      if (currentSkillScore >= 85) {
        baseDifficulty = 4;
      } else if (currentSkillScore <= 55) {
        baseDifficulty = 1;
      } else if (currentSkillScore <= 70) {
        baseDifficulty = 2;
      } else {
        baseDifficulty = 3;
      }
    }

    // Apply Adaptive Difficulty Adjustment
    const { difficulty, difficultyLabel } = this.adjustDifficulty(baseDifficulty, adaptiveState, experienceLevel);

    // 8. Determine Scaffolding Level
    const latestAttemptScore = state.recentAttempts?.[0]?.score;
    const scaffoldingLevel = this.calculateScaffolding(
      adaptiveState,
      difficulty,
      experienceLevel,
      latestAttemptScore
    );

    // 9. Select Question Category using Context-Aware Mapping + Anti-Repetition
    const recentCategories = (state.recentAttempts || [])
      .map((a) => a.category || '')
      .filter(Boolean);

    const questionCategory = this.selectCategory(
      practiceContext,
      targetWeakness,
      recentCategories
    );

    // 10. Synthesize Concrete Objective & Why
    const { trainingObjective } = this.synthesizeTrainingObjective(
      practiceContext,
      targetRole,
      experienceLevel,
      questionCategory,
      targetWeakness,
      targetDomain
    );

    // 11. Synthesize Explainable "Why This Next?"
    const reasonForNextChallenge = this.synthesizeWhyThisNext(
      adaptiveState,
      targetSkill,
      targetWeakness,
      questionCategory,
      latestAttemptScore,
      scaffoldingLevel,
      difficulty
    );

    // 12. Time limit based on difficulty & category
    const timeLimitSeconds = questionCategory === 'status_update' ? 45 : difficulty >= 4 ? 90 : 60;

    // 13. Ring buffer of recent prompts to avoid
    const avoidRecentPrompts = (state.recentAttempts || [])
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
      adaptiveState,
      adaptiveStateLabel,
      scaffoldingLevel,
      reasonForNextChallenge,
      avoidRecentPrompts,
      avoidRecentCategories: recentCategories.slice(0, 3),
    };
  },
};


