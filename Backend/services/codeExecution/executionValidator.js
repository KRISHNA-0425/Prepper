/**
 * @file executionValidator.js
 * Input validation, rate-limiting, and lifecycle checks for the code execution engine.
 */

import { EXECUTION_LIMITS } from './executionLimits.js';
import languageRegistry from './languageRegistry.js';
import Interview from '../../models/interview.model.js';

const userLastRunTimestamps = new Map();
let activeExecutionsCount = 0;

export class ExecutionValidator {
  /**
   * Validates source code, language availability, and payload size.
   */
  static validateSubmission({ sourceCode, language, interviewId, problemIndex }) {
    if (!interviewId) {
      const err = new Error('Interview ID is required');
      err.statusCode = 400;
      throw err;
    }

    if (problemIndex === undefined || problemIndex === null || isNaN(Number(problemIndex))) {
      const err = new Error('Valid problem index is required');
      err.statusCode = 400;
      throw err;
    }

    if (!language || typeof language !== 'string' || !language.trim()) {
      const err = new Error('Programming language is required');
      err.statusCode = 400;
      throw err;
    }

    const langDef = languageRegistry.getLanguage(language);
    if (!langDef) {
      const err = new Error(`Unsupported programming language: '${language}'`);
      err.statusCode = 400;
      throw err;
    }

    if (!langDef.isAvailable) {
      const err = new Error(
        `Language '${langDef.name}' is not installed or available in this server environment. Please select an available language.`
      );
      err.statusCode = 400;
      throw err;
    }

    if (typeof sourceCode !== 'string' || !sourceCode.trim()) {
      const err = new Error('Source code cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    const codeBytes = Buffer.byteLength(sourceCode, 'utf8');
    if (codeBytes > EXECUTION_LIMITS.MAX_SOURCE_CODE_BYTES) {
      const err = new Error(
        `Source code exceeds maximum allowed size of 64KB (Current: ${Math.round(codeBytes / 1024)}KB)`
      );
      err.statusCode = 400;
      throw err;
    }

    return langDef;
  }

  /**
   * Minimal cooldown rate-limiter to prevent client execution spam.
   */
  static checkRateLimit(userId) {
    if (!userId) return;
    const now = Date.now();
    const lastRun = userLastRunTimestamps.get(String(userId)) || 0;
    const elapsed = now - lastRun;

    if (elapsed < EXECUTION_LIMITS.RUN_RATE_LIMIT_MS) {
      const waitSeconds = Math.ceil((EXECUTION_LIMITS.RUN_RATE_LIMIT_MS - elapsed) / 1000);
      const err = new Error(`Please wait ${waitSeconds}s before executing code again`);
      err.statusCode = 429;
      throw err;
    }

    userLastRunTimestamps.set(String(userId), now);

    // Periodic cleanup to prevent unbounded memory retention
    if (userLastRunTimestamps.size > 5000) {
      for (const [uid, timestamp] of userLastRunTimestamps.entries()) {
        if (now - timestamp > 60000) {
          userLastRunTimestamps.delete(uid);
        }
      }
    }
  }

  /**
   * Verifies interview ownership, expiration, and status.
   */
  static async verifyInterviewAccess(interviewId, userId) {
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      const err = new Error('Interview session not found');
      err.statusCode = 404;
      throw err;
    }

    // Anti-IDOR check
    if (String(interview.userId) !== String(userId)) {
      const err = new Error('Unauthorized: You do not own this interview session');
      err.statusCode = 403;
      throw err;
    }

    if (interview.status === 'Completed') {
      const err = new Error('Interview session has already been completed');
      err.statusCode = 400;
      throw err;
    }

    if (interview.expiresAt && new Date(interview.expiresAt).getTime() <= Date.now()) {
      const err = new Error('Interview session has expired');
      err.statusCode = 410;
      throw err;
    }

    return interview;
  }

  /**
   * Bounded concurrency guard to protect Node.js backend event loop.
   */
  static async withConcurrencyGuard(action) {
    if (activeExecutionsCount >= EXECUTION_LIMITS.MAX_CONCURRENT_EXECUTIONS) {
      const err = new Error(
        'Code execution engine is currently at maximum capacity. Please wait a moment and try again.'
      );
      err.statusCode = 429;
      err.code = 'MAX_CONCURRENCY_EXCEEDED';
      throw err;
    }

    activeExecutionsCount++;
    try {
      return await action();
    } finally {
      activeExecutionsCount = Math.max(0, activeExecutionsCount - 1);
    }
  }

  static getActiveCount() {
    return activeExecutionsCount;
  }
}
