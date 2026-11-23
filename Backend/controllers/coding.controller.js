/**
 * @file coding.controller.js
 * Express controllers for live coding execution, submission evaluation, and status checks.
 */

import judge0Service from '../services/coding/judge0.service.js';
import codingExecutionService from '../services/coding/codingExecution.service.js';

export const getLanguages = async (req, res) => {
  try {
    const languages = await judge0Service.getLanguages();
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

export const getJudge0Health = async (req, res) => {
  try {
    const health = await judge0Service.checkHealth();
    return res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      health,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Judge0 health check failed',
      error: err.message,
    });
  }
};

export const runCode = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { interviewId, problemIndex, languageId, language, sourceCode, customInput } = req.body;

    const result = await codingExecutionService.runCode({
      userId,
      interviewId,
      problemIndex: Number(problemIndex),
      languageId: Number(languageId),
      language,
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

export const submitSolution = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { interviewId, problemIndex, languageId, language, sourceCode, candidateExplanation } = req.body;

    const result = await codingExecutionService.submitSolution({
      userId,
      interviewId,
      problemIndex: Number(problemIndex),
      languageId: Number(languageId),
      language,
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
    const statusCode = err.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Error retrieving submission',
    });
  }
};

export const getInterviewSubmissions = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { interviewId } = req.params;

    const submissions = await codingExecutionService.getInterviewSubmissions(interviewId, userId);
    return res.status(200).json({
      success: true,
      submissions,
    });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Error retrieving interview submissions',
    });
  }
};
