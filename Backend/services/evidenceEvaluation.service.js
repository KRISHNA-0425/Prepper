/**
 * @file evidenceEvaluation.service.js
 * Evidence-Based Interview Evaluation Engine for Prepper AI.
 * Provides question-aware rubric scoring, strict evidence extraction from candidate answers,
 * mathematical consistency enforcement, and interview-level performance analytics.
 */

import {
  EVALUATION_CRITERIA,
  ALL_CRITERIA_NAMES,
  QUESTION_CATEGORIES,
  EVIDENCE_CLASSIFICATIONS,
  detectQuestionCategory,
  getCriteriaWeights,
} from '../contracts/evaluationRubrics.js';
import { askAI as defaultAskAI } from './openRouter.service.js';
import { safeParseJson } from './resumeIntelligence.service.js';

export {
  EVALUATION_CRITERIA,
  ALL_CRITERIA_NAMES,
  QUESTION_CATEGORIES,
  EVIDENCE_CLASSIFICATIONS,
  detectQuestionCategory,
  getCriteriaWeights,
};

/**
 * Normalizes text for lenient substring search (lowercasing, collapsing whitespace, stripping punctuation).
 * @param {string} text
 * @returns {string}
 */
export const normalizeTextForSearch = (text = '') => {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Verifies whether an extracted evidence excerpt is grounded in the candidate's actual answer.
 * @param {string} excerpt
 * @param {string} candidateAnswer
 * @returns {boolean}
 */
export const verifyExcerptInAnswer = (excerpt = '', candidateAnswer = '') => {
  if (!excerpt || !candidateAnswer) return false;
  const normExcerpt = normalizeTextForSearch(excerpt);
  const normAnswer = normalizeTextForSearch(candidateAnswer);

  if (!normExcerpt || normExcerpt.length < 4) return false;
  if (normAnswer.includes(normExcerpt)) return true;

  // Check if first 3-5 words of the excerpt match a substring of the answer
  const excerptWords = normExcerpt.split(' ').filter(Boolean);
  if (excerptWords.length >= 3) {
    const chunk = excerptWords.slice(0, 4).join(' ');
    if (normAnswer.includes(chunk)) return true;
  }

  return false;
};

/**
 * Generates an evaluation for an empty answer or timed-out question without calling the AI provider.
 * @param {object} params
 * @returns {object}
 */
