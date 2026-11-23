import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';

/**
 * Computes deterministic hire verdict based on score thresholds
 */
export const deriveHiringVerdict = (score) => {
  if (score >= 85) return 'Strong Hire';
  if (score >= 70) return 'Hire';
  if (score >= 55) return 'Leaning Hire';
  if (score >= 40) return 'Leaning No Hire';
  return 'No Hire';
};

/**
 * Computes fit level
 */
export const deriveFitLevel = (score) => {
  if (score >= 75) return 'Exceeds Expectations';
  if (score >= 60) return 'Meets Expectations';
  return 'Needs Further Preparation';
};

/**
 * Evaluates candidate responses in a company interview simulation
 * and produces a role readiness assessment with next round recommendations.
 */
export const evaluateCompanyInterview = async ({
  interview,
  companyProfile,
  options = {},
}) => {
  const askAI = options.askAI || defaultAskAI;

  const companyName = interview.companySimulation?.companyName || companyProfile?.name || 'Company';
  const role = interview.companySimulation?.targetDesignation || interview.role || 'Software Engineer';
  const round = interview.companySimulation?.roundTitle || 'Technical Interview';
  const questions = interview.questions || [];

  // 1. Calculate baseline quantitative metrics from question scores
  let totalScore = 0;
  let answeredCount = 0;

  questions.forEach((q) => {
    if (typeof q.score === 'number' && q.score > 0) {
      totalScore += q.score <= 10 ? q.score * 10 : q.score;
      answeredCount++;
    }
  });

  const avgScore = answeredCount > 0 ? Math.round(totalScore / answeredCount) : 50;
  const defaultVerdict = deriveHiringVerdict(avgScore);
  const defaultFitLevel = deriveFitLevel(avgScore);

  let readinessResult = {
    readinessScore: avgScore,
    verdict: defaultVerdict,
    fitLevel: defaultFitLevel,
    strengths: [
      `Demonstrated technical foundation for ${role} role`,
      `Articulated problem solving approaches under ${round} conditions`,
    ],
    criticalGaps: [
      `Deepen familiarity with ${companyName}'s core engineering paradigms and edge cases`,
    ],
    recommendedTopics: [
      'Time & Space Complexity optimization',
      'System tradeoff articulation',
      'Edge-case hardening',
    ],
    nextRoundRecommendation: avgScore >= 65
      ? `Demonstrated readiness to advance to next interview round at ${companyName}.`
      : `Recommend completing a targeted 7 or 14-day recovery plan on identified gaps before attempting next round.`,
    companyCultureFit: `Candidate engaged thoughtfully with ${companyName}'s interview standards and demonstrated learning aptitude.`,
  };

  // 2. Synthesize qualitative depth via OpenRouter AI
  try {
    const prompt = `You are a Senior Bar Raiser and Interview Committee Member at ${companyName}.
Evaluate this completed candidate interview for the position of "${role}" in the "${round}".

CANDIDATE PERFORMANCE EVIDENCE:
Average Rubric Score: ${avgScore}/100
Questions and Answers:
${questions
  .map(
    (q, i) =>
      `Q${i + 1} [${q.topic || q.category}]: ${q.question}
Candidate Answer: "${(q.answer || 'No answer recorded').slice(0, 300)}"
Score: ${q.score}/10`
  )
  .join('\n\n')}

EVALUATION OBJECTIVE:
Evaluate role readiness specifically for ${companyName}'s engineering bar.
Is the candidate ready for this company and round?

RETURN STRICT JSON:
{
  "readinessScore": ${avgScore},
  "verdict": "Strong Hire | Hire | Leaning Hire | Leaning No Hire | No Hire",
  "fitLevel": "Exceeds Expectations | Meets Expectations | Needs Further Preparation",
  "companyCultureFit": "2 sentences evaluating alignment with ${companyName}'s culture and principles",
  "strengths": ["Specific verified strength 1", "Specific verified strength 2"],
  "criticalGaps": ["Specific technical or behavioral gap 1", "Specific gap 2"],
  "recommendedTopics": ["Recommended revision topic 1", "Recommended revision topic 2"],
  "nextRoundRecommendation": "Concrete recommendation on whether to proceed to next round or remediate first"
}`;

    const rawResponse = await askAI(
      [
        { role: 'system', content: 'You are an objective engineering hiring committee lead. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 1500, temperature: 0.2 }
    );

    const { data } = safeParseJson(rawResponse);
    if (data && data.verdict && Array.isArray(data.strengths)) {
      readinessResult = {
        readinessScore: typeof data.readinessScore === 'number' ? Math.min(100, Math.max(0, Math.round(data.readinessScore))) : avgScore,
        verdict: ['Strong Hire', 'Hire', 'Leaning Hire', 'Leaning No Hire', 'No Hire'].includes(data.verdict) ? data.verdict : defaultVerdict,
        hireVerdict: ['Strong Hire', 'Hire', 'Leaning Hire', 'Leaning No Hire', 'No Hire'].includes(data.verdict) ? data.verdict : defaultVerdict,
        fitLevel: ['Exceeds Expectations', 'Meets Expectations', 'Needs Further Preparation'].includes(data.fitLevel) ? data.fitLevel : defaultFitLevel,
        companyCultureFit: data.companyCultureFit || readinessResult.companyCultureFit,
        strengths: data.strengths.slice(0, 5),
        criticalGaps: Array.isArray(data.criticalGaps) ? data.criticalGaps.slice(0, 5) : readinessResult.criticalGaps,
        gaps: Array.isArray(data.criticalGaps) ? data.criticalGaps.slice(0, 5) : (readinessResult.gaps || readinessResult.criticalGaps),
        recommendedTopics: Array.isArray(data.recommendedTopics) ? data.recommendedTopics.slice(0, 5) : readinessResult.recommendedTopics,
        nextRoundRecommendation: data.nextRoundRecommendation || readinessResult.nextRoundRecommendation,
      };
    }
  } catch (err) {
    // Retain deterministic readiness result
  }

  readinessResult.hireVerdict = readinessResult.hireVerdict || readinessResult.verdict;
  readinessResult.gaps = readinessResult.gaps || readinessResult.criticalGaps;
  return readinessResult;
};
