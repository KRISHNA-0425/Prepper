/**
 * @file coding.routes.js
 * Express routing table for live coding interview execution, sample testing, and submissions.
 */

import express from 'express';
import isAuth from '../middleware/isAuth.js';
import {
  getLanguages,
  getExecutionHealth,
  runCode,
  runSampleTests,
  submitSolution,
  getSubmissionById,
  getInterviewSubmissions,
  getProblemById
} from '../controllers/coding.controller.js';

const codingRouter = express.Router();

// Public / discovery endpoints
codingRouter.get('/languages', getLanguages);
codingRouter.get('/health', getExecutionHealth);

// Authenticated code execution modes
codingRouter.post('/run', isAuth, runCode);
codingRouter.post('/sample-tests', isAuth, runSampleTests);
codingRouter.post('/submit', isAuth, submitSolution);

// Problem details
codingRouter.get('/problems/:problemId', isAuth, getProblemById);

// Submissions retrieval
codingRouter.get('/submissions/:submissionId', isAuth, getSubmissionById);
codingRouter.get('/interviews/:interviewId/submissions', isAuth, getInterviewSubmissions);
codingRouter.get('/submissions/interview/:interviewId', isAuth, getInterviewSubmissions);

export default codingRouter;
