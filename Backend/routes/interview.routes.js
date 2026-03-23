import express from 'express'
import isAuth from '../middleware/isAuth.js';
import { upload } from '../middleware/multer.js';
import { resumeAnalyse } from '../controllers/interview.controller.js';
import limiter from '../middleware/rateLimiter.js';

const interviewRouter = express.Router();

interviewRouter.post("/resume", isAuth, limiter, upload.single('resume'), resumeAnalyse)

export default interviewRouter;
