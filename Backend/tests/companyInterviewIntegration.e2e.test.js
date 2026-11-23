/**
 * @file companyInterviewIntegration.e2e.test.js
 * Comprehensive End-to-End Integration Verification Suite for Module 6:
 * Company-Specific Interview Simulation and its genuine synergy with Modules 1–5.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Interview from '../models/interview.model.js';
import User from '../models/user.model.js';
import CrossExaminationSession from '../models/crossExaminationSession.model.js';
import CodingSubmission from '../models/codingSubmission.model.js';
import {
  createCompanyInterviewSession,
  submitCompanyAnswer,
  finishCompanyInterview,
  getCompanyInterviewSession,
} from '../services/companySimulation/companyInterview.service.js';
import { harvestInterviewEvidence } from '../services/recoveryPlan/evidenceHarvester.service.js';
import { DIFFICULTY_LEVELS } from '../contracts/adaptiveContracts.js';

describe('Module 6: End-to-End Master Integration Verification Suite', () => {
  const userIdA = new mongoose.Types.ObjectId();
  const userIdB = new mongoose.Types.ObjectId();

  const mockInterviews = new Map();
  let originalSave;
  let originalFindById;
  let originalFindOne;
  let originalUserFindById;
  let originalCrossFindOne;
  let originalCodingFind;

  const mockAskAI = async () => JSON.stringify({
    overallScore: 8.5,
    summaryFeedback: 'Solid explanation addressing core algorithmic and system trade-offs.',
    verdict: 'Strong Hire',
    hireVerdict: 'Strong Hire',
    fitLevel: 'Exceeds Expectations',
    criteria: [
      { name: 'Technical Accuracy', score: 8.5 },
      { name: 'Conceptual Understanding', score: 8.5 },
      { name: 'Practical Knowledge', score: 8.5 },
      { name: 'Depth of Explanation', score: 8.5 },
      { name: 'Problem-Solving Ability', score: 8.5 },
      { name: 'Communication Clarity', score: 8.5 },
    ],
    evaluationConfidence: 0.9,
    evidence: [],
    strengths: ['Clear architecture pattern', 'Addressed fault-tolerance'],
    criticalGaps: ['Could elaborate on cross-datacenter edge cases'],
    gaps: ['Could elaborate on cross-datacenter edge cases'],
    recommendedTopics: ['Distributed Systems', 'Fault Tolerance'],
    nextRoundRecommendation: 'Proceed to next round',
    companyCultureFit: 'Demonstrates strong technical maturity.',
  });

  const fastOptions = {
    checkUserCredits: async () => ({ hasCredits: true }),
    deductInterviewCredits: async () => ({ success: true, creditsLeft: 50 }),
    refundInterviewCredits: async () => ({ success: true }),
    askAI: mockAskAI,
    askAIFn: mockAskAI,
  };

  before(() => {
    originalSave = Interview.prototype.save;
    originalFindById = Interview.findById;
    originalFindOne = Interview.findOne;
    originalUserFindById = User.findById;
    originalCrossFindOne = CrossExaminationSession.findOne;
    originalCodingFind = CodingSubmission.find;

    Interview.prototype.save = async function () {
      if (!this._id) {
        this._id = new mongoose.Types.ObjectId();
      }
      mockInterviews.set(this._id.toString(), this);
      return this;
    };

    Interview.findById = async function (id) {
      if (!id) return null;
      return mockInterviews.get(id.toString()) || null;
    };

    Interview.findOne = function (query) {
      let result = null;
      if (query?._id) {
        result = mockInterviews.get(query._id.toString());
        if (result && query.userId && result.userId.toString() !== query.userId.toString()) {
          result = null;
        }
      }
      return {
        lean: async () => (result ? (result.toObject ? result.toObject() : result) : null),
        sort: () => ({ lean: async () => (result ? [result] : []) }),
      };
    };

    User.findById = async function (id) {
      return {
        _id: id,
        credits: 100,
        save: async () => {},
      };
    };

    CrossExaminationSession.findOne = function () {
      return {
        lean: async () => null,
      };
    };

    CodingSubmission.find = function () {
      return {
        lean: async () => [],
      };
    };
  });

  after(() => {
    Interview.prototype.save = originalSave;
    Interview.findById = originalFindById;
    Interview.findOne = originalFindOne;
    User.findById = originalUserFindById;
    CrossExaminationSession.findOne = originalCrossFindOne;
    CodingSubmission.find = originalCodingFind;
  });

  // =========================================================================
  // 1. Module 1: Standard Interview Lifecycle & Persistence Integration
  // =========================================================================
  describe('1. Module 1: Standard Interview Lifecycle Integration', () => {
    it('creates interview with status Incompleted, mapped questions, and companySimulation metadata', async () => {
      const { interview, interviewerGreeting } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'Google',
        targetDesignation: 'Senior Software Engineer',
        experienceLevel: 'Senior',
        interviewRound: 'technical_round_1',
        selectedQuestionCount: 3,
        options: fastOptions,
      });

      assert.ok(interview, 'Must create interview document');
      assert.equal(interview.status, 'Incompleted', 'Initial status must be Incompleted');
      assert.equal(interview.role, 'Senior Software Engineer');
      assert.ok(interview.companySimulation?.isCompanySimulation, 'Must flag as company simulation');
      assert.equal(interview.companySimulation.companyName, 'Google');
      assert.equal(interview.companySimulation.interviewRound, 'technical_round_1');
      assert.equal(interview.questions.length, 3, 'Must match requested question count');
      assert.ok(interviewerGreeting.length > 0, 'Must produce interviewer greeting');
    });

    it('records candidate answers, computes question scores, and updates question index', async () => {
      const { interview } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'Amazon',
        targetDesignation: 'SDE II',
        interviewRound: 'technical_round_2',
        selectedQuestionCount: 3,
        options: fastOptions,
      });

      // Submit first answer
      const submitRes = await submitCompanyAnswer({
        interviewId: interview._id,
        questionIndex: 0,
        answer: 'I would design the cache using an LRU eviction policy with an internal Doubly Linked List and Hash Map for O(1) lookups and updates.',
        userId: userIdA,
        options: fastOptions,
      });

      assert.ok(submitRes.evaluatedQuestion.score > 0, 'Question must receive non-zero evaluation score');
      assert.ok(submitRes.evaluatedQuestion.feedback.length > 0, 'Question must receive rubric feedback');
      assert.equal(submitRes.interview.currentQuestionIndex, 1, 'Current question index must advance');
      assert.equal(submitRes.isLastQuestion, false, 'First question should not be marked as last question');
    });

    it('finalizes interview simulation, sets status Completed, and records finalScore', async () => {
      const { interview } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'Microsoft',
        targetDesignation: 'Azure Cloud Engineer',
        interviewRound: 'system_design',
        selectedQuestionCount: 2,
        options: fastOptions,
      });

      // Answer all questions
      await submitCompanyAnswer({
        interviewId: interview._id,
        questionIndex: 0,
        answer: 'We partition data using consistent hashing and deploy Redis clusters with asynchronous replication across availability zones.',
        userId: userIdA,
        options: fastOptions,
      });

      const finalized = await finishCompanyInterview(interview._id, userIdA, fastOptions);

      assert.equal(finalized.status, 'Completed', 'Final status must be Completed');
      assert.ok(typeof finalized.finalScore === 'number' && finalized.finalScore > 0, 'Final score must be populated');
      assert.ok(finalized.companySimulation.readinessAssessment, 'Readiness scorecard must be attached');
      assert.ok(finalized.companySimulation.readinessAssessment.hireVerdict, 'Must assign hiring verdict');
    });
  });

  // =========================================================================
  // 2. Module 2: Evidence-Based Evaluation Integration
  // =========================================================================
  describe('2. Module 2: Evidence-Based Evaluation Integration', () => {
    it('populates evidenceEvaluation with structured rubrics and grounded excerpts', async () => {
      const { interview } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'Adobe',
        targetDesignation: 'Frontend Architect',
        interviewRound: 'technical_round_1',
        selectedQuestionCount: 2,
        options: fastOptions,
      });

      const res = await submitCompanyAnswer({
        interviewId: interview._id,
        questionIndex: 0,
        answer: 'In WebGL and Canvas rendering, we prevent main thread stalls by offloading matrix transformations to Web Workers with SharedArrayBuffers and using requestAnimationFrame to sync frame buffers.',
        userId: userIdA,
        options: fastOptions,
      });

      const q = res.evaluatedQuestion;
      assert.ok(q.evidenceEvaluation, 'Must attach evidenceEvaluation object');
      assert.ok(q.score >= 50, 'Substantive answer must score >= 50');
      assert.ok(q.correctness > 0, 'Must record correctness score');
      assert.ok(q.communication > 0, 'Must record communication score');
    });

    it('handles short or missing answers conservatively without inflating scores', async () => {
      const { interview } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'TCS',
        targetDesignation: 'Developer',
        interviewRound: 'technical_round_1',
        selectedQuestionCount: 2,
        options: fastOptions,
      });

      const res = await submitCompanyAnswer({
        interviewId: interview._id,
        questionIndex: 0,
        answer: 'I dont know.',
        userId: userIdA,
        options: {
          ...fastOptions,
          askAIFn: async () => JSON.stringify({
            overallScore: 2.0,
            summaryFeedback: 'Incomplete response demonstrating minimal conceptual grasp.',
            criteria: [{ name: 'Technical Accuracy', score: 2 }],
            evaluationConfidence: 0.95,
          }),
        },
      });

      assert.ok(res.evaluatedQuestion.score <= 50, 'Non-substantive answer must receive low score');
    });
  });

  // =========================================================================
  // 3. Module 3: Adaptive Questioning & Steering Integration
  // =========================================================================
  describe('3. Module 3: Adaptive Questioning Integration', () => {
    it('tracks topic performance, detects knowledge gaps, and promotes difficulty on consecutive strong answers', async () => {
      const { interview } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'Google',
        targetDesignation: 'Systems Engineer',
        interviewRound: 'technical_round_1',
        selectedQuestionCount: 4,
        options: fastOptions,
      });

      assert.ok(interview.adaptiveState, 'Must initialize adaptiveState');
      assert.equal(interview.adaptiveState.currentDifficulty, DIFFICULTY_LEVELS.INTERMEDIATE);

      // Strong answer 1
      const res1 = await submitCompanyAnswer({
        interviewId: interview._id,
        questionIndex: 0,
        answer: 'We utilize Raft consensus to guarantee linearizable state machine replication with leader election and log compaction via snapshots.',
        userId: userIdA,
        options: fastOptions,
      });
      assert.equal(res1.interview.adaptiveState.consecutiveStrongAnswers, 1, 'First strong answer increases streak to 1');

      // Strong answer 2 (triggers difficulty promotion to Advanced)
      const res2 = await submitCompanyAnswer({
        interviewId: interview._id,
        questionIndex: 1,
        answer: 'For distributed transactions across heterogeneous databases, we orchestrate via a Saga pattern with compensating transactions and idempotent deduplication keys.',
        userId: userIdA,
        options: fastOptions,
      });

      assert.equal(res2.interview.adaptiveState.currentDifficulty, DIFFICULTY_LEVELS.ADVANCED, 'Must promote to Advanced after 2 consecutive strong answers');
      assert.equal(res2.interview.questions[2].difficulty, DIFFICULTY_LEVELS.ADVANCED, 'Next question must reflect promoted difficulty');
      assert.ok(res2.interview.questions[2].transitionPhrase.includes('elevate'), 'Must inject transition phrase for difficulty elevation');
    });
  });

  // =========================================================================
  // 4. Module 4: Live Coding & Online Assessment Integration
  // =========================================================================
  describe('4. Module 4: Live Coding Integration for Online Assessments', () => {
    it('populates codingProblems with starter code and test cases when round is online_assessment', async () => {
      const { interview } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'Amazon',
        targetDesignation: 'SDE I',
        interviewRound: 'online_assessment',
        selectedQuestionCount: 2,
        options: fastOptions,
      });

      assert.equal(interview.mode, 'Coding', 'Mode must be Coding for OA round');
      assert.equal(interview.interviewType, 'coding', 'InterviewType must be coding');
      assert.ok(interview.codingProblems && interview.codingProblems.length > 0, 'Must generate executable codingProblems');

      const firstProb = interview.codingProblems[0];
      assert.ok(firstProb.title, 'Problem must have title');
      assert.ok(firstProb.visibleTestCases && firstProb.visibleTestCases.length > 0, 'Problem must have visible test cases');
      assert.ok(firstProb.hiddenTestCases && firstProb.hiddenTestCases.length > 0, 'Problem must have hidden test cases');
    });
  });

  // =========================================================================
  // 5. Module 5: Personalized Recovery Plan Integration
  // =========================================================================
  describe('5. Module 5: Recovery Plan Evidence Harvesting Integration', () => {
    it('evidence harvester successfully discovers company simulation and extracts company gaps', async () => {
      const { interview } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'Google',
        targetDesignation: 'Staff L6 Engineer',
        interviewRound: 'system_design',
        selectedQuestionCount: 2,
        options: fastOptions,
      });

      // Submit answers and complete interview
      await submitCompanyAnswer({
        interviewId: interview._id,
        questionIndex: 0,
        answer: 'Basic load balancer with simple SQL database without sharding.',
        userId: userIdA,
        options: fastOptions,
      });

      const completedSession = await finishCompanyInterview(interview._id, userIdA, fastOptions);

      // Harvest evidence using Module 5 harvester
      const harvested = await harvestInterviewEvidence(completedSession._id, userIdA);

      assert.ok(harvested, 'Harvester must return harvested evidence');
      assert.ok(harvested.targetRole.includes('Google'), 'Target role must include company name');
      assert.ok(harvested.weaknesses.length > 0, 'Must harvest identified weaknesses');

      const hasCompanySource = harvested.weaknesses.some((w) => w.evidence?.sourceType === 'company_interview' || w.evidence?.sourceType === 'standard_interview');
      assert.ok(hasCompanySource, 'Weaknesses must reference authentic interview evidence');
    });
  });

  // =========================================================================
  // 6. Financial Integrity, Concurrency, and Credit Deductions
  // =========================================================================
  describe('6. Financial Integrity & Credit Deduction Safeguards', () => {
    it('rejects simulation creation when candidate has insufficient credits', async () => {
      const mockCheckCredits = async () => ({ hasCredits: false, message: 'Free limit reached please purchase more credits' });

      await assert.rejects(
        async () => {
          await createCompanyInterviewSession({
            userId: userIdA,
            companyName: 'Amazon',
            options: { checkUserCredits: mockCheckCredits },
          });
        },
        /Free limit reached/
      );
    });

    it('triggers automatic credit refund if interview document persistence fails', async () => {
      let refunded = false;
      const mockRefundCredits = async () => {
        refunded = true;
        return { success: true };
      };

      const failingSave = async function () {
        throw new Error('Database disk full');
      };
      Interview.prototype.save = failingSave;

      try {
        await createCompanyInterviewSession({
          userId: userIdA,
          companyName: 'Microsoft',
          options: {
            ...fastOptions,
            refundInterviewCredits: mockRefundCredits,
          },
        });
      } catch (err) {
        // Expected
      } finally {
        Interview.prototype.save = async function () {
          if (!this._id) this._id = new mongoose.Types.ObjectId();
          mockInterviews.set(this._id.toString(), this);
          return this;
        };
      }

      assert.equal(refunded, true, 'Refund guard executed and refunded candidate credits');
    });
  });

  // =========================================================================
  // 7. Security & Anti-IDOR Ownership Protection
  // =========================================================================
  describe('7. Security & Anti-IDOR Verification', () => {
    it('prevents User B from accessing, answering, or finalizing User A company session', async () => {
      const { interview } = await createCompanyInterviewSession({
        userId: userIdA,
        companyName: 'Deloitte',
        targetDesignation: 'Technology Consultant',
        options: fastOptions,
      });

      // User B attempts to access User A's session
      await assert.rejects(
        async () => {
          await getCompanyInterviewSession(interview._id, userIdB);
        },
        (err) => err.status === 403,
        'Must reject unauthorized session retrieval with status 403'
      );

      // User B attempts to submit answer to User A's session
      await assert.rejects(
        async () => {
          await submitCompanyAnswer({
            interviewId: interview._id,
            questionIndex: 0,
            answer: 'Malicious cross-user answer injection',
            userId: userIdB,
            options: fastOptions,
          });
        },
        (err) => err.status === 403,
        'Must reject unauthorized answer submission with status 403'
      );

      // User B attempts to finalize User A's session
      await assert.rejects(
        async () => {
          await finishCompanyInterview(interview._id, userIdB, fastOptions);
        },
        (err) => err.status === 403,
        'Must reject unauthorized interview finalization with status 403'
      );
    });
  });
});
