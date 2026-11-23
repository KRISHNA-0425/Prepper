/**
 * @file ats.routes.js
 * Express router for Module 7: AI Resume-to-Job ATS & Application Intelligence.
 * Mounts endpoints at /api/ats for upload, analysis, history, improvements, and cross-module bridges.
 */

import express from 'express';
import isAuth from '../middleware/isAuth.js';
import { handleAtsResumeUpload } from '../middleware/multer.js';
import {
  uploadResumeHandler,
  analyzeAtsHandler,
  analyzeDirectHandler,
  getAtsAnalysisHandler,
  getUserAnalysesHandler,
  deleteAtsAnalysisHandler,
  updateImprovementStatusHandler,
  getUserResumesHandler,
  getResumeByIdHandler,
  bridgeToInterviewHandler,
  bridgeToRecoveryPlanHandler,
} from '../controllers/ats.controller.js';

const atsRouter = express.Router();

// Resume Upload & Extraction (0 credits)
atsRouter.post('/upload-resume', isAuth, handleAtsResumeUpload, uploadResumeHandler);

// Single-request direct upload and analyze
atsRouter.post('/analyze-direct', isAuth, handleAtsResumeUpload, analyzeDirectHandler);

// Run ATS Matching Analysis (10 credits)
atsRouter.post('/analyze', isAuth, analyzeAtsHandler);

// Retrieve single ATS Analysis Report (with anti-IDOR protection)
atsRouter.get('/analysis/:id', isAuth, getAtsAnalysisHandler);

// List candidate's past ATS analyses
atsRouter.get('/analyses', isAuth, getUserAnalysesHandler);

// Delete an ATS Analysis Report
atsRouter.delete('/analysis/:id', isAuth, deleteAtsAnalysisHandler);

// Accept / Reject / Pending toggle on resume improvement suggestions
atsRouter.patch('/analysis/:id/improvement', isAuth, updateImprovementStatusHandler);

// Resume retrieval
atsRouter.get('/resumes', isAuth, getUserResumesHandler);
atsRouter.get('/resume/:id', isAuth, getResumeByIdHandler);

// Cross-Module Bridges
atsRouter.post('/bridge/interview', isAuth, bridgeToInterviewHandler);
atsRouter.post('/bridge/recovery-plan', isAuth, bridgeToRecoveryPlanHandler);

export default atsRouter;
