import express from 'express'
import isAuth from '../middleware/isAuth.js';
import { upload } from '../middleware/multer.js';
import { finishInterview, generateQuestions, resumeAnalyse, submitAnswer } from '../controllers/interview.controller.js';
// import limiter from '../middleware/rateLimiter.js';

const interviewRouter = express.Router();

interviewRouter.post("/resume", isAuth, upload.single('resume'), resumeAnalyse)
interviewRouter.post("/generateQuestions", isAuth, generateQuestions);
interviewRouter.post("/submitAnswer", isAuth, submitAnswer);
interviewRouter.post("/finish", isAuth,finishInterview);

export default interviewRouter;
