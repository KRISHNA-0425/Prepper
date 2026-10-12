/**
 * @file crossExamination.routes.js
 * Protected Express routes for the Cross-Examination Session Lifecycle.
 * All endpoints enforce authenticated caller context via isAuth middleware.
 */

import express from 'express';
import isAuth from '../middleware/isAuth.js';
import {
  createSession,
  getSession,
  listSessions,
  submitAnswer,
  advanceQuestion,
  completeSession,
} from '../controllers/crossExamination.controller.js';

const crossExaminationRouter = express.Router();

// Session CRUD and lifecycle management
crossExaminationRouter.post('/sessions', isAuth, createSession);
crossExaminationRouter.get('/sessions', isAuth, listSessions);
crossExaminationRouter.get('/sessions/:sessionId', isAuth, getSession);

// Question and Answer progression
crossExaminationRouter.post('/sessions/:sessionId/answers', isAuth, submitAnswer);
crossExaminationRouter.post('/sessions/:sessionId/advance', isAuth, advanceQuestion);
crossExaminationRouter.post('/sessions/:sessionId/complete', isAuth, completeSession);

export default crossExaminationRouter;
