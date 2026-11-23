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
export const createEmptyAnswerEvaluation = ({
  questionText = '',
  category = QUESTION_CATEGORIES.TECHNICAL,
  isTimedOut = false,
}) => {
  const weights = getCriteriaWeights(category);
  const reasoning = isTimedOut
    ? 'Time expired before an answer was submitted.'
    : 'No response was recorded for this question.';

  const criteria = ALL_CRITERIA_NAMES.map((name) => ({
    name,
    score: 0,
    maxScore: 10,
    weight: weights[name] || 0.16,
    reasoning,
    evidence: [
      {
        text: '',
        classification: EVIDENCE_CLASSIFICATIONS.MISSING,
        explanation: reasoning,
      },
    ],
    missingConcepts: ['Complete answer to: ' + questionText.slice(0, 80)],
    improvements: ['Formulate and articulate an answer within the allocated time limit.'],
  }));

  return {
    overallScore: 0,
    maxScore: 10,
    category,
    criteria,
    strengths: [],
    weaknesses: ['Question was left unanswered.'],
    missingConcepts: ['Entire topic of: ' + questionText.slice(0, 80)],
    improvements: ['Ensure each question is attempted, even with partial or high-level reasoning.'],
    summaryFeedback: isTimedOut ? 'Time expired. No response submitted.' : 'Unanswered question.',
    evaluationConfidence: 1.0,
  };
};

/**
 * Builds system prompt for evidence-based evaluation.
 */
