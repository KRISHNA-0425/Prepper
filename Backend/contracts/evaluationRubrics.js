/**
 * @file evaluationRubrics.js
 * Configurable evaluation criteria, question categories, and rubric weight matrices
 * for Prepper AI's Evidence-Based Interview Evaluation Engine.
 */

export const EVALUATION_CRITERIA = {
  TECHNICAL_ACCURACY: 'Technical Accuracy',
  CONCEPTUAL_UNDERSTANDING: 'Conceptual Understanding',
  PRACTICAL_KNOWLEDGE: 'Practical Knowledge',
  DEPTH_OF_EXPLANATION: 'Depth of Explanation',
  PROBLEM_SOLVING_ABILITY: 'Problem-Solving Ability',
  COMMUNICATION_CLARITY: 'Communication Clarity',
};

export const ALL_CRITERIA_NAMES = Object.values(EVALUATION_CRITERIA);

export const QUESTION_CATEGORIES = {
  CONCEPTUAL: 'conceptual',
  CODING: 'coding',
  SYSTEM_DESIGN: 'system_design',
  BEHAVIORAL: 'behavioral',
  TECHNICAL: 'technical',
};

export const EVIDENCE_CLASSIFICATIONS = {
  CORRECT: 'correct',
  PARTIALLY_CORRECT: 'partially_correct',
  INCORRECT: 'incorrect',
  MISSING: 'missing',
  UNSUPPORTED_CLAIM: 'unsupported_claim',
  MISUNDERSTANDING: 'misunderstanding',
  ALTERNATIVE_APPROACH: 'alternative_approach',
};

/**
 * Weights by category - each set must sum strictly to 1.00
 */
export const CRITERIA_WEIGHTS_BY_CATEGORY = {
  [QUESTION_CATEGORIES.CONCEPTUAL]: {
    [EVALUATION_CRITERIA.TECHNICAL_ACCURACY]: 0.30,
    [EVALUATION_CRITERIA.CONCEPTUAL_UNDERSTANDING]: 0.30,
    [EVALUATION_CRITERIA.DEPTH_OF_EXPLANATION]: 0.15,
    [EVALUATION_CRITERIA.PRACTICAL_KNOWLEDGE]: 0.10,
    [EVALUATION_CRITERIA.COMMUNICATION_CLARITY]: 0.10,
    [EVALUATION_CRITERIA.PROBLEM_SOLVING_ABILITY]: 0.05,
  },
  [QUESTION_CATEGORIES.CODING]: {
    [EVALUATION_CRITERIA.TECHNICAL_ACCURACY]: 0.30,
    [EVALUATION_CRITERIA.PROBLEM_SOLVING_ABILITY]: 0.25,
    [EVALUATION_CRITERIA.PRACTICAL_KNOWLEDGE]: 0.20,
    [EVALUATION_CRITERIA.CONCEPTUAL_UNDERSTANDING]: 0.10,
    [EVALUATION_CRITERIA.DEPTH_OF_EXPLANATION]: 0.10,
    [EVALUATION_CRITERIA.COMMUNICATION_CLARITY]: 0.05,
  },
  [QUESTION_CATEGORIES.SYSTEM_DESIGN]: {
    [EVALUATION_CRITERIA.TECHNICAL_ACCURACY]: 0.25,
    [EVALUATION_CRITERIA.PROBLEM_SOLVING_ABILITY]: 0.25,
    [EVALUATION_CRITERIA.DEPTH_OF_EXPLANATION]: 0.20,
    [EVALUATION_CRITERIA.PRACTICAL_KNOWLEDGE]: 0.15,
    [EVALUATION_CRITERIA.CONCEPTUAL_UNDERSTANDING]: 0.10,
    [EVALUATION_CRITERIA.COMMUNICATION_CLARITY]: 0.05,
  },
  [QUESTION_CATEGORIES.BEHAVIORAL]: {
    [EVALUATION_CRITERIA.COMMUNICATION_CLARITY]: 0.30,
    [EVALUATION_CRITERIA.PRACTICAL_KNOWLEDGE]: 0.25,
    [EVALUATION_CRITERIA.PROBLEM_SOLVING_ABILITY]: 0.20,
    [EVALUATION_CRITERIA.DEPTH_OF_EXPLANATION]: 0.15,
    [EVALUATION_CRITERIA.CONCEPTUAL_UNDERSTANDING]: 0.05,
    [EVALUATION_CRITERIA.TECHNICAL_ACCURACY]: 0.05,
  },
  [QUESTION_CATEGORIES.TECHNICAL]: {
    [EVALUATION_CRITERIA.TECHNICAL_ACCURACY]: 0.25,
    [EVALUATION_CRITERIA.CONCEPTUAL_UNDERSTANDING]: 0.20,
    [EVALUATION_CRITERIA.PRACTICAL_KNOWLEDGE]: 0.15,
    [EVALUATION_CRITERIA.DEPTH_OF_EXPLANATION]: 0.15,
    [EVALUATION_CRITERIA.PROBLEM_SOLVING_ABILITY]: 0.15,
    [EVALUATION_CRITERIA.COMMUNICATION_CLARITY]: 0.10,
  },
};

/**
 * Classifies a question into a primary category based on mode, wording, and intent.
 * @param {string} questionText
 * @param {string} [mode='Technical'] - 'HR' | 'Technical'
 * @returns {string} One of QUESTION_CATEGORIES
 */
export const detectQuestionCategory = (questionText = '', mode = 'Technical') => {
  const qLower = String(questionText || '').toLowerCase();
  const safeMode = String(mode || '').toLowerCase();

  if (safeMode === 'hr' || safeMode === 'behavioral') {
    return QUESTION_CATEGORIES.BEHAVIORAL;
  }

  // Behavioral indicators
  if (
    qLower.includes('tell me about a time') ||
    qLower.includes('describe a situation') ||
    qLower.includes('how do you handle conflict') ||
    qLower.includes('how do you prioritize') ||
    qLower.includes('give an example of when')
  ) {
    return QUESTION_CATEGORIES.BEHAVIORAL;
  }

  // System Design indicators
  if (
    qLower.includes('system design') ||
    qLower.includes('design a') ||
    qLower.includes('architect') ||
    qLower.includes('scale') ||
    qLower.includes('high availability') ||
    qLower.includes('microservices') ||
    qLower.includes('distributed system') ||
    qLower.includes('database sharding') ||
    qLower.includes('load balancer')
  ) {
    return QUESTION_CATEGORIES.SYSTEM_DESIGN;
  }

  // Coding / Algorithmic indicators
  if (
    qLower.includes('write a function') ||
    qLower.includes('implement an algorithm') ||
    qLower.includes('time complexity') ||
    qLower.includes('space complexity') ||
    qLower.includes('big o') ||
    qLower.includes('data structure') ||
    qLower.includes('binary tree') ||
    qLower.includes('linked list') ||
    qLower.includes('recursion')
  ) {
    return QUESTION_CATEGORIES.CODING;
  }

  // Conceptual indicators
  if (
    qLower.includes('what is the difference between') ||
    qLower.includes('explain the concept of') ||
    qLower.includes('how does') ||
    qLower.includes('what are the principles of') ||
    qLower.includes('what does it mean when') ||
    qLower.includes('define')
  ) {
    return QUESTION_CATEGORIES.CONCEPTUAL;
  }

  return QUESTION_CATEGORIES.TECHNICAL;
};

/**
 * Returns the weights configuration for a given category.
 * Falls back to 'technical' if unknown.
 * @param {string} category
 * @returns {Record<string, number>}
 */
export const getCriteriaWeights = (category = QUESTION_CATEGORIES.TECHNICAL) => {
  return CRITERIA_WEIGHTS_BY_CATEGORY[category] || CRITERIA_WEIGHTS_BY_CATEGORY[QUESTION_CATEGORIES.TECHNICAL];
};
