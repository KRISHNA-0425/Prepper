import express from 'express';
import isAuth from '../middleware/isAuth.js';
import {
  generatePlan,
  getMyPlans,
  getPlanById,
  startPlan,
  updateTask,
  startReassessment,
  submitReassessmentAnswers,
} from '../controllers/recoveryPlan.controller.js';

const recoveryPlanRouter = express.Router();

// Generate / retrieve idempotent plan
recoveryPlanRouter.post('/generate', isAuth, generatePlan);

// List candidate's recovery plans
recoveryPlanRouter.get('/', isAuth, getMyPlans);

// Fetch single plan
recoveryPlanRouter.get('/:planId', isAuth, getPlanById);

// Start plan
recoveryPlanRouter.patch('/:planId/start', isAuth, startPlan);

// Update task status and candidate notes
recoveryPlanRouter.patch('/:planId/tasks/:taskId', isAuth, updateTask);

// Reassessment workflows
recoveryPlanRouter.post('/:planId/reassess/start', isAuth, startReassessment);
recoveryPlanRouter.post('/:planId/reassess/submit', isAuth, submitReassessmentAnswers);

export default recoveryPlanRouter;
