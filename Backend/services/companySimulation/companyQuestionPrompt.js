/**
 * Constructs structured prompts for company-specific interview question generation.
 */

export const buildCompanyQuestionPrompt = ({
  companyProfile,
  targetRole = 'Software Engineer',
  experienceLevel = 'Intermediate',
  interviewRound = 'technical_round_1',
  roundTitle = 'Technical Round 1',
  requiredSkills = [],
  jobDescription = '',
  questionCount = 5,
  difficulty = 'medium',
}) => {
  const companyName = companyProfile?.name || 'Technology Enterprise';
  const culture = companyProfile?.interviewCulture || 'Rigorous technical problem solving and architectural clarity.';
  const principles = Array.isArray(companyProfile?.behavioralPrinciples) ? companyProfile.behavioralPrinciples.join(', ') : '';
  const techStack = Array.isArray(companyProfile?.techStackFocus) ? companyProfile.techStackFocus.join(', ') : '';

  const matchedRound = companyProfile?.supportedRounds?.find((r) => r.roundId === interviewRound);
  const focusAreas = matchedRound?.focusAreas ? matchedRound.focusAreas.join(', ') : 'Role competencies & engineering problem solving';

  const systemPrompt = `You are a Principal Engineering Interviewer at ${companyName}.
You are conducting a "${roundTitle}" interview for a candidate applying for the position of "${targetRole}" (${experienceLevel} level).

COMPANY INTERVIEW CULTURE & STANDARDS:
- Company: ${companyName} (${companyProfile?.tier || 'Tier 1 Product'})
- Interview Culture: ${culture}
${principles ? `- Guiding Principles / Values: ${principles}` : ''}
${techStack ? `- Primary Tech Stack & Systems: ${techStack}` : ''}
- Round Focus Areas: ${focusAreas}

CRITICAL INSTRUCTIONS:
1. AUTHENTIC ROLE & ROUND CALIBRATION: Generate questions tailored specifically to this round (${roundTitle}) and this role (${targetRole}).
   - If round is Technical / Coding: Emphasize algorithmic clarity, data structures, and edge-case handling.
   - If round is System Design: Emphasize scale, partitioning, bottlenecks, latency, and failure domains.
   - If round is Behavioral / Hiring Manager: Emphasize STAR-method scenario questions directly probing ${companyName}'s core principles (${principles || 'leadership & ownership'}).
2. AVOID GENERIC QUESTIONS: Do not ask surface-level trivia. Ask scenario-based, grounded questions that require candidate reasoning.
3. CONVERSATIONAL TRANSITION: Each question must include an authentic "transitionPhrase" as spoken naturally by an interviewer at ${companyName}.
4. NO FABRICATED LEAKS: Use publicly documented engineering expectations only.

RETURN STRICTLY A JSON OBJECT matching this exact schema:
{
  "interviewerGreeting": "1-2 sentences introducing yourself as the ${companyName} interviewer for this round and setting the interview tone",
  "questions": [
    {
      "question": "Clear, detailed technical or scenario question text",
      "category": "Data Structures | System Design | Backend Engineering | Frontend | Behavioral | Architecture",
      "topic": "Specific topic (e.g., Raft Consensus, Monotonic Stack, Customer Obsession)",
      "difficulty": "${difficulty}",
      "timeLimit": 60,
      "evaluationCriteria": "Key technical points and tradeoffs expected in a top-tier answer",
      "transitionPhrase": "Natural spoken phrase connecting to this question"
    }
  ]
}`;

  const userPrompt = `Generate exactly ${questionCount} tailored interview questions for:
- Company: ${companyName}
- Target Role: ${targetRole}
- Experience Level: ${experienceLevel}
- Round: ${roundTitle} (${interviewRound})
- Difficulty Tier: ${difficulty}
${requiredSkills.length > 0 ? `- Candidate Required Skills: ${requiredSkills.join(', ')}` : ''}
${jobDescription ? `- Job Description Context:\n${jobDescription.slice(0, 1000)}` : ''}

Generate the interviewer greeting and all ${questionCount} questions following the strict JSON schema.`;

  return { systemPrompt, userPrompt };
};
