/**
 * @file coding.routes.js
 * Express routing table for live coding interview execution and submissions.
 */

import express from 'express';
import isAuth from '../middleware/isAuth.js';
import {
  getLanguages,
  getJudge0Health,
  runCode,
  submitSolution,
  getSubmissionById,
  getInterviewSubmissions,
} from '../controllers/coding.controller.js';

const codingRouter = express.Router();

// Public / Authenticated discovery
codingRouter.get('/languages', getLanguages);
codingRouter.get('/health', getJudge0Health);

// Authenticated code execution & submission
codingRouter.post('/run', isAuth, runCode);
codingRouter.post('/submit', isAuth, submitSolution);

// Submission retrieval
codingRouter.get('/submissions/:submissionId', isAuth, getSubmissionById);
codingRouter.get('/interviews/:interviewId/submissions', isAuth, getInterviewSubmissions);

export default codingRouter;
