/**
 * @file knowledgeGap.service.js
 * Grounded Topic Mastery & Weak-Area Detection Engine for Prepper AI.
 * 
 * Tracks candidate competency progression, validates topics against approved domain registries,
 * and extracts identifiable knowledge gaps and technical strengths directly from Module 2 evidence.
 */

import { TOPIC_STATUS, GAP_SEVERITY } from '../contracts/adaptiveContracts.js';

/**
 * Standard baseline competencies for common roles and modes.
 */
const BASELINE_COMPETENCIES_BY_ROLE = {
  frontend: ['JavaScript', 'TypeScript', 'React', 'State Management', 'CSS & Responsive Design', 'Web Performance', 'Browser APIs', 'REST APIs'],
  backend: ['Node.js', 'Express.js', 'Database Modeling & MongoDB', 'RESTful API Design', 'Authentication & Security', 'Async Programming & Event Loop', 'System Architecture', 'Caching & Redis'],
  fullstack: ['JavaScript & TypeScript', 'React', 'Node.js & Express', 'MongoDB & Databases', 'API Design & Integration', 'Authentication & Authorization', 'System Design', 'Performance Optimization'],
  hr: ['Leadership & Collaboration', 'Conflict Resolution', 'Project Ownership', 'Communication & Adaptability', 'Time Management', 'Problem Solving Under Pressure']
};

/**
 * Derives an authoritative list of approved competencies from the candidate's
 * role, skills, projects, and interview mode.
 * 
 * @param {Object} params
 * @param {string} params.role
 * @param {Array<string|Object>} [params.skills=[]]
 * @param {Array<string|Object>} [params.projects=[]]
 * @param {string} [params.mode='Technical']
 * @returns {Array<string>} Normalized list of canonical approved competencies
 */
export const deriveApprovedCompetencies = ({
  role = '',
  skills = [],
  projects = [],
  mode = 'Technical'
}) => {
  const approved = new Set();
  const safeMode = String(mode || '').toLowerCase();

  // 1. Add mode-specific baseline competencies
  if (safeMode === 'hr' || safeMode === 'behavioral') {
    BASELINE_COMPETENCIES_BY_ROLE.hr.forEach(c => approved.add(c));
    return Array.from(approved);
  }

  // 2. Add role-aligned baseline competencies
  const safeRole = String(role || '').toLowerCase();
  if (safeRole.includes('front') || safeRole.includes('ui') || safeRole.includes('web')) {
    BASELINE_COMPETENCIES_BY_ROLE.frontend.forEach(c => approved.add(c));
  } else if (safeRole.includes('back') || safeRole.includes('node') || safeRole.includes('server')) {
    BASELINE_COMPETENCIES_BY_ROLE.backend.forEach(c => approved.add(c));
  } else {
    BASELINE_COMPETENCIES_BY_ROLE.fullstack.forEach(c => approved.add(c));
  }

  // 3. Add explicit skills from resume
  if (Array.isArray(skills)) {
    skills.forEach(s => {
      const name = typeof s === 'string' ? s.trim() : (s?.name || s?.title || '').trim();
      if (name.length >= 2 && name.length <= 40) {
        approved.add(name);
      }
    });
  }

  // 4. Add core technologies from projects
  if (Array.isArray(projects)) {
    projects.forEach(p => {
      const technologies = Array.isArray(p.technologies) ? p.technologies : [];
      technologies.forEach(t => {
        if (typeof t === 'string' && t.trim().length >= 2) {
          approved.add(t.trim());
        }
      });
      const name = typeof p === 'string' ? p : (p?.name || p?.title || '');
      if (name && name.length < 30) {
        approved.add(`Project: ${name.trim()}`);
      }
    });
  }

  return Array.from(approved);
};

/**
 * Normalizes an arbitrary topic string to the closest approved competency.
 * Prevents AI hallucinations from introducing arbitrary or unrelated concepts.
 * 
 * @param {string} rawTopic
 * @param {Array<string>} approvedCompetencies
 * @returns {string} Canonical approved competency
 */
export const normalizeTopicToCompetency = (rawTopic = '', approvedCompetencies = []) => {
  const safeRaw = String(rawTopic || '').trim();
  if (!safeRaw) return approvedCompetencies[0] || 'Core Technical Concepts';

  // Exact or case-insensitive match
  const lowerRaw = safeRaw.toLowerCase();
  const directMatch = approvedCompetencies.find(c => c.toLowerCase() === lowerRaw);
  if (directMatch) return directMatch;

  // Substring inclusion match
  const partialMatch = approvedCompetencies.find(c => {
    const lowerC = c.toLowerCase();
    return lowerRaw.includes(lowerC) || lowerC.includes(lowerRaw);
  });
  if (partialMatch) return partialMatch;

  // Word token overlap match (e.g. "MongoDB" in "MongoDB & Databases")
  const rawWords = lowerRaw.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  let bestMatch = null;
  let maxOverlap = 0;

  for (const c of approvedCompetencies) {
    const cWords = c.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const overlap = rawWords.filter(w => cWords.includes(w)).length;
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestMatch = c;
    }
  }
  if (bestMatch && maxOverlap > 0) return bestMatch;

  // Fallback to top approved competency
  return approvedCompetencies[0] || 'Core Technical Concepts';
};

/**
 * Updates the candidate's topic performance record in the interview state.
 * 
 * @param {Array<Object>} topicPerformanceList - Existing topic performance array
 * @param {string} topic - Validated topic name
 * @param {number} score - Current score (0 to 10)
 * @param {number} questionIndex - Index of the question evaluated
 * @returns {Array<Object>} Updated topic performance array
 */
export const updateTopicPerformanceRecord = (
  topicPerformanceList = [],
  topic = 'General',
  score = 6,
  questionIndex = 0
) => {
  const numScore = Number(score) || 0;
  const list = Array.isArray(topicPerformanceList) ? [...topicPerformanceList] : [];
  const existingIdx = list.findIndex(t => t.topic.toLowerCase() === topic.toLowerCase());

  if (existingIdx >= 0) {
    const existing = list[existingIdx];
    const newScores = [...(existing.scores || []), numScore];
    const totalQuestions = newScores.length;
    const avgScore = Number((newScores.reduce((a, b) => a + b, 0) / totalQuestions).toFixed(1));

    let status = TOPIC_STATUS.AVERAGE;
    if (avgScore >= 7.5) status = TOPIC_STATUS.STRONG;
    else if (avgScore < 5.0) status = TOPIC_STATUS.WEAK;

    list[existingIdx] = {
      ...existing,
      totalQuestions,
      avgScore,
      scores: newScores,
      status,
      lastCoveredQuestionIndex: questionIndex
    };
  } else {
    let status = TOPIC_STATUS.AVERAGE;
    if (numScore >= 7.5) status = TOPIC_STATUS.STRONG;
    else if (numScore < 5.0) status = TOPIC_STATUS.WEAK;

    list.push({
      topic,
      totalQuestions: 1,
      avgScore: Number(numScore.toFixed(1)),
      scores: [numScore],
      status,
      lastCoveredQuestionIndex: questionIndex
    });
  }

  return list;
};

/**
 * Detects knowledge gaps and technical strengths directly from Module 2 evidence.
 * 
 * @param {Object} params
 * @param {string} params.topic - Validated competency topic
 * @param {number} params.score - Question score (0 to 10)
 * @param {Object} params.evidenceEvaluation - Module 2 evaluation payload
 * @param {number} params.questionIndex - Question index
 * @returns {Object} { newGaps: Array, newStrengths: Array }
 */
export const detectKnowledgeGapsAndStrengths = ({
  topic = 'General',
  score = 6,
  evidenceEvaluation = null,
  questionIndex = 0
}) => {
  const newGaps = [];
  const newStrengths = [];
  const numScore = Number(score) || 0;
  const evidenceList = Array.isArray(evidenceEvaluation?.evidence) ? evidenceEvaluation.evidence : [];

  // 1. Detect Knowledge Gaps
  evidenceList.forEach(e => {
    if (e.classification === 'misunderstanding' || e.classification === 'incorrect' || e.classification === 'missing') {
      let severity = GAP_SEVERITY.MODERATE;
      if (e.classification === 'misunderstanding' || numScore < 4.0) {
        severity = GAP_SEVERITY.CRITICAL;
      } else if (e.classification === 'missing' && numScore >= 6.0) {
        severity = GAP_SEVERITY.MINOR;
      }

      newGaps.push({
        topic,
        severity,
        detectedAtQuestionIndex: questionIndex,
        description: e.explanation || e.concept || `Knowledge gap observed in ${topic}`,
        misconceptionSnippet: e.excerpt || ""
      });
    }
  });

  // If score is weak but no explicit misconception evidence was parsed, register generic gap
  if (numScore < 5.0 && newGaps.length === 0) {
    newGaps.push({
      topic,
      severity: numScore < 3.0 ? GAP_SEVERITY.CRITICAL : GAP_SEVERITY.MODERATE,
      detectedAtQuestionIndex: questionIndex,
      description: `Candidate scored ${numScore}/10 on ${topic}. Demonstrated insufficient technical depth or accuracy.`,
      misconceptionSnippet: ""
    });
  }

  // 2. Detect Technical Strengths
  if (numScore >= 7.5) {
    const verifiedEvidence = evidenceList.filter(e => e.classification === 'correct' && e.groundedInTranscript);
    const excerpt = verifiedEvidence.length > 0 ? (verifiedEvidence[0].excerpt || "") : "";

    let proficiency = 'proficient';
    if (numScore >= 9.0) proficiency = 'expert';
    else if (numScore >= 8.2) proficiency = 'advanced';

    newStrengths.push({
      topic,
      proficiency,
      detectedAtQuestionIndex: questionIndex,
      evidenceExcerpt: excerpt
    });
  }

  return { newGaps, newStrengths };
};
