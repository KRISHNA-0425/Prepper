/**
 * @file coding.controller.js
 * Express controllers for live coding execution, sample test evaluation,
 * solution submissions, and status discovery.
 */

import executionAdapter from '../services/coding/executionAdapter.service.js';
import codingExecutionService from '../services/coding/codingExecution.service.js';

export const getLanguages = async (req, res) => {
  try {
    const languages = executionAdapter.getLanguages();
    return res.status(200).json({
      success: true,
      languages,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve execution languages',
      error: err.message,
    });
  }
};

export const getExecutionHealth = async (req, res) => {
  try {
    const health = await executionAdapter.checkHealth();
    return res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      health,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Execution engine health check failed',
      error: err.message,
    });
  }
};

/**
 * Mode 1: Run Code (Custom input or quick run)
 */
export const runCode = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { interviewId, problemIndex, language, languageId, sourceCode, customInput } = req.body;

    const result = await codingExecutionService.runCode({
      userId,
      interviewId,
      problemIndex: Number(problemIndex),
      language,
      languageId,
      sourceCode,
      customInput,
    });

    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Error executing code',
    });
  }
};

/**
 * Mode 2: Run Sample Tests (Public visible test cases)
 */
export const runSampleTests = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { interviewId, problemIndex, language, languageId, sourceCode } = req.body;

    const result = await codingExecutionService.runSampleTests({
      userId,
      interviewId,
      problemIndex: Number(problemIndex),
      language,
      languageId,
      sourceCode,
    });

    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Error running sample tests',
    });
  }
};

/**
 * Mode 3: Submit Solution (Full evaluation against hidden test cases)
 */
export const submitSolution = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { interviewId, problemIndex, language, languageId, sourceCode, candidateExplanation } = req.body;

    const result = await codingExecutionService.submitSolution({
      userId,
      interviewId,
      problemIndex: Number(problemIndex),
      language,
      languageId,
      sourceCode,
      candidateExplanation,
    });

    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Error submitting solution',
    });
  }
};

export const getSubmissionById = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { submissionId } = req.params;

    const submission = await codingExecutionService.getSubmissionById(submissionId, userId);
    return res.status(200).json({
      success: true,
      submission,
    });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to retrieve submission',
    });
  }
};

export const getInterviewSubmissions = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { interviewId } = req.params;

    const submissions = await codingExecutionService.getSubmissionsByInterview(interviewId, userId);
    return res.status(200).json({
      success: true,
      submissions,
    });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to retrieve interview submissions',
    });
  }
};

export const getProblemById = async (req, res) => {
  try {
    const { problemId } = req.params;
    const problem = await codingExecutionService.getProblemById(problemId);
    return res.status(200).json({
      success: true,
      problem,
    });
  } catch (err) {
    const statusCode = err.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Problem not found',
    });
  }
};
