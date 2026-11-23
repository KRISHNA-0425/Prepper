import mongoose from 'mongoose';
import RecoveryPlan from '../../models/recoveryPlan.model.js';
import { harvestInterviewEvidence } from './evidenceHarvester.service.js';
import { buildRecoveryPlanPrompt } from './recoveryPlanPrompt.js';
import { validateRecoveryPlanData } from './recoveryPlanValidator.js';
import { generateFallbackRecoveryPlan } from './recoveryPlanFallback.js';
import { generateReassessmentQuestions, evaluateReassessmentAnswers } from './reassessment.service.js';
import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';

/**
 * Creates or retrieves an idempotent Recovery Plan for a candidate.
 */
export const generateRecoveryPlan = async ({
  userId,
  interviewId,
  scheduleDurationDays = 14,
  dailyStudyMinutes = 45,
  idempotencyKey = null,
  options = {},
}) => {
  if (!userId || !interviewId) {
    throw new Error('userId and interviewId are strictly required to generate a recovery plan');
  }

  const duration = [7, 14, 30].includes(Number(scheduleDurationDays))
    ? Number(scheduleDurationDays)
    : 14;

  const dailyMinutes = Number(dailyStudyMinutes) >= 15 && Number(dailyStudyMinutes) <= 240
    ? Number(dailyStudyMinutes)
    : 45;

  // 1. Idempotency Check: Return existing plan if already generated
  const existingPlan = await RecoveryPlan.findOne({
    userId,
    interviewId,
    scheduleDurationDays: duration,
  });

  if (existingPlan) {
    return { plan: existingPlan, isExisting: true };
  }

  // 2. Harvest authentic performance evidence
  const harvestedData = await harvestInterviewEvidence(interviewId, userId);

  // 3. Attempt AI-driven plan synthesis
  let finalPlanData = null;
  let isFallback = false;
  let fallbackReason = '';

  const askAI = options.askAI || defaultAskAI;

  try {
    const { systemPrompt, userPrompt } = buildRecoveryPlanPrompt({
      targetRole: harvestedData.targetRole,
      experienceLevel: harvestedData.experienceLevel,
      scheduleDurationDays: duration,
      dailyStudyMinutes: dailyMinutes,
      overallScore: harvestedData.overallScore,
      strengths: harvestedData.strengths,
      weaknesses: harvestedData.weaknesses,
    });

    const aiResponse = await askAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        max_tokens: 3000,
        temperature: 0.3,
      }
    );

    const { data: parsedJson, error: parseError } = safeParseJson(aiResponse);

    if (parseError || !parsedJson) {
      throw new Error(`AI JSON parse failure: ${parseError || 'Null JSON received'}`);
    }

    const validation = validateRecoveryPlanData({
      rawPlan: parsedJson,
      harvestedData,
      scheduleDurationDays: duration,
      dailyStudyMinutes: dailyMinutes,
    });

    if (validation.isValid && validation.planData) {
      finalPlanData = validation.planData;
    } else {
      throw new Error(`AI plan failed validation: ${validation.errors.join(', ')}`);
    }
  } catch (err) {
    // 4. Fallback to deterministic engine
    isFallback = true;
    fallbackReason = `Deterministic recovery plan: ${err.message || 'AI service response unavailable'}`;
    finalPlanData = generateFallbackRecoveryPlan({
      harvestedData,
      scheduleDurationDays: duration,
      dailyStudyMinutes: dailyMinutes,
      fallbackReason,
    });
  }

  // 5. Construct and persist RecoveryPlan document
  const newPlan = new RecoveryPlan({
    userId,
    interviewId,
    targetRole: harvestedData.targetRole,
    experienceLevel: harvestedData.experienceLevel,
    interviewType: harvestedData.interviewType,
    scheduleDurationDays: duration,
    dailyStudyMinutes: dailyMinutes,
    status: 'not_started',
    isFallbackGenerated: isFallback,
    fallbackReason,
    overallAssessment: finalPlanData.overallAssessment,
    strengths: finalPlanData.strengths,
    criticalWeaknesses: finalPlanData.criticalWeaknesses,
    tasks: finalPlanData.tasks,
    progress: {
      totalTasks: finalPlanData.tasks.length,
      completedTasks: 0,
      completionPercentage: 0,
      currentDay: 1,
    },
    reassessment: {
      status: 'not_eligible',
      originalScore: harvestedData.overallScore,
      reassessmentScore: null,
      scoreDelta: null,
      questions: [],
      improvementsObserved: [],
      remainingGaps: [],
    },
    idempotencyKey: idempotencyKey || undefined,
  });

  try {
    await newPlan.save();
    return { plan: newPlan, isExisting: false };
  } catch (dbErr) {
    // Handle concurrent duplicate key insertion gracefully
    if (dbErr.code === 11000) {
      const raceExisting = await RecoveryPlan.findOne({
        userId,
        interviewId,
        scheduleDurationDays: duration,
      });
      if (raceExisting) {
        return { plan: raceExisting, isExisting: true };
      }
    }
    throw dbErr;
  }
};

/**
 * Retrieves all recovery plans owned by a specific user.
 */
export const getUserRecoveryPlans = async (userId) => {
  if (!userId) throw new Error('userId is required');
  return RecoveryPlan.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Retrieves a single recovery plan with strict IDOR ownership enforcement.
 */
export const getRecoveryPlanById = async (planId, userId) => {
  if (!planId || !userId) throw new Error('planId and userId are required');
  const plan = await RecoveryPlan.findById(planId);
  if (!plan) return null;

  if (plan.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized: You do not own this recovery plan');
    error.status = 403;
    throw error;
  }
  return plan;
};

/**
 * Activates a recovery plan from not_started to in_progress.
 */
export const startRecoveryPlan = async (planId, userId) => {
  const plan = await getRecoveryPlanById(planId, userId);
  if (!plan) throw new Error('Recovery plan not found');

  if (plan.status === 'not_started') {
    plan.status = 'in_progress';
    await plan.save();
  }
  return plan;
};

/**
 * Updates a specific task's status and notes with anti-tamper validation.
 */
export const updateTaskStatus = async (planId, taskId, { status, candidateNotes }, userId) => {
  const plan = await getRecoveryPlanById(planId, userId);
  if (!plan) throw new Error('Recovery plan not found');

  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (status && !validStatuses.includes(status)) {
    throw new Error(`Invalid status: '${status}'. Must be one of: ${validStatuses.join(', ')}`);
  }

  const task = plan.tasks.find((t) => t.taskId === taskId);
  if (!task) {
    throw new Error(`Task '${taskId}' not found in recovery plan`);
  }

  if (status) {
    task.status = status;
    if (status === 'completed') {
      task.completedAt = task.completedAt || new Date();
    } else {
      task.completedAt = null;
    }
  }

  if (typeof candidateNotes === 'string') {
    task.candidateNotes = candidateNotes.trim();
  }

  plan.recalculateProgress();
  await plan.save();
  return plan;
};

/**
 * Generates targeted reassessment questions when candidate reaches eligibility.
 */
export const initiateReassessment = async (planId, userId, options = {}) => {
  const plan = await getRecoveryPlanById(planId, userId);
  if (!plan) throw new Error('Recovery plan not found');

  if (plan.progress.completionPercentage < 50 && plan.status !== 'completed') {
    throw new Error('Candidate must complete at least 50% of recovery tasks before initiating reassessment');
  }

  const questions = await generateReassessmentQuestions(plan, options);
  plan.reassessment.questions = questions;
  plan.reassessment.status = 'in_progress';

  await plan.save();
  return plan;
};

/**
 * Evaluates candidate reassessment responses and measures progress delta.
 */
export const submitReassessment = async (planId, submittedAnswers, userId, options = {}) => {
  const plan = await getRecoveryPlanById(planId, userId);
  if (!plan) throw new Error('Recovery plan not found');

  if (!plan.reassessment?.questions || plan.reassessment.questions.length === 0) {
    throw new Error('Reassessment questions must be initialized before submitting answers');
  }

  const result = await evaluateReassessmentAnswers({
    plan,
    submittedAnswers,
    options,
  });

  plan.reassessment.reassessmentScore = result.reassessmentScore;
  plan.reassessment.originalScore = result.originalScore;
  plan.reassessment.scoreDelta = result.scoreDelta;
  plan.reassessment.questions = result.questions;
  plan.reassessment.improvementsObserved = result.improvementsObserved;
  plan.reassessment.remainingGaps = result.remainingGaps;
  plan.reassessment.status = 'completed';
  plan.reassessment.reassessedAt = new Date();

  await plan.save();
  return plan;
};
