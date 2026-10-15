import express from 'express';
import isAuth from '../middleware/isAuth.js';
import { upload } from '../middleware/multer.js';
import {
  createSession,
  getSession,
  listSessions,
  submitAnswer,
  advanceQuestion,
  completeSession,
} from '../controllers/crossExamination.controller.js';

const crossExaminationRouter = express.Router();

/**
 * Middleware to safely handle optional resume file upload without failing on JSON payloads.
 * Enforces configured 10MB upload limits via Multer.
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
      return res.status(400).json({
        message: 'File upload error',
        error: err.message,
      });
    }
    next();
  });
};

// Session CRUD and lifecycle management
crossExaminationRouter.post('/sessions', isAuth, handleOptionalResumeUpload, createSession);
crossExaminationRouter.get('/sessions', isAuth, listSessions);
crossExaminationRouter.get('/sessions/:sessionId', isAuth, getSession);

// Question and Answer progression
crossExaminationRouter.post('/sessions/:sessionId/answers', isAuth, submitAnswer);
crossExaminationRouter.post('/sessions/:sessionId/advance', isAuth, advanceQuestion);
crossExaminationRouter.post('/sessions/:sessionId/complete', isAuth, completeSession);

export default crossExaminationRouter;
