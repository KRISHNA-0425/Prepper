/**
 * @file crossExamination.api.test.js
 * Comprehensive automated test suite for Cross-Examination Session Lifecycle APIs.
 * Validates authenticated ownership, question/answer progression, state machine transitions,
 * candidate privacy masking, and failure recovery.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import mongoose from 'mongoose';
import CrossExaminationSession from '../models/crossExaminationSession.model.js';
import { handleOptionalResumeUpload } from '../routes/crossExamination.routes.js';
import {
  createCrossExaminationController,
  sanitizeQuestionForCandidate,
  sanitizeSessionForCandidate,
} from '../controllers/crossExamination.controller.js';
import {
  SESSION_STATUSES,
  CLAIM_CATEGORIES,
  PROVENANCE_TYPES,
  CONFIDENCE_LEVELS,
  EXAMINATION_DIMENSIONS,
  EXAMINATION_INTENTS,
  OPPORTUNITY_TYPES,
  PRIORITY_LEVELS,
  QUESTION_DIFFICULTY,
  INQUIRY_TYPES,
} from '../contracts/crossExamination.contracts.js';

// Helper to create mock Express response
const createMockRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  },
});

// Mock in-memory SessionModel backed by real CrossExaminationSession Mongoose documents
class MockSessionStore {
  constructor() {
    this.sessions = new Map();
  }

  createModelClass() {
    const store = this;

    class MockSessionModel extends CrossExaminationSession {
      constructor(data) {
        super(data);
        if (!this._id) {
          this._id = new mongoose.Types.ObjectId();
        }
      }

      async save() {
        const validationError = this.validateSync();
        if (validationError) {
          throw validationError;
        }
        store.sessions.set(this._id.toString(), this);
        return this;
      }

      static async findOne(query) {
        const { _id, userId, idempotencyKey } = query;
        if (idempotencyKey) {
          for (const session of store.sessions.values()) {
            if (
              session.idempotencyKey === idempotencyKey &&
              (!userId || session.userId.toString() === userId.toString())
            ) {
              return session;
            }
          }
          return null;
        }
        if (!_id) return null;
        const session = store.sessions.get(_id.toString());
        if (!session) return null;
        if (userId && session.userId.toString() !== userId.toString()) {
          return null; // Enforces resource-level user ownership
        }
        return session;
      }

      static find(query) {
        const { userId } = query;
        const results = [];
        for (const session of store.sessions.values()) {
          if (!userId || session.userId.toString() === userId.toString()) {
            results.push(session);
          }
        }

        const queryObj = {
          sort(sortCriteria) {
            results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            return queryObj;
          },
          limit(n) {
            results.splice(n);
            return queryObj;
          },
          select(fields) {
            return results;
          },
        };
        return queryObj;
      }
    }

    return MockSessionModel;
  }
}

// Sample valid test fixtures
const createSampleProjectProfile = () => ({
  projects: [
    {
      projectId: 'prj_alpha_1',
      title: 'Cloud Transaction Platform',
      description: 'Distributed payment gateway processing high volumes',
      candidateRole: 'Lead Backend Engineer',
      technologies: ['Node.js', 'PostgreSQL', 'Redis', 'Kafka'],
      claims: [
        {
          claimId: 'clm_1',
          category: CLAIM_CATEGORIES.SCALE_METRIC,
          statement: 'Processed 5,000 transactions per second during flash sales',
          sourceExcerpt: 'Scaled transaction pipeline to handle 5k TPS during flash sales',
          provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
          confidence: CONFIDENCE_LEVELS.HIGH,
        },
        {
          claimId: 'clm_2',
          category: CLAIM_CATEGORIES.ARCHITECTURE_DECISION,
          statement: 'Selected Kafka to decouple checkout requests from billing ledger',
          sourceExcerpt: 'Adopted Kafka message bus to isolate payment events from billing',
          provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
          confidence: CONFIDENCE_LEVELS.HIGH,
        },
      ],
    },
  ],
});

const createSampleBlueprint = () => ({
  success: true,
  blueprintId: 'blp_sample_01',
  totalProjectsAnalyzed: 1,
  totalOpportunities: 2,
  allOpportunitiesSorted: [
    {
      opportunityId: 'opp_alpha_01',
      projectId: 'prj_alpha_1',
      projectTitle: 'Cloud Transaction Platform',
      referencedClaimIds: ['clm_1'],
      dimension: EXAMINATION_DIMENSIONS.METRICS_AND_OUTCOMES,
      examinationIntent: EXAMINATION_INTENTS.CLARIFY_METRIC,
      opportunityType: OPPORTUNITY_TYPES.DIRECT_CLAIM_PROBE,
      groundingSource: 'Processed 5,000 transactions per second during flash sales',
      rationale: 'Examine measurement methodology and baseline context',
      priorityScore: 85,
      priorityLevel: PRIORITY_LEVELS.HIGH,
    },
    {
      opportunityId: 'opp_alpha_02',
      projectId: 'prj_alpha_1',
      projectTitle: 'Cloud Transaction Platform',
      referencedClaimIds: ['clm_2'],
      dimension: EXAMINATION_DIMENSIONS.ARCHITECTURE_BOUNDARIES,
      examinationIntent: EXAMINATION_INTENTS.PROBE_ARCHITECTURE,
      opportunityType: OPPORTUNITY_TYPES.DIRECT_CLAIM_PROBE,
      groundingSource: 'Selected Kafka to decouple checkout requests',
      rationale: 'Probe delivery guarantees and partition semantics',
      priorityScore: 78,
      priorityLevel: PRIORITY_LEVELS.MEDIUM,
    },
  ],
});

const createSampleQuestions = () => [
  {
    questionId: 'ceq_q1',
    opportunityId: 'opp_alpha_01',
    targetProjectId: 'prj_alpha_1',
    targetClaimIds: ['clm_1'],
    dimension: EXAMINATION_DIMENSIONS.METRICS_AND_OUTCOMES,
    examinationIntent: EXAMINATION_INTENTS.CLARIFY_METRIC,
    inquiryType: INQUIRY_TYPES.TECHNICAL_EXPLANATION,
    difficulty: QUESTION_DIFFICULTY.HARD,
    questionText: 'Under what test conditions was the 5,000 TPS measured, and what was the 99th percentile latency?',
    rationale: 'PRIVATE EVAL RATIONALE - DO NOT EXPOSE TO CANDIDATE',
    expectedEvidence: ['latency benchmarks', 'load injection methodology'],
    followUpGuidance: 'Check if candidate knew failure margins',
    timeLimit: 90,
  },
  {
    questionId: 'ceq_q2',
    opportunityId: 'opp_alpha_02',
    targetProjectId: 'prj_alpha_1',
    targetClaimIds: ['clm_2'],
    dimension: EXAMINATION_DIMENSIONS.ARCHITECTURE_BOUNDARIES,
    examinationIntent: EXAMINATION_INTENTS.PROBE_ARCHITECTURE,
    inquiryType: INQUIRY_TYPES.ARCHITECTURE_TRADEOFF,
    difficulty: QUESTION_DIFFICULTY.MEDIUM,
    questionText: 'How did you handle message duplication and partition rebalancing in the Kafka consumer groups?',
    rationale: 'PRIVATE ARCHITECTURE RATIONALE',
    expectedEvidence: ['idempotent receiver', 'consumer group offsets'],
    followUpGuidance: 'Probe dead letter queues',
    timeLimit: 90,
  },
];

describe('Cross-Examination Session Lifecycle APIs', () => {
  let sessionStore;
  let MockSessionModel;
  let userAId;
  let userBId;
  let controller;

  beforeEach(() => {
    sessionStore = new MockSessionStore();
    MockSessionModel = sessionStore.createModelClass();
    userAId = new mongoose.Types.ObjectId().toString();
    userBId = new mongoose.Types.ObjectId().toString();

    controller = createCrossExaminationController({
      SessionModel: MockSessionModel,
      extractClaimsFn: async () => ({
        ...createSampleProjectProfile(),
        role: 'Distributed Systems Engineer',
        resumeHash: 'hash_test_123',
      }),
      analyzeBlueprintFn: () => createSampleBlueprint(),
      generateQuestionsFn: async () => ({
        success: true,
        questions: createSampleQuestions(),
      }),
      evaluateAnswerFn: async () => ({
        success: true,
        evaluation: null,
      }),
      generateFollowUpFn: async () => ({
        success: true,
        followUpQuestion: null,
      }),
    });
  });

  describe('Session Creation (POST /api/cross-examination/sessions)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const req = { body: { resumeText: 'Valid resume text with sufficient length for testing...' } };
      const res = createMockRes();

      await controller.createSession(req, res);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.message, 'Authentication required');
    });

    it('should reject empty or missing resume profile with 400', async () => {
      const req = { userId: userAId, body: {} };
      const res = createMockRes();

      await controller.createSession(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /valid resumeText .* required/i);
    });

    it('should reject resumeText exceeding 30,000 characters', async () => {
      const longText = 'x'.repeat(30005);
      const req = { userId: userAId, body: { resumeText: longText } };
      const res = createMockRes();

      await controller.createSession(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /maximum allowed length/i);
    });

    it('should successfully create and initialize an active session from valid profile', async () => {
      const req = {
        userId: userAId,
        body: {
          crossExaminationProfile: createSampleProjectProfile(),
          targetRole: 'Staff Systems Architect',
          targetDomain: 'Cloud Infrastructure',
          questionCount: 2,
        },
      };
      const res = createMockRes();

      await controller.createSession(req, res);
      assert.strictEqual(res.statusCode, 201);
      assert.ok(res.body.session);
      assert.strictEqual(res.body.session.targetRole, 'Staff Systems Architect');
      assert.strictEqual(res.body.session.status, SESSION_STATUSES.AWAITING_ANSWER);
      assert.strictEqual(res.body.session.progress.totalQuestions, 2);
      assert.strictEqual(res.body.session.progress.answeredCount, 0);
      assert.strictEqual(res.body.session.progress.currentQuestionIndex, 1);
      assert.strictEqual(res.body.session.currentQuestion.questionId, 'ceq_q1');
    });

    it('should NOT persist session if question generation fails (graceful failure)', async () => {
      const failingController = createCrossExaminationController({
        SessionModel: MockSessionModel,
        analyzeBlueprintFn: () => createSampleBlueprint(),
        generateQuestionsFn: async () => ({
          success: false,
          questions: [],
          error: 'AI Provider Rate Limit Exceeded',
        }),
      });

      const req = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res = createMockRes();

      await failingController.createSession(req, res);
      assert.strictEqual(res.statusCode, 502);
      assert.match(res.body.error, /Rate Limit/);
      assert.strictEqual(sessionStore.sessions.size, 0); // No broken session persisted
    });

    it('should NEVER expose private evaluation metadata in candidate payload during creation', async () => {
      const req = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res = createMockRes();

      await controller.createSession(req, res);
      assert.strictEqual(res.statusCode, 201);

      const session = res.body.session;
      // Questions must not expose rationale, expectedEvidence, followUpGuidance
      for (const q of session.questions) {
        assert.strictEqual(q.rationale, undefined);
        assert.strictEqual(q.expectedEvidence, undefined);
        assert.strictEqual(q.followUpGuidance, undefined);
      }
      assert.strictEqual(session.currentQuestion.rationale, undefined);
      assert.strictEqual(session.currentQuestion.expectedEvidence, undefined);
      assert.strictEqual(session.currentQuestion.followUpGuidance, undefined);
    });
  });

  describe('Session Retrieval & Ownership Authorization (GET /:sessionId)', () => {
    let createdSessionId;

    beforeEach(async () => {
      const req = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res = createMockRes();
      await controller.createSession(req, res);
      createdSessionId = res.body.session.sessionId.toString();
    });

    it('should return 404 for nonexistent session ID', async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const req = { userId: userAId, params: { sessionId: randomId } };
      const res = createMockRes();

      await controller.getSession(req, res);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.message, 'Cross-examination session not found');
    });

    it('should prevent cross-user access: User B cannot retrieve User A session (returns 404)', async () => {
      const req = { userId: userBId, params: { sessionId: createdSessionId } };
      const res = createMockRes();

      await controller.getSession(req, res);
      // Returns 404 to avoid revealing resource existence across tenants
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.message, 'Cross-examination session not found');
    });

    it('should allow legitimate owner to retrieve session with masked active evaluation metadata', async () => {
      const req = { userId: userAId, params: { sessionId: createdSessionId } };
      const res = createMockRes();

      await controller.getSession(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.session.sessionId.toString(), createdSessionId);
      assert.strictEqual(res.body.session.questions[0].rationale, undefined);
      assert.strictEqual(res.body.session.questions[0].expectedEvidence, undefined);
    });

    it('should list only sessions belonging to authenticated user', async () => {
      // Create session for user B
      const reqB = {
        userId: userBId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      await controller.createSession(reqB, createMockRes());

      // Query for User A
      const reqListA = { userId: userAId, query: {} };
      const resListA = createMockRes();
      await controller.listSessions(reqListA, resListA);

      assert.strictEqual(resListA.statusCode, 200);
      assert.strictEqual(resListA.body.count, 1);
      assert.strictEqual(resListA.body.sessions[0].sessionId.toString(), createdSessionId);
    });
  });

  describe('Answer Submission & Question Progression (POST /:sessionId/answers)', () => {
    let sessionId;

    beforeEach(async () => {
      const req = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res = createMockRes();
      await controller.createSession(req, res);
      sessionId = res.body.session.sessionId.toString();
    });

    it('should reject answer submission by another user (User B) with 404', async () => {
      const req = {
        userId: userBId,
        params: { sessionId },
        body: { questionId: 'ceq_q1', rawTranscript: 'Candidate answer...' },
      };
      const res = createMockRes();

      await controller.submitAnswer(req, res);
      assert.strictEqual(res.statusCode, 404);
    });

    it('should reject empty answer transcript with 400', async () => {
      const req = {
        userId: userAId,
        params: { sessionId },
        body: { questionId: 'ceq_q1', rawTranscript: '   ' },
      };
      const res = createMockRes();

      await controller.submitAnswer(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /rawTranscript is required/);
    });

    it('should reject answer transcript exceeding 5000 characters', async () => {
      const req = {
        userId: userAId,
        params: { sessionId },
        body: { questionId: 'ceq_q1', rawTranscript: 'a'.repeat(5001) },
      };
      const res = createMockRes();

      await controller.submitAnswer(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /maximum allowed length/i);
    });

    it('should reject answer if questionId does NOT match active question', async () => {
      const req = {
        userId: userAId,
        params: { sessionId },
        body: { questionId: 'ceq_q2', rawTranscript: 'Attempting to answer Q2 out of order...' },
      };
      const res = createMockRes();

      await controller.submitAnswer(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /active question is 'ceq_q1'/);
    });

    it('should accept valid answer and mark active question as answered', async () => {
      const req = {
        userId: userAId,
        params: { sessionId },
        body: {
          questionId: 'ceq_q1',
          rawTranscript: 'We used JMeter distributed load generation on 8 worker instances...',
          timeTaken: 45,
        },
      };
      const res = createMockRes();

      await controller.submitAnswer(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.progress.answeredCount, 1);

      // Verify session state in store
      const sessionInStore = sessionStore.sessions.get(sessionId);
      assert.strictEqual(sessionInStore.answers.length, 1);
      assert.strictEqual(sessionInStore.findQuestion('ceq_q1').status, 'answered');
    });

    it('should reject duplicate answer submission for already answered question', async () => {
      const req1 = {
        userId: userAId,
        params: { sessionId },
        body: { questionId: 'ceq_q1', rawTranscript: 'First submission' },
      };
      await controller.submitAnswer(req1, createMockRes());

      const req2 = {
        userId: userAId,
        params: { sessionId },
        body: { questionId: 'ceq_q1', rawTranscript: 'Duplicate submission attempt' },
      };
      const res2 = createMockRes();
      await controller.submitAnswer(req2, res2);

      // Fails with 400 or 409 because Q1 is no longer current / already answered
      assert.ok(res2.statusCode === 400 || res2.statusCode === 409);
    });

    it('should auto-advance to next question when autoAdvance is true', async () => {
      const req = {
        userId: userAId,
        params: { sessionId },
        body: {
          questionId: 'ceq_q1',
          rawTranscript: 'Answer to question 1',
          autoAdvance: true,
        },
      };
      const res = createMockRes();

      await controller.submitAnswer(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.progress.currentQuestionIndex, 2);
      assert.strictEqual(res.body.nextQuestion.questionId, 'ceq_q2');
      assert.strictEqual(res.body.nextQuestion.rationale, undefined); // Sanitized
    });
  });

  describe('Advancing Questions (POST /:sessionId/advance)', () => {
    let sessionId;

    beforeEach(async () => {
      const req = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res = createMockRes();
      await controller.createSession(req, res);
      sessionId = res.body.session.sessionId.toString();
    });

    it('should reject advancing while current question is unanswered with 400', async () => {
      const req = { userId: userAId, params: { sessionId } };
      const res = createMockRes();

      await controller.advanceQuestion(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /unanswered/i);
    });

    it('should successfully advance to Question 2 after Question 1 is answered', async () => {
      // 1. Answer Q1
      await controller.submitAnswer(
        {
          userId: userAId,
          params: { sessionId },
          body: { questionId: 'ceq_q1', rawTranscript: 'Valid answer 1' },
        },
        createMockRes()
      );

      // 2. Advance
      const reqAdvance = { userId: userAId, params: { sessionId } };
      const resAdvance = createMockRes();
      await controller.advanceQuestion(reqAdvance, resAdvance);

      assert.strictEqual(resAdvance.statusCode, 200);
      assert.strictEqual(resAdvance.body.progress.currentQuestionIndex, 2);
      assert.strictEqual(resAdvance.body.currentQuestion.questionId, 'ceq_q2');
      assert.strictEqual(resAdvance.body.currentQuestion.rationale, undefined); // Privacy check
    });

    it('should report isFinished when all questions have been answered', async () => {
      // Answer Q1 and advance
      await controller.submitAnswer(
        {
          userId: userAId,
          params: { sessionId },
          body: { questionId: 'ceq_q1', rawTranscript: 'Valid answer 1', autoAdvance: true },
        },
        createMockRes()
      );

      // Answer Q2
      await controller.submitAnswer(
        {
          userId: userAId,
          params: { sessionId },
          body: { questionId: 'ceq_q2', rawTranscript: 'Valid answer 2' },
        },
        createMockRes()
      );

      // Advance past last question
      const resAdvance = createMockRes();
      await controller.advanceQuestion({ userId: userAId, params: { sessionId } }, resAdvance);

      assert.strictEqual(resAdvance.statusCode, 200);
      assert.strictEqual(resAdvance.body.isFinished, true);
      assert.strictEqual(resAdvance.body.currentQuestion, null);
    });
  });

  describe('Session Completion (POST /:sessionId/complete)', () => {
    let sessionId;

    beforeEach(async () => {
      const req = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res = createMockRes();
      await controller.createSession(req, res);
      sessionId = res.body.session.sessionId.toString();
    });

    it('should complete session and transition state to COMPLETED', async () => {
      const req = { userId: userAId, params: { sessionId } };
      const res = createMockRes();

      await controller.completeSession(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.session.status, SESSION_STATUSES.COMPLETED);
      assert.ok(res.body.session.report);

      const sessionInStore = sessionStore.sessions.get(sessionId);
      assert.strictEqual(sessionInStore.status, SESSION_STATUSES.COMPLETED);
    });

    it('should reject duplicate completion attempt with 400', async () => {
      await controller.completeSession({ userId: userAId, params: { sessionId } }, createMockRes());

      const resSecond = createMockRes();
      await controller.completeSession({ userId: userAId, params: { sessionId } }, resSecond);

      assert.strictEqual(resSecond.statusCode, 400);
      assert.match(resSecond.body.message, /already completed/i);
    });

    it('should reject submitting answers to a completed session with 409', async () => {
      await controller.completeSession({ userId: userAId, params: { sessionId } }, createMockRes());

      const resSubmit = createMockRes();
      await controller.submitAnswer(
        {
          userId: userAId,
          params: { sessionId },
          body: { questionId: 'ceq_q1', rawTranscript: 'Late answer' },
        },
        resSubmit
      );

      assert.strictEqual(resSubmit.statusCode, 409);
      assert.match(resSubmit.body.message, /Cannot submit answer to a session with status 'completed'/i);
    });
  });

  describe('Session Resumption & Mid-Interview State Recovery', () => {
    it('should accurately resume a partially completed session', async () => {
      // 1. Create session
      const reqCreate = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const resCreate = createMockRes();
      await controller.createSession(reqCreate, resCreate);
      const sessionId = resCreate.body.session.sessionId.toString();

      // 2. Answer Q1 and auto-advance to Q2
      const reqAnswer = {
        userId: userAId,
        params: { sessionId },
        body: {
          questionId: 'ceq_q1',
          rawTranscript: 'Detailed answer for question 1...',
          timeTaken: 50,
          autoAdvance: true,
        },
      };
      await controller.submitAnswer(reqAnswer, createMockRes());

      // 3. User closes browser and resumes by fetching session
      const reqResume = { userId: userAId, params: { sessionId } };
      const resResume = createMockRes();
      await controller.getSession(reqResume, resResume);

      assert.strictEqual(resResume.statusCode, 200);
      const resumed = resResume.body.session;
      assert.strictEqual(resumed.progress.answeredCount, 1);
      assert.strictEqual(resumed.progress.totalQuestions, 2);
      assert.strictEqual(resumed.progress.currentQuestionIndex, 2);
      assert.strictEqual(resumed.currentQuestion.questionId, 'ceq_q2');
      assert.strictEqual(resumed.questions.find((q) => q.questionId === 'ceq_q1').status, 'answered');
      assert.strictEqual(resumed.questions.find((q) => q.questionId === 'ceq_q2').status, 'current');
      // Verify evaluation metadata is still masked upon resumption
      assert.strictEqual(resumed.currentQuestion.expectedEvidence, undefined);
    });
  });

  describe('Input Validation & Persistence Failure Handling', () => {
    it('should reject profile with invalid project claims contract', async () => {
      const invalidProfile = {
        projects: [
          {
            title: 'Faulty Project',
            claims: [
              {
                statement: 'Unsupported category claim',
                category: 'INVALID_CATEGORY_NAME',
                provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
              },
            ],
          },
        ],
      };

      const req = { userId: userAId, body: { crossExaminationProfile: invalidProfile } };
      const res = createMockRes();

      await controller.createSession(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /Invalid claim category/i);
    });

    it('should handle persistence error cleanly without leaking partial state', async () => {
      class ErrorThrowingModel extends MockSessionModel {
        async save() {
          throw new Error('Database write failure: disk quota exceeded');
        }
      }

      const failingPersistController = createCrossExaminationController({
        SessionModel: ErrorThrowingModel,
        analyzeBlueprintFn: () => createSampleBlueprint(),
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const req = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res = createMockRes();

      await failingPersistController.createSession(req, res);
      assert.strictEqual(res.statusCode, 500);
      assert.match(res.body.message, /Internal server error creating cross-examination session/i);
      assert.match(res.body.error, /Database write failure/i);
    });
  });

  describe('Resume File Upload & PDF Parsing (POST /sessions with req.file)', () => {
    it('should parse uploaded PDF resume and clean up uploaded file from disk', async () => {
      const mockFilePath = 'public/temp_test_resume.pdf';
      fs.writeFileSync(mockFilePath, 'dummy pdf buffer');

      let parsedFilePath = null;
      const uploadController = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async (filePath) => {
          parsedFilePath = filePath;
          return 'Valid parsed resume text containing engineering experience and projects with more than fifty characters.';
        },
        extractClaimsFn: async () => ({
          ...createSampleProjectProfile(),
          role: 'Backend Architect',
          resumeHash: 'pdf_hash_123',
        }),
        analyzeBlueprintFn: () => createSampleBlueprint(),
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const req = {
        userId: userAId,
        file: { path: mockFilePath },
        body: { targetRole: 'Backend Architect' },
      };
      const res = createMockRes();

      await uploadController.createSession(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(parsedFilePath, mockFilePath);
      assert.strictEqual(fs.existsSync(mockFilePath), false); // File unlinked immediately
      assert.strictEqual(res.body.session.targetRole, 'Backend Architect');
    });

    it('should handle PDF parsing failure gracefully and clean up file path', async () => {
      const mockFilePath = 'public/corrupt_resume.pdf';
      fs.writeFileSync(mockFilePath, 'corrupted data');

      const failingPdfController = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async () => {
          throw new Error('Invalid or password-protected PDF document');
        },
      });

      const req = {
        userId: userAId,
        file: { path: mockFilePath },
        body: {},
      };
      const res = createMockRes();

      await failingPdfController.createSession(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /Failed to parse uploaded PDF/i);
      assert.strictEqual(fs.existsSync(mockFilePath), false); // File cleaned up on failure
    });
  });

  describe('Forged Provenance & Trust Boundary Guardrails', () => {
    it('should detect and demote forged explicit claims when excerpt is not in source text', async () => {
      const sourceResume = 'Real source text: Developed Node.js REST API with Redis cache.';
      const profileWithForgedClaim = {
        resumeExcerpt: sourceResume,
        projects: [
          {
            title: 'Payment Gateway',
            claims: [
              {
                statement: 'Fabricated scale claim with forged provenance',
                category: CLAIM_CATEGORIES.SCALE_METRIC,
                provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
                sourceExcerpt: 'This phrase absolutely does NOT exist anywhere in the source text',
                confidence: CONFIDENCE_LEVELS.HIGH,
              },
            ],
          },
        ],
      };

      let passedProfile = null;
      const guardController = createCrossExaminationController({
        SessionModel: MockSessionModel,
        analyzeBlueprintFn: ({ crossExaminationProfile }) => {
          passedProfile = crossExaminationProfile;
          return createSampleBlueprint();
        },
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const req = {
        userId: userAId,
        body: { crossExaminationProfile: profileWithForgedClaim },
      };
      const res = createMockRes();

      await guardController.createSession(req, res);

      assert.strictEqual(res.statusCode, 201);
      // Verify claim was demoted
      const checkedClaim = passedProfile.projects[0].claims[0];
      assert.strictEqual(checkedClaim.provenanceType, PROVENANCE_TYPES.AI_INFERRED_CATEGORY);
      assert.strictEqual(checkedClaim.confidence, CONFIDENCE_LEVELS.UNCERTAIN);
    });

    it('should demote claims if no source text is provided to substantiate explicit statements', async () => {
      const profileNoSource = {
        projects: [
          {
            title: 'Microservices Platform',
            claims: [
              {
                statement: 'Scaled to 10k TPS without source text',
                category: CLAIM_CATEGORIES.SCALE_METRIC,
                provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
                sourceExcerpt: 'Scaled to 10k TPS',
                confidence: CONFIDENCE_LEVELS.HIGH,
              },
            ],
          },
        ],
      };

      let passedProfile = null;
      const guardController = createCrossExaminationController({
        SessionModel: MockSessionModel,
        analyzeBlueprintFn: ({ crossExaminationProfile }) => {
          passedProfile = crossExaminationProfile;
          return createSampleBlueprint();
        },
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const req = {
        userId: userAId,
        body: { crossExaminationProfile: profileNoSource },
      };
      const res = createMockRes();

      await guardController.createSession(req, res);

      assert.strictEqual(res.statusCode, 201);
      const checkedClaim = passedProfile.projects[0].claims[0];
      assert.strictEqual(checkedClaim.provenanceType, PROVENANCE_TYPES.AI_INFERRED_CATEGORY);
      assert.strictEqual(checkedClaim.confidence, CONFIDENCE_LEVELS.UNCERTAIN);
    });
  });

  describe('Idempotency & Duplicate Session Prevention', () => {
    it('should return existing session when idempotency key is repeated', async () => {
      const idempotencyKey = 'client-req-uuid-999';

      const req1 = {
        userId: userAId,
        headers: { 'idempotency-key': idempotencyKey },
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res1 = createMockRes();
      await controller.createSession(req1, res1);

      assert.strictEqual(res1.statusCode, 201);
      const firstSessionId = res1.body.session.sessionId.toString();

      // Second request with same idempotency key
      const req2 = {
        userId: userAId,
        headers: { 'idempotency-key': idempotencyKey },
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res2 = createMockRes();
      await controller.createSession(req2, res2);

      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(res2.body.isIdempotentReplay, true);
      assert.strictEqual(res2.body.session.sessionId.toString(), firstSessionId);
      // No duplicate session persisted
      assert.strictEqual(sessionStore.sessions.size, 1);
    });

    it('should recover gracefully from concurrent Mongo E11000 duplicate key error and return winning session', async () => {
      const idempotencyKey = 'concurrent-race-key-101';
      // First session exists in store
      const req1 = {
        userId: userAId,
        headers: { 'idempotency-key': idempotencyKey },
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res1 = createMockRes();
      await controller.createSession(req1, res1);
      const expectedSessionId = res1.body.session.sessionId.toString();

      // Controller simulating save() throwing E11000 duplicate key
      class DuplicateKeyThrowingModel extends MockSessionModel {
        async save() {
          const dupErr = new Error('E11000 duplicate key error collection: crossexaminationsessions index: userId_1_idempotencyKey_1');
          dupErr.code = 11000;
          throw dupErr;
        }
      }

      const raceController = createCrossExaminationController({
        SessionModel: DuplicateKeyThrowingModel,
        analyzeBlueprintFn: () => createSampleBlueprint(),
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const req2 = {
        userId: userAId,
        headers: { 'idempotency-key': idempotencyKey },
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const res2 = createMockRes();

      await raceController.createSession(req2, res2);

      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(res2.body.isIdempotentReplay, true);
      assert.strictEqual(res2.body.session.sessionId.toString(), expectedSessionId);
    });
  });

  describe('Strict Authentication Guards Across All Endpoints', () => {
    it('should reject unauthenticated getSession with 401', async () => {
      const res = createMockRes();
      await controller.getSession({ params: { sessionId: 'some_id' } }, res);
      assert.strictEqual(res.statusCode, 401);
    });

    it('should reject unauthenticated listSessions with 401', async () => {
      const res = createMockRes();
      await controller.listSessions({ query: {} }, res);
      assert.strictEqual(res.statusCode, 401);
    });

    it('should reject unauthenticated submitAnswer with 401', async () => {
      const res = createMockRes();
      await controller.submitAnswer({ params: { sessionId: 'some_id' }, body: {} }, res);
      assert.strictEqual(res.statusCode, 401);
    });

    it('should reject unauthenticated advanceQuestion with 401', async () => {
      const res = createMockRes();
      await controller.advanceQuestion({ params: { sessionId: 'some_id' } }, res);
      assert.strictEqual(res.statusCode, 401);
    });

    it('should reject unauthenticated completeSession with 401', async () => {
      const res = createMockRes();
      await controller.completeSession({ params: { sessionId: 'some_id' } }, res);
      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Route Middleware (handleOptionalResumeUpload)', () => {
    it('should bypass non-multipart requests to next() without error', () => {
      let nextCalled = false;
      const req = { is: () => false };
      const res = createMockRes();
      handleOptionalResumeUpload(req, res, () => {
        nextCalled = true;
      });
      assert.strictEqual(nextCalled, true);
    });
  });

  describe('Phase 7: Answer Analysis & Adaptive Probing Integration', () => {
    it('should evaluate answer and attach evaluation to answer record on submitAnswer', async () => {
      const mockEvaluateAnswer = async ({ question, answer }) => ({
        success: true,
        evaluation: {
          evaluationId: 'evl_mock_01',
          version: '1.0.0',
          questionId: question.questionId,
          answerId: answer.answerId,
          directEvidence: ['Demonstrated Sentinel quorum consensus'],
          partialEvidence: [],
          ambiguities: [],
          unsupportedAssertions: [],
          contradictions: [],
          alternativeApproaches: [],
          missingInformation: [],
          dimensionEvaluations: [
            {
              dimension: 'ARCHITECTURE_BOUNDARIES',
              score: 'STRONG',
              rationale: 'Clean explanation',
            },
          ],
          confidence: 'HIGH',
          followUpEligible: false,
          clarificationTargets: [],
          evaluatedAt: new Date(),
        },
      });

      const customStore = new MockSessionStore();
      const customController = createCrossExaminationController({
        SessionModel: customStore.createModelClass(),
        evaluateAnswerFn: mockEvaluateAnswer,
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      // Create session
      const createReq = {
        userId: userAId,
        body: { crossExaminationProfile: createSampleProjectProfile() },
      };
      const createRes = createMockRes();
      await customController.createSession(createReq, createRes);
      const sessionId = createRes.body.session.sessionId;

      // Submit answer
      const activeQId = createRes.body.session.currentQuestion.questionId;
      const submitReq = {
        userId: userAId,
        params: { sessionId },
        body: {
          questionId: activeQId,
          rawTranscript: 'Sentinel quorum=2 ensures no split brain when partitioned.',
          autoAdvance: false,
        },
      };
      const submitRes = createMockRes();
      await customController.submitAnswer(submitReq, submitRes);

      assert.strictEqual(submitRes.statusCode, 200);

      // Verify answer has evaluation in persisted store
      const persistedSession = customStore.sessions.get(sessionId.toString());
      assert.ok(persistedSession.answers[0].evaluation);
      assert.strictEqual(persistedSession.answers[0].evaluation.evaluationId, 'evl_mock_01');
      assert.strictEqual(persistedSession.answers[0].evaluation.directEvidence[0], 'Demonstrated Sentinel quorum consensus');

      // Verify candidate-facing response did not leak evaluation internals
      assert.strictEqual(submitRes.body.answer.evaluation, undefined);
      assert.strictEqual(submitRes.body.answer.rationale, undefined);
    });

    it('should dynamically insert targeted follow-up question and auto-advance to it when eligible', async () => {
      const mockEvaluateAnswer = async ({ question, answer }) => ({
        success: true,
        evaluation: {
          evaluationId: 'evl_mock_02',
          version: '1.0.0',
          questionId: question.questionId,
          answerId: answer.answerId,
          directEvidence: [],
          partialEvidence: ['Mentions Redis Sentinel'],
          ambiguities: ['Unclear how split-brain was prevented'],
          unsupportedAssertions: [],
          contradictions: [],
          alternativeApproaches: [],
          missingInformation: ['Specific quorum number and partition timeout'],
          dimensionEvaluations: [],
          confidence: 'LOW',
          followUpEligible: true,
          clarificationTargets: ['Explain specific quorum number and partition detection timeout'],
          evaluatedAt: new Date(),
        },
      });

      const mockGenerateFollowUp = async ({ parentQuestion }) => ({
        success: true,
        followUpQuestion: {
          questionId: 'ceq_followup_99',
          targetProjectId: parentQuestion.targetProjectId,
          targetClaimIds: parentQuestion.targetClaimIds,
          inquiryType: 'FOLLOW_UP_PROBE',
          parentQuestionId: parentQuestion.questionId,
          depth: parentQuestion.depth + 1,
          order: parentQuestion.order + 1,
          questionText: 'What exact down-after-milliseconds threshold did you configure to detect the partition?',
          difficulty: 'hard',
          timeLimit: 90,
          status: 'pending',
          dimension: parentQuestion.dimension,
          examinationIntent: parentQuestion.examinationIntent,
          rationale: 'Clarify partition timeout',
          expectedEvidence: ['Down-after-milliseconds threshold'],
          followUpGuidance: 'Candidate specifies exact timing',
        },
      });

      const customStore = new MockSessionStore();
      const customController = createCrossExaminationController({
        SessionModel: customStore.createModelClass(),
        evaluateAnswerFn: mockEvaluateAnswer,
        generateFollowUpFn: mockGenerateFollowUp,
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      // Create session
      const createRes = createMockRes();
      await customController.createSession({ userId: userAId, body: { crossExaminationProfile: createSampleProjectProfile() } }, createRes);
      const sessionId = createRes.body.session.sessionId;
      const initialTotalQuestions = createRes.body.session.progress.totalQuestions;

      // Submit answer with autoAdvance=true
      const activeQId = createRes.body.session.currentQuestion.questionId;
      const submitRes = createMockRes();
      await customController.submitAnswer({
        userId: userAId,
        params: { sessionId },
        body: {
          questionId: activeQId,
          rawTranscript: 'We used Redis Sentinel with clustering.',
          autoAdvance: true,
        },
      }, submitRes);

      assert.strictEqual(submitRes.statusCode, 200);

      // Verify nextQuestion is the generated follow-up
      assert.ok(submitRes.body.nextQuestion);
      assert.strictEqual(submitRes.body.nextQuestion.questionId, 'ceq_followup_99');
      assert.strictEqual(submitRes.body.nextQuestion.inquiryType, 'FOLLOW_UP_PROBE');

      // Verify totalQuestions incremented by 1 in session
      const persistedSession = customStore.sessions.get(sessionId.toString());
      assert.strictEqual(persistedSession.questions.length, initialTotalQuestions + 1);
    });

    it('should degrade gracefully when evaluateAnswerFn throws error without aborting answer submission', async () => {
      const failingEvaluateAnswer = async () => {
        throw new Error('AI evaluation timed out');
      };

      const customStore = new MockSessionStore();
      const customController = createCrossExaminationController({
        SessionModel: customStore.createModelClass(),
        evaluateAnswerFn: failingEvaluateAnswer,
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const createRes = createMockRes();
      await customController.createSession({ userId: userAId, body: { crossExaminationProfile: createSampleProjectProfile() } }, createRes);
      const sessionId = createRes.body.session.sessionId;

      const activeQId = createRes.body.session.currentQuestion.questionId;
      const submitRes = createMockRes();
      await customController.submitAnswer({
        userId: userAId,
        params: { sessionId },
        body: {
          questionId: activeQId,
          rawTranscript: 'Answer submitted during AI outage.',
          autoAdvance: false,
        },
      }, submitRes);

      // Successfully records answer even if evaluation failed
      assert.strictEqual(submitRes.statusCode, 200);
      assert.strictEqual(submitRes.body.message, 'Answer submitted successfully');

      const persistedSession = customStore.sessions.get(sessionId.toString());
      assert.strictEqual(persistedSession.answers.length, 1);
      assert.strictEqual(persistedSession.answers[0].rawTranscript, 'Answer submitted during AI outage.');
    });
  });

  describe('Phase 8: Preparation Report Generation and Retrieval APIs', () => {
    let completedSessionId;

    beforeEach(async () => {
      // Create session for userA
      const createRes = createMockRes();
      await controller.createSession(
        { userId: userAId, body: { crossExaminationProfile: createSampleProjectProfile() } },
        createRes
      );
      completedSessionId = createRes.body.session.sessionId.toString();

      // Answer Q1 with autoAdvance
      await controller.submitAnswer(
        {
          userId: userAId,
          params: { sessionId: completedSessionId },
          body: { questionId: 'ceq_q1', rawTranscript: 'Answered Q1 completely', autoAdvance: true },
        },
        createMockRes()
      );

      // Answer Q2 without autoAdvance
      await controller.submitAnswer(
        {
          userId: userAId,
          params: { sessionId: completedSessionId },
          body: { questionId: 'ceq_q2', rawTranscript: 'Answered Q2 completely', autoAdvance: false },
        },
        createMockRes()
      );

      // Complete session
      await controller.completeSession(
        { userId: userAId, params: { sessionId: completedSessionId } },
        createMockRes()
      );
    });

    it('should reject report generation for incomplete session with 400', async () => {
      // Create an incomplete draft/active session
      const createRes = createMockRes();
      await controller.createSession(
        { userId: userAId, body: { crossExaminationProfile: createSampleProjectProfile() } },
        createRes
      );
      const activeSessionId = createRes.body.session.sessionId.toString();

      const res = createMockRes();
      await controller.generateReport(
        { userId: userAId, params: { sessionId: activeSessionId } },
        res
      );

      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /incomplete/i);
    });

    it('should generate report upon session completion and expose it in candidate response', async () => {
      const getRes = createMockRes();
      await controller.getSession(
        { userId: userAId, params: { sessionId: completedSessionId } },
        getRes
      );

      assert.strictEqual(getRes.statusCode, 200);
      assert.ok(getRes.body.session.report);
      assert.ok(getRes.body.session.report.executiveSummary.length > 0);
      assert.strictEqual(getRes.body.session.report.completionState.totalQuestions, 2);
      assert.strictEqual(getRes.body.session.report.completionState.answeredCount, 2);
    });

    it('should retrieve existing report via GET /api/cross-examination/sessions/:sessionId/report', async () => {
      const res = createMockRes();
      await controller.getReport(
        { userId: userAId, params: { sessionId: completedSessionId } },
        res
      );

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.report);
      assert.ok(res.body.report.reportId.startsWith('rpt_'));
      assert.strictEqual(res.body.report.version, '1.0.0');
      assert.ok(Array.isArray(res.body.report.claimVerificationMatrix));
      assert.ok(Array.isArray(res.body.report.demonstratedStrengths));
      assert.ok(Array.isArray(res.body.report.preparationGaps));
      assert.ok(Array.isArray(res.body.report.studyRecommendations));
      assert.ok(Array.isArray(res.body.report.dimensionScores));
    });

    it('should be idempotent: POST /sessions/:sessionId/report without regenerate flag returns existing report', async () => {
      const res1 = createMockRes();
      await controller.generateReport(
        { userId: userAId, params: { sessionId: completedSessionId } },
        res1
      );
      assert.strictEqual(res1.statusCode, 200);
      const initialReportId = res1.body.report.reportId;

      const res2 = createMockRes();
      await controller.generateReport(
        { userId: userAId, params: { sessionId: completedSessionId } },
        res2
      );
      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(res2.body.report.reportId, initialReportId);
      assert.match(res2.body.message, /retrieved successfully/i);
    });

    it('should regenerate report when regenerate query flag is set', async () => {
      const res1 = createMockRes();
      await controller.generateReport(
        { userId: userAId, params: { sessionId: completedSessionId } },
        res1
      );
      const initialReportId = res1.body.report.reportId;

      const res2 = createMockRes();
      await controller.generateReport(
        { userId: userAId, params: { sessionId: completedSessionId }, query: { regenerate: 'true' } },
        res2
      );
      assert.strictEqual(res2.statusCode, 200);
      assert.match(res2.body.message, /generated successfully/i);
      assert.notStrictEqual(res2.body.report.reportId, initialReportId);
    });

    it('should enforce authentication on report endpoints (401 when unauthenticated)', async () => {
      const resGen = createMockRes();
      await controller.generateReport(
        { userId: null, params: { sessionId: completedSessionId } },
        resGen
      );
      assert.strictEqual(resGen.statusCode, 401);

      const resGet = createMockRes();
      await controller.getReport(
        { userId: null, params: { sessionId: completedSessionId } },
        resGet
      );
      assert.strictEqual(resGet.statusCode, 401);
    });

    it('should enforce resource authorization (404 when requested by different user)', async () => {
      const resGen = createMockRes();
      await controller.generateReport(
        { userId: userBId, params: { sessionId: completedSessionId } },
        resGen
      );
      assert.strictEqual(resGen.statusCode, 404);

      const resGet = createMockRes();
      await controller.getReport(
        { userId: userBId, params: { sessionId: completedSessionId } },
        resGet
      );
      assert.strictEqual(resGet.statusCode, 404);
    });

    it('should sanitize candidate-facing report payload (exclude _id and internal fields)', async () => {
      const res = createMockRes();
      await controller.getReport(
        { userId: userAId, params: { sessionId: completedSessionId } },
        res
      );

      assert.strictEqual(res.statusCode, 200);
      const report = res.body.report;
      assert.strictEqual(report._id, undefined);
      assert.strictEqual(report.__v, undefined);
    });
  });
});
