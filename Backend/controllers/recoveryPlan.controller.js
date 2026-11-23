import {
  generateRecoveryPlan,
  getUserRecoveryPlans,
  getRecoveryPlanById,
  startRecoveryPlan,
  updateTaskStatus,
  initiateReassessment,
  submitReassessment,
} from '../services/recoveryPlan/recoveryPlan.service.js';

/**
 * Generates or retrieves an idempotent personalized recovery plan.
 * POST /api/recovery-plans/generate
 */
export const generatePlan = async (req, res) => {
  try {
    const userId = req.userId;
    const { interviewId, scheduleDurationDays, dailyStudyMinutes, idempotencyKey } = req.body;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: 'interviewId is required to generate a recovery plan',
      });
    }

    const { plan, isExisting } = await generateRecoveryPlan({
      userId,
      interviewId,
      scheduleDurationDays: scheduleDurationDays ? Number(scheduleDurationDays) : 14,
      dailyStudyMinutes: dailyStudyMinutes ? Number(dailyStudyMinutes) : 45,
      idempotencyKey,
    });

    return res.status(isExisting ? 200 : 201).json({
      success: true,
      message: isExisting
        ? 'Existing recovery plan retrieved'
        : 'Personalized recovery plan successfully generated',
      isExisting,
      plan,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to generate recovery plan',
    });
  }
};

/**
 * Retrieves all recovery plans for the authenticated user.
 * GET /api/recovery-plans
 */
export const getMyPlans = async (req, res) => {
  try {
    const userId = req.userId;
    const plans = await getUserRecoveryPlans(userId);
    return res.status(200).json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve recovery plans',
    });
  }
};

/**
 * Retrieves a single recovery plan by ID with anti-IDOR verification.
 * GET /api/recovery-plans/:planId
 */
export const getPlanById = async (req, res) => {
  try {
    const userId = req.userId;
    const { planId } = req.params;

    const plan = await getRecoveryPlanById(planId, userId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Recovery plan not found',
      });
    }

    return res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error fetching recovery plan',
    });
  }
};

/**
 * Starts a recovery plan.
 * PATCH /api/recovery-plans/:planId/start
 */
export const startPlan = async (req, res) => {
  try {
    const userId = req.userId;
    const { planId } = req.params;

    const plan = await startRecoveryPlan(planId, userId);
    return res.status(200).json({
      success: true,
      message: 'Recovery plan started',
      plan,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to start recovery plan',
    });
  }
};

/**
 * Updates a task status or notes with automatic progress recalculation.
 * PATCH /api/recovery-plans/:planId/tasks/:taskId
 */
export const updateTask = async (req, res) => {
  try {
    const userId = req.userId;
    const { planId, taskId } = req.params;
    const { status, candidateNotes } = req.body;

    const plan = await updateTaskStatus(
      planId,
      taskId,
      { status, candidateNotes },
      userId
    );

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      plan,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update task',
    });
  }
};

/**
 * Initiates the reassessment phase for an eligible plan.
 * POST /api/recovery-plans/:planId/reassess/start
 */
export const startReassessment = async (req, res) => {
  try {
    const userId = req.userId;
    const { planId } = req.params;

    const plan = await initiateReassessment(planId, userId);
    return res.status(200).json({
      success: true,
      message: 'Reassessment initialized with targeted verification questions',
      reassessment: plan.reassessment,
      plan,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to initiate reassessment',
    });
  }
};

/**
 * Submits reassessment answers and measures improvement delta.
 * POST /api/recovery-plans/:planId/reassess/submit
 */
export const submitReassessmentAnswers = async (req, res) => {
  try {
    const userId = req.userId;
    const { planId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reassessment answers must be a non-empty array of { questionId, answer }',
      });
    }

    const plan = await submitReassessment(planId, answers, userId);
    return res.status(200).json({
      success: true,
      message: 'Reassessment successfully evaluated and recorded',
      reassessment: plan.reassessment,
      plan,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to evaluate reassessment',
    });
  }
};
