import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import CrossExaminationSession from '../models/crossExaminationSession.model.js';
import {
  INTERVIEW_CREDIT_COST,
  INSUFFICIENT_CREDITS_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
  checkUserCredits,
  deductInterviewCredits,
  refundInterviewCredits,
} from '../services/credit.service.js';
import { INTERVIEW_CREDIT_COST as NORMAL_INTERVIEW_CREDIT_COST } from '../controllers/interview.controller.js';
import {
  createCrossExaminationController,
  INTERVIEW_CREDIT_COST as CROSS_EXAM_CREDIT_COST,
  INSUFFICIENT_CREDITS_MESSAGE as CROSS_EXAM_INSUFFICIENT_MSG,
} from '../controllers/crossExamination.controller.js';
import {
  CLAIM_CATEGORIES,
  PROVENANCE_TYPES,
  CONFIDENCE_LEVELS,
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

// Mock User Model with atomic operations support
class MockUserModel {
  constructor(users = []) {
    this.users = new Map();
    for (const u of users) {
      this.users.set(u._id.toString(), { ...u });
    }
  }

  async findById(id) {
    const user = this.users.get(id?.toString());
    if (!user) return null;
    return {
      ...user,
      save: async () => {
        this.users.set(id.toString(), { ...user });
        return user;
      },
    };
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const userId = filter._id?.toString();
    const user = this.users.get(userId);
    if (!user) return null;

    if (filter.credits && filter.credits.$gte !== undefined) {
      if (typeof user.credits !== 'number' || user.credits < filter.credits.$gte) {
        return null;
      }
    }

    if (update.$inc && update.$inc.credits !== undefined) {
      user.credits += update.$inc.credits;
    }

    this.users.set(userId, user);
    return { ...user };
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const userId = id?.toString();
    const user = this.users.get(userId);
    if (!user) return null;

    if (update.$inc && update.$inc.credits !== undefined) {
      user.credits += update.$inc.credits;
    }

    this.users.set(userId, user);
    return { ...user };
  }
}

// In-memory mock Session Model backed by real CrossExaminationSession Mongoose documents
class MockSessionStore {
  constructor() {
    this.sessions = new Map();
    this.shouldFailSave = false;
    this.duplicateKeyOnSave = false;
  }

  createModelClass() {
    const store = this;

    return class MockSessionModel extends CrossExaminationSession {
      constructor(data) {
        super(data);
        if (!this._id) {
          this._id = new mongoose.Types.ObjectId();
        }
      }

      async save() {
        if (store.shouldFailSave) {
          throw new Error('Database connection lost during session save');
        }
        if (store.duplicateKeyOnSave) {
          const err = new Error('E11000 duplicate key error index: idempotencyKey_1');
          err.code = 11000;
          throw err;
        }
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
          return null;
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
        return {
          sort() {
            return results;
          },
        };
      }
    };
  }
}

const sampleProjectProfile = () => ({
  role: 'Staff Infrastructure Engineer',
  projects: [
    {
      projectId: 'prj_test_1',
      title: 'High-Availability Event Bus',
      description: 'Distributed event bus processing millions of events per hour',
      candidateRole: 'Core Architect',
      technologies: ['Go', 'Kafka', 'Kubernetes'],
      claims: [
        {
          claimId: 'clm_1',
          category: CLAIM_CATEGORIES.SCALE_METRIC,
          statement: 'Maintained 99.999% availability during multi-region failover',
          sourceExcerpt: '',
          provenanceType: PROVENANCE_TYPES.AI_INFERRED_CATEGORY,
          confidence: CONFIDENCE_LEVELS.HIGH,
        },
      ],
    },
  ],
});

const sampleQuestions = () => [
  {
    questionId: 'ceq_credit_01',
    targetProjectId: 'prj_test_1',
    targetClaimIds: ['clm_1'],
    questionText: 'How did you prevent message duplication during the multi-region failover?',
    difficulty: 'hard',
    timeLimit: 90,
    order: 1,
    status: 'pending',
  },
];

describe('Cross-Examination Credit Cost Parity & Safe Deduction Suite', () => {
  let sessionStore;
  let SessionModelClass;
  let userModel;
  let testUserId;
  let defaultController;

  beforeEach(() => {
    sessionStore = new MockSessionStore();
    SessionModelClass = sessionStore.createModelClass();

    testUserId = new mongoose.Types.ObjectId().toString();
    userModel = new MockUserModel([
      {
        _id: testUserId,
        email: 'prepper.candidate@example.com',
        credits: 100,
      },
    ]);

    defaultController = createCrossExaminationController({
      SessionModel: SessionModelClass,
      UserModel: userModel,
      extractClaimsFn: async () => sampleProjectProfile(),
      analyzeBlueprintFn: () => ({
        success: true,
        allOpportunitiesSorted: [
          {
            opportunityId: 'opp_01',
            projectId: 'prj_test_1',
            projectTitle: 'High-Availability Event Bus',
            claim: sampleProjectProfile().projects[0].claims[0],
            opportunityType: 'METRIC_VERIFICATION',
            priorityScore: 90,
          },
        ],
      }),
      generateQuestionsFn: async () => ({
        success: true,
        questions: sampleQuestions().map((q, idx) => ({ ...q, order: idx + 1, status: 'current' })),
      }),
      evaluateAnswerFn: async () => ({
        success: true,
        evaluation: null,
      }),
    });
  });

  describe('1. Credit Cost Parity with Normal Interviews', () => {
    it('should define authoritative interview cost of 50 credits across all interview types', () => {
      assert.strictEqual(INTERVIEW_CREDIT_COST, 50);
      assert.strictEqual(NORMAL_INTERVIEW_CREDIT_COST, 50);
      assert.strictEqual(CROSS_EXAM_CREDIT_COST, 50);
      assert.strictEqual(CROSS_EXAM_INSUFFICIENT_MSG, INSUFFICIENT_CREDITS_MESSAGE);
    });

    it('should deduct exactly 50 credits for a successful normal interview', async () => {
      const deduction = await deductInterviewCredits(testUserId, userModel);
      assert.strictEqual(deduction.success, true);
      assert.strictEqual(deduction.creditsLeft, 50);

      const user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 50);
    });

    it('should deduct exactly the same 50 credits for a Cross-Examination session', async () => {
      const req = {
        userId: testUserId,
        body: { crossExaminationProfile: sampleProjectProfile() },
      };
      const res = createMockRes();

      await defaultController.createSession(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.ok(res.body.session);
      assert.strictEqual(res.body.creditsLeft, 50);

      // Verify user balance in store
      const user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 50);
    });
  });

  describe('2. No Extra Charges for AI, Resume Analysis, Probing, or Reports', () => {
    it('should not charge extra credits for parsing, claim extraction, or blueprint generation', async () => {
      let aiCallCount = 0;
      const trackingController = createCrossExaminationController({
        SessionModel: SessionModelClass,
        UserModel: userModel,
        extractClaimsFn: async () => {
          aiCallCount++;
          return sampleProjectProfile();
        },
        analyzeBlueprintFn: () => {
          aiCallCount++;
          return {
            success: true,
            allOpportunitiesSorted: [
              {
                opportunityId: 'opp_01',
                projectId: 'prj_test_1',
                projectTitle: 'High-Availability Event Bus',
                claim: sampleProjectProfile().projects[0].claims[0],
                opportunityType: 'METRIC_VERIFICATION',
                priorityScore: 90,
              },
            ],
          };
        },
        generateQuestionsFn: async () => {
          aiCallCount++;
          return {
            success: true,
            questions: sampleQuestions(),
          };
        },
      });

      const req = {
        userId: testUserId,
        body: { resumeText: 'Extensive resume text with distributed systems architecture experience...' },
      };
      const res = createMockRes();

      await trackingController.createSession(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(aiCallCount, 3); // Extracted claims + analyzed blueprint + generated questions

      // Exactly 50 credits deducted, ZERO extra credits for multiple AI pipeline stages
      const user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 50);
    });

    it('should not deduct any credits for submitting answers, follow-ups, or reports', async () => {
      // Create session (consumes 50 credits: 100 -> 50)
      const createRes = createMockRes();
      await defaultController.createSession(
        { userId: testUserId, body: { crossExaminationProfile: sampleProjectProfile() } },
        createRes
      );
      assert.strictEqual(createRes.statusCode, 201);
      const sessionId = createRes.body.session.sessionId;

      const userAfterCreation = await userModel.findById(testUserId);
      assert.strictEqual(userAfterCreation.credits, 50);

      // Submit answer (should NOT deduct credits)
      const submitRes = createMockRes();
      await defaultController.submitAnswer(
        {
          userId: testUserId,
          params: { sessionId },
          body: {
            questionId: 'ceq_credit_01',
            rawTranscript: 'We used idempotent deduplication keys in Redis with 24-hour TTL.',
            autoAdvance: true,
          },
        },
        submitRes
      );
      assert.strictEqual(submitRes.statusCode, 200);

      const userAfterAnswer = await userModel.findById(testUserId);
      assert.strictEqual(userAfterAnswer.credits, 50);

      // Complete session (should NOT deduct credits)
      const completeRes = createMockRes();
      await defaultController.completeSession(
        { userId: testUserId, params: { sessionId } },
        completeRes
      );
      assert.strictEqual(completeRes.statusCode, 200);

      const userAfterComplete = await userModel.findById(testUserId);
      assert.strictEqual(userAfterComplete.credits, 50);
    });
  });

  describe('3. Idempotency & Duplicate Prevention (Zero Double-Charging)', () => {
    it('should charge credits only once when request is retried with same idempotency key', async () => {
      const idempotencyKey = 'retry-idemp-key-999';

      // First request: charges 50 credits
      const res1 = createMockRes();
      await defaultController.createSession(
        {
          userId: testUserId,
          headers: { 'idempotency-key': idempotencyKey },
          body: { crossExaminationProfile: sampleProjectProfile() },
        },
        res1
      );
      assert.strictEqual(res1.statusCode, 201);
      assert.strictEqual(res1.body.creditsLeft, 50);

      let user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 50);

      // Second request (retry/double-click with same key): returns existing session with 0 deduction
      const res2 = createMockRes();
      await defaultController.createSession(
        {
          userId: testUserId,
          headers: { 'idempotency-key': idempotencyKey },
          body: { crossExaminationProfile: sampleProjectProfile() },
        },
        res2
      );
      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(res2.body.isIdempotentReplay, true);

      user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 50); // NOT double-charged!
    });

    it('should refund credits if concurrent race causes Mongo E11000 duplicate key error', async () => {
      // Simulate existing session in database for user
      const existingSession = new SessionModelClass({
        userId: testUserId,
        idempotencyKey: 'concurrent-race-key',
        sessionTitle: 'Staff Infrastructure Engineer Cross-Examination',
        targetRole: 'Staff Infrastructure Engineer',
        targetDomain: 'General Software Engineering',
        status: 'awaiting_answer',
        questions: sampleQuestions(),
        projects: sampleProjectProfile().projects,
        answers: [],
      });
      await existingSession.save();

      // Now set duplicateKeyOnSave = true to simulate duplicate key error on losing concurrent branch
      sessionStore.duplicateKeyOnSave = true;

      const res = createMockRes();
      await defaultController.createSession(
        {
          userId: testUserId,
          headers: { 'idempotency-key': 'concurrent-race-key' },
          body: { crossExaminationProfile: sampleProjectProfile() },
        },
        res
      );

      // Should recover gracefully: returns 200 with winning session
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.isIdempotentReplay, true);

      // Crucial: The duplicate request must NOT consume credits
      const user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 100);
    });
  });

  describe('4. Insufficient Credits & Failure Protection', () => {
    it('should reject users with insufficient credits (< 50) with 400 and clear message', async () => {
      const poorUserId = new mongoose.Types.ObjectId().toString();
      userModel.users.set(poorUserId, { _id: poorUserId, credits: 30 });

      const res = createMockRes();
      await defaultController.createSession(
        { userId: poorUserId, body: { crossExaminationProfile: sampleProjectProfile() } },
        res
      );

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, INSUFFICIENT_CREDITS_MESSAGE);

      const user = await userModel.findById(poorUserId);
      assert.strictEqual(user.credits, 30); // Untouched
    });

    it('should reject users with zero credits with 400', async () => {
      const zeroUserId = new mongoose.Types.ObjectId().toString();
      userModel.users.set(zeroUserId, { _id: zeroUserId, credits: 0 });

      const res = createMockRes();
      await defaultController.createSession(
        { userId: zeroUserId, body: { crossExaminationProfile: sampleProjectProfile() } },
        res
      );

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, INSUFFICIENT_CREDITS_MESSAGE);
    });

    it('should return 404 when user record does not exist', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();
      const res = createMockRes();
      await defaultController.createSession(
        { userId: nonExistentUserId, body: { crossExaminationProfile: sampleProjectProfile() } },
        res
      );

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.message, USER_NOT_FOUND_MESSAGE);
    });

    it('should not deduct credits if PDF parsing fails', async () => {
      const failingPdfController = createCrossExaminationController({
        SessionModel: SessionModelClass,
        UserModel: userModel,
        parsePdfFn: async () => {
          const err = new Error('Invalid PDF stream');
          err.name = 'InvalidPDFException';
          throw err;
        },
      });

      const res = createMockRes();
      await failingPdfController.createSession(
        {
          userId: testUserId,
          file: { buffer: Buffer.from('corrupt') },
        },
        res
      );

      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /corrupted or unreadable/i);

      // Credits remain untouched
      const user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 100);
    });

    it('should not deduct credits if blueprint opportunity derivation fails (422)', async () => {
      const emptyBlueprintController = createCrossExaminationController({
        SessionModel: SessionModelClass,
        UserModel: userModel,
        analyzeBlueprintFn: () => ({
          success: false,
          allOpportunitiesSorted: [],
          warnings: ['No quantifiable claims found'],
        }),
      });

      const res = createMockRes();
      await emptyBlueprintController.createSession(
        { userId: testUserId, body: { crossExaminationProfile: sampleProjectProfile() } },
        res
      );

      assert.strictEqual(res.statusCode, 422);
      assert.match(res.body.message, /Unable to derive examination opportunities/i);

      const user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 100);
    });

    it('should not deduct credits if question generation fails (502)', async () => {
      const failingQuestionController = createCrossExaminationController({
        SessionModel: SessionModelClass,
        UserModel: userModel,
        analyzeBlueprintFn: () => ({
          success: true,
          allOpportunitiesSorted: [{ opportunityId: 'opp_1' }],
        }),
        generateQuestionsFn: async () => ({
          success: false,
          error: 'AI Provider timeout',
        }),
      });

      const res = createMockRes();
      await failingQuestionController.createSession(
        { userId: testUserId, body: { crossExaminationProfile: sampleProjectProfile() } },
        res
      );

      assert.strictEqual(res.statusCode, 502);
      assert.strictEqual(res.body.message, 'Failed to generate cross-examination questions');

      const user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 100);
    });

    it('should automatically refund credits if database persistence fails after generation', async () => {
      sessionStore.shouldFailSave = true;

      const res = createMockRes();
      await defaultController.createSession(
        { userId: testUserId, body: { crossExaminationProfile: sampleProjectProfile() } },
        res
      );

      assert.strictEqual(res.statusCode, 500);
      assert.match(res.body.error, /Database connection lost/i);

      // Crucial: Persistence failed, so any deducted credits MUST be refunded
      const user = await userModel.findById(testUserId);
      assert.strictEqual(user.credits, 100);
    });
  });

  describe('5. Concurrency & Overspending Protection', () => {
    it('should prevent concurrent overspending when user only has credits for one interview', async () => {
      // User has exactly 50 credits (only enough for 1 session)
      const exactUserId = new mongoose.Types.ObjectId().toString();
      userModel.users.set(exactUserId, { _id: exactUserId, credits: 50 });

      const reqA = {
        userId: exactUserId,
        body: { crossExaminationProfile: sampleProjectProfile(), targetRole: 'Session A' },
      };
      const reqB = {
        userId: exactUserId,
        body: { crossExaminationProfile: sampleProjectProfile(), targetRole: 'Session B' },
      };

      const resA = createMockRes();
      const resB = createMockRes();

      // Launch both requests simultaneously
      await Promise.all([
        defaultController.createSession(reqA, resA),
        defaultController.createSession(reqB, resB),
      ]);

      const statusCodes = [resA.statusCode, resB.statusCode].sort();
      // One request MUST succeed (201), the other MUST fail with 400 (insufficient credits)
      assert.deepStrictEqual(statusCodes, [201, 400]);

      // Exactly 1 session created, balance ends at 0 (never negative)
      const user = await userModel.findById(exactUserId);
      assert.strictEqual(user.credits, 0);
      assert.strictEqual(sessionStore.sessions.size, 1);
    });
  });
});
