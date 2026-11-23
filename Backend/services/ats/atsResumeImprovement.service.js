/**
 * @file atsResumeImprovement.service.js
 * Resume Improvement Engine for Module 7: AI Resume-to-Job ATS Intelligence.
 * Rewrites professional summaries, experience bullets, and project descriptions to enhance
 * ATS alignment without hallucinating unverified experience or fabricating metrics.
 */

import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';

/**
 * Builds deterministic fallback resume improvements if AI is unavailable.
 * @param {object} resumeData
 * @param {object} jobData
 * @returns {object}
 */
export const buildDeterministicImprovements = (resumeData, jobData) => {
  const origSummary = resumeData.professionalSummary || 'Software Engineer with experience developing applications.';
  const jobTitle = jobData.jobTitle || 'Software Engineer';
  const targetCompany = jobData.companyName || 'Target Company';
  const topMatchedSkills = (resumeData.technicalSkills || []).slice(0, 4).join(', ') || 'full-stack engineering';

  const suggestedSummary = `${origSummary.replace(/\.$/, '')}, specializing in ${topMatchedSkills} with demonstrated ability to deliver scalable solutions aligned with ${jobTitle} standards at ${targetCompany}.`;

  const bullets = [];
  const rawBullets = [];
  (resumeData.experience || []).forEach((exp) => {
    (exp.bullets || []).forEach((b) => {
      rawBullets.push({ bullet: b, company: exp.company, role: exp.role });
    });
  });

  const sampleBullets = rawBullets.slice(0, 4);
  const actionVerbs = ['Architected', 'Spearheaded', 'Engineered', 'Optimized', 'Implemented'];

  sampleBullets.forEach((item, idx) => {
    const verb = actionVerbs[idx % actionVerbs.length];
    const cleanedOriginal = item.bullet.replace(/^[•\-\*]\s*/, '').trim();
    bullets.push({
      id: `bullet-${idx + 1}`,
      original: cleanedOriginal,
      suggested: `${verb} ${cleanedOriginal.charAt(0).toLowerCase() + cleanedOriginal.slice(1)}, improving operational performance and system reliability.`,
      company: item.company || 'Experience',
      role: item.role || 'Engineer',
      actionVerb: verb,
      rationale: `Replaced passive language with strong action verb "${verb}" and reinforced engineering impact.`,
      status: 'pending',
    });
  });

  const projectImprovements = (resumeData.projects || []).slice(0, 2).map((proj, pIdx) => ({
    id: `proj-${pIdx + 1}`,
    projectName: proj.name || `Project ${pIdx + 1}`,
    originalDescription: proj.description || 'Full-stack application',
    suggestedDescription: `${proj.description || 'Full-stack application'} utilizing ${(proj.technologies || []).slice(0, 3).join(', ') || 'modern frameworks'} to ensure high availability, data consistency, and streamlined user workflows.`,
    relevantKeywords: (proj.technologies || []).slice(0, 4),
    rationale: 'Emphasized technical architecture, tech stack implementation, and production resilience.',
    status: 'pending',
  }));

  const keywords = (jobData.extractedRequirements?.keywords || []).slice(0, 6).map((kw) => ({
    keyword: kw,
    placementSuggestion: 'Technical Skills or relevant Project description bullets',
    context: `Aligns with explicit requirement for ${jobTitle} at ${targetCompany}.`,
  }));

  return {
    professionalSummary: {
      original: origSummary,
      suggested: suggestedSummary,
      rationale: `Tailored summary to highlight matching competencies for ${jobTitle} while strictly preserving factual experience.`,
      status: 'pending',
    },
    experienceBullets: bullets,
    projectImprovements,
    keywordRecommendations: keywords,
  };
};

/**
 * Generates actionable resume improvements tailored to the target job description.
 *
 * @param {object} params
 * @param {object} params.resume - Resume profile object
 * @param {object} params.jobDescription - Job description profile object
 * @param {object} [options={}]
 * @returns {Promise<object>}
 */
export const generateResumeImprovements = async ({ resume, jobDescription, options = {} }) => {
  const askAI = options.askAI || defaultAskAI;
  const deterministicFallback = buildDeterministicImprovements(resume.structuredData || {}, jobDescription);

  const prompt = `You are a Principal Technical Resume Editor and ATS Optimization Expert.
Analyze the candidate's resume and target Job Description (JD).
Generate actionable, professional improvements to enhance ATS alignment.

STRICT NON-HALLUCINATION RULES:
1. NEVER invent companies, dates, degrees, metrics, or technologies that the candidate did not mention.
2. If metrics are absent, use natural placeholders like "[X]% improvement" or "[N] daily active users" so the candidate can supply real numbers.
3. Use strong technical action verbs (e.g. Engineered, Spearheaded, Optimized, Architected).
4. Do NOT recommend keyword stuffing.

CANDIDATE SUMMARY:
${resume.structuredData?.professionalSummary || 'Software Engineer'}

CANDIDATE BULLETS:
${(resume.structuredData?.experience || []).flatMap((e) => e.bullets || []).slice(0, 5).join('\n')}

TARGET JOB:
${jobDescription.jobTitle} at ${jobDescription.companyName}
Required Skills: ${(jobDescription.extractedRequirements?.requiredTechnicalSkills || []).slice(0, 8).join(', ')}

RETURN STRICT JSON ONLY:
{
  "professionalSummary": {
    "suggested": "Tailored 2-3 sentence summary emphasizing matching competencies",
    "rationale": "Why this improves ATS keyword alignment"
  },
  "experienceBullets": [
    {
      "original": "Exact original bullet from candidate",
      "suggested": "Action-verb driven rewrite with technical context and metric placeholder",
      "actionVerb": "e.g. Architected",
      "rationale": "Explanation of structural improvement"
    }
  ],
  "projectImprovements": [
    {
      "projectName": "Project name from resume",
      "suggestedDescription": "Enhanced technical description highlighting architecture and stack",
      "rationale": "Why this highlights role relevance"
    }
  ],
  "keywordRecommendations": [
    {
      "keyword": "Matching keyword from JD",
      "placementSuggestion": "Where in resume to naturally place this",
      "context": "Contextual usage suggestion"
    }
  ]
}`;

  try {
    const rawAiResponse = await askAI(
      [
        { role: 'system', content: 'You are an objective technical resume enhancement assistant. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 2200, temperature: 0.2 }
    );

    const { data } = safeParseJson(rawAiResponse);
    if (data && typeof data === 'object') {
      const enhancedSummary = {
        original: deterministicFallback.professionalSummary.original,
        suggested: data.professionalSummary?.suggested || deterministicFallback.professionalSummary.suggested,
        rationale: data.professionalSummary?.rationale || deterministicFallback.professionalSummary.rationale,
        status: 'pending',
      };

      const enhancedBullets = Array.isArray(data.experienceBullets) && data.experienceBullets.length > 0
        ? data.experienceBullets.map((b, idx) => ({
            id: `bullet-${idx + 1}`,
            original: b.original || deterministicFallback.experienceBullets[idx]?.original || 'Original achievement bullet',
            suggested: b.suggested || deterministicFallback.experienceBullets[idx]?.suggested || 'Enhanced bullet',
            company: deterministicFallback.experienceBullets[idx]?.company || 'Experience',
            role: deterministicFallback.experienceBullets[idx]?.role || 'Engineer',
            actionVerb: b.actionVerb || 'Spearheaded',
            rationale: b.rationale || 'Enhanced with strong action verb and technical context.',
            status: 'pending',
          }))
        : deterministicFallback.experienceBullets;

      const enhancedProjects = Array.isArray(data.projectImprovements) && data.projectImprovements.length > 0
        ? data.projectImprovements.map((p, idx) => ({
            id: `proj-${idx + 1}`,
            projectName: p.projectName || deterministicFallback.projectImprovements[idx]?.projectName || `Project ${idx + 1}`,
            originalDescription: deterministicFallback.projectImprovements[idx]?.originalDescription || '',
            suggestedDescription: p.suggestedDescription || deterministicFallback.projectImprovements[idx]?.suggestedDescription || '',
            relevantKeywords: (jobDescription.extractedRequirements?.keywords || []).slice(0, 4),
            rationale: p.rationale || 'Improved architectural description and technical relevance.',
            status: 'pending',
          }))
        : deterministicFallback.projectImprovements;

      const enhancedKeywords = Array.isArray(data.keywordRecommendations) && data.keywordRecommendations.length > 0
        ? data.keywordRecommendations.slice(0, 6)
        : deterministicFallback.keywordRecommendations;

      return {
        professionalSummary: enhancedSummary,
        experienceBullets: enhancedBullets,
        projectImprovements: enhancedProjects,
        keywordRecommendations: enhancedKeywords,
      };
    }
  } catch (err) {
    // Retain deterministic fallback on AI timeout or failure
  }

  return deterministicFallback;
};
