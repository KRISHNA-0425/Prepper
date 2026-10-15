import express from 'express';
import isAuth from '../middleware/isAuth.js';
import { upload } from '../middleware/multer.js';
import { aiOperationLimiter } from '../middleware/rateLimiter.js';
import {
  createSession,
  getSession,
  listSessions,
  submitAnswer,
  advanceQuestion,
  completeSession,
  generateReport,
  getReport,
} from '../controllers/crossExamination.controller.js';

const crossExaminationRouter = express.Router();

/**
 * Middleware to safely handle optional resume file upload without failing on JSON payloads.
 * Enforces configured 10MB upload limits and PDF type restrictions via Multer.
 */
export const handleOptionalResumeUpload = (req, res, next) => {
  if (!req.is || !req.is('multipart/form-data')) {
    return next();
  }

  upload.single('resume')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'Resume file size limit exceeded (maximum 10MB)',
        });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          message: 'Only PDF resume files (.pdf) are supported',
          error: err.message,
        });
      }
      return res.status(400).json({
        message: 'File upload error',
        error: err.message,
      });
    }
    next();
  });
};

// Session CRUD and lifecycle management
crossExaminationRouter.post('/sessions', isAuth, aiOperationLimiter, handleOptionalResumeUpload, createSession);
crossExaminationRouter.get('/sessions', isAuth, listSessions);
crossExaminationRouter.get('/sessions/:sessionId', isAuth, getSession);

// Question and Answer progression
crossExaminationRouter.post('/sessions/:sessionId/answers', isAuth, submitAnswer);
crossExaminationRouter.post('/sessions/:sessionId/advance', isAuth, advanceQuestion);
crossExaminationRouter.post('/sessions/:sessionId/complete', isAuth, completeSession);

// Preparation Report generation and retrieval
crossExaminationRouter.post('/sessions/:sessionId/report', isAuth, aiOperationLimiter, generateReport);
crossExaminationRouter.get('/sessions/:sessionId/report', isAuth, getReport);

export default crossExaminationRouter;
