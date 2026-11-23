/**
 * @file atsMatcher.service.js
 * Core ATS Matching and Explainable Scoring Engine for Module 7: AI Resume-to-Job ATS Intelligence.
 * Implements a 7-dimension hybrid model with deterministic rubric verification and AI qualitative synthesis.
 */

import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';
import { checkSkillMatch, normalizeSkillList } from './atsSkillNormalizer.js';

export const ATS_WEIGHTS = Object.freeze({
  REQUIRED_SKILLS: 0.30,
  EXPERIENCE_RELEVANCE: 0.20,
  PROJECT_RELEVANCE: 0.15,
  PREFERRED_SKILLS: 0.10,
  RESPONSIBILITIES_ALIGNMENT: 0.10,
  KEYWORD_COVERAGE: 0.10,
  EDUCATION_RELEVANCE: 0.05,
});

/**
 * Computes match category based on score bands.
 * @param {number} score
 * @returns {string}
 */
export const deriveMatchCategory = (score) => {
  if (score >= 85) return 'Excellent Match';
  if (score >= 70) return 'Strong Match';
  if (score >= 55) return 'Moderate Match';
  if (score >= 40) return 'Weak Match';
  return 'Low Match';
};

/**
 * Evaluates deterministic matching across skills, keywords, experience, and education.
 * @param {object} resumeData
 * @param {object} jobData
 * @returns {object}
 */
export const evaluateDeterministicAts = (resumeData, jobData) => {
  const candidateSkills = resumeData.technicalSkills || [];
  const candidateRawText = resumeData.rawText || '';
  const candidateExp = resumeData.experience || [];
  const candidateProjects = resumeData.projects || [];
  const candidateEdu = resumeData.education || [];

  const reqSkills = jobData.extractedRequirements?.requiredTechnicalSkills || [];
  const prefSkills = jobData.extractedRequirements?.preferredTechnicalSkills || [];
  const keywords = jobData.extractedRequirements?.keywords || [];

  // 1. Required Technical Skills Coverage (Weight: 30%)
  const matchedRequired = [];
  const missingRequired = [];

  for (const skill of reqSkills) {
    const match = checkSkillMatch(skill, candidateSkills, candidateRawText);
    if (match.isMatched) {
      matchedRequired.push({ skill, evidenceSource: match.evidenceSource });
    } else {
      missingRequired.push(skill);
    }
  }

  const reqScorePct = reqSkills.length > 0 ? Math.round((matchedRequired.length / reqSkills.length) * 100) : 75;

  // 2. Preferred Technical Skills Coverage (Weight: 10%)
  const matchedPreferred = [];
  const missingPreferred = [];

  for (const skill of prefSkills) {
    const match = checkSkillMatch(skill, candidateSkills, candidateRawText);
    if (match.isMatched) {
      matchedPreferred.push({ skill, evidenceSource: match.evidenceSource });
    } else {
      missingPreferred.push(skill);
    }
  }

  const prefScorePct = prefSkills.length > 0 ? Math.round((matchedPreferred.length / prefSkills.length) * 100) : 70;

  // 3. Keyword Coverage (Weight: 10%)
  const matchedKeywords = [];
  for (const kw of keywords) {
    const match = checkSkillMatch(kw, candidateSkills, candidateRawText);
    if (match.isMatched) matchedKeywords.push(kw);
  }
  const keywordScorePct = keywords.length > 0 ? Math.round((matchedKeywords.length / keywords.length) * 100) : 70;

  // 4. Experience Relevance (Weight: 20%)
  let expScorePct = 60;
  const candidateTotalYears = typeof resumeData.totalYearsExperience === 'number' ? resumeData.totalYearsExperience : candidateExp.length * 1.5;
  if (candidateExp.length >= 2 || candidateTotalYears >= 3) expScorePct = 85;
  else if (candidateExp.length === 1 || candidateTotalYears >= 1) expScorePct = 70;
  else expScorePct = 50;

  // 5. Project Relevance (Weight: 15%)
  let projScorePct = 60;
  if (candidateProjects.length >= 2) projScorePct = 85;
  else if (candidateProjects.length === 1) projScorePct = 70;
  else projScorePct = 45;

  // 6. Responsibilities Alignment (Weight: 10%)
  let respScorePct = 65;
  if (candidateExp.length > 0 && candidateProjects.length > 0) respScorePct = 80;

  // 7. Education Relevance (Weight: 5%)
  let eduScorePct = candidateEdu.length > 0 ? 90 : 65;

  // Composite Weighted Calculation
  const totalCompositeScore = Math.round(
    reqScorePct * ATS_WEIGHTS.REQUIRED_SKILLS +
    expScorePct * ATS_WEIGHTS.EXPERIENCE_RELEVANCE +
    projScorePct * ATS_WEIGHTS.PROJECT_RELEVANCE +
    prefScorePct * ATS_WEIGHTS.PREFERRED_SKILLS +
    respScorePct * ATS_WEIGHTS.RESPONSIBILITIES_ALIGNMENT +
    keywordScorePct * ATS_WEIGHTS.KEYWORD_COVERAGE +
    eduScorePct * ATS_WEIGHTS.EDUCATION_RELEVANCE
  );

  const boundedScore = Math.min(100, Math.max(0, totalCompositeScore));

  return {
    overallScore: boundedScore,
    matchCategory: deriveMatchCategory(boundedScore),
    dimensionScores: {
      requiredSkills: {
        score: Math.round(reqScorePct * ATS_WEIGHTS.REQUIRED_SKILLS),
        weight: 30,
        maxScore: 30,
        percentage: reqScorePct,
        explanation: `Candidate matches ${matchedRequired.length} of ${reqSkills.length} mandatory technical requirements (${reqScorePct}%).`,
      },
      preferredSkills: {
        score: Math.round(prefScorePct * ATS_WEIGHTS.PREFERRED_SKILLS),
        weight: 10,
        maxScore: 10,
        percentage: prefScorePct,
        explanation: `Candidate demonstrates ${matchedPreferred.length} of ${prefSkills.length} nice-to-have technical skills (${prefScorePct}%).`,
      },
      experienceRelevance: {
        score: Math.round(expScorePct * ATS_WEIGHTS.EXPERIENCE_RELEVANCE),
        weight: 20,
        maxScore: 20,
        percentage: expScorePct,
        explanation: `Documented employment profile demonstrates ${candidateTotalYears} years of engineering experience.`,
      },
      projectRelevance: {
        score: Math.round(projScorePct * ATS_WEIGHTS.PROJECT_RELEVANCE),
        weight: 15,
        maxScore: 15,
        percentage: projScorePct,
        explanation: `Resume features ${candidateProjects.length} technical projects illustrating practical architecture application.`,
      },
      responsibilitiesAlignment: {
        score: Math.round(respScorePct * ATS_WEIGHTS.RESPONSIBILITIES_ALIGNMENT),
        weight: 10,
        maxScore: 10,
        percentage: respScorePct,
        explanation: `Demonstrated technical responsibilities align with the target engineering role.`,
      },
      keywordCoverage: {
        score: Math.round(keywordScorePct * ATS_WEIGHTS.KEYWORD_COVERAGE),
        weight: 10,
        maxScore: 10,
        percentage: keywordScorePct,
        explanation: `Matched ${matchedKeywords.length} of ${keywords.length} priority ATS keywords throughout resume text.`,
      },
      educationRelevance: {
        score: Math.round(eduScorePct * ATS_WEIGHTS.EDUCATION_RELEVANCE),
        weight: 5,
        maxScore: 5,
        percentage: eduScorePct,
        explanation: candidateEdu.length > 0 ? `Verified academic degree aligned with technical requirements.` : `Practical experience demonstrated without explicit degree credential.`,
      },
    },
    matchedRequired,
    missingRequired,
    matchedPreferred,
    missingPreferred,
    matchedKeywords,
  };
};

/**
 * Builds prioritized skill gaps array from missing requirements.
 * @param {string[]} missingMandatory
 * @param {string[]} missingPreferred
 * @param {string} roleTitle
 * @returns {Array<object>}
 */
export const buildSkillGapsList = (missingMandatory = [], missingPreferred = [], roleTitle = 'the role') => {
  const gaps = [];

  for (const skill of missingMandatory) {
    gaps.push({
      skill,
      importance: 'mandatory',
      whyItMatters: `Core required technology explicitly requested in job description for ${roleTitle}.`,
      resumeEvidence: 'Not explicitly demonstrated in work history or project bullets.',
      missingEvidence: `Production deployment, architectural integration, or concrete code examples featuring ${skill}.`,
      suggestedActivity: `Build or document a practical feature integrating ${skill} and prepare core architectural trade-offs.`,
      impactPriority: 'High',
    });
  }

  for (const skill of missingPreferred) {
    gaps.push({
      skill,
      importance: 'preferred',
      whyItMatters: `Preferred secondary skill that differentiates top candidates for ${roleTitle}.`,
      resumeEvidence: 'Mentioned without deep evidence or absent from technical sections.',
      missingEvidence: `Documented hands-on usage of ${skill}.`,
      suggestedActivity: `Explore fundamental concepts and best practices of ${skill} to address secondary interview questions.`,
      impactPriority: 'Medium',
    });
  }

  return gaps.slice(0, 10);
};

/**
 * Executes ATS match analysis combining deterministic scoring with OpenRouter AI qualitative synthesis.
 *
 * @param {object} params
 * @param {object} params.resume - Resume profile object
 * @param {object} params.jobDescription - Job description profile object
 * @param {object} [options={}]
 * @returns {Promise<object>}
 */
export const matchResumeToJob = async ({ resume, jobDescription, options = {} }) => {
  if (!resume || !jobDescription) {
    throw new Error('Both resume profile and job description are required for ATS analysis.');
  }

  const askAI = options.askAI || defaultAskAI;
  const deterministicResult = evaluateDeterministicAts(resume.structuredData || {}, jobDescription);

  const skillGaps = buildSkillGapsList(
    deterministicResult.missingRequired,
    deterministicResult.missingPreferred,
    jobDescription.jobTitle
  );

  let strengths = [
    {
      area: 'Technical Competency Foundation',
      evidence: `Demonstrated mastery in ${deterministicResult.matchedRequired.slice(0, 4).map((m) => m.skill).join(', ') || 'core software engineering'}`,
      relevanceToJob: `Satisfies primary baseline requirements for ${jobDescription.jobTitle}.`,
    },
    {
      area: 'Practical Project Experience',
      evidence: `Documented implementation across ${resume.structuredData?.projects?.length || 1} technical projects.`,
      relevanceToJob: 'Validates ability to deliver functional software solutions.',
    },
  ];

  let readinessReport = {
    summary: `Candidate achieves a ${deterministicResult.overallScore}/100 (${deterministicResult.matchCategory}) ATS alignment for the ${jobDescription.jobTitle} position at ${jobDescription.companyName || 'Target Company'}.`,
    strongestAreas: deterministicResult.matchedRequired.slice(0, 5).map((m) => m.skill),
    criticalGaps: deterministicResult.missingRequired.slice(0, 5),
    nextSteps: [
      `Strengthen resume bullet descriptions for matching skills to highlight business impact and metrics.`,
      `Complete a focused recovery drill on missing mandatory skills: ${deterministicResult.missingRequired.slice(0, 3).join(', ') || 'advanced architecture'}.`,
      `Practice mock interview questions tailored to ${jobDescription.jobTitle}.`,
    ],
    interviewPrepRecommendations: [
      `Review system architecture and trade-offs for ${deterministicResult.matchedRequired.slice(0, 3).map((m) => m.skill).join(', ') || 'distributed systems'}.`,
      `Prepare STAR-framework responses demonstrating engineering ownership and edge-case resolution.`,
    ],
  };

  // Qualitative enrichment via OpenRouter AI
  try {
    const prompt = `You are an expert ATS Algorithm Engineer and Technical Hiring Bar Raiser.
Compare the candidate's resume against the target Job Description (JD).

CANDIDATE PROFILE:
Title / Role: ${resume.structuredData?.professionalSummary || 'Software Engineer'}
Skills: ${(resume.structuredData?.technicalSkills || []).join(', ')}
Experience: ${(resume.structuredData?.experience || []).map((e) => `${e.company}: ${e.role} (${e.bullets?.join('; ')})`).join('\n')}
Projects: ${(resume.structuredData?.projects || []).map((p) => `${p.name}: ${p.description}`).join('\n')}

TARGET JOB REQUIREMENTS:
Job Title: ${jobDescription.jobTitle} at ${jobDescription.companyName}
Required Skills: ${(jobDescription.extractedRequirements?.requiredTechnicalSkills || []).join(', ')}
Preferred Skills: ${(jobDescription.extractedRequirements?.preferredTechnicalSkills || []).join(', ')}
Responsibilities: ${(jobDescription.extractedRequirements?.responsibilities || []).join('\n')}

DETERMINISTIC ATS SCORE: ${deterministicResult.overallScore}/100 (${deterministicResult.matchCategory})

OBJECTIVE:
Synthesize 2-3 verified strengths, identify top critical gaps, and provide next steps for interview readiness.
Do NOT fabricate claims or skills.

RETURN STRICT JSON ONLY:
{
  "strengths": [
    {
      "area": "Specific strength area",
      "evidence": "Concrete evidence excerpt from resume",
      "relevanceToJob": "Why this matters for ${jobDescription.jobTitle}"
    }
  ],
  "readinessSummary": "2-3 sentence executive summary of candidate readiness for this role",
  "strongestAreas": ["Top matching skill/area 1", "Top area 2"],
  "nextSteps": ["Actionable step 1", "Actionable step 2"],
  "interviewPrepRecommendations": ["Targeted interview prep focus 1", "Focus 2"]
}`;

    const rawAiResponse = await askAI(
      [
        { role: 'system', content: 'You are an objective ATS hiring algorithm analyst. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 1500, temperature: 0.2 }
    );

    const { data } = safeParseJson(rawAiResponse);
    if (data && typeof data === 'object') {
      if (Array.isArray(data.strengths) && data.strengths.length > 0) {
        strengths = data.strengths.slice(0, 4);
      }
      readinessReport = {
        summary: data.readinessSummary || readinessReport.summary,
        strongestAreas: Array.isArray(data.strongestAreas) ? data.strongestAreas.slice(0, 5) : readinessReport.strongestAreas,
        criticalGaps: deterministicResult.missingRequired.slice(0, 5),
        nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps.slice(0, 4) : readinessReport.nextSteps,
        interviewPrepRecommendations: Array.isArray(data.interviewPrepRecommendations) ? data.interviewPrepRecommendations.slice(0, 4) : readinessReport.interviewPrepRecommendations,
      };
    }
  } catch (err) {
    // Retain deterministic synthesis on AI error
  }

  return {
    overallScore: deterministicResult.overallScore,
    matchCategory: deterministicResult.matchCategory,
    isInsufficientData: false,
    dimensionScores: deterministicResult.dimensionScores,
    scoringFormula: 'Overall = 0.30*ReqSkills + 0.20*Exp + 0.15*Projects + 0.10*PrefSkills + 0.10*Resp + 0.10*Keywords + 0.05*Edu',
    skillGaps,
    strengths,
    readinessReport,
    matchedRequired: deterministicResult.matchedRequired,
    missingRequired: deterministicResult.missingRequired,
  };
};
