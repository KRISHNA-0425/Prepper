/**
 * @file crossExaminationApi.js
 * Frontend API client and domain helpers for AI Resume & Project Cross-Examination.
 * Integrates with protected /api/cross-examination backend endpoints using Axios with credentials.
 */

import axios from 'axios';

// Get backend server URL safely in both Vite client and Node test environments
const resolveServerUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (typeof process !== 'undefined' && process?.env?.VITE_SERVER_URL) {
    return process.env.VITE_SERVER_URL;
  }
  return 'http://localhost:5000';
};

export const backendServerUrl = resolveServerUrl();

// Configuration boundaries matching backend engine limits
export const CROSS_EXAM_BOUNDS = Object.freeze({
  MIN_QUESTION_COUNT: 3,
  MAX_QUESTION_COUNT: 10,
  DEFAULT_QUESTION_COUNT: 5,
  MIN_RESUME_TEXT_CHARS: 50,
  MAX_RESUME_TEXT_CHARS: 30000,
  MAX_ANSWER_CHARS: 5000,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
});

export const MIN_QUESTIONS = CROSS_EXAM_BOUNDS.MIN_QUESTION_COUNT;
export const MAX_QUESTIONS = CROSS_EXAM_BOUNDS.MAX_QUESTION_COUNT;
export const MIN_RESUME_TEXT_LENGTH = CROSS_EXAM_BOUNDS.MIN_RESUME_TEXT_CHARS;
export const MAX_RESUME_TEXT_LENGTH = CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS;
export const MAX_FILE_SIZE_BYTES = CROSS_EXAM_BOUNDS.MAX_FILE_SIZE_BYTES;
export const MAX_TRANSCRIPT_LENGTH = CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS;

/**
 * Validates session setup inputs on the client before network transmission.
 * @param {object} params
 * @returns {{ isValid: boolean, error?: string, errors: Record<string, string> }}
 */
export const validateSessionSetupInput = ({
  inputMode = 'upload',
  resumeFile,
  resumeText,
  targetRole,
  targetDomain,
  questionCount,
}) => {
  const errors = {};

  // Validate targetRole if provided
  if (targetRole !== undefined && (!targetRole || typeof targetRole !== 'string' || !targetRole.trim())) {
    errors.targetRole = 'Target role is required';
  }

  // Validate targetDomain if provided
  if (targetDomain !== undefined && (!targetDomain || typeof targetDomain !== 'string' || !targetDomain.trim())) {
    errors.targetDomain = 'Target domain is required';
  }

  // Validate question count
  const count = Number(questionCount);
  if (isNaN(count) || count < CROSS_EXAM_BOUNDS.MIN_QUESTION_COUNT || count > CROSS_EXAM_BOUNDS.MAX_QUESTION_COUNT) {
    errors.questionCount = `Question count must be between ${CROSS_EXAM_BOUNDS.MIN_QUESTION_COUNT} and ${CROSS_EXAM_BOUNDS.MAX_QUESTION_COUNT}`;
  }

  // If file mode
  if (inputMode === 'file' || (inputMode === 'upload' && resumeFile)) {
    if (!resumeFile) {
      errors.resumeFile = 'Please select a resume PDF file';
    } else {
      const fileName = resumeFile.name ? resumeFile.name.toLowerCase() : '';
      if (!fileName.endsWith('.pdf') && resumeFile.type !== 'application/pdf') {
        errors.resumeFile = 'Only PDF format is supported for resume upload';
      } else if (resumeFile.size > CROSS_EXAM_BOUNDS.MAX_FILE_SIZE_BYTES) {
        errors.resumeFile = 'File size cannot exceed 10MB';
      }
    }
  } else {
    // Text mode
    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < CROSS_EXAM_BOUNDS.MIN_RESUME_TEXT_CHARS) {
      errors.resumeText = `Resume text must be at least ${CROSS_EXAM_BOUNDS.MIN_RESUME_TEXT_CHARS} characters`;
    } else if (resumeText.length > CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS) {
      errors.resumeText = `Resume text cannot exceed ${CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS.toLocaleString()} characters`;
    }
  }

  const isValid = Object.keys(errors).length === 0;
  const firstErrorKey = Object.keys(errors)[0];
  return {
    isValid,
    error: firstErrorKey ? errors[firstErrorKey] : null,
    errors,
  };
};

/**
 * Validates candidate answer input on the client.
 * @param {string} rawTranscript
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validateAnswerInput = (rawTranscript) => {
  if (!rawTranscript || typeof rawTranscript !== 'string' || !rawTranscript.trim()) {
    return {
      isValid: false,
      error: 'Please enter your response before submitting.',
    };
  }

  if (rawTranscript.trim().length > CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS) {
    return {
      isValid: false,
      error: `Answer cannot exceed ${CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS.toLocaleString()} characters`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Defensive client-side allowlist for candidate-facing questions.
 * Ensures evaluator-only metadata (rationale, expectedEvidence, followUpGuidance, scoring, claims)
 * is never retained or rendered in UI state.
 * @param {object} question
 * @returns {object|null}
 */
export const sanitizeCandidateQuestion = (question) => {
  if (!question || typeof question !== 'object') return null;

  const candidateQuestion = {};

  if (question.questionId !== undefined) candidateQuestion.questionId = question.questionId;
  if (question.order !== undefined) candidateQuestion.order = question.order;
  if (question.questionText !== undefined) candidateQuestion.questionText = question.questionText;
  if (question.inquiryType !== undefined) candidateQuestion.inquiryType = question.inquiryType;
  if (question.status !== undefined) candidateQuestion.status = question.status;
  if (question.targetProjectId !== undefined) candidateQuestion.targetProjectId = question.targetProjectId;
  if (question.dimension !== undefined) candidateQuestion.dimension = question.dimension;

  // Handle difficulty
  if (question.difficulty !== undefined) candidateQuestion.difficulty = question.difficulty;
  if (question.difficultyTier !== undefined) candidateQuestion.difficultyTier = question.difficultyTier;
  if (!candidateQuestion.difficulty && !candidateQuestion.difficultyTier) {
    candidateQuestion.difficulty = 'medium';
  }

  // Handle timeLimit
  if (question.timeLimit !== undefined) candidateQuestion.timeLimit = question.timeLimit;
  if (question.timeLimitSeconds !== undefined) candidateQuestion.timeLimitSeconds = question.timeLimitSeconds;
  if (!candidateQuestion.timeLimit && !candidateQuestion.timeLimitSeconds) {
    candidateQuestion.timeLimit = 90;
  }

  return candidateQuestion;
};

/**
 * Generates a stable UUID v4 for request idempotency.
 * @returns {string}
 */
export const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'idem_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// ── API Network Functions ──

/**
 * POST /api/cross-examination/sessions
 * Creates an authenticated cross-examination session from PDF or text.
 */
export const createCrossExaminationSession = async ({
  resumeFile,
  resumeText,
  targetRole,
  targetDomain,
  questionCount,
  idempotencyKey,
}) => {
  const headers = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  let payload;
  if (resumeFile) {
    payload = new FormData();
    payload.append('resume', resumeFile);
    if (targetRole) payload.append('targetRole', targetRole);
    if (targetDomain) payload.append('targetDomain', targetDomain);
    if (questionCount) payload.append('questionCount', questionCount);
    if (idempotencyKey) payload.append('idempotencyKey', idempotencyKey);
  } else {
    payload = {
      resumeText,
      targetRole: targetRole || undefined,
      targetDomain: targetDomain || undefined,
      questionCount: Number(questionCount) || CROSS_EXAM_BOUNDS.DEFAULT_QUESTION_COUNT,
      idempotencyKey,
    };
  }

  const response = await axios.post(
    `${backendServerUrl}/api/cross-examination/sessions`,
    payload,
    {
      headers,
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * GET /api/cross-examination/sessions
 * Lists the authenticated user's recent sessions.
 */
export const getMyCrossExaminationSessions = async (limit = 20) => {
  const response = await axios.get(
    `${backendServerUrl}/api/cross-examination/sessions?limit=${limit}`,
    { withCredentials: true }
  );
  return response.data;
};

/**
 * GET /api/cross-examination/sessions/:sessionId
 * Retrieves an active or completed session by ID.
 */
export const getCrossExaminationSession = async (sessionId) => {
  const response = await axios.get(
    `${backendServerUrl}/api/cross-examination/sessions/${sessionId}`,
    { withCredentials: true }
  );
  return response.data;
};

/**
 * POST /api/cross-examination/sessions/:sessionId/answers
 * Submits an answer transcript for the active question.
 */
export const submitCrossExamAnswer = async (
  sessionId,
  { questionId, rawTranscript, timeTaken, autoAdvance = true }
) => {
  const response = await axios.post(
    `${backendServerUrl}/api/cross-examination/sessions/${sessionId}/answers`,
    {
      questionId,
      rawTranscript: rawTranscript.trim(),
      timeTaken: Number(timeTaken) || 0,
      autoAdvance: Boolean(autoAdvance),
    },
    { withCredentials: true }
  );
  return response.data;
};

/**
 * POST /api/cross-examination/sessions/:sessionId/advance
 * Manually advances session to the next pending question.
 */
export const advanceCrossExamQuestion = async (sessionId) => {
  const response = await axios.post(
    `${backendServerUrl}/api/cross-examination/sessions/${sessionId}/advance`,
    {},
    { withCredentials: true }
  );
  return response.data;
};

/**
 * POST /api/cross-examination/sessions/:sessionId/complete
 * Completes the cross-examination session early or upon final question.
 */
export const completeCrossExamSession = async (sessionId) => {
  const response = await axios.post(
    `${backendServerUrl}/api/cross-examination/sessions/${sessionId}/complete`,
    {},
    { withCredentials: true }
  );
  return response.data;
};

/**
 * GET /api/cross-examination/sessions/:sessionId/report
 * Retrieves the evidence-linked preparation report for a completed session.
 */
export const getCrossExamReport = async (sessionId) => {
  const response = await axios.get(
    `${backendServerUrl}/api/cross-examination/sessions/${sessionId}/report`,
    { withCredentials: true }
  );
  return response.data;
};

/**
 * POST /api/cross-examination/sessions/:sessionId/report
 * Generates or regenerates the preparation report.
 */
export const generateCrossExamReport = async (sessionId, regenerate = false) => {
  const response = await axios.post(
    `${backendServerUrl}/api/cross-examination/sessions/${sessionId}/report?regenerate=${Boolean(regenerate)}`,
    {},
    { withCredentials: true }
  );
  return response.data;
};
