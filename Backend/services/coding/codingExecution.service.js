/**
 * @file codingExecution.service.js
 * Core orchestrator for live coding interview execution.
 * Enforces ownership, lifecycle restrictions, rate limits, 3 distinct execution modes
 * (Run Code with custom input, Run Sample Tests, and Submit Solution), and test case security.
 */

import Interview from '../../models/interview.model.js';
import CodingSubmission from '../../models/codingSubmission.model.js';
import CodingProblem from '../../models/codingProblem.model.js';
import testCaseService from './testCase.service.js';
import codeEvaluationService from './codeEvaluation.service.js';
import executionAdapter from './executionAdapter.service.js';

export const MAX_CODE_SIZE_BYTES = 64 * 1024; // 64 KB limit
export const RUN_RATE_LIMIT_MS = 1500; // 1.5 seconds between runs

const userLastRunTimestamps = new Map();

export class CodingExecutionService {
  /**
   * Validates code execution payload and security constraints.
   */
  validatePayload({ sourceCode, language, interviewId, problemIndex }) {
    if (!interviewId) {
      throw new Error('Interview ID is required');
    }

    if (problemIndex === undefined || problemIndex === null || isNaN(Number(problemIndex))) {
      throw new Error('Valid problem index is required');
    }

    if (!language || typeof language !== 'string' || language.trim().length === 0) {
      throw new Error('Valid programming language is required');
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
   * Enforces minimal rate limit between rapid Run Code calls to prevent spamming execution backend.
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
   * Mode 1: Run Code (Custom Input Execution)
   * Executes candidate code against custom stdin.
   * Does NOT finalize or submit the interview. Consumes 0 credits.
   */
  async runCode({
    userId,
    interviewId,
    problemIndex,
    language,
    languageId,
    sourceCode,
    customInput = ''
  }) {
    const langSlug = language || executionAdapter.normalizeLanguage(languageId);
    this.validatePayload({ sourceCode, language: langSlug, interviewId, problemIndex });
    this.checkRateLimit(userId);
    const interview = await this.verifyInterviewAccess(interviewId, userId);

    const problem = interview.codingProblems?.[problemIndex];
    if (!problem) {
      const err = new Error(`Problem not found at index ${problemIndex}`);
      err.statusCode = 404;
      throw err;
    }

    const executionResult = await executionAdapter.execute({
      language: langSlug,
      sourceCode,
      stdin: String(customInput || ''),
      cpuTimeLimit: 5.0,
      memoryLimitKb: 128000
    });

    return {
      success: true,
      mode: 'run',
      problemIndex,
      language: langSlug,
      stdout: executionResult.stdout || '',
      stderr: executionResult.stderr || '',
      compileOutput: executionResult.compileOutput || '',
      exitCode: executionResult.exitCode ?? 0,
      executionTimeMs: executionResult.executionTimeMs || 0,
      memoryKb: executionResult.memoryKb || 0,
      statusDescription: executionResult.statusDescription || 'Completed'
    };
  }

  /**
   * Mode 2: Run Sample Tests
   * Executes candidate code against publicly visible sample test cases.
   * Does NOT finalize the interview. Consumes 0 credits.
   */
  async runSampleTests({
    userId,
    interviewId,
    problemIndex,
    language,
    languageId,
    sourceCode
  }) {
    const langSlug = language || executionAdapter.normalizeLanguage(languageId);
    this.validatePayload({ sourceCode, language: langSlug, interviewId, problemIndex });
    this.checkRateLimit(userId);
    const interview = await this.verifyInterviewAccess(interviewId, userId);

    const problem = interview.codingProblems?.[problemIndex];
    if (!problem) {
      const err = new Error(`Problem not found at index ${problemIndex}`);
      err.statusCode = 404;
      throw err;
    }

    const sampleTests = (problem.visibleTestCases || []).map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      explanation: tc.explanation || '',
      isHidden: false
    }));

    if (sampleTests.length === 0) {
      sampleTests.push({ input: '', expectedOutput: '', isHidden: false });
    }

    const summary = await testCaseService.executeTestCases({
      language: langSlug,
      sourceCode,
      testCases: sampleTests,
      cpuTimeLimit: 5.0,
      memoryLimitKb: 128000
    });

    return {
      success: true,
      mode: 'sample-tests',
      problemIndex,
      language: langSlug,
      passedCount: summary.passedCount,
      totalCount: summary.totalCount,
      allPassed: summary.allPassed,
      maxTimeMs: summary.maxTimeMs,
      maxMemoryKb: summary.maxMemoryKb,
      results: testCaseService.sanitizeResultsForClient(summary.results)
    };
  }

  /**
   * Mode 3: Submit Solution
   * Executes code against ALL test cases (visible + hidden).
   * Masks hidden test inputs from client.
   * Records submission to MongoDB and attaches to interview record.
   */
  async submitSolution({
    userId,
    interviewId,
    problemIndex,
    language,
    languageId,
    sourceCode,
    candidateExplanation = ''
  }) {
    const langSlug = language || executionAdapter.normalizeLanguage(languageId);
    this.validatePayload({ sourceCode, language: langSlug, interviewId, problemIndex });
    const interview = await this.verifyInterviewAccess(interviewId, userId);

    const problem = interview.codingProblems?.[problemIndex];
    if (!problem) {
      const err = new Error(`Problem not found at index ${problemIndex}`);
      err.statusCode = 404;
      throw err;
    }

    const visibleTests = (problem.visibleTestCases || []).map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: false
    }));

    const hiddenTests = (problem.hiddenTestCases || []).map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: true
    }));

    const fullSuite = [...visibleTests, ...hiddenTests];
    if (fullSuite.length === 0) {
      fullSuite.push({ input: '', expectedOutput: '', isHidden: false });
    }

    const executionSummary = await testCaseService.executeTestCases({
      language: langSlug,
      sourceCode,
      testCases: fullSuite,
      cpuTimeLimit: 5.0,
      memoryLimitKb: 128000
    });

    // Determine submission verdict
    let submissionStatus = 'Accepted';
    if (!executionSummary.allPassed) {
      const failedCase = executionSummary.results.find((r) => !r.passed);
      submissionStatus = failedCase?.statusDescription || 'Wrong Answer';
    }

    // Client-safe sanitized results
    const clientSafeResults = testCaseService.sanitizeResultsForClient(executionSummary.results);

    // AI code evaluation (or deterministic fallback)
    const aiEvaluation = await codeEvaluationService.evaluateSolution({
      problemTitle: problem.title,
      problemDescription: problem.description,
      language: langSlug,
      sourceCode,
      candidateExplanation,
      passedTestCases: executionSummary.passedCount,
      totalTestCases: executionSummary.totalCount,
      executionTimeMs: executionSummary.maxTimeMs,
      memoryKb: executionSummary.maxMemoryKb
    });

    // Persist to MongoDB
    const submission = new CodingSubmission({
      userId,
      interviewId,
      problemId: problem.problemId || String(problem._id),
      problemIndex,
      languageId: 0,
      language: langSlug,
      sourceCode,
      runType: 'submit',
      status: 'completed',
      passedTestCases: executionSummary.passedCount,
      totalTestCases: executionSummary.totalCount,
      testResults: clientSafeResults,
      overallExecutionTimeMs: executionSummary.maxTimeMs,
      overallMemoryKb: executionSummary.maxMemoryKb,
      candidateExplanation,
      aiEvaluation: {
        score: aiEvaluation.score || 0,
        correctness: aiEvaluation.correctness || 0,
        efficiency: aiEvaluation.efficiency || 0,
        readability: aiEvaluation.readability || 0,
        approach: aiEvaluation.approach || '',
        timeComplexity: aiEvaluation.timeComplexity || 'O(n)',
        spaceComplexity: aiEvaluation.spaceComplexity || 'O(1)',
        strengths: aiEvaluation.strengths || [],
        weaknesses: aiEvaluation.weaknesses || [],
        suggestions: aiEvaluation.suggestions || [],
        overallFeedback: aiEvaluation.overallFeedback || '',
        status: 'completed'
      }
    });

    await submission.save();

    // Link submission to interview
    if (!Array.isArray(interview.codingSubmissions)) {
      interview.codingSubmissions = [];
    }
    interview.codingSubmissions.push(submission._id);
    await interview.save();

    return {
      success: true,
      submissionId: submission._id,
      problemIndex,
      language: langSlug,
      verdict: submissionStatus,
      passedCount: executionSummary.passedCount,
      totalCount: executionSummary.totalCount,
      allPassed: executionSummary.allPassed,
      maxTimeMs: executionSummary.maxTimeMs,
      maxMemoryKb: executionSummary.maxMemoryKb,
      testResults: clientSafeResults,
      aiEvaluation: submission.aiEvaluation
    };
  }

  /**
   * Retrieves all submissions for an interview session.
   */
  async getSubmissionsByInterview(interviewId, userId) {
    await this.verifyInterviewAccess(interviewId, userId);
    return await CodingSubmission.find({ interviewId, userId }).sort({ createdAt: -1 });
  }

  /**
   * Retrieves single submission by ID with ownership verification.
   */
  async getSubmissionById(submissionId, userId) {
    const submission = await CodingSubmission.findById(submissionId);
    if (!submission) {
      const err = new Error('Submission not found');
      err.statusCode = 404;
      throw err;
    }

    if (String(submission.userId) !== String(userId)) {
      const err = new Error('Unauthorized to view this submission');
      err.statusCode = 403;
      throw err;
    }

    return submission;
  }

  /**
   * Retrieves problem definition by problemId.
   */
  async getProblemById(problemId) {
    const problem = await CodingProblem.findOne({ problemId });
    if (!problem) {
      const err = new Error('Problem not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      problemId: problem.problemId,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      category: problem.category,
      constraints: problem.constraints,
      examples: problem.examples,
      supportedLanguages: problem.supportedLanguages,
      starterCode: problem.starterCode,
      executionMode: problem.executionMode,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      publicTestCases: problem.publicTestCases
      // hiddenTestCases are strictly excluded
    };
  }
}

export default new CodingExecutionService();
