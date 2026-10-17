/**
 * @file crossExamination.e2e.test.js
 * End-to-End Integration and Lifecycle Release Verification Suite for Prepper AI.
 * Validates the full connected user journey:
 * Resume upload/extraction -> Claim analysis -> Question generation ->
 * Answer submission -> Adaptive probing -> Progression -> Completion ->
 * Report synthesis -> Report regeneration -> Concurrency and boundary protection.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import CrossExaminationSession from '../models/crossExaminationSession.model.js';
import {
  createCrossExaminationController,
  sanitizeSessionForCandidate,
  sanitizeReportForCandidate,
} from '../controllers/crossExamination.controller.js';
import {
  SESSION_STATUSES,
  CLAIM_CATEGORIES,
  INQUIRY_TYPES,
  CONFIDENCE_LEVELS,
  PROVENANCE_TYPES,
  VERIFICATION_STATUSES,
  REPORT_SCHEMA_VERSION,
  PROBING_LIMITS,
  EXAMINATION_DIMENSIONS,
} from '../contracts/crossExamination.contracts.js';

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

        // Simulate Mongoose optimisticConcurrency: increment __v on save
        if (typeof this.__v === 'number') {
          this.__v += 1;
        } else {
          this.__v = 0;
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
          return null; // Enforces server-side resource authorization
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
          sort() {
            return queryObj;
          },
          limit() {
            return queryObj;
          },
          select() {
            return results;
          },
        };
        return queryObj;
      }
    }

    return MockSessionModel;
  }
}

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
  };
  return res;
};

describe('Phase 10: End-to-End Integration & Release Verification', () => {
  let mockStore;
  let MockSessionModel;
  let controller;
  let candidateUserId;
  let unauthorizedUserId;

  beforeEach(() => {
    mockStore = new MockSessionStore();
    MockSessionModel = mockStore.createModelClass();
    candidateUserId = new mongoose.Types.ObjectId();
    unauthorizedUserId = new mongoose.Types.ObjectId();

    controller = createCrossExaminationController({
      SessionModel: MockSessionModel,
      extractClaimsFn: async ({ resumeText }) => ({
        role: 'Senior Distributed Systems Architect',
        experience: '7 years',
        projects: [
          {
            title: 'Real-Time Telemetry Pipeline',
            candidateRole: 'Lead Systems Architect',
            technologies: ['Go', 'Apache Pulsar', 'ClickHouse', 'Kubernetes'],
            claims: [
              {
                category: CLAIM_CATEGORIES.SCALE_METRIC,
                statement: 'Processed 500,000 metrics per second with sub-50ms p99 ingestion latency',
                sourceExcerpt: 'Processed 500,000 metrics per second with sub-50ms p99 latency',
                provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
                confidence: CONFIDENCE_LEVELS.HIGH,
                verificationStatus: VERIFICATION_STATUSES.UNVERIFIED,
              },
              {
                category: CLAIM_CATEGORIES.ARCHITECTURE_DECISION,
                statement: 'Employed tiered storage in Pulsar to offload historical partitions to S3',
                sourceExcerpt: 'Employed tiered storage in Pulsar to offload historical partitions',
                provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
                confidence: CONFIDENCE_LEVELS.HIGH,
                verificationStatus: VERIFICATION_STATUSES.UNVERIFIED,
              },
            ],
          },
        ],
        standaloneClaims: [],
        allClaims: [],
        resumeHash: 'hash_telemetry_500k',
        provenanceStats: { totalClaims: 2, explicitSourceClaims: 2 },
      }),
      analyzeBlueprintFn: () => ({
        allOpportunitiesSorted: [
          {
            targetProjectId: 'prj_telemetry_1',
            targetClaimIds: ['clm_scale_1'],
            dimension: EXAMINATION_DIMENSIONS.PERFORMANCE_AND_SCALE,
            inquiryType: INQUIRY_TYPES.IMPLEMENTATION_PROBING,
            priorityScore: 92,
          },
          {
            targetProjectId: 'prj_telemetry_1',
            targetClaimIds: ['clm_arch_2'],
            dimension: EXAMINATION_DIMENSIONS.ARCHITECTURE_BOUNDARIES,
            inquiryType: INQUIRY_TYPES.ARCHITECTURE_TRADEOFF,
            priorityScore: 88,
          },
        ],
        warnings: [],
      }),
      generateQuestionsFn: async () => ({
        success: true,
        questions: [
          {
            questionId: 'ceq_q1_scale',
            questionText: 'How did you profile and eliminate memory bottlenecks in Go at 500k metrics/sec?',
            inquiryType: INQUIRY_TYPES.IMPLEMENTATION_PROBING,
            dimension: EXAMINATION_DIMENSIONS.PERFORMANCE_AND_SCALE,
            targetProjectId: 'prj_telemetry_1',
            targetClaimIds: ['clm_scale_1'],
            timeLimit: 120,
            expectedEvidence: ['sync.Pool allocation reuse', 'Garbage collection tuning', 'pprof heap analysis'],
            rationale: 'Verify actual implementation experience with high allocation rates',
            followUpGuidance: 'Ask about sync.Pool if GC pauses were cited',
          },
          {
            questionId: 'ceq_q2_arch',
            questionText: 'What trade-offs led you to choose Apache Pulsar over Kafka for tiered storage?',
            inquiryType: INQUIRY_TYPES.ARCHITECTURE_TRADEOFF,
            dimension: EXAMINATION_DIMENSIONS.ARCHITECTURE_BOUNDARIES,
            targetProjectId: 'prj_telemetry_1',
            targetClaimIds: ['clm_arch_2'],
            timeLimit: 120,
            expectedEvidence: ['Decoupled compute and BookKeeper storage', 'Native tiered storage integration'],
            rationale: 'Examine architectural evaluation of multi-layer messaging brokers',
            followUpGuidance: 'Inquire regarding operational complexity of ZooKeeper + BookKeeper',
          },
        ],
      }),
      evaluateAnswerFn: async ({ question, answer }) => {
        // Evidence-grounded evaluation simulation
        if (question.questionId === 'ceq_q1_scale') {
          return {
            success: true,
            evaluation: {
              evaluationId: 'eval_q1_001',
              questionId: question.questionId,
              dimensionEvaluations: [
                {
                  dimension: EXAMINATION_DIMENSIONS.PERFORMANCE_AND_SCALE,
                  score: 'STRONG',
                  rationale: 'Demonstrated direct mastery of sync.Pool and GC pacer tuning in Go.',
                },
                {
                  dimension: EXAMINATION_DIMENSIONS.INDIVIDUAL_CONTRIBUTION,
                  score: 'STRONG',
                  rationale: 'Personal ownership proven through concrete profiling metrics.',
                },
              ],
              directEvidence: ['Replaced slice allocations with sync.Pool buffer recycling', 'Reduced p99 GC pause to 4ms'],
              partialEvidence: [],
              ambiguities: [],
              unsupportedAssertions: [],
              contradictions: [],
              alternativeApproaches: ['Pre-allocated ring buffers for zero-alloc channel reads'],
              missingInformation: [],
              confidence: CONFIDENCE_LEVELS.HIGH,
              followUpEligible: true,
              clarificationTargets: ['How backpressure was communicated to ingestion producers during bursts'],
            },
          };
        }
        return {
          success: true,
          evaluation: {
            evaluationId: 'eval_q2_002',
            questionId: question.questionId,
            dimensionEvaluations: [
              {
                dimension: EXAMINATION_DIMENSIONS.ARCHITECTURE_BOUNDARIES,
                score: 'STRONG',
                rationale: 'Articulated BookKeeper multi-tier architectural decoupling clearly.',
              },
            ],
            directEvidence: ['Pulsar separated compute/storage scaling', 'Offloaded cold ledger segments to S3'],
            partialEvidence: [],
            ambiguities: [],
            unsupportedAssertions: [],
            contradictions: [],
            alternativeApproaches: [],
            missingInformation: [],
            confidence: CONFIDENCE_LEVELS.HIGH,
            followUpEligible: false,
            clarificationTargets: [],
          },
        };
      },
      generateFollowUpFn: async ({ parentQuestion, evaluation }) => ({
        success: true,
        followUpQuestion: {
          questionId: 'ceq_q1_followup_1',
          questionText: 'When backpressure built up during ingestion bursts, how did you prevent dropped packets?',
          inquiryType: INQUIRY_TYPES.FOLLOW_UP_PROBE,
          dimension: EXAMINATION_DIMENSIONS.ERROR_AND_FAILURE_HANDLING,
          targetProjectId: parentQuestion.targetProjectId,
          targetClaimIds: parentQuestion.targetClaimIds,
          timeLimit: 90,
          depth: (parentQuestion.depth || 0) + 1,
          parentQuestionId: parentQuestion.questionId,
          expectedEvidence: ['TCP window throttling', 'Proportional drop or buffering strategies'],
          rationale: 'Probe resilience boundaries under producer flood',
        },
      }),
      generateReportFn: async ({ session }) => ({
        success: true,
        report: {
          version: REPORT_SCHEMA_VERSION,
          generatedAt: new Date(),
          completedAt: new Date(),
          summary: 'Candidate demonstrated authoritative depth in high-throughput Go systems and distributed telemetry pipelines.',
          readinessLevel: 'READY',
          verifiedClaimsCount: 2,
          unverifiedClaimsCount: 0,
          contradictionsCount: 0,
          claimVerificationMatrix: [
            {
              claimId: session.projects?.[0]?.claims?.[0]?.claimId || 'clm_scale_1',
              statement: 'Processed 500,000 metrics per second with sub-50ms p99 ingestion latency',
              category: CLAIM_CATEGORIES.SCALE_METRIC,
              status: VERIFICATION_STATUSES.DEMONSTRATED,
              confidence: CONFIDENCE_LEVELS.HIGH,
              demonstratedDepth: 'STRONG',
              evidenceQuestionIds: ['ceq_q1_scale', 'ceq_q1_followup_1'],
              evaluatorNotes: 'Thoroughly corroborated through sync.Pool buffer reuse and backpressure mechanics.',
            },
            {
              claimId: session.projects?.[0]?.claims?.[1]?.claimId || 'clm_arch_2',
              statement: 'Employed tiered storage in Pulsar to offload historical partitions to S3',
              category: CLAIM_CATEGORIES.ARCHITECTURE_DECISION,
              status: VERIFICATION_STATUSES.DEMONSTRATED,
              confidence: CONFIDENCE_LEVELS.HIGH,
              demonstratedDepth: 'STRONG',
              evidenceQuestionIds: ['ceq_q2_arch'],
              evaluatorNotes: 'Articulated architectural separation of compute and BookKeeper storage.',
            },
          ],
          dimensionScores: [
            {
              dimension: EXAMINATION_DIMENSIONS.PERFORMANCE_AND_SCALE,
              demonstratedLevel: 'STRONG',
              observedEvidenceCount: 2,
              unexaminedQuestionCount: 0,
            },
            {
              dimension: EXAMINATION_DIMENSIONS.ARCHITECTURE_BOUNDARIES,
              demonstratedLevel: 'STRONG',
              observedEvidenceCount: 1,
              unexaminedQuestionCount: 0,
            },
          ],
          preparationGaps: [],
          recommendedFollowUps: [],
          alternativeApproaches: ['Pre-allocated ring buffers for zero-alloc channel reads'],
          evidenceTraceability: [
            {
              evidenceId: 'ev_001',
              questionId: 'ceq_q1_scale',
              answerId: 'ans_q1_001',
              verifiedAt: new Date(),
            },
          ],
          evaluationCoverage: {
            questionsEvaluated: 3,
            evaluationsFailedOrUnavailable: 0,
            unexaminedTopicsCount: 0,
          },
          generationStatus: 'completed',
        },
      }),
    });
  });

  describe('Journey 1: Complete Connected Happy Path (Phases 0–9 Integration)', () => {
    it('should complete the full end-to-end examination lifecycle from creation to report generation', async () => {
      // Step 1: Client creates session with idempotency key
      const idempotencyKey = 'e2e_session_key_999';
      const createReq = {
        userId: candidateUserId,
        headers: { 'idempotency-key': idempotencyKey },
        body: {
          resumeText: 'Processed 500,000 metrics per second with sub-50ms p99 latency in Go and Apache Pulsar on Kubernetes.',
          targetRole: 'Distributed Systems Architect',
          targetDomain: 'High-Throughput Telemetry',
          questionCount: 3,
        },
      };
      const createRes = createMockRes();
      await controller.createSession(createReq, createRes);

      assert.strictEqual(createRes.statusCode, 201);
      assert.strictEqual(createRes.body.message, 'Cross-examination session created successfully');
      const createdSession = createRes.body.session;
      const sessionId = createdSession.sessionId.toString();

      assert.ok(sessionId);
      assert.strictEqual(createdSession.targetRole, 'Distributed Systems Architect');
      assert.strictEqual(createdSession.status, SESSION_STATUSES.AWAITING_ANSWER);
      assert.strictEqual(createdSession.progress.totalQuestions, 2);
      assert.strictEqual(createdSession.progress.answeredCount, 0);

      // Verify Question 1 is active and candidate privacy masking is applied
      const q1 = createdSession.currentQuestion;
      assert.strictEqual(q1.questionId, 'ceq_q1_scale');
      assert.strictEqual(q1.rationale, undefined, 'Internal rationale must not leak to candidate');
      assert.strictEqual(q1.expectedEvidence, undefined, 'Expected evidence must not leak to candidate');

      // Step 2: Idempotent replay with same key returns HTTP 200 with isIdempotentReplay: true
      const replayRes = createMockRes();
      await controller.createSession(createReq, replayRes);
      assert.strictEqual(replayRes.statusCode, 200);
      assert.strictEqual(replayRes.body.isIdempotentReplay, true);
      assert.strictEqual(replayRes.body.session.sessionId.toString(), sessionId);

      // Step 3: Candidate submits answer for Question 1
      const answerQ1Req = {
        userId: candidateUserId,
        params: { sessionId },
        body: {
          questionId: 'ceq_q1_scale',
          rawTranscript: 'We used sync.Pool to recycle memory buffers and tuned GOGC to eliminate stop-the-world pauses, achieving 4ms p99.',
          timeTaken: 85,
        },
      };
      const answerQ1Res = createMockRes();
      await controller.submitAnswer(answerQ1Req, answerQ1Res);

      assert.strictEqual(answerQ1Res.statusCode, 200);
      assert.strictEqual(answerQ1Res.body.message, 'Answer submitted successfully');
      assert.strictEqual(answerQ1Res.body.answer.questionId, 'ceq_q1_scale');

      // Adaptive probing check: follow-up probe should have been inserted into session
      const sessionAfterQ1 = mockStore.sessions.get(sessionId);
      assert.strictEqual(sessionAfterQ1.questions.length, 3, 'Follow-up question must be inserted');
      const followUpQ = sessionAfterQ1.questions.find((q) => q.inquiryType === INQUIRY_TYPES.FOLLOW_UP_PROBE);
      assert.ok(followUpQ, 'Follow-up probe question must exist');
      assert.strictEqual(followUpQ.questionId, 'ceq_q1_followup_1');
      assert.strictEqual(followUpQ.depth, 1);

      // Step 4: Advance to the inserted follow-up probe
      const advance1Res = createMockRes();
      await controller.advanceQuestion({ userId: candidateUserId, params: { sessionId } }, advance1Res);
      assert.strictEqual(advance1Res.statusCode, 200);
      assert.strictEqual(advance1Res.body.currentQuestion.questionId, 'ceq_q1_followup_1');

      // Step 5: Answer the follow-up probe
      const answerFollowUpReq = {
        userId: candidateUserId,
        params: { sessionId },
        body: {
          questionId: 'ceq_q1_followup_1',
          rawTranscript: 'We applied TCP window backpressure and ring-buffer buffering so producers slowed down rather than dropping packets.',
          timeTaken: 55,
        },
      };
      const answerFollowUpRes = createMockRes();
      await controller.submitAnswer(answerFollowUpReq, answerFollowUpRes);
      assert.strictEqual(answerFollowUpRes.statusCode, 200);

      // Step 6: Advance to Question 2
      const advance2Res = createMockRes();
      await controller.advanceQuestion({ userId: candidateUserId, params: { sessionId } }, advance2Res);
      assert.strictEqual(advance2Res.statusCode, 200);
      assert.strictEqual(advance2Res.body.currentQuestion.questionId, 'ceq_q2_arch');

      // Step 7: Answer Question 2 with autoAdvance: true
      const answerQ2Req = {
        userId: candidateUserId,
        params: { sessionId },
        body: {
          questionId: 'ceq_q2_arch',
          rawTranscript: 'Pulsar decoupled compute brokers from BookKeeper bookies, allowing us to tier old ledger segments to S3 effortlessly.',
          timeTaken: 90,
          autoAdvance: true,
        },
      };
      const answerQ2Res = createMockRes();
      await controller.submitAnswer(answerQ2Req, answerQ2Res);
      assert.strictEqual(answerQ2Res.statusCode, 200);
      assert.strictEqual(answerQ2Res.body.progress.isFinished, true);

      // Step 8: Complete Session & Automatically Synthesize Preparation Report
      const completeRes = createMockRes();
      await controller.completeSession({ userId: candidateUserId, params: { sessionId } }, completeRes);

      assert.strictEqual(completeRes.statusCode, 200);
      assert.strictEqual(completeRes.body.message, 'Cross-examination session completed successfully');
      const completedSessionDoc = completeRes.body.session;
      assert.strictEqual(completedSessionDoc.status, SESSION_STATUSES.COMPLETED);
      assert.ok(completedSessionDoc.report, 'Preparation report must be attached upon completion');
      assert.strictEqual(completedSessionDoc.report.generationStatus, 'completed');
      assert.strictEqual(completedSessionDoc.report.verifiedClaimsCount, 2);

      // Step 9: Independent Report Retrieval via GET /sessions/:sessionId/report
      const getReportRes = createMockRes();
      await controller.getReport({ userId: candidateUserId, params: { sessionId } }, getReportRes);

      assert.strictEqual(getReportRes.statusCode, 200);
      const retrievedReport = getReportRes.body.report;
      assert.ok(retrievedReport);
      assert.strictEqual(retrievedReport.version, REPORT_SCHEMA_VERSION);
      assert.strictEqual(retrievedReport.claimVerificationMatrix.length, 2);
      assert.strictEqual(retrievedReport.dimensionScores.length, 2);
      assert.strictEqual(retrievedReport._id, undefined, '_id must be stripped from candidate payload');
      assert.strictEqual(retrievedReport.__v, undefined, '__v must be stripped from candidate payload');

      // Step 10: Explicit Report Regeneration via POST /sessions/:sessionId/report?regenerate=true
      const regenRes = createMockRes();
      await controller.generateReport(
        {
          userId: candidateUserId,
          params: { sessionId },
          query: { regenerate: 'true' },
        },
        regenRes
      );

      assert.strictEqual(regenRes.statusCode, 200);
      assert.strictEqual(regenRes.body.message, 'Preparation report generated successfully');
      assert.ok(regenRes.body.report);

      // Step 11: History Listing via GET /sessions
      const listRes = createMockRes();
      await controller.listSessions({ userId: candidateUserId, query: { limit: 10 } }, listRes);
      assert.strictEqual(listRes.statusCode, 200);
      assert.strictEqual(listRes.body.count, 1);
      assert.strictEqual(listRes.body.sessions[0].sessionId.toString(), sessionId);
      assert.strictEqual(listRes.body.sessions[0].status, SESSION_STATUSES.COMPLETED);
      assert.strictEqual(listRes.body.sessions[0].answeredCount, 3);
    });
  });

  describe('Journey 2: Edge Cases, Security Boundaries & Concurrency Isolation', () => {
    it('should block unauthorized user from accessing or completing candidate session across all stages', async () => {
      // Create session for Candidate
      const createRes = createMockRes();
      await controller.createSession(
        {
          userId: candidateUserId,
          body: {
            resumeText: 'Senior engineer with Go and distributed messaging experience at scale.',
            targetRole: 'Senior Go Engineer',
          },
        },
        createRes
      );
      const sessionId = createRes.body.session.sessionId.toString();

      // Unauthorized user attempts GET session
      const getRes = createMockRes();
      await controller.getSession({ userId: unauthorizedUserId, params: { sessionId } }, getRes);
      assert.strictEqual(getRes.statusCode, 404);

      // Unauthorized user attempts submitAnswer
      const ansRes = createMockRes();
      await controller.submitAnswer(
        {
          userId: unauthorizedUserId,
          params: { sessionId },
          body: { questionId: 'ceq_q1_scale', rawTranscript: 'Hacked answer' },
        },
        ansRes
      );
      assert.strictEqual(ansRes.statusCode, 404);

      // Unauthorized user attempts advance
      const advRes = createMockRes();
      await controller.advanceQuestion({ userId: unauthorizedUserId, params: { sessionId } }, advRes);
      assert.strictEqual(advRes.statusCode, 404);

      // Unauthorized user attempts complete
      const compRes = createMockRes();
      await controller.completeSession({ userId: unauthorizedUserId, params: { sessionId } }, compRes);
      assert.strictEqual(compRes.statusCode, 404);

      // Unauthorized user attempts getReport
      const repRes = createMockRes();
      await controller.getReport({ userId: unauthorizedUserId, params: { sessionId } }, repRes);
      assert.strictEqual(repRes.statusCode, 404);
    });

    it('should reject out-of-order and illegal state progression attempts', async () => {
      // Create session
      const createRes = createMockRes();
      await controller.createSession(
        {
          userId: candidateUserId,
          body: {
            resumeText: 'Senior engineer with Go and distributed messaging experience at scale.',
            targetRole: 'Senior Go Engineer',
          },
        },
        createRes
      );
      const sessionId = createRes.body.session.sessionId.toString();

      // 1. Attempt to advance while active question is unanswered
      const advFailRes = createMockRes();
      await controller.advanceQuestion({ userId: candidateUserId, params: { sessionId } }, advFailRes);
      assert.strictEqual(advFailRes.statusCode, 400);
      assert.match(advFailRes.body.message, /is unanswered/i);

      // 2. Attempt to submit answer for wrong/inactive questionId
      const ansFailRes = createMockRes();
      await controller.submitAnswer(
        {
          userId: candidateUserId,
          params: { sessionId },
          body: { questionId: 'non_existent_or_inactive_q', rawTranscript: 'Invalid question answer' },
        },
        ansFailRes
      );
      assert.strictEqual(ansFailRes.statusCode, 400);
      assert.match(ansFailRes.body.message, /Cannot submit answer for question/i);

      // 3. Attempt to generate report on active/incomplete session
      const repFailRes = createMockRes();
      await controller.generateReport({ userId: candidateUserId, params: { sessionId } }, repFailRes);
      assert.strictEqual(repFailRes.statusCode, 400);
      assert.match(repFailRes.body.message, /incomplete session/i);
    });

    it('should prevent mutating a terminal completed session', async () => {
      // Create session
      const createRes = createMockRes();
      await controller.createSession(
        {
          userId: candidateUserId,
          body: {
            resumeText: 'Senior engineer with Go and distributed messaging experience at scale.',
            targetRole: 'Senior Go Engineer',
          },
        },
        createRes
      );
      const sessionId = createRes.body.session.sessionId.toString();

      // Answer Q1
      await controller.submitAnswer(
        {
          userId: candidateUserId,
          params: { sessionId },
          body: { questionId: 'ceq_q1_scale', rawTranscript: 'Answered Q1' },
        },
        createMockRes()
      );

      // Complete session
      const compRes = createMockRes();
      await controller.completeSession({ userId: candidateUserId, params: { sessionId } }, compRes);
      assert.strictEqual(compRes.statusCode, 200);

      // Attempt to submit answer to completed session -> 409 Conflict
      const lateAnsRes = createMockRes();
      await controller.submitAnswer(
        {
          userId: candidateUserId,
          params: { sessionId },
          body: { questionId: 'ceq_q1_scale', rawTranscript: 'Late answer' },
        },
        lateAnsRes
      );
      assert.strictEqual(lateAnsRes.statusCode, 409);
      assert.match(lateAnsRes.body.message, /Cannot submit answer to a session with status 'completed'/i);

      // Attempt to advance completed session -> 409 Conflict
      const lateAdvRes = createMockRes();
      await controller.advanceQuestion({ userId: candidateUserId, params: { sessionId } }, lateAdvRes);
      assert.strictEqual(lateAdvRes.statusCode, 409);
      assert.match(lateAdvRes.body.message, /Cannot advance a session with status 'completed'/i);

      // Attempt duplicate complete -> 400 Bad Request
      const dupCompRes = createMockRes();
      await controller.completeSession({ userId: candidateUserId, params: { sessionId } }, dupCompRes);
      assert.strictEqual(dupCompRes.statusCode, 400);
      assert.match(dupCompRes.body.message, /already completed/i);
    });

    it('should enforce follow-up probing depth and total session limits', () => {
      assert.strictEqual(PROBING_LIMITS.MAX_FOLLOW_UP_DEPTH, 2);
      assert.strictEqual(PROBING_LIMITS.MAX_TOTAL_SESSION_QUESTIONS, 12);
    });
  });
});
