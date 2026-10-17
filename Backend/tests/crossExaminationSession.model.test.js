import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import CrossExaminationSession from '../models/crossExaminationSession.model.js';
import User from '../models/user.model.js';
import Interview from '../models/interview.model.js';
import Payment from '../models/payment.model.js';
import {
  SESSION_STATUSES,
  INQUIRY_TYPES,
  CLAIM_CATEGORIES,
} from '../contracts/crossExamination.contracts.js';

describe('CrossExaminationSession Mongoose Model', () => {
  const dummyUserId = new mongoose.Types.ObjectId();

  it('should validate a properly structured session instance', async () => {
    const session = new CrossExaminationSession({
      userId: dummyUserId,
      sessionTitle: 'Full Stack Engineer Evaluation',
      targetRole: 'Backend Engineer',
      targetDomain: 'Distributed Systems',
      status: SESSION_STATUSES.DRAFT,
      sourceProvenance: {
        resumeTextExcerpt: '5 years of Node.js and MongoDB development experience...',
        resumeHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        extractedAt: new Date(),
      },
      projects: [
        {
          title: 'High-Concurrency Chat Engine',
          candidateRole: 'Lead Architect',
          technologies: ['Node.js', 'Redis', 'WebSockets'],
          claims: [
            {
              category: CLAIM_CATEGORIES.SCALE_METRIC,
              statement: 'Supported 10,000 concurrent socket connections per node',
              sourceExcerpt: 'Scaled to 10k concurrent users per cluster instance',
            },
          ],
        },
      ],
      questions: [
        {
          questionId: 'ceq_test_001',
          order: 1,
          questionText: 'How did you handle WebSocket connection state persistence across multiple cluster nodes?',
          inquiryType: INQUIRY_TYPES.ARCHITECTURE_TRADEOFF,
          timeLimit: 90,
          status: 'pending',
        },
      ],
    });

    const validationError = session.validateSync();
    assert.strictEqual(validationError, undefined);
  });

  it('should reject session without userId (ownership enforcement)', () => {
    const session = new CrossExaminationSession({
      targetRole: 'Backend Engineer',
    });

    const error = session.validateSync();
    assert.ok(error);
    assert.ok(error.errors['userId']);
    assert.strictEqual(error.errors['userId'].message, 'Session owner userId is required');
  });

  it('should reject session without targetRole', () => {
    const session = new CrossExaminationSession({
      userId: dummyUserId,
    });

    const error = session.validateSync();
    assert.ok(error);
    assert.ok(error.errors['targetRole']);
  });

  it('should reject invalid session status enum', () => {
    const session = new CrossExaminationSession({
      userId: dummyUserId,
      targetRole: 'Frontend Developer',
      status: 'non_existent_status',
    });

    const error = session.validateSync();
    assert.ok(error);
    assert.ok(error.errors['status']);
  });

  describe('Lifecycle State Transitions', () => {
    it('should transition status legally when allowed', () => {
      const session = new CrossExaminationSession({
        userId: dummyUserId,
        targetRole: 'Platform Engineer',
        status: SESSION_STATUSES.DRAFT,
      });

      assert.strictEqual(session.canTransitionTo(SESSION_STATUSES.ACTIVE), true);
      session.transitionTo(SESSION_STATUSES.ACTIVE);
      assert.strictEqual(session.status, SESSION_STATUSES.ACTIVE);

      assert.strictEqual(session.canTransitionTo(SESSION_STATUSES.AWAITING_ANSWER), true);
      session.transitionTo(SESSION_STATUSES.AWAITING_ANSWER);
      assert.strictEqual(session.status, SESSION_STATUSES.AWAITING_ANSWER);

      assert.strictEqual(session.canTransitionTo(SESSION_STATUSES.COMPLETED), true);
      session.transitionTo(SESSION_STATUSES.COMPLETED);
      assert.strictEqual(session.status, SESSION_STATUSES.COMPLETED);
    });

    it('should throw an error on illegal state transitions', () => {
      const session = new CrossExaminationSession({
        userId: dummyUserId,
        targetRole: 'Platform Engineer',
        status: SESSION_STATUSES.DRAFT,
      });

      assert.throws(() => {
        session.transitionTo(SESSION_STATUSES.COMPLETED);
      }, /Illegal session status transition/);
    });
  });

  describe('Answer Recording & Question Association', () => {
    it('should successfully record an answer and update question status to answered', () => {
      const session = new CrossExaminationSession({
        userId: dummyUserId,
        targetRole: 'Backend Engineer',
        status: SESSION_STATUSES.ACTIVE,
        questions: [
          {
            questionId: 'ceq_123',
            order: 1,
            questionText: 'Can you explain your database sharding strategy?',
            status: 'current',
          },
        ],
      });

      const answer = session.recordAnswer({
        questionId: 'ceq_123',
        rawTranscript: 'We partitioned customer accounts by organization UUID using consistent hashing...',
        timeTaken: 45,
      });

      assert.ok(answer.answerId.startsWith('ans_'));
      assert.strictEqual(session.answers.length, 1);
      assert.strictEqual(session.findQuestion('ceq_123').status, 'answered');
    });

    it('should throw error when answering non-existent question', () => {
      const session = new CrossExaminationSession({
        userId: dummyUserId,
        targetRole: 'Backend Engineer',
        questions: [],
      });

      assert.throws(() => {
        session.recordAnswer({
          questionId: 'non_existent_id',
          rawTranscript: 'Answer text',
        });
      }, /Question 'non_existent_id' not found/);
    });

    it('should reject duplicate answers for the same question', () => {
      const session = new CrossExaminationSession({
        userId: dummyUserId,
        targetRole: 'Backend Engineer',
        questions: [
          {
            questionId: 'ceq_123',
            order: 1,
            questionText: 'Test question',
            status: 'current',
          },
        ],
      });

      session.recordAnswer({
        questionId: 'ceq_123',
        rawTranscript: 'First answer',
      });

      assert.throws(() => {
        session.recordAnswer({
          questionId: 'ceq_123',
          rawTranscript: 'Second duplicate answer',
        });
      }, /Answer for question 'ceq_123' has already been submitted/);
    });
  });

  describe('Model Ecosystem Coexistence & Backward Compatibility', () => {
    it('should coexist with existing User, Interview, and Payment models without collision', () => {
      assert.ok(User);
      assert.ok(Interview);
      assert.ok(Payment);
      assert.ok(CrossExaminationSession);

      assert.strictEqual(User.modelName, 'User');
      assert.strictEqual(Interview.modelName, 'Interview');
      assert.strictEqual(Payment.modelName, 'Payment');
      assert.strictEqual(CrossExaminationSession.modelName, 'CrossExaminationSession');
    });
  });
});
