-- ============================================================================
-- VERBLYN V1 BETA READINESS & CATALOG EXPANSION (PHASE 7)
-- Seeds 38 curated challenges and creates the beta feedback table.
-- ============================================================================

-- 1. BETA FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS public.beta_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES public.challenge_attempts(id) ON DELETE SET NULL,
    challenge_id TEXT REFERENCES public.challenges(id) ON DELETE SET NULL,
    rating TEXT NOT NULL CHECK (rating IN ('very_useful', 'useful', 'not_useful')),
    difficulty_perception TEXT CHECK (difficulty_perception IN ('too_easy', 'just_right', 'too_hard')),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON public.beta_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.beta_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- 2. SEED EXPANDED CHALLENGE LIBRARY (38 Challenges)
INSERT INTO public.challenges (
    id, title, short_description, why_it_matters, target_skill, challenge_type,
    difficulty_level, difficulty_label, duration_seconds, prompt, instructions,
    expected_behavior, xp_reward, goal_tags, target_weakness
) VALUES
-- Fluency & Pacing (7)
(
    'fluency-filler-reduction-45', '45-Second Filler Detox',
    'Speak for 45 seconds continuously while eliminating verbal fillers (um, uh, like).',
    'Replacing filler sounds with confident silence instantly enhances authority.',
    'Fluency', 'timed_speaking', 1, 'Beginner', 45,
    'Describe your favorite productivity habit and explain why it works for you.',
    '["Speak at a calm, controlled tempo.", "If you lose your train of thought, pause silently for 1 second instead of saying um or like.", "Keep going until the 45-second timer concludes."]'::jsonb,
    'Zero or minimal filler words with steady, deliberate cadence.', 30,
    ARRAY['EVERYDAY_COMMUNICATION', 'PUBLIC_SPEAKING', 'WORKPLACE_COMMUNICATION'], 'filler_dependency'
),
(
    'fluency-rapid-pitch-60', '60-Second Momentum Drill',
    'Deliver a continuous 60-second pitch without stalling or second-guessing.',
    'Builds flow state and trains you to think ahead while speaking.',
    'Fluency', 'rapid_response', 2, 'Intermediate', 60,
    'Tell me about your latest project or coursework in 60 seconds.',
    '["Start with a 1-sentence summary of what it is.", "Highlight 1 core challenge you solved.", "Finish with the real-world value or lesson learned."]'::jsonb,
    'Continuous speech flow maintaining 130-150 WPM.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'slow_delivery'
),
(
    'fluency-deliberate-pause-45', 'The Power of the Silent Pause',
    'Deliver an update using deliberate 1-second silent pauses between major ideas.',
    'Strategic pauses allow the listener to absorb key points and prevent rushed delivery.',
    'Fluency', 'timed_speaking', 1, 'Beginner', 45,
    'Explain two important reasons why continuous learning matters in modern careers.',
    '["State Point 1, then pause in complete silence for 1 full second.", "State Point 2, and again pause silently before your conclusion.", "Never fill the silence with vocal hesitation sounds."]'::jsonb,
    'Clean deliberate pauses without filler sounds.', 30,
    ARRAY['PUBLIC_SPEAKING', 'WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'filler_dependency'
),
(
    'fluency-breath-control-60', 'Controlled Cadence Sprint',
    'Maintain a steady, measured pace without rushing through complex thoughts.',
    'Rushed delivery signals nervousness; controlled cadence projects command and calm.',
    'Fluency', 'timed_speaking', 2, 'Intermediate', 60,
    'Walk me through how a team should handle an urgent deadline when requirements change.',
    '["Inhale calmly before starting each major sentence.", "Maintain an even tempo between 125 and 145 WPM.", "Emphasize key operative words with deliberate vocal weight."]'::jsonb,
    'Even cadence without rapid rushed bursts.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'GROUP_DISCUSSIONS'], 'rushed_delivery'
),
(
    'fluency-spontaneous-stream-75', 'Stream of Thought Pivot',
    'Connect two unrelated topics smoothly without breaking speech continuity.',
    'Sharpens mental agility for handling unexpected meeting questions.',
    'Fluency', 'rapid_response', 2, 'Intermediate', 75,
    'Start by describing a book or movie you love, then pivot to what it teaches about modern leadership.',
    '["Spend 35 seconds on the book/movie summary.", "Use a bridging transition (e.g. This directly mirrors how leaders must...)", "Spend the remaining 40 seconds on the leadership takeaway."]'::jsonb,
    'Seamless logical pivot without hesitation pauses.', 35,
    ARRAY['PUBLIC_SPEAKING', 'EVERYDAY_COMMUNICATION'], 'slow_delivery'
),
(
    'fluency-storytelling-arc-60', 'The 3-Act Mini Story',
    'Narrate a memorable personal anecdote with a clear beginning, middle, and climax.',
    'Storytelling makes information memorable and emotionally engaging.',
    'Fluency', 'storytelling', 2, 'Intermediate', 60,
    'Tell a 60-second story about a time when an unexpected obstacle forced you to adapt quickly.',
    '["Act 1 - Setup (15s): What was supposed to happen.", "Act 2 - Crisis (30s): The sudden obstacle and what you did.", "Act 3 - Resolution (15s): The outcome and takeaway."]'::jsonb,
    'Vivid narrative flow with clear dynamic pacing changes.', 30,
    ARRAY['PUBLIC_SPEAKING', 'EVERYDAY_COMMUNICATION', 'JOB_INTERVIEWS'], 'unclear_structure'
),
(
    'fluency-executive-summary-90', 'Executive Multi-Minute Stamina',
    'Deliver a structured 90-second strategic briefing without running out of breath.',
    'Senior presentations require sustained vocal energy and thought management.',
    'Fluency', 'timed_speaking', 3, 'Advanced', 90,
    'Deliver a comprehensive 90-second proposal for adopting a new tool or methodology in your organization.',
    '["Phase 1: The core problem and business cost (30s).", "Phase 2: The proposed solution and implementation path (35s).", "Phase 3: The expected return on investment (25s)."]'::jsonb,
    'Continuous, high-stamina delivery without energy drops.', 40,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'slow_delivery'
),

-- Clarity & Structure (7)
(
    'clarity-explain-simply-60', 'Explain to a 10-Year-Old',
    'Explain a technical or complex concept in simple, accessible language.',
    'True mastery of a subject is proven by making it crystal clear to anyone.',
    'Clarity', 'explain_simply', 2, 'Intermediate', 60,
    'Explain how Cloud Computing or APIs work to someone with zero technical background.',
    '["Use a physical real-world analogy (e.g. restaurant kitchen or postal service).", "Avoid technical acronyms and jargon.", "Keep sentence structures under 15 words each."]'::jsonb,
    'Jargon-free clarity using short, punchy sentence structures.', 30,
    ARRAY['CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'excessive_jargon'
),
(
    'clarity-concise-answer-45', 'The 45-Second Executive Update',
    'Summarize a complex weekly status update in under 45 seconds.',
    'Executives and recruiters value brevity and high information density.',
    'Clarity', 'concise_answer', 3, 'Advanced', 45,
    'Give a 45-second status update on an initiative where something went wrong and how you fixed it.',
    '["Headline (10s): State current status and the main blocker.", "Action (20s): Outline the immediate fix deployed.", "Next Step (15s): Give the clear timeline to completion."]'::jsonb,
    'High information density with structured transitions.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'overlong_answers'
),
(
    'clarity-bottom-line-first-30', 'BLUF: Bottom Line Up Front',
    'State the core decision/recommendation in the very first sentence.',
    'Busy stakeholders need the takeaway before the supporting details.',
    'Clarity', 'concise_answer', 1, 'Beginner', 30,
    'Should remote teams prioritize asynchronous documentation or live meetings? Deliver your verdict.',
    '["Sentence 1: Unambiguous bottom line (My recommendation is...).", "Sentence 2 & 3: The 2 highest-impact supporting facts.", "Stop cleanly before the 30-second mark."]'::jsonb,
    'Immediate clear thesis without throat-clearing.', 25,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'weak_opening'
),
(
    'clarity-rule-of-three-60', 'The Rule of Three Framework',
    'Organize any response into exactly three clear, numbered pillars.',
    'Human memory naturally retains information grouped in triads.',
    'Clarity', 'explain_simply', 1, 'Beginner', 60,
    'What are the 3 essential qualities of an exceptional team member?',
    '["Introduce: There are three core traits: First... Second... Third...", "Give 1 concise example for each trait.", "Synthesize with a 1-sentence wrap-up."]'::jsonb,
    'Structured 3-part delivery with signposting words.', 30,
    ARRAY['CAMPUS_PLACEMENTS', 'JOB_INTERVIEWS', 'GROUP_DISCUSSIONS'], 'unclear_structure'
),
(
    'clarity-complex-system-75', 'Deconstructing Technical Complexity',
    'Break down a multi-component architecture into logical layers.',
    'Technical leaders must bridge high-level architecture with practical execution.',
    'Clarity', 'explain_simply', 3, 'Advanced', 75,
    'Explain how user authentication and security tokens flow through a modern web application.',
    '["Start with the user action (Login trigger).", "Explain the middle tier (Token generation & validation).", "Finish with the database & session state layer."]'::jsonb,
    'Step-by-step sequential clarity without technical hand-waving.', 35,
    ARRAY['CAMPUS_PLACEMENTS', 'JOB_INTERVIEWS'], 'vague_explanation'
),
(
    'clarity-elevator-pitch-45', 'The 45-Second Value Proposition',
    'Pitch an app, service, or concept with immediate value clarity.',
    'Capturing investor or client attention requires instant value differentiation.',
    'Clarity', 'concise_answer', 2, 'Intermediate', 45,
    'Pitch an AI-powered voice coach (like Verblyn) to a busy university student.',
    '["Hook (10s): The burning pain point.", "Solution (20s): How the product solves it in minutes a day.", "Call to action (15s): The immediate next step."]'::jsonb,
    'Punchy value proposition free of generic fluff.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'weak_opening'
),
(
    'clarity-closing-punchline-45', 'The Memorable Closing Call',
    'Deliver an explanation that culminates in a clear, memorable call to action.',
    'Great presentations fall flat if the ending is vague or trails off.',
    'Clarity', 'concise_answer', 2, 'Intermediate', 45,
    'Argue why your organization should invest more time in weekly knowledge-sharing sessions.',
    '["Lay out the core rationale in the first 30 seconds.", "Dedicate the final 15 seconds to a sharp, definitive closing directive.", "Finish with vocal firmness and no trailing hesitations."]'::jsonb,
    'Decisive closing sentence that anchors the entire message.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'weak_conclusion'
),

-- Vocabulary & Precision (6)
(
    'vocab-professional-precision-60', 'Power Verb Precision',
    'Describe an achievement using active, precise verbs instead of generic words.',
    'Action verbs (orchestrated, streamlined, spearheaded) project high capability.',
    'Vocabulary', 'explain_simply', 2, 'Intermediate', 60,
    'Describe a significant accomplishment. Replace words like did, made, worked on with precise action verbs.',
    '["Use at least 3 distinct action verbs (e.g. engineered, resolved, accelerated).", "Articulate the measurable impact of your work.", "Maintain lexical variety without repeating common descriptors."]'::jsonb,
    'High lexical diversity (TTR > 0.65) with descriptive precision.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'weak_vocabulary'
),
(
    'vocab-analogy-mastery-60', 'Concrete Metaphor Builder',
    'Explain an abstract technical concept using vivid physical metaphors.',
    'Metaphors bridge unfamiliar technical concepts into intuitive understanding.',
    'Vocabulary', 'explain_simply', 2, 'Intermediate', 60,
    'Explain what Database Indexing or Caching is by comparing it to a physical library or cookbook.',
    '["Explicitly map technical terms to physical items in your metaphor.", "Show the difference in speed/efficiency using descriptive sensory language.", "Bring it back to the software reality in your final sentence."]'::jsonb,
    'Rich metaphorical descriptors without jargon reliance.', 30,
    ARRAY['CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'excessive_jargon'
),
(
    'vocab-descriptive-impact-45', 'Sensory Language Drill',
    'Describe a high-pressure environment using vivid descriptive language.',
    'Sensory vocabulary makes storytelling immersive and memorable.',
    'Vocabulary', 'timed_speaking', 1, 'Beginner', 45,
    'Describe the intense atmosphere inside a hospital emergency room or a stock trading floor.',
    '["Incorporate auditory and visual descriptive adjectives.", "Avoid overused words like very busy or really fast.", "Paint a distinct mental picture for the listener."]'::jsonb,
    'Descriptive, evocative vocabulary with high lexical variety.', 25,
    ARRAY['PUBLIC_SPEAKING', 'EVERYDAY_COMMUNICATION'], 'weak_vocabulary'
),
(
    'vocab-synonym-expansion-60', 'Eliminate Repetitive Words',
    'Speak for 60 seconds about innovation without repeating key adjectives.',
    'Repetitive vocabulary makes long speeches tedious and reveals narrow lexical depth.',
    'Vocabulary', 'explain_simply', 2, 'Intermediate', 60,
    'Discuss how artificial intelligence is transforming education and work.',
    '["Never use the words good, bad, big, or important.", "Use sophisticated alternatives (e.g. transformative, pivotal, sub-optimal, substantial).", "Keep sentences fluid and natural."]'::jsonb,
    'Zero repeated adjectives; high Type-Token Ratio.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'PUBLIC_SPEAKING'], 'excessive_repetition'
),
(
    'vocab-nuanced-qualifiers-75', 'Nuanced Executive Distinction',
    'Differentiate between two subtly distinct strategies using precise vocabulary.',
    'Senior professionals distinguish between nuance rather than binary black-and-white views.',
    'Vocabulary', 'concise_answer', 3, 'Advanced', 75,
    'Explain the nuanced difference between being efficient vs being effective in project execution.',
    '["Define each concept with surgical lexical precision.", "Provide a scenario where an action is efficient but completely ineffective.", "Synthesize how high-performing teams balance both."]'::jsonb,
    'Precise, nuanced vocabulary and analytical clarity.', 35,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'vague_explanation'
),
(
    'vocab-data-storytelling-60', 'Translating Numbers to Impact',
    'Describe quantitative metrics by connecting data points to human outcomes.',
    'Data without narrative leaves listeners cold; storytelling brings metrics to life.',
    'Vocabulary', 'explain_simply', 2, 'Intermediate', 60,
    'Your software reduced page latency from 3.2s to 0.4s and increased retention by 18%. Explain the impact.',
    '["Translate milliseconds into human patience and conversion value.", "Explain what an 18% retention lift means for team growth and revenue.", "Close with the overarching strategic implication."]'::jsonb,
    'Quantitative precision paired with narrative impact.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'insufficient_detail'
),

-- Grammar & Structural Discipline (5)
(
    'grammar-short-sentence-discipline-45', 'Short Sentence Sprint',
    'Speak in disciplined sentences of 8 to 14 words each.',
    'Run-on sentences cause listener fatigue and make arguments hard to follow.',
    'Grammar', 'timed_speaking', 1, 'Beginner', 45,
    'Explain why regular physical exercise improves cognitive focus at work.',
    '["Keep every sentence under 14 words.", "End each sentence with a clean drop in vocal inflection.", "Never chain clauses together with and then... and also..."]'::jsonb,
    'Average sentence length between 9 and 14 words.', 25,
    ARRAY['EVERYDAY_COMMUNICATION', 'PUBLIC_SPEAKING'], 'grammar_errors'
),
(
    'grammar-prep-framework-60', 'Point-Reason-Example-Point (PREP)',
    'Structure an argumentative answer using the rigorous PREP formula.',
    'PREP guarantees tight logical cohesion without rambling.',
    'Grammar', 'concise_answer', 2, 'Intermediate', 60,
    'Should companies enforce a strict 4-day workweek? State and defend your view.',
    '["P (Point, 10s): Your core stance.", "R (Reason, 15s): The primary underlying driver.", "E (Example, 25s): A concrete real-world example or study.", "P (Point, 10s): Restate your thesis with finality."]'::jsonb,
    'Flawless execution of PREP 4-part structure.', 30,
    ARRAY['GROUP_DISCUSSIONS', 'JOB_INTERVIEWS', 'PUBLIC_SPEAKING'], 'unclear_structure'
),
(
    'grammar-active-voice-focus-60', 'Active Voice Authority',
    'Deliver a retrospective without using passive voice phrasing.',
    'Active voice demonstrates ownership, directness, and executive confidence.',
    'Grammar', 'explain_simply', 2, 'Intermediate', 60,
    'Describe a situation where an error occurred in your team and how it was remediated.',
    '["Do not say mistakes were made or it was decided.", "Name specific actors: I investigated..., Our team restructured..., We deployed...", "Maintain strong subject-verb alignment throughout."]'::jsonb,
    '100% active voice structure with clear agency.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'grammar_errors'
),
(
    'grammar-clause-economy-45', 'Compound Sentence Trimming',
    'Trim wordy explanations into crisp, decisive claims.',
    'Eliminating filler clauses increases audience retention.',
    'Grammar', 'concise_answer', 3, 'Advanced', 45,
    'Why is unit testing critical before deploying code to production?',
    '["Deliver 4 distinct, powerful assertions in 45 seconds.", "Avoid qualifying preambles like I feel that essentially what happens is...", "State raw facts and direct cause-and-effect relationships."]'::jsonb,
    'High information density free from rambling qualifying phrases.', 30,
    ARRAY['CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'overlong_answers'
),
(
    'grammar-transition-flow-60', 'Seamless Signposting Words',
    'Use formal transitional signposts (Furthermore, Consequently, In contrast).',
    'Signposting gives speeches an architectural roadmap that listeners easily track.',
    'Grammar', 'explain_simply', 2, 'Intermediate', 60,
    'Compare working in an early-stage startup versus an established corporate enterprise.',
    '["Use On one hand... for the startup perspective.", "Use Conversely / In contrast... to pivot to enterprise.", "Use Ultimately / Therefore... for your closing synthesis."]'::jsonb,
    'Explicit logical signposting connecting all arguments.', 30,
    ARRAY['GROUP_DISCUSSIONS', 'JOB_INTERVIEWS'], 'unclear_structure'
),

-- Confidence & Vocal Delivery (6)
(
    'confidence-assertive-opinion-60', 'Defend a Controversial View',
    'State a clear opinion and back it up with two compelling arguments in 60 seconds.',
    'Eliminates apologetic hedging words like I guess or sort of.',
    'Confidence', 'concise_answer', 2, 'Intermediate', 60,
    'Pick a trend in technology, work, or education that you disagree with and explain why with two reasons.',
    '["Open with an unambiguous thesis statement in the first 10 seconds.", "Support with Reason 1 (20s) and Reason 2 (20s).", "Close decisively without trailing off."]'::jsonb,
    'Firm vocal assertion free from passive hedging language.', 30,
    ARRAY['GROUP_DISCUSSIONS', 'WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'filler_dependency'
),
(
    'confidence-eliminating-hedges-45', 'Zero-Hedge Direct Stance',
    'Answer a difficult question without using softeners (I think, maybe, sort of).',
    'Hedging language dilutes authority and undermines credibility.',
    'Confidence', 'concise_answer', 1, 'Beginner', 45,
    'Will AI replace software engineers within 5 years? Give a definitive yes or no and defend it.',
    '["Never say I think, I feel, in my humble opinion, or it kind of depends.", "State direct, declarative sentences: AI will accelerate productivity, not replace engineers, because...", "Deliver with calm conviction."]'::jsonb,
    'Zero hedging qualifiers with firm delivery.', 25,
    ARRAY['GROUP_DISCUSSIONS', 'JOB_INTERVIEWS'], 'filler_dependency'
),
(
    'confidence-unpopular-truth-60', 'Delivering Uncomfortable Feedback',
    'Deliver constructive, direct feedback with professional empathy and firmness.',
    'Difficult conversations require balancing clarity with professionalism.',
    'Confidence', 'concise_answer', 3, 'Advanced', 60,
    'Tell a peer that their recent missed deadlines are impacting the whole team project.',
    '["State the observable fact without accusation (15s).", "Explain the team-wide consequence (25s).", "Propose a collaborative path forward (20s)."]'::jsonb,
    'Assertive, non-apologetic tone maintaining professional respect.', 35,
    ARRAY['WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'weak_opening'
),
(
    'confidence-high-stakes-qna-45', 'Spontaneous Objection Handling',
    'Defend your project timeline against a skeptical client or manager.',
    'Composure under fire distinguishes reliable leaders from panicked responders.',
    'Confidence', 'rapid_response', 3, 'Advanced', 45,
    'Stakeholder says: This timeline is twice as long as we expected. Why should we approve this?',
    '["Acknowledge the urgency without becoming defensive (10s).", "Explain the quality and risk mitigation built into the timeline (25s).", "Offer a phased tradeoff option (10s)."]'::jsonb,
    'Composed, steady cadence under simulated adversarial pressure.', 35,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'slow_delivery'
),
(
    'confidence-vocal-conviction-60', 'Decisive Recommendation Delivery',
    'Pitch an expensive strategic pivot with uncompromising conviction.',
    'If the speaker sounds uncertain, the decision-maker will never approve the risk.',
    'Confidence', 'concise_answer', 2, 'Intermediate', 60,
    'Convince leadership to rewrite a legacy software system from scratch.',
    '["Anchor on the hidden cost of technical debt (20s).", "Show the breakthrough velocity of modern architecture (25s).", "Conclude with an unambiguous call to action (15s)."]'::jsonb,
    'High conviction vocal energy with zero hesitation sounds.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'weak_conclusion'
),
(
    'confidence-crisis-handling-90', 'Leadership Under Pressure',
    'Address an anxious team during a severe product outage or company crisis.',
    'In a crisis, tone and vocal stability matter as much as the actual facts.',
    'Confidence', 'timed_speaking', 3, 'Advanced', 90,
    'Your flagship product is down for major enterprise customers. Brief your engineering team on the incident response.',
    '["Calm the room with transparent truth (30s).", "Assign immediate triage swimlanes (35s).", "Establish communication protocols and close with confidence (25s)."]'::jsonb,
    'Authoritative, calm, grounding pacing throughout 90 seconds.', 45,
    ARRAY['WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'rushed_delivery'
),

-- Interview & Career Mastery (7)
(
    'interview-tell-me-about-yourself-60', 'The "Tell Me About Yourself" Hook',
    'Deliver a crisp 60-second self-introduction tailored for recruiters.',
    'First impressions in interviews set the tone for the entire conversation.',
    'Clarity', 'interview_answer', 1, 'Beginner', 60,
    'Answer: Tell me about yourself, your background, and what excites you right now.',
    '["Present (20s): Current role/studies and core expertise.", "Past (20s): 1 standout milestone or formative experience.", "Future (20s): Why you are excited about upcoming opportunities."]'::jsonb,
    'Present-Past-Future narrative structure with confidence.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'], 'weak_opening'
),
(
    'interview-star-behavioral-90', 'STAR Conflict Resolution',
    'Structure a behavioral interview response using Situation, Task, Action, and Result.',
    'STAR method prevents rambling and ensures you provide concrete behavioral evidence.',
    'Confidence', 'interview_answer', 3, 'Advanced', 90,
    'Describe a time you disagreed with a colleague or teammate on an approach and how you resolved it.',
    '["Situation & Task (25s): The context and the point of disagreement.", "Action (40s): How you initiated a constructive conversation.", "Result (25s): The mutual outcome and what was learned."]'::jsonb,
    'Evenly apportioned STAR delivery without rambling.', 35,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'unclear_structure'
),
(
    'interview-why-hire-you-60', 'Why Should We Hire You?',
    'Articulate your unique value proposition without sounding arrogant or generic.',
    'Differentiates you from dozens of candidates with identical resumes.',
    'Clarity', 'interview_answer', 2, 'Intermediate', 60,
    'Answer: With so many qualified candidates, why should we select you for this role?',
    '["Highlight 1 distinct technical/execution superpower (25s).", "Highlight 1 cultural/communication superpower (20s).", "Close with your immediate commitment to day-1 impact (15s)."]'::jsonb,
    'Targeted value alignment tailored to team needs.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'], 'weak_opening'
),
(
    'interview-greatest-failure-75', 'The Turnaround Failure Story',
    'Discuss a genuine mistake, what you learned, and how you turned it into a strength.',
    'Tests self-awareness, humility, resilience, and growth mindset.',
    'Fluency', 'interview_answer', 3, 'Advanced', 75,
    'Describe a project that failed or did not meet expectations. What was your role and what changed?',
    '["Own the mistake clearly without blaming external teammates (20s).", "Detail the immediate corrective action taken (30s).", "Explain the permanent system or habit you adopted as a result (25s)."]'::jsonb,
    'Authentic accountability and clear growth narrative.', 35,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'], 'insufficient_detail'
),
(
    'interview-salary-value-defense-60', 'Articulating Your Market Value',
    'State and justify your compensation expectations with professionalism and data.',
    'Negotiation confidence directly impacts career trajectory and earnings.',
    'Confidence', 'interview_answer', 2, 'Intermediate', 60,
    'Answer: What are your salary expectations for this position and how did you arrive at that number?',
    '["Anchor to industry benchmarking and market data (20s).", "Connect the number to the unique multiplier impact you deliver (25s).", "Leave room for holistic package discussion (15s)."]'::jsonb,
    'Polite, firm, data-backed justification without apologetic qualifiers.', 30,
    ARRAY['JOB_INTERVIEWS', 'WORKPLACE_COMMUNICATION'], 'weak_opening'
),
(
    'interview-technical-deepdive-90', 'System Architecture Deep Dive',
    'Explain your most complex technical architecture from high level down to trade-offs.',
    'Senior engineering interviews test depth of technical design and trade-off justification.',
    'Clarity', 'interview_answer', 3, 'Advanced', 90,
    'Describe the technical architecture of the most complex system you have designed or worked on.',
    '["High level overview & business requirements (25s).", "Key architectural choices (databases, caching, queues) (40s).", "The hardest trade-off you had to accept and why (25s)."]'::jsonb,
    'High technical rigor, structured transitions, and clear trade-off rationale.', 45,
    ARRAY['CAMPUS_PLACEMENTS', 'JOB_INTERVIEWS'], 'vague_explanation'
),
(
    'interview-vision-future-60', 'Where Do You See Yourself in 3 Years?',
    'Share realistic, ambitious career goals aligned with role growth.',
    'Recruiters assess ambition, commitment, and alignment with organizational needs.',
    'Fluency', 'interview_answer', 1, 'Beginner', 60,
    'Answer: Where do you see yourself professionally in 3 to 5 years?',
    '["Year 1: Mastery of role and team impact (20s).", "Year 2-3: Taking on broader ownership and mentoring (25s).", "Long term: The domain mastery you aim to achieve (15s)."]'::jsonb,
    'Realistic ambition tied directly to practical skills growth.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'], 'weak_conclusion'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    why_it_matters = EXCLUDED.why_it_matters,
    target_skill = EXCLUDED.target_skill,
    challenge_type = EXCLUDED.challenge_type,
    difficulty_level = EXCLUDED.difficulty_level,
    difficulty_label = EXCLUDED.difficulty_label,
    duration_seconds = EXCLUDED.duration_seconds,
    prompt = EXCLUDED.prompt,
    instructions = EXCLUDED.instructions,
    expected_behavior = EXCLUDED.expected_behavior,
    xp_reward = EXCLUDED.xp_reward,
    goal_tags = EXCLUDED.goal_tags,
    target_weakness = EXCLUDED.target_weakness;
