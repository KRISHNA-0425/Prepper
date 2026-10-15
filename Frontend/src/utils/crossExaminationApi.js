/**
 * @file crossExaminationApi.js
 * Frontend API client and domain helpers for AI Resume & Project Cross-Examination.
 * Integrates with protected /api/cross-examination backend endpoints using Axios with credentials.
 */

import axios from 'axios';
import { backendServerUrl } from '../App';

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

/**
 * Validates session setup inputs on the client before network transmission.
 * @param {object} params
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validateSessionSetupInput = ({ resumeFile, resumeText, questionCount }) => {
  // Validate question count
  const count = Number(questionCount);
  if (isNaN(count) || count < CROSS_EXAM_BOUNDS.MIN_QUESTION_COUNT || count > CROSS_EXAM_BOUNDS.MAX_QUESTION_COUNT) {
    return {
      isValid: false,
      error: `Question count must be between ${CROSS_EXAM_BOUNDS.MIN_QUESTION_COUNT} and ${CROSS_EXAM_BOUNDS.MAX_QUESTION_COUNT}`,
    };
  }

  // If a file is uploaded
  if (resumeFile) {
    if (!resumeFile.name.toLowerCase().endsWith('.pdf')) {
      return {
        isValid: false,
        error: 'Only PDF resume files (.pdf) are currently supported for upload',
      };
    }
    if (resumeFile.size > CROSS_EXAM_BOUNDS.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: 'Resume PDF exceeds maximum allowed file size of 10MB',
      };
    }
    return { isValid: true };
  }

  // If text is provided
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < CROSS_EXAM_BOUNDS.MIN_RESUME_TEXT_CHARS) {
    return {
      isValid: false,
      error: `Please upload a PDF resume or paste resume text (minimum ${CROSS_EXAM_BOUNDS.MIN_RESUME_TEXT_CHARS} characters)`,
    };
  }

  if (resumeText.length > CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS) {
    return {
      isValid: false,
      error: `Resume text exceeds maximum limit of ${CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS.toLocaleString()} characters`,
    };
  }

  return { isValid: true };
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
      error: 'Answer cannot be empty. Please enter your technical explanation.',
    };
  }

  if (rawTranscript.trim().length > CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS) {
    return {
      isValid: false,
      error: `Answer exceeds maximum limit of ${CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS} characters`,
    };
  }

  return { isValid: true };
};

/**
 * Defensive client-side allowlist for candidate-facing questions.
 * Ensures evaluator-only metadata (rationale, expectedEvidence, followUpGuidance)
 * is never retained or rendered in UI state.
 * @param {object} question
 * @returns {object|null}
 */
export const sanitizeCandidateQuestion = (question) => {
  if (!question || typeof question !== 'object') return null;

  return {
    questionId: question.questionId,
    order: question.order,
    questionText: question.questionText,
    difficulty: question.difficulty || 'medium',
    timeLimit: question.timeLimit || 90,
    status: question.status || 'pending',
    targetProjectId: question.targetProjectId || null,
    inquiryType: question.inquiryType || null,
  };
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
