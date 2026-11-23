import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import RecoveryPlan from '../models/recoveryPlan.model.js';
import { harvestInterviewEvidence } from '../services/recoveryPlan/evidenceHarvester.service.js';
import { buildRecoveryPlanPrompt } from '../services/recoveryPlan/recoveryPlanPrompt.js';
import { validateRecoveryPlanData } from '../services/recoveryPlan/recoveryPlanValidator.js';
import { generateFallbackRecoveryPlan } from '../services/recoveryPlan/recoveryPlanFallback.js';
import { generateReassessmentQuestions, evaluateReassessmentAnswers } from '../services/recoveryPlan/reassessment.service.js';
import {
  generateRecoveryPlan,
  getRecoveryPlanById,
  startRecoveryPlan,
  updateTaskStatus,
  initiateReassessment,
  submitReassessment,
} from '../services/recoveryPlan/recoveryPlan.service.js';

test('Recovery Plan Test Suite - Module 5 Implementation', async (t) => {
  const dummyUserId = new mongoose.Types.ObjectId();
  const dummyInterviewId = new mongoose.Types.ObjectId();
  const unauthorizedUserId = new mongoose.Types.ObjectId();

  await t.test('1. Prompt Builder generates structured schema with correct constraints', () => {
    const prompt = buildRecoveryPlanPrompt({
      targetRole: 'Full Stack Engineer',
      experienceLevel: 'Senior',
      scheduleDurationDays: 14,
      dailyStudyMinutes: 45,
      overallScore: 65,
      strengths: [{ topic: 'React Hooks', description: 'Deep lifecycle mastery' }],
      weaknesses: [{
        weaknessId: 'gap_1',
        topic: 'Database Indexing',
        severity: 'critical',
        description: 'Failed to explain B-Tree index scan vs sequential scan',
        misconceptionSnippet: 'indexes search every row',
        evidence: { sourceType: 'standard_interview' },
      }],
    });

    assert.ok(prompt.systemPrompt.includes('14 days'));
    assert.ok(prompt.systemPrompt.includes('45 minutes'));
    assert.ok(prompt.systemPrompt.includes('STRICT SEQUENCING & PREREQUISITES'));
    assert.ok(prompt.userPrompt.includes('Database Indexing'));
    assert.ok(prompt.userPrompt.includes('indexes search every row'));
  });

  await t.test('2. Validator successfully sanitizes tasks and maps evidence links', () => {
    const rawPlan = {
      overallAssessment: 'Comprehensive 14-day study program addressing database and concurrency gaps.',
      tasks: [
        {
          taskId: 'task_1',
          dayNumber: 1,
          title: 'Study B-Tree Index Mechanics',
          description: 'Read PostgreSQL index internals and benchmark explain analyze query plans.',
          relatedWeaknessId: 'gap_1',
          priority: 'critical',
          estimatedMinutes: 45,
          difficulty: 'intermediate',
          category: 'theory',
          expectedOutcome: 'Clarity on index scans',
          completionCriteria: 'Explain index scan vs seq scan',
        },
      ],
    };

    const harvestedData = {
      targetRole: 'Full Stack Engineer',
      strengths: [],
      weaknesses: [
        {
          weaknessId: 'gap_1',
          topic: 'Database Indexing',
          severity: 'critical',
          description: 'Failed to explain B-Tree index scan',
          evidence: {
            sourceType: 'standard_interview',
            sourceId: dummyInterviewId,
            questionOrProblemId: 'q_1',
            competency: 'Database Indexing',
            evidenceExcerpt: 'Candidate said indexes check every row',
            identifiedFinding: 'Missing index knowledge',
          },
        },
      ],
    };

    const validation = validateRecoveryPlanData({
      rawPlan,
      harvestedData,
      scheduleDurationDays: 7,
      dailyStudyMinutes: 45,
    });

    assert.equal(validation.isValid, true);
    assert.ok(validation.planData.tasks.length >= 7, 'All 7 days covered with structured tasks');
    const task1 = validation.planData.tasks.find((t) => t.taskId === 'task_1');
    assert.ok(task1);
    assert.equal(task1.relatedWeaknessTopic, 'Database Indexing');
    assert.ok(task1.evidence);
    assert.equal(task1.evidence.competency, 'Database Indexing');
  });

  await t.test('3. Deterministic Fallback Generator produces grounded plan without hallucination', () => {
    const harvestedData = {
      targetRole: 'Backend Engineer',
      strengths: [{ topic: 'Node.js Streams', description: 'Handled backpressure properly' }],
      weaknesses: [
        {
          weaknessId: 'gap_node_1',
          topic: 'Event Loop & Libuv',
          severity: 'critical',
          description: 'Confused microtask queue with timer queue execution order',
          misconceptionSnippet: 'setTimeout always runs before Promise.then',
          evidence: {
            sourceType: 'standard_interview',
            sourceId: dummyInterviewId,
            questionOrProblemId: 'q_3',
            competency: 'Node.js Internals',
            evidenceExcerpt: 'Candidate claimed setTimeout has priority',
            identifiedFinding: 'Event loop phase misconception',
          },
        },
      ],
    };

    const fallback = generateFallbackRecoveryPlan({
      harvestedData,
      scheduleDurationDays: 14,
      dailyStudyMinutes: 45,
    });

    assert.equal(fallback.isFallbackGenerated, true);
    assert.ok(fallback.tasks.length >= 14);
    assert.ok(fallback.overallAssessment.includes('systematically derived from your interview performance'));

    const theoryTask = fallback.tasks.find((t) => t.taskId.includes('theory'));
    assert.ok(theoryTask);
    assert.equal(theoryTask.relatedWeaknessTopic, 'Event Loop & Libuv');
    assert.equal(theoryTask.evidence.sourceType, 'standard_interview');
    assert.equal(theoryTask.priority, 'critical');
  });

  await t.test('4. RecoveryPlan Model progress recalculation and status transitions', () => {
    const plan = new RecoveryPlan({
      userId: dummyUserId,
      interviewId: dummyInterviewId,
      targetRole: 'Distributed Systems Engineer',
      scheduleDurationDays: 7,
      dailyStudyMinutes: 45,
      overallAssessment: 'Test recovery roadmap',
      tasks: [
        {
          taskId: 't1',
          dayNumber: 1,
          title: 'Review Raft Consensus',
          description: 'Study election safety and log replication',
          priority: 'critical',
          estimatedMinutes: 45,
          difficulty: 'intermediate',
          category: 'theory',
          expectedOutcome: 'Clear understanding of Raft terms',
          completionCriteria: 'Diagram term transition',
          status: 'pending',
        },
        {
          taskId: 't2',
          dayNumber: 2,
          title: 'Implement Heartbeat Leader Election',
          description: 'Simulate heartbeat timer in code',
          priority: 'high',
          estimatedMinutes: 45,
          difficulty: 'advanced',
          category: 'coding_practice',
          expectedOutcome: 'Passing simulation',
          completionCriteria: 'Timer reset verified',
          status: 'pending',
        },
      ],
      reassessment: {
        status: 'not_eligible',
        originalScore: 60,
      },
    });

    assert.equal(plan.status, 'not_started');
    assert.equal(plan.progress.completionPercentage, 0);

    // Complete task 1 (50%)
    plan.tasks[0].status = 'completed';
    plan.tasks[0].completedAt = new Date();
    plan.recalculateProgress();

    assert.equal(plan.status, 'in_progress');
    assert.equal(plan.progress.completedTasks, 1);
    assert.equal(plan.progress.completionPercentage, 50);
    assert.equal(plan.progress.currentDay, 2);

    // Complete task 2 (100%)
    plan.tasks[1].status = 'completed';
    plan.tasks[1].completedAt = new Date();
    plan.recalculateProgress();

    assert.equal(plan.status, 'completed');
    assert.equal(plan.progress.completedTasks, 2);
    assert.equal(plan.progress.completionPercentage, 100);
    assert.equal(plan.reassessment.status, 'ready');
  });

  await t.test('5. Reassessment generation and score delta evaluation integrity', async () => {
    const mockPlan = {
      targetRole: 'Staff Frontend Engineer',
      overallScore: 55,
      criticalWeaknesses: [
        {
          weaknessId: 'gap_css_1',
          topic: 'Browser Rendering Pipeline',
          description: 'Did not know difference between Composite and Layout reflows',
        },
      ],
      reassessment: {
        originalScore: 55,
        questions: [
          {
            questionId: 'rq_1',
            questionText: 'Explain the difference between Layout reflow and Composite paint.',
            topic: 'Browser Rendering Pipeline',
            relatedWeaknessId: 'gap_css_1',
          },
        ],
      },
    };

    // Test questions generation
    const questions = await generateReassessmentQuestions(mockPlan, {
      askAI: async () => JSON.stringify({
        questions: [
          {
            questionId: 'rq_1',
            questionText: 'Explain why transform and opacity trigger composite-only renders.',
            topic: 'Browser Rendering Pipeline',
            relatedWeaknessId: 'gap_css_1',
          },
        ],
      }),
    });

    assert.ok(Array.isArray(questions));
    assert.equal(questions.length, 1);
    assert.equal(questions[0].topic, 'Browser Rendering Pipeline');

    // Test evaluation and score comparison
    const evalResult = await evaluateReassessmentAnswers({
      plan: mockPlan,
      submittedAnswers: [
        {
          questionId: 'rq_1',
          answer: 'Transform and opacity changes can be offloaded directly to the GPU compositor thread without triggering CPU layout calculation or repaint passes, avoiding expensive DOM tree reflows.',
        },
      ],
      options: {
        askAI: async () => JSON.stringify({
          score: 90,
          feedback: 'Exceptional response explaining GPU compositor thread offloading and DOM avoidance.',
          isMastered: true,
        }),
      },
    });

    assert.equal(evalResult.reassessmentScore, 90);
    assert.equal(evalResult.originalScore, 55);
    assert.equal(evalResult.scoreDelta, 35, 'Demonstrates authentic +35 score delta improvement');
    assert.ok(evalResult.improvementsObserved.length > 0);
  });

  await t.test('6. Anti-IDOR Security: Unauthorized access is rejected with status 403', async () => {
    // Mock RecoveryPlan.findById
    const originalFindById = RecoveryPlan.findById;
    RecoveryPlan.findById = async (id) => ({
      _id: id,
      userId: dummyUserId,
      targetRole: 'Software Engineer',
    });

    try {
      // Authorized access succeeds
      const authorized = await getRecoveryPlanById('mock_plan_id', dummyUserId);
      assert.ok(authorized);
      assert.equal(authorized.userId.toString(), dummyUserId.toString());

      // Unauthorized access throws 403
      await assert.rejects(
        async () => {
          await getRecoveryPlanById('mock_plan_id', unauthorizedUserId);
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.ok(err.message.includes('Unauthorized'));
          return true;
        }
      );
    } finally {
      RecoveryPlan.findById = originalFindById;
    }
  });

  await t.test('7. Task Status Update validates status enum and recalculates progress', async () => {
    const mockPlanDoc = new RecoveryPlan({
      userId: dummyUserId,
      interviewId: dummyInterviewId,
      targetRole: 'QA Automation Engineer',
      scheduleDurationDays: 7,
      dailyStudyMinutes: 30,
      overallAssessment: 'Test plan',
      tasks: [
        {
          taskId: 't_qa_1',
          dayNumber: 1,
          title: 'Playwright Fixtures',
          description: 'Learn worker vs test fixtures',
          priority: 'high',
          estimatedMinutes: 30,
          difficulty: 'intermediate',
          category: 'coding_practice',
          expectedOutcome: 'Working test fixture',
          completionCriteria: 'Pass fixture test',
          status: 'pending',
        },
      ],
      reassessment: {
        status: 'not_eligible',
        originalScore: 50,
      },
    });

    mockPlanDoc.save = async () => mockPlanDoc;

    const originalFindById = RecoveryPlan.findById;
    RecoveryPlan.findById = async () => mockPlanDoc;

    try {
      // Rejects invalid status
      await assert.rejects(
        async () => {
          await updateTaskStatus('plan_1', 't_qa_1', { status: 'invalid_status' }, dummyUserId);
        },
        /Invalid status/
      );

      // Successfully updates to in_progress
      const updated = await updateTaskStatus('plan_1', 't_qa_1', { status: 'in_progress', candidateNotes: 'Starting module' }, dummyUserId);
      assert.equal(updated.tasks[0].status, 'in_progress');
      assert.equal(updated.tasks[0].candidateNotes, 'Starting module');

      // Completes task
      const completed = await updateTaskStatus('plan_1', 't_qa_1', { status: 'completed' }, dummyUserId);
      assert.equal(completed.tasks[0].status, 'completed');
      assert.equal(completed.progress.completionPercentage, 100);
      assert.equal(completed.status, 'completed');
    } finally {
      RecoveryPlan.findById = originalFindById;
    }
  });

  await t.test('8. Reassessment Eligibility Gate: Rejects reassessment if minimum threshold not met', async () => {
    const mockIncompletePlan = new RecoveryPlan({
      userId: dummyUserId,
      interviewId: dummyInterviewId,
      targetRole: 'DevOps Engineer',
      scheduleDurationDays: 14,
      dailyStudyMinutes: 45,
      overallAssessment: 'Test roadmap',
      status: 'not_started',
      progress: {
        totalTasks: 10,
        completedTasks: 1,
        completionPercentage: 10,
        currentDay: 2,
      },
      tasks: [],
      reassessment: {
        status: 'not_eligible',
        originalScore: 40,
      },
    });

    mockIncompletePlan.save = async () => mockIncompletePlan;

    const originalFindById = RecoveryPlan.findById;
    RecoveryPlan.findById = async () => mockIncompletePlan;

    try {
      await assert.rejects(
        async () => {
          await initiateReassessment('mock_plan_id', dummyUserId);
        },
        /Candidate must complete at least 50% of recovery tasks/
      );
    } finally {
      RecoveryPlan.findById = originalFindById;
    }
  });
});
