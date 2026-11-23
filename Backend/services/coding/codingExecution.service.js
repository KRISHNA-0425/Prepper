/**
 * @file codingExecution.service.js
 * Core orchestrator for live coding interview execution.
 * Enforces ownership, lifecycle restrictions, rate limits, visible vs. hidden test segregation,
 * and coordinates Judge0 execution with AI evaluation.
 */

import Interview from '../../models/interview.model.js';
import CodingSubmission from '../../models/codingSubmission.model.js';
import testCaseService from './testCase.service.js';
import codeEvaluationService from './codeEvaluation.service.js';
import judge0Service from './judge0.service.js';

export const MAX_CODE_SIZE_BYTES = 64 * 1024; // 64 KB limit
export const RUN_RATE_LIMIT_MS = 2000; // 2 seconds between runs

const userLastRunTimestamps = new Map();

export class CodingExecutionService {
  /**
   * Validates code execution payload and security constraints.
   */
  validatePayload({ sourceCode, languageId, interviewId, problemIndex }) {
    if (!interviewId) {
      throw new Error('Interview ID is required');
    }

    if (problemIndex === undefined || problemIndex === null || isNaN(Number(problemIndex))) {
      throw new Error('Valid problem index is required');
    }

    if (!languageId || isNaN(Number(languageId))) {
      throw new Error('Valid Judge0 language ID is required');
    }

    if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
      throw new Error('Source code cannot be empty');
    }

    const codeBytes = Buffer.byteLength(sourceCode, 'utf8');
    if (codeBytes > MAX_CODE_SIZE_BYTES) {
      throw new Error(`Source code exceeds maximum allowed size of 64KB (Current: ${Math.round(codeBytes / 1024)}KB)`);
    }
  }

  /**
   * Verifies interview existence, user ownership, and lifecycle status.
   */
  async verifyInterviewAccess(interviewId, userId) {
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      const err = new Error('Interview session not found');
      err.statusCode = 404;
      throw err;
    }

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
      err.statusCode = 400;
      throw err;
    }

    return interview;
  }

  /**
   * Enforces minimal rate limit between rapid Run Code calls to prevent spamming Judge0.
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const lastRun = userLastRunTimestamps.get(String(userId)) || 0;
    if (now - lastRun < RUN_RATE_LIMIT_MS) {
      const waitSeconds = Math.ceil((RUN_RATE_LIMIT_MS - (now - lastRun)) / 1000);
      const err = new Error(`Please wait ${waitSeconds}s before running code again`);
      err.statusCode = 429;
      throw err;
    }
    userLastRunTimestamps.set(String(userId), now);
  }

  /**
   * Executes code against VISIBLE test cases only (or custom input).
   * Does NOT consume credits. Safe for fast debugging.
   */
  async runCode({
    userId,
    interviewId,
    problemIndex,
    languageId,
    language,
    sourceCode,
    customInput = null,
  }) {
    this.validatePayload({ sourceCode, languageId, interviewId, problemIndex });
    this.checkRateLimit(userId);
    const interview = await this.verifyInterviewAccess(interviewId, userId);

    const problem = interview.codingProblems?.[problemIndex];
    if (!problem) {
      const err = new Error(`Problem not found at index ${problemIndex}`);
      err.statusCode = 404;
      throw err;
    }

    let testCasesToRun = [];

    if (customInput !== null && customInput !== undefined && String(customInput).trim() !== '') {
      // User provided custom standard input
      testCasesToRun = [
        {
          input: String(customInput),
          expectedOutput: '',
          isHidden: false,
        },
      ];
    } else {
      // Use configured visible test cases
      testCasesToRun = (problem.visibleTestCases || []).map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false,
      }));
    }

    if (testCasesToRun.length === 0) {
      // If no visible test cases, run one empty test to verify compilation/execution
      testCasesToRun = [{ input: '', expectedOutput: '', isHidden: false }];
    }

    const executionSummary = await testCaseService.executeTestCases({
      sourceCode,
      languageId,
      testCases: testCasesToRun,
      cpuTimeLimit: 5.0,
      memoryLimitKb: 128000,
    });

    return {
      success: true,
      problemIndex,
      languageId,
      language,
      passedCount: executionSummary.passedCount,
      totalCount: executionSummary.totalCount,
      allPassed: executionSummary.allPassed,
      maxTimeMs: executionSummary.maxTimeMs,
      maxMemoryKb: executionSummary.maxMemoryKb,
      results: testCaseService.sanitizeResultsForClient(executionSummary.results),
    };
  }

  /**
   * Final solution submission for a problem.
   * Executes against ALL test cases (both visible and hidden).
   * Masks hidden test cases from client. Triggers AI evaluation.
   */
  async submitSolution({
    userId,
    interviewId,
    problemIndex,
    languageId,
    language,
    sourceCode,
    candidateExplanation = '',
  }) {
    this.validatePayload({ sourceCode, languageId, interviewId, problemIndex });
    const interview = await this.verifyInterviewAccess(interviewId, userId);

    const problem = interview.codingProblems?.[problemIndex];
    if (!problem) {
      const err = new Error(`Problem not found at index ${problemIndex}`);
      err.statusCode = 404;
      throw err;
    }

    // Assemble full test suite: visible + hidden
    const visibleTests = (problem.visibleTestCases || []).map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: false,
    }));

    const hiddenTests = (problem.hiddenTestCases || []).map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: true,
    }));

    const fullTestSuite = [...visibleTests, ...hiddenTests];
    if (fullTestSuite.length === 0) {
      fullTestSuite.push({ input: '', expectedOutput: '', isHidden: false });
    }

    // 1. Run all test cases in isolated sandbox
    const executionSummary = await testCaseService.executeTestCases({
      sourceCode,
      languageId,
      testCases: fullTestSuite,
      cpuTimeLimit: 5.0,
      memoryLimitKb: 128000,
    });

    // 2. Perform AI code evaluation
    const evaluation = await codeEvaluationService.evaluateSubmission({
      problem,
      sourceCode,
      language,
      passedTestCases: executionSummary.passedCount,
      totalTestCases: executionSummary.totalCount,
      testResults: executionSummary.results,
      candidateExplanation,
    });

    // 3. Persist submission record
    const submission = new CodingSubmission({
      userId,
      interviewId,
      problemId: problem.problemId || String(problem._id || problemIndex),
      problemIndex,
      languageId,
      language,
      sourceCode,
      runType: 'submit',
      status: 'completed',
      passedTestCases: executionSummary.passedCount,
      totalTestCases: executionSummary.totalCount,
      testResults: executionSummary.results, // Full unmasked stored securely in DB
      overallExecutionTimeMs: executionSummary.maxTimeMs,
      overallMemoryKb: executionSummary.maxMemoryKb,
      candidateExplanation,
      evaluation,
    });

    await submission.save();

    // Link submission to interview
    if (!interview.codingSubmissions) {
      interview.codingSubmissions = [];
    }
    interview.codingSubmissions.push(submission._id);
    await interview.save();

    // 4. Return sanitized response to client (Hidden test cases strictly masked)
    return {
      success: true,
      submissionId: submission._id,
      problemIndex,
      language,
      passedTestCases: executionSummary.passedCount,
      totalTestCases: executionSummary.totalCount,
      allPassed: executionSummary.allPassed,
      overallExecutionTimeMs: executionSummary.maxTimeMs,
      overallMemoryKb: executionSummary.maxMemoryKb,
      testResults: testCaseService.sanitizeResultsForClient(executionSummary.results),
      evaluation,
    };
  }

  /**
   * Retrieves a specific submission by ID, with security sanitization.
   */
  async getSubmissionById(submissionId, userId) {
    const submission = await CodingSubmission.findById(submissionId);
    if (!submission) {
      const err = new Error('Submission not found');
      err.statusCode = 404;
      throw err;
    }

    if (String(submission.userId) !== String(userId)) {
      const err = new Error('Unauthorized access to submission');
      err.statusCode = 403;
      throw err;
    }

    const obj = submission.toObject();
    obj.testResults = testCaseService.sanitizeResultsForClient(obj.testResults);
    return obj;
  }

  /**
   * Retrieves all submissions for an interview session, with security sanitization.
   */
  async getInterviewSubmissions(interviewId, userId) {
    await this.verifyInterviewAccess(interviewId, userId);

    const submissions = await CodingSubmission.find({ interviewId, userId }).sort({ createdAt: -1 });

    return submissions.map((sub) => {
      const obj = sub.toObject();
      obj.testResults = testCaseService.sanitizeResultsForClient(obj.testResults);
      return obj;
    });
  }
}

export default new CodingExecutionService();
