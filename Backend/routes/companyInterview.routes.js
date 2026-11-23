import express from 'express';
import isAuth from '../middleware/isAuth.js';
import {
  getCompanies,
  getCompanyBySlug,
  getCompanyIntelligence,
  recommendStructure,
  createSession,
  getSession,
  submitAnswer,
  finishSession,
  getMyCompanySimulations,
} from '../controllers/companyInterview.controller.js';

const companyInterviewRouter = express.Router();

// Discovery & Intelligence endpoints
companyInterviewRouter.get('/companies', getCompanies);
companyInterviewRouter.get('/companies/:slug', getCompanyBySlug);
companyInterviewRouter.post('/intelligence', isAuth, getCompanyIntelligence);
companyInterviewRouter.post('/recommend-structure', recommendStructure);

// Authenticated session lifecycle endpoints
companyInterviewRouter.post('/create-session', isAuth, createSession);
companyInterviewRouter.get('/session/:id', isAuth, getSession);
companyInterviewRouter.post('/submit-answer', isAuth, submitAnswer);
companyInterviewRouter.post('/finish', isAuth, finishSession);
companyInterviewRouter.get('/history', isAuth, getMyCompanySimulations);

export default companyInterviewRouter;
