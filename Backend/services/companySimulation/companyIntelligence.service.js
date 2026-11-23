import CompanyProfile from '../../models/companyProfile.model.js';
import { getCuratedProfiles, findCuratedProfile } from './curatedCompanyProfiles.js';
import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';

/**
 * Creates a clean URL-friendly slug from a company name
 */
export const generateCompanySlug = (name) => {
  if (!name || typeof name !== 'string') return 'general-tech';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Retrieves all available companies (curated top companies + user-created companies in DB)
 */
export const getAvailableCompanies = async () => {
  const curated = getCuratedProfiles();

  try {
    const dbProfiles = await CompanyProfile.find().lean();
    const curatedSlugs = new Set(curated.map((c) => c.slug));

    const extraProfiles = dbProfiles.filter((p) => !curatedSlugs.has(p.slug));
    return [...curated, ...extraProfiles];
  } catch (err) {
    // If DB has error, return curated profiles smoothly
    return curated;
  }
};

/**
 * Generates deterministic fallback intelligence when AI is unreachable.
 */
export const generateFallbackCompanyProfile = (companyName, targetRole = '') => {
  const slug = generateCompanySlug(companyName);
  const cleanName = companyName.trim();

  return {
    name: cleanName,
    slug,
    industry: 'Technology & Digital Services',
    tier: 'Enterprise Tech',
    description: `${cleanName} technology organization evaluating technical competence, engineering mindset, and team collaboration.`,
    interviewCulture: `Rigorous technical evaluation emphasizing core problem solving for ${targetRole || 'engineering roles'}, clean architectural communication, and practical engineering judgment.`,
    supportedRounds: [
      {
        roundId: 'online_assessment',
        name: 'Round 1: Online Technical Assessment',
        focusAreas: ['Core problem solving', 'Language fundamentals', 'Clean algorithmic logic'],
        recommendedDuration: 45,
        typicalQuestionCount: 3,
        format: 'coding',
      },
      {
        roundId: 'technical_round_1',
        name: 'Technical Round 1: Core Engineering & DSA',
        focusAreas: ['Data Structures & Algorithms', 'Language specifics', 'Debugging & Code Quality'],
        recommendedDuration: 45,
        typicalQuestionCount: 5,
        format: 'mixed',
      },
      {
        roundId: 'technical_round_2',
        name: 'Technical Round 2: System Architecture & APIs',
        focusAreas: ['Backend/Frontend Architecture', 'API Design & Integration', 'Database & Caching'],
        recommendedDuration: 45,
        typicalQuestionCount: 4,
        format: 'conceptual',
      },
      {
        roundId: 'system_design',
        name: 'System Design & Scalability',
        focusAreas: ['Microservices architecture', 'High availability & data consistency', 'Tradeoff evaluation'],
        recommendedDuration: 50,
        typicalQuestionCount: 3,
        format: 'system_design',
      },
      {
        roundId: 'hiring_manager',
        name: 'Hiring Manager & Behavioral Fit',
        focusAreas: ['Cross-functional collaboration', 'Handling deadlines & roadblocks', 'Ownership & leadership'],
        recommendedDuration: 40,
        typicalQuestionCount: 4,
        format: 'behavioral',
      },
      {
        roundId: 'final_hr',
        name: 'Final HR & Culture Alignment',
        focusAreas: ['Cultural alignment', 'Career trajectory', 'Working style'],
        recommendedDuration: 30,
        typicalQuestionCount: 4,
        format: 'behavioral',
      },
    ],
    commonCompetencies: [
      'Problem Solving & Logic',
      'System Architecture',
      'Clean Code & Best Practices',
      'Collaboration & Ownership',
    ],
    techStackFocus: ['JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'SQL', 'Cloud (AWS/GCP/Azure)'],
    behavioralPrinciples: [
      'Accountability & Ownership',
      'Continuous Learning',
      'Transparent Communication',
      'Customer Value',
    ],
    sampleQuestionThemes: [
      `How do you design and structure applications for ${cleanName}'s scale?`,
      'Describe a challenging technical obstacle you overcame and the architecture tradeoffs considered.',
    ],
    disclaimer: `Publicly documented interview preparation patterns; not affiliated with official ${cleanName} hiring evaluations.`,
    isVerified: false,
  };
};

/**
 * Retrieves an existing company profile from curated list or DB,
 * or synthesizes intelligence on-demand using AI with fallback.
 */
export const getOrGenerateCompanyProfile = async ({
  companyName,
  targetRole = 'Software Engineer',
  jobDescription = '',
  userId = null,
  options = {},
}) => {
  if (!companyName || typeof companyName !== 'string') {
    throw new Error('companyName is required to retrieve or generate company intelligence');
  }

  const slug = generateCompanySlug(companyName);

  // 1. Check curated list
  const curated = findCuratedProfile(companyName) || findCuratedProfile(slug);
  if (curated) {
    return curated;
  }

  // 2. Check MongoDB for previously cached company profile
  try {
    const existing = await CompanyProfile.findOne({ slug }).lean();
    if (existing) {
      return existing;
    }
  } catch (err) {
    // If DB check fails, proceed to dynamic generation
  }

  // 3. Synthesize via OpenRouter AI
  const askAI = options.askAI || defaultAskAI;
  let synthesizedData = null;

  try {
    const prompt = `You are a Principal Tech Recruiter and Technical Interview Architect.
Analyze the company "${companyName}" and target role "${targetRole}".
${jobDescription ? `Provided Job Description:\n${jobDescription.slice(0, 1500)}\n` : ''}

Generate structured company interview intelligence reflecting publicly known engineering hiring expectations.
CRITICAL CONSTRAINTS:
1. Strictly base information on publicly documented engineering practices and standards.
2. NEVER claim access to confidential or leaked questions.
3. Include realistic interview rounds, competencies, tech stack, and behavioral principles.

RETURN STRICT JSON matching this schema:
{
  "name": "${companyName.trim()}",
  "industry": "e.g. Enterprise Cloud | FinTech | E-Commerce | HealthTech",
  "tier": "Tier 1 Product | Enterprise Tech | IT Services & Consulting | FinTech & Banking | Startup / Unicorn",
  "description": "2-sentence company summary",
  "interviewCulture": "Paragraph describing interview expectations, evaluation rigor, and style",
  "supportedRounds": [
    {
      "roundId": "online_assessment | technical_round_1 | technical_round_2 | system_design | hiring_manager | behavioral | final_hr",
      "name": "Full Round Title",
      "focusAreas": ["Topic 1", "Topic 2", "Topic 3"],
      "recommendedDuration": 45,
      "typicalQuestionCount": 4,
      "format": "coding | conceptual | system_design | behavioral | mixed"
    }
  ],
  "commonCompetencies": ["Competency 1", "Competency 2", "Competency 3", "Competency 4"],
  "techStackFocus": ["Tech 1", "Tech 2", "Tech 3"],
  "behavioralPrinciples": ["Principle 1", "Principle 2"],
  "sampleQuestionThemes": ["Sample question 1", "Sample question 2"]
}`;

    const rawResponse = await askAI(
      [
        { role: 'system', content: 'You are an expert technical recruiter and interviewer. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 2000, temperature: 0.3 }
    );

    const { data } = safeParseJson(rawResponse);
    if (data && data.name && Array.isArray(data.supportedRounds) && data.supportedRounds.length > 0) {
      synthesizedData = {
        ...data,
        slug,
        isVerified: false,
        disclaimer: `Publicly documented interview preparation patterns; not affiliated with official ${data.name} hiring evaluations.`,
        createdBy: userId || null,
      };
    }
  } catch (aiErr) {
    // Graceful fallback to deterministic generator
  }

  if (!synthesizedData) {
    synthesizedData = generateFallbackCompanyProfile(companyName, targetRole);
    if (userId) synthesizedData.createdBy = userId;
  }

  // 4. Cache in MongoDB
  try {
    const newDoc = new CompanyProfile(synthesizedData);
    await newDoc.save();
    return newDoc.toObject();
  } catch (saveErr) {
    // If concurrent insert occurred, fetch existing
    try {
      const existing = await CompanyProfile.findOne({ slug }).lean();
      if (existing) return existing;
    } catch (e) {}
    return synthesizedData;
  }
};

/**
 * Intelligently recommends an interview structure based on company, role, and experience.
 */
export const recommendInterviewStructure = ({
  companyProfile,
  targetRole = 'Software Engineer',
  experienceLevel = 'Intermediate',
}) => {
  const roleLower = (targetRole || '').toLowerCase();
  const expLower = (experienceLevel || '').toLowerCase();

  const isSenior = expLower.includes('senior') || expLower.includes('lead') || expLower.includes('architect') || expLower.includes('principal');
  const isEntry = expLower.includes('fresher') || expLower.includes('intern') || expLower.includes('junior') || expLower.includes('entry');
  const isManager = roleLower.includes('manager') || roleLower.includes('director') || roleLower.includes('lead');
  const isCodingFocused = roleLower.includes('software') || roleLower.includes('developer') || roleLower.includes('frontend') || roleLower.includes('backend') || roleLower.includes('full stack');

  let recommendedRoundId = 'technical_round_1';
  let recommendedRoundTitle = 'Technical Round 1: Core Engineering & Problem Solving';
  let rationale = 'Comprehensive technical screening evaluating role-specific competencies and problem-solving depth.';

  if (isManager) {
    recommendedRoundId = 'hiring_manager';
    recommendedRoundTitle = 'Hiring Manager: Leadership, Strategy & Team Delivery';
    rationale = 'Evaluates team leadership, cross-functional execution, architectural judgment, and cultural fit.';
  } else if (isSenior && !isEntry) {
    recommendedRoundId = 'system_design';
    recommendedRoundTitle = 'System Design: Scalability & Architecture';
    rationale = 'Recommended for Senior/Staff engineers to evaluate distributed system design, high availability, and architectural tradeoffs.';
  } else if (isEntry) {
    recommendedRoundId = 'technical_round_1';
    recommendedRoundTitle = 'Technical Round 1: Core Fundamentals & DSA';
    rationale = 'Recommended for early-career roles to test foundational computer science principles, data structures, and algorithmic clarity.';
  }

  // Check if company has this round
  const matchedRound = companyProfile?.supportedRounds?.find((r) => r.roundId === recommendedRoundId);

  return {
    recommendedRoundId,
    recommendedRoundTitle: matchedRound ? matchedRound.name : recommendedRoundTitle,
    recommendedDuration: matchedRound ? matchedRound.recommendedDuration : 45,
    recommendedQuestionCount: matchedRound ? matchedRound.typicalQuestionCount : 5,
    format: matchedRound ? matchedRound.format : (isCodingFocused ? 'coding' : 'conceptual'),
    rationale,
    focusAreas: matchedRound ? matchedRound.focusAreas : ['Core Problem Solving', 'Clean Code', 'Communication'],
  };
};
