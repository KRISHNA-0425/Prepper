/**
 * @file atsJobAnalyzer.service.js
 * Job Description parser and requirements analyzer for Module 7: AI Resume-to-Job ATS Intelligence.
 * Extracts structured mandatory vs preferred requirements, responsibilities, and seniority.
 */

import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';
import { normalizeSkillList } from './atsSkillNormalizer.js';

/**
 * Deterministically parses key fields from JD text if AI is unavailable.
 * @param {string} rawJD
 * @param {string} [inputJobTitle='']
 * @param {string} [inputCompany='']
 * @returns {object}
 */
export const buildDeterministicJobProfile = (rawJD = '', inputJobTitle = '', inputCompany = '') => {
  const lines = rawJD.split('\n').map((l) => l.trim()).filter(Boolean);
  const derivedTitle = inputJobTitle || lines[0]?.slice(0, 50) || 'Software Engineer';
  const derivedCompany = inputCompany || 'Target Company';

  // Common tech keywords regex
  const techKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express.js', 'Python', 'Java',
    'C++', 'Go', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'MongoDB', 'PostgreSQL',
    'MySQL', 'Redis', 'GraphQL', 'REST API', 'CI/CD', 'Git', 'Microservices', 'Tailwind CSS'
  ];

  const foundTech = [];
  const lowerJD = rawJD.toLowerCase();

  for (const tech of techKeywords) {
    if (lowerJD.includes(tech.toLowerCase())) {
      foundTech.push(tech);
    }
  }

  // Derive experience years from pattern like "3+ years", "5-7 years"
  const expMatch = rawJD.match(/(\d+)\+?\s*(?:-\s*\d+)?\s*years?(?:\s+of)?\s+experience/i);
  const derivedExp = expMatch ? `${expMatch[1]}+ years experience` : '2+ years experience';

  // Derive seniority
  let seniority = 'Mid-Level';
  if (lowerJD.includes('senior') || lowerJD.includes('sr.') || lowerJD.includes('lead')) {
    seniority = 'Senior-Level';
  } else if (lowerJD.includes('junior') || lowerJD.includes('entry') || lowerJD.includes('fresher') || lowerJD.includes('intern')) {
    seniority = 'Entry-Level';
  } else if (lowerJD.includes('principal') || lowerJD.includes('staff') || lowerJD.includes('architect')) {
    seniority = 'Lead/Staff-Level';
  }

  const normalizedFound = normalizeSkillList(foundTech);
  const halfLen = Math.ceil(normalizedFound.length / 2);

  return {
    jobTitle: derivedTitle,
    companyName: derivedCompany,
    experienceRequirement: derivedExp,
    seniorityLevel: seniority,
    extractedRequirements: {
      requiredTechnicalSkills: normalizedFound.slice(0, halfLen),
      preferredTechnicalSkills: normalizedFound.slice(halfLen),
      programmingLanguages: normalizedFound.filter((s) => ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go'].includes(s)),
      frameworks: normalizedFound.filter((s) => ['React', 'Node.js', 'Express.js', 'Next.js', 'Angular', 'Vue.js'].includes(s)),
      databases: normalizedFound.filter((s) => ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'].includes(s)),
      tools: normalizedFound.filter((s) => ['Docker', 'Kubernetes', 'AWS', 'Git', 'CI/CD'].includes(s)),
      responsibilities: [
        'Design, build, and maintain efficient, scalable, and reliable technical solutions.',
        'Collaborate with cross-functional product and engineering teams.',
        'Participate in code reviews, testing, and continuous deployment workflows.',
      ],
      educationRequirements: ['Bachelor degree in Computer Science, Engineering or related technical field'],
      certifications: [],
      domainKnowledge: ['Software Engineering', 'System Design', 'Cloud Computing'],
      keywords: normalizedFound.slice(0, 15),
    },
  };
};

/**
 * Analyzes a raw job description using OpenRouter AI with deterministic fallback.
 *
 * @param {object} params
 * @param {string} params.rawJobDescription - Full text of the job description
 * @param {string} [params.jobTitle=''] - Optional candidate provided title
 * @param {string} [params.companyName=''] - Optional candidate provided company
 * @param {object} [options={}]
 * @returns {Promise<object>}
 */
export const analyzeJobDescription = async ({
  rawJobDescription = '',
  jobTitle = '',
  companyName = '',
  options = {},
}) => {
  if (!rawJobDescription || typeof rawJobDescription !== 'string' || rawJobDescription.trim().length < 20) {
    throw new Error('Job description is too brief or empty to analyze.');
  }

  const askAI = options.askAI || defaultAskAI;
  const deterministicFallback = buildDeterministicJobProfile(rawJobDescription, jobTitle, companyName);

  const prompt = `You are an expert Technical Recruiter and ATS Requirement Analyst.
Analyze the following Job Description (JD) and extract explicit, structured requirements.

IMPORTANT RULES:
1. SEPARATE mandatory (must-have) technical skills from preferred (nice-to-have) skills.
2. Extract responsibilities, minimum experience, education, and domain knowledge.
3. Group technical requirements into programmingLanguages, frameworks, databases, and tools.
4. Do NOT fabricate requirements that are not stated in the JD.

JOB DESCRIPTION:
"""
${rawJobDescription.slice(0, 15000)}
"""

RETURN STRICT JSON ONLY:
{
  "jobTitle": "${jobTitle || 'Extracted Job Title'}",
  "companyName": "${companyName || 'Extracted Company Name'}",
  "experienceRequirement": "e.g. 3+ years experience",
  "seniorityLevel": "Entry-Level | Mid-Level | Senior-Level | Lead/Staff-Level",
  "extractedRequirements": {
    "requiredTechnicalSkills": ["Must-have skill 1", "Must-have skill 2"],
    "preferredTechnicalSkills": ["Nice-to-have skill 1"],
    "programmingLanguages": ["Language 1"],
    "frameworks": ["Framework 1"],
    "databases": ["Database 1"],
    "tools": ["Tool 1"],
    "responsibilities": ["Primary responsibility 1", "Responsibility 2"],
    "educationRequirements": ["Degree requirements"],
    "certifications": ["Certification if required"],
    "domainKnowledge": ["e.g. Distributed Systems, FinTech"],
    "keywords": ["Top 10-15 essential ATS keywords"]
  }
}`;

  try {
    const rawAiResponse = await askAI(
      [
        { role: 'system', content: 'You are an objective job description requirements parsing engine. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 2000, temperature: 0.1 }
    );

    const { data } = safeParseJson(rawAiResponse);
    if (data && typeof data === 'object') {
      const reqs = data.extractedRequirements || {};

      return {
        jobTitle: String(data.jobTitle || jobTitle || deterministicFallback.jobTitle).trim(),
        companyName: String(data.companyName || companyName || deterministicFallback.companyName).trim(),
        experienceRequirement: String(data.experienceRequirement || deterministicFallback.experienceRequirement).trim(),
        seniorityLevel: data.seniorityLevel || deterministicFallback.seniorityLevel,
        extractedRequirements: {
          requiredTechnicalSkills: normalizeSkillList(Array.isArray(reqs.requiredTechnicalSkills) ? reqs.requiredTechnicalSkills : deterministicFallback.extractedRequirements.requiredTechnicalSkills),
          preferredTechnicalSkills: normalizeSkillList(Array.isArray(reqs.preferredTechnicalSkills) ? reqs.preferredTechnicalSkills : deterministicFallback.extractedRequirements.preferredTechnicalSkills),
          programmingLanguages: normalizeSkillList(Array.isArray(reqs.programmingLanguages) ? reqs.programmingLanguages : deterministicFallback.extractedRequirements.programmingLanguages),
          frameworks: normalizeSkillList(Array.isArray(reqs.frameworks) ? reqs.frameworks : deterministicFallback.extractedRequirements.frameworks),
          databases: normalizeSkillList(Array.isArray(reqs.databases) ? reqs.databases : deterministicFallback.extractedRequirements.databases),
          tools: normalizeSkillList(Array.isArray(reqs.tools) ? reqs.tools : deterministicFallback.extractedRequirements.tools),
          responsibilities: Array.isArray(reqs.responsibilities) && reqs.responsibilities.length > 0 ? reqs.responsibilities : deterministicFallback.extractedRequirements.responsibilities,
          educationRequirements: Array.isArray(reqs.educationRequirements) ? reqs.educationRequirements : deterministicFallback.extractedRequirements.educationRequirements,
          certifications: Array.isArray(reqs.certifications) ? reqs.certifications : [],
          domainKnowledge: Array.isArray(reqs.domainKnowledge) ? reqs.domainKnowledge : deterministicFallback.extractedRequirements.domainKnowledge,
          keywords: normalizeSkillList(Array.isArray(reqs.keywords) ? reqs.keywords : deterministicFallback.extractedRequirements.keywords),
        },
      };
    }
  } catch (err) {
    // Retain deterministic fallback on AI timeout or failure
  }

  return deterministicFallback;
};
