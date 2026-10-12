/**
 * @file crossExamination.contracts.js
 * Domain contracts, enums, type definitions, and validation rules for
 * Prepper AI — Resume & Project Cross-Examination.
 */

import crypto from 'node:crypto';

/**
 * Technical claim categories classification.
 * Distinguishes concrete contributions, architecture choices, scale, and tools.
 */
export const CLAIM_CATEGORIES = Object.freeze({
  TECHNICAL_SKILL: 'TECHNICAL_SKILL',
  PROJECT_CONTRIBUTION: 'PROJECT_CONTRIBUTION',
  ARCHITECTURE_DECISION: 'ARCHITECTURE_DECISION',
  SCALE_METRIC: 'SCALE_METRIC',
  TOOL_OR_DATABASE: 'TOOL_OR_DATABASE',
  DEPLOYMENT_INFRASTRUCTURE: 'DEPLOYMENT_INFRASTRUCTURE',
  RESPONSIBILITY_AND_OWNERSHIP: 'RESPONSIBILITY_AND_OWNERSHIP',
  PROBLEM_STATEMENT: 'PROBLEM_STATEMENT',
  FAILURE_HANDLING: 'FAILURE_HANDLING',
});

/**
 * Source provenance types.
 * Distinguishes direct quotes from AI inferences or candidate responses.
 */
export const PROVENANCE_TYPES = Object.freeze({
  EXPLICIT_SOURCE_STATEMENT: 'EXPLICIT_SOURCE_STATEMENT',
  AI_INFERRED_CATEGORY: 'AI_INFERRED_CATEGORY',
  CANDIDATE_CLARIFICATION: 'CANDIDATE_CLARIFICATION',
});

/**
 * Confidence level of extraction / classification.
 */
export const CONFIDENCE_LEVELS = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNCERTAIN: 'UNCERTAIN',
});

/**
 * Claim verification status in assessment.
 */
export const VERIFICATION_STATUSES = Object.freeze({
  UNVERIFIED: 'UNVERIFIED',
  DEMONSTRATED: 'DEMONSTRATED',
  PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  UNRESOLVED_CONTRADICTION: 'UNRESOLVED_CONTRADICTION',
});

/**
 * State machine for Cross-Examination session lifecycle.
 */
export const SESSION_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  AWAITING_ANSWER: 'awaiting_answer',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABANDONED: 'abandoned',
});

/**
 * Valid state transitions for session progression.
 */
export const ALLOWED_SESSION_TRANSITIONS = Object.freeze({
  [SESSION_STATUSES.DRAFT]: [SESSION_STATUSES.ACTIVE, SESSION_STATUSES.ABANDONED, SESSION_STATUSES.FAILED],
  [SESSION_STATUSES.ACTIVE]: [SESSION_STATUSES.AWAITING_ANSWER, SESSION_STATUSES.COMPLETED, SESSION_STATUSES.FAILED, SESSION_STATUSES.ABANDONED],
  [SESSION_STATUSES.AWAITING_ANSWER]: [SESSION_STATUSES.ACTIVE, SESSION_STATUSES.COMPLETED, SESSION_STATUSES.FAILED, SESSION_STATUSES.ABANDONED],
  [SESSION_STATUSES.COMPLETED]: [],
  [SESSION_STATUSES.FAILED]: [],
  [SESSION_STATUSES.ABANDONED]: [],
});

/**
 * Question inquiry types for cross-examination probing.
 */
export const INQUIRY_TYPES = Object.freeze({
  CLAIM_VERIFICATION: 'CLAIM_VERIFICATION',
  TECHNICAL_EXPLANATION: 'TECHNICAL_EXPLANATION',
  ARCHITECTURE_TRADEOFF: 'ARCHITECTURE_TRADEOFF',
  IMPLEMENTATION_PROBING: 'IMPLEMENTATION_PROBING',
  DEBUGGING_FAILURE_SCENARIO: 'DEBUGGING_FAILURE_SCENARIO',
  TESTING_VALIDATION: 'TESTING_VALIDATION',
  CONTRIBUTION_VERIFICATION: 'CONTRIBUTION_VERIFICATION',
  FOLLOW_UP_PROBE: 'FOLLOW_UP_PROBE',
});

/**
 * Evidence strength evaluated from candidate answers.
 */
export const EVIDENCE_STRENGTHS = Object.freeze({
  STRONG: 'STRONG',
  MODERATE: 'MODERATE',
  WEAK: 'WEAK',
  CONTRADICTORY: 'CONTRADICTORY',
  ABSENT: 'ABSENT',
});

/**
 * Generates stable domain identifiers.
 * @param {string} prefix
 * @returns {string}
 */
export const generateDomainId = (prefix = 'id') => {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * Computes SHA-256 hash of text for provenance indexing.
 * @param {string} text
 * @returns {string}
 */
export const hashSourceText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
};

/**
 * Validates a single Resume/Project Claim object against domain contract.
 * @param {object} claim
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateClaimContract = (claim) => {
  const errors = [];
  if (!claim || typeof claim !== 'object') {
    return { isValid: false, errors: ['Claim must be an object'] };
  }

  if (!claim.statement || typeof claim.statement !== 'string' || !claim.statement.trim()) {
    errors.push('Claim statement is required and must be a non-empty string');
  }

  if (claim.statement && claim.statement.length > 500) {
    errors.push('Claim statement exceeds maximum length of 500 characters');
  }

  if (!claim.category || !CLAIM_CATEGORIES[claim.category]) {
    errors.push(`Invalid claim category: ${claim.category}`);
  }

  if (!claim.provenanceType || !PROVENANCE_TYPES[claim.provenanceType]) {
    errors.push(`Invalid provenance type: ${claim.provenanceType}`);
  }

  // Provenance check: Explicit statement claims must have source excerpt
  if (
    claim.provenanceType === PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT &&
    (!claim.sourceExcerpt || typeof claim.sourceExcerpt !== 'string' || !claim.sourceExcerpt.trim())
  ) {
    errors.push('Explicit source statement claims must retain a sourceExcerpt');
  }

  if (claim.confidence && !CONFIDENCE_LEVELS[claim.confidence]) {
    errors.push(`Invalid confidence level: ${claim.confidence}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates a Project Profile against domain contract.
 * @param {object} project
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateProjectProfileContract = (project) => {
  const errors = [];
  if (!project || typeof project !== 'object') {
    return { isValid: false, errors: ['Project must be an object'] };
  }

  if (!project.title || typeof project.title !== 'string' || !project.title.trim()) {
    errors.push('Project title is required');
  }

  if (project.title && project.title.length > 150) {
    errors.push('Project title exceeds 150 characters');
  }

  if (project.claims && !Array.isArray(project.claims)) {
    errors.push('Project claims must be an array');
  } else if (Array.isArray(project.claims)) {
    project.claims.forEach((claim, idx) => {
      const claimVal = validateClaimContract(claim);
      if (!claimVal.isValid) {
        errors.push(`Claim at index ${idx} is invalid: ${claimVal.errors.join('; ')}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates state transition legality.
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {boolean}
 */
export const isValidStateTransition = (currentStatus, targetStatus) => {
  const allowed = ALLOWED_SESSION_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
};

/**
 * 12 Examination dimensions for in-depth project cross-examination.
 */
export const EXAMINATION_DIMENSIONS = Object.freeze({
  PROBLEM_AND_REQUIREMENTS: 'PROBLEM_AND_REQUIREMENTS',
  INDIVIDUAL_CONTRIBUTION: 'INDIVIDUAL_CONTRIBUTION',
  ARCHITECTURE_BOUNDARIES: 'ARCHITECTURE_BOUNDARIES',
  TECHNOLOGY_SELECTION: 'TECHNOLOGY_SELECTION',
  API_AND_DATA_FLOW: 'API_AND_DATA_FLOW',
  DATABASE_AND_CONSISTENCY: 'DATABASE_AND_CONSISTENCY',
  SECURITY_AND_AUTH: 'SECURITY_AND_AUTH',
  PERFORMANCE_AND_SCALE: 'PERFORMANCE_AND_SCALE',
  ERROR_AND_FAILURE_HANDLING: 'ERROR_AND_FAILURE_HANDLING',
  TESTING_AND_DEPLOYMENT: 'TESTING_AND_DEPLOYMENT',
  METRICS_AND_OUTCOMES: 'METRICS_AND_OUTCOMES',
  TRADEOFFS_AND_LIMITATIONS: 'TRADEOFFS_AND_LIMITATIONS',
});

/**
 * Examination intents defining the probe objective.
 */
export const EXAMINATION_INTENTS = Object.freeze({
  VERIFY_OWNERSHIP: 'VERIFY_OWNERSHIP',
  EXPLORE_TRADEOFF: 'EXPLORE_TRADEOFF',
  CLARIFY_METRIC: 'CLARIFY_METRIC',
  INVESTIGATE_FAILURE: 'INVESTIGATE_FAILURE',
  PROBE_ARCHITECTURE: 'PROBE_ARCHITECTURE',
  VALIDATE_TECH_SELECTION: 'VALIDATE_TECH_SELECTION',
  INSPECT_DATA_CONSISTENCY: 'INSPECT_DATA_CONSISTENCY',
  ASSESS_SECURITY_MEASURES: 'ASSESS_SECURITY_MEASURES',
  EVALUATE_OPERATIONAL_PRACTICES: 'EVALUATE_OPERATIONAL_PRACTICES',
  PROBE_IMPLEMENTATION_DETAIL: 'PROBE_IMPLEMENTATION_DETAIL',
});

/**
 * Grounding types for examination opportunities.
 */
export const OPPORTUNITY_TYPES = Object.freeze({
  DIRECT_CLAIM_PROBE: 'DIRECT_CLAIM_PROBE',
  INFORMATION_GAP_PROBE: 'INFORMATION_GAP_PROBE',
  AMBIGUITY_RESOLVER: 'AMBIGUITY_RESOLVER',
});

/**
 * Discrete priority levels for examination opportunities.
 */
export const PRIORITY_LEVELS = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

/**
 * Validates an examination opportunity against contract rules.
 * @param {object} opportunity
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateExaminationOpportunityContract = (opportunity) => {
  const errors = [];
  if (!opportunity || typeof opportunity !== 'object') {
    return { isValid: false, errors: ['Opportunity must be an object'] };
  }

  if (!opportunity.opportunityId || typeof opportunity.opportunityId !== 'string') {
    errors.push('opportunityId is required');
  }

  if (!opportunity.projectId || typeof opportunity.projectId !== 'string') {
    errors.push('projectId is required');
  }

  if (!opportunity.dimension || !EXAMINATION_DIMENSIONS[opportunity.dimension]) {
    errors.push(`Invalid examination dimension: ${opportunity.dimension}`);
  }

  if (!opportunity.examinationIntent || !EXAMINATION_INTENTS[opportunity.examinationIntent]) {
    errors.push(`Invalid examination intent: ${opportunity.examinationIntent}`);
  }

  if (!opportunity.opportunityType || !OPPORTUNITY_TYPES[opportunity.opportunityType]) {
    errors.push(`Invalid opportunity type: ${opportunity.opportunityType}`);
  }

  if (!opportunity.priorityLevel || !PRIORITY_LEVELS[opportunity.priorityLevel]) {
    errors.push(`Invalid priority level: ${opportunity.priorityLevel}`);
  }

  if (!opportunity.rationale || typeof opportunity.rationale !== 'string' || !opportunity.rationale.trim()) {
    errors.push('Rationale is required and must be non-empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Question difficulty tiers.
 */
export const QUESTION_DIFFICULTY = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
});

/**
 * Validates a generated cross-examination question against domain contract.
 * @param {object} question
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateQuestionContract = (question) => {
  const errors = [];
  if (!question || typeof question !== 'object') {
    return { isValid: false, errors: ['Question must be an object'] };
  }

  if (!question.questionId || typeof question.questionId !== 'string') {
    errors.push('questionId is required');
  }

  if (!question.targetProjectId || typeof question.targetProjectId !== 'string') {
    errors.push('targetProjectId is required');
  }

  if (!question.questionText || typeof question.questionText !== 'string' || !question.questionText.trim()) {
    errors.push('questionText is required and must be non-empty');
  }

  if (question.questionText && (question.questionText.length < 15 || question.questionText.length > 500)) {
    errors.push('questionText must be between 15 and 500 characters');
  }

  if (question.difficulty && !Object.values(QUESTION_DIFFICULTY).includes(question.difficulty)) {
    errors.push(`Invalid difficulty: ${question.difficulty}`);
  }

  if (question.inquiryType && !INQUIRY_TYPES[question.inquiryType]) {
    errors.push(`Invalid inquiryType: ${question.inquiryType}`);
  }

  if (question.dimension && !EXAMINATION_DIMENSIONS[question.dimension]) {
    errors.push(`Invalid dimension: ${question.dimension}`);
  }

  if (question.examinationIntent && !EXAMINATION_INTENTS[question.examinationIntent]) {
    errors.push(`Invalid examinationIntent: ${question.examinationIntent}`);
  }

  if (question.expectedEvidence && !Array.isArray(question.expectedEvidence)) {
    errors.push('expectedEvidence must be an array of concept strings');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};


