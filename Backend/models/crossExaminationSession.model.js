/**
 * @file crossExaminationSession.model.js
 * Mongoose schema and persistence model for Cross-Examination sessions.
 * Preserves strict user ownership, question-answer relationships,
 * and claim provenance without duplicate data bloat.
 */

import mongoose from 'mongoose';
import {
  CLAIM_CATEGORIES,
  PROVENANCE_TYPES,
  CONFIDENCE_LEVELS,
  VERIFICATION_STATUSES,
  SESSION_STATUSES,
  INQUIRY_TYPES,
  EVIDENCE_STRENGTHS,
  EXAMINATION_DIMENSIONS,
  EVALUATION_VERSION,
  PROBING_LIMITS,
  REPORT_SCHEMA_VERSION,
  REPORT_METHODOLOGY,
  SEVERITY_LEVELS,
  PRIORITY_LEVELS,
  READINESS_LEVELS,
  isValidStateTransition,
  generateDomainId,
} from '../contracts/crossExamination.contracts.js';

const claimSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      required: true,
      default: () => generateDomainId('clm'),
    },
    category: {
      type: String,
      enum: Object.values(CLAIM_CATEGORIES),
      required: true,
    },
    statement: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    sourceExcerpt: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    provenanceType: {
      type: String,
      enum: Object.values(PROVENANCE_TYPES),
      required: true,
      default: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
    },
    confidence: {
      type: String,
      enum: Object.values(CONFIDENCE_LEVELS),
      default: CONFIDENCE_LEVELS.HIGH,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUSES),
      default: VERIFICATION_STATUSES.UNVERIFIED,
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      default: () => generateDomainId('prj'),
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    candidateRole: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    technologies: {
      type: [String],
      default: [],
    },
    claims: {
      type: [claimSchema],
      default: [],
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      default: () => generateDomainId('ceq'),
    },
    targetClaimIds: {
      type: [String],
      default: [],
    },
    targetProjectId: {
      type: String,
      default: null,
    },
    inquiryType: {
      type: String,
      enum: Object.values(INQUIRY_TYPES),
      required: true,
      default: INQUIRY_TYPES.CLAIM_VERIFICATION,
    },
    parentQuestionId: {
      type: String,
      default: null,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    timeLimit: {
      type: Number,
      default: 90,
      min: 30,
      max: 300,
    },
    status: {
      type: String,
      enum: ['pending', 'current', 'answered', 'skipped'],
      default: 'pending',
    },
    opportunityId: {
      type: String,
      default: null,
    },
    dimension: {
      type: String,
      default: null,
    },
    examinationIntent: {
      type: String,
      default: null,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    rationale: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    expectedEvidence: {
      type: [String],
      default: [],
    },
    followUpGuidance: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  { _id: false }
);

const findingSchema = new mongoose.Schema(
  {
    findingId: {
      type: String,
      required: true,
      default: () => generateDomainId('fnd'),
    },
    claimId: {
      type: String,
      required: true,
    },
    evidenceStrength: {
      type: String,
      enum: Object.values(EVIDENCE_STRENGTHS),
      required: true,
    },
    reasoning: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { _id: false }
);

const dimensionEvaluationSchema = new mongoose.Schema(
  {
    dimension: {
      type: String,
      enum: Object.values(EXAMINATION_DIMENSIONS),
      required: true,
    },
    score: {
      type: String,
      enum: Object.values(EVIDENCE_STRENGTHS),
      required: true,
    },
    rationale: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    evaluationId: {
      type: String,
      required: true,
      default: () => generateDomainId('evl'),
    },
    version: {
      type: String,
      default: EVALUATION_VERSION,
    },
    directEvidence: {
      type: [String],
      default: [],
    },
    partialEvidence: {
      type: [String],
      default: [],
    },
    ambiguities: {
      type: [String],
      default: [],
    },
    unsupportedAssertions: {
      type: [String],
      default: [],
    },
    contradictions: {
      type: [String],
      default: [],
    },
    alternativeApproaches: {
      type: [String],
      default: [],
    },
    missingInformation: {
      type: [String],
      default: [],
    },
    dimensionEvaluations: {
      type: [dimensionEvaluationSchema],
      default: [],
    },
    confidence: {
      type: String,
      enum: Object.values(CONFIDENCE_LEVELS),
      default: CONFIDENCE_LEVELS.HIGH,
    },
    followUpEligible: {
      type: Boolean,
      default: false,
    },
    clarificationTargets: {
      type: [String],
      default: [],
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    answerId: {
      type: String,
      required: true,
      default: () => generateDomainId('ans'),
    },
    questionId: {
      type: String,
      required: true,
    },
    rawTranscript: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    timeTaken: {
      type: Number,
      default: 0,
      min: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    findings: {
      type: [findingSchema],
      default: [],
    },
    evaluation: {
      type: evaluationSchema,
      default: null,
    },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      default: () => generateDomainId('rpt'),
    },
    version: {
      type: String,
      default: REPORT_SCHEMA_VERSION,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    executiveSummary: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    methodology: {
      type: String,
      default: REPORT_METHODOLOGY,
    },
    completionState: {
      totalQuestions: { type: Number, default: 0 },
      answeredCount: { type: Number, default: 0 },
      skippedCount: { type: Number, default: 0 },
      evaluatedCount: { type: Number, default: 0 },
      unexaminedClaimsCount: { type: Number, default: 0 },
    },
    verifiedClaimsCount: {
      type: Number,
      default: 0,
    },
    unverifiedClaimsCount: {
      type: Number,
      default: 0,
    },
    contradictionsCount: {
      type: Number,
      default: 0,
    },
    claimVerificationMatrix: {
      type: [
        {
          claimId: { type: String, required: true },
          category: { type: String },
          statement: { type: String },
          projectTitle: { type: String, default: '' },
          sourceExcerpt: { type: String, default: '' },
          verificationStatus: { type: String, default: 'UNEXAMINED' },
          evidenceReferences: {
            type: [{ questionId: String, answerId: String }],
            default: [],
          },
        },
      ],
      default: [],
    },
    demonstratedStrengths: {
      type: [
        {
          id: { type: String, default: () => generateDomainId('str') },
          title: { type: String, required: true },
          description: { type: String, required: true },
          evidenceReferences: {
            type: [{ questionId: String, answerId: String }],
            default: [],
          },
        },
      ],
      default: [],
    },
    // Supports both Phase 8 objects and legacy string arrays
    preparationGaps: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    recommendedFollowUps: {
      type: [String],
      default: [],
    },
    alternativeApproachesAcknowledged: {
      type: [
        {
          id: { type: String, default: () => generateDomainId('alt') },
          topic: { type: String, default: '' },
          description: { type: String, required: true },
          questionId: { type: String, default: null },
          answerId: { type: String, default: null },
        },
      ],
      default: [],
    },
    unresolvedContradictions: {
      type: [
        {
          id: { type: String, default: () => generateDomainId('ctr') },
          claimId: { type: String, default: null },
          contradictionSummary: { type: String, required: true },
          evidenceReferences: {
            type: [{ questionId: String, answerId: String }],
            default: [],
          },
        },
      ],
      default: [],
    },
    studyRecommendations: {
      type: [
        {
          id: { type: String, default: () => generateDomainId('rec') },
          priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
          topic: { type: String, required: true },
          recommendation: { type: String, required: true },
          targetAreas: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    dimensionScores: {
      type: [
        {
          dimension: { type: String, required: true },
          demonstratedLevel: { type: String, default: 'UNAVAILABLE' },
          rationale: { type: String, default: '' },
          evaluatedAnswersCount: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    limitations: {
      type: [String],
      default: [],
    },
    evaluationCoverage: {
      questionsEvaluated: { type: Number, default: 0 },
      evaluationsFailedOrUnavailable: { type: Number, default: 0 },
      unexaminedTopicsCount: { type: Number, default: 0 },
    },
    generationStatus: {
      type: String,
      enum: ['completed', 'partial', 'failed'],
      default: 'completed',
    },
  },
  { _id: false }
);

const crossExaminationSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Session owner userId is required'],
      index: true,
    },
    sessionTitle: {
      type: String,
      trim: true,
      maxlength: 200,
      default: 'Resume & Project Cross-Examination',
    },
    targetRole: {
      type: String,
      required: [true, 'targetRole is required'],
      trim: true,
      maxlength: 120,
    },
    targetDomain: {
      type: String,
      trim: true,
      default: 'General Software Engineering',
      maxlength: 120,
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUSES),
      default: SESSION_STATUSES.DRAFT,
      index: true,
    },
    sourceProvenance: {
      resumeTextExcerpt: {
        type: String,
        trim: true,
        maxlength: 4000,
        default: '',
      },
      resumeHash: {
        type: String,
        trim: true,
        default: '',
      },
      extractedAt: {
        type: Date,
        default: Date.now,
      },
    },
    projects: {
      type: [projectSchema],
      default: [],
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    report: {
      type: reportSchema,
      default: null,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for user querying, idempotency, and status filtering
crossExaminationSessionSchema.index({ userId: 1, createdAt: -1 });
crossExaminationSessionSchema.index({ userId: 1, status: 1 });
crossExaminationSessionSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

/**
 * Validates whether the session can legally transition to target status.
 */
crossExaminationSessionSchema.methods.canTransitionTo = function (targetStatus) {
  return isValidStateTransition(this.status, targetStatus);
};

/**
 * Transitions the session status if allowed; throws an error otherwise.
 */
crossExaminationSessionSchema.methods.transitionTo = function (targetStatus) {
  if (!this.canTransitionTo(targetStatus)) {
    throw new Error(
      `Illegal session status transition from '${this.status}' to '${targetStatus}'`
    );
  }
  this.status = targetStatus;
  return this;
};

/**
 * Helper to find a question by its unique questionId.
 */
crossExaminationSessionSchema.methods.findQuestion = function (questionId) {
  return this.questions.find((q) => q.questionId === questionId) || null;
};

/**
 * Helper to record an answer and advance question status.
 */
crossExaminationSessionSchema.methods.recordAnswer = function ({
  questionId,
  rawTranscript,
  timeTaken = 0,
  findings = [],
}) {
  const targetQuestion = this.findQuestion(questionId);
  if (!targetQuestion) {
    throw new Error(`Question '${questionId}' not found in session`);
  }

  const existingAnswer = this.answers.find((a) => a.questionId === questionId);
  if (existingAnswer) {
    throw new Error(`Answer for question '${questionId}' has already been submitted`);
  }

  const newAnswer = {
    answerId: generateDomainId('ans'),
    questionId,
    rawTranscript,
    timeTaken,
    submittedAt: new Date(),
    findings,
  };

  this.answers.push(newAnswer);
  targetQuestion.status = 'answered';
  return newAnswer;
};

/**
 * Helper to get currently active question.
 */
crossExaminationSessionSchema.methods.getActiveQuestion = function () {
  return this.questions.find((q) => q.status === 'current') || null;
};

/**
 * Helper to advance to the next pending question.
 * Ensures any active question is answered or skipped before advancing.
 */
crossExaminationSessionSchema.methods.advanceQuestion = function () {
  const currentQuestion = this.getActiveQuestion();
  if (currentQuestion) {
    const isAnswered = this.answers.some((a) => a.questionId === currentQuestion.questionId);
    if (!isAnswered && currentQuestion.status !== 'skipped') {
      throw new Error(`Cannot advance while question '${currentQuestion.questionId}' is unanswered`);
    }
  }

  const nextPending = this.questions
    .filter((q) => q.status === 'pending')
    .sort((a, b) => a.order - b.order)[0];

  if (!nextPending) {
    return null;
  }

  nextPending.status = 'current';
  this.status = SESSION_STATUSES.AWAITING_ANSWER;
  return nextPending;
};

/**
 * Attaches structured evaluation to an existing answer and updates claim verification states.
 */
crossExaminationSessionSchema.methods.attachAnswerEvaluation = function (questionId, evaluationData) {
  const answer = this.answers.find((a) => a.questionId === questionId);
  if (!answer) {
    throw new Error(`Answer for question '${questionId}' not found`);
  }

  answer.evaluation = evaluationData;

  // Update claim verification statuses if targeted claims are present
  const question = this.findQuestion(questionId);
  if (question && Array.isArray(question.targetClaimIds) && question.targetClaimIds.length > 0) {
    const targetClaimIdsSet = new Set(question.targetClaimIds);

    // Determine verification level from evaluation
    let inferredStatus = null;
    if (evaluationData.contradictions && evaluationData.contradictions.length > 0) {
      inferredStatus = VERIFICATION_STATUSES.UNRESOLVED_CONTRADICTION;
    } else if (evaluationData.directEvidence && evaluationData.directEvidence.length > 0) {
      inferredStatus = VERIFICATION_STATUSES.DEMONSTRATED;
    } else if (
      (evaluationData.partialEvidence && evaluationData.partialEvidence.length > 0) ||
      (evaluationData.alternativeApproaches && evaluationData.alternativeApproaches.length > 0)
    ) {
      inferredStatus = VERIFICATION_STATUSES.PARTIALLY_SUPPORTED;
    } else if (evaluationData.missingInformation && evaluationData.missingInformation.length > 0) {
      inferredStatus = VERIFICATION_STATUSES.INSUFFICIENT_EVIDENCE;
    }

    if (inferredStatus) {
      for (const project of this.projects) {
        for (const claim of project.claims) {
          if (targetClaimIdsSet.has(claim.claimId)) {
            // Do not downgrade a DEMONSTRATED claim unless contradiction found
            if (
              claim.verificationStatus !== VERIFICATION_STATUSES.DEMONSTRATED ||
              inferredStatus === VERIFICATION_STATUSES.UNRESOLVED_CONTRADICTION
            ) {
              claim.verificationStatus = inferredStatus;
            }
          }
        }
      }
    }
  }

  return answer;
};

/**
 * Dynamically inserts a targeted follow-up question immediately after current question.
 * Bounded by PROBING_LIMITS.MAX_FOLLOW_UP_DEPTH and PROBING_LIMITS.MAX_TOTAL_SESSION_QUESTIONS.
 */
crossExaminationSessionSchema.methods.addFollowUpQuestion = function ({
  questionId,
  parentQuestionId,
  questionText,
  timeLimit = 90,
  dimension = null,
  examinationIntent = null,
  rationale = '',
  expectedEvidence = [],
  followUpGuidance = '',
  difficulty = 'medium',
  targetProjectId = null,
  targetClaimIds = [],
}) {
  const parent = this.findQuestion(parentQuestionId);
  if (!parent) {
    throw new Error(`Parent question '${parentQuestionId}' not found`);
  }

  if (parent.depth >= PROBING_LIMITS.MAX_FOLLOW_UP_DEPTH) {
    throw new Error(
      `Maximum follow-up depth (${PROBING_LIMITS.MAX_FOLLOW_UP_DEPTH}) reached for question '${parentQuestionId}'`
    );
  }

  if (this.questions.length >= PROBING_LIMITS.MAX_TOTAL_SESSION_QUESTIONS) {
    throw new Error(
      `Maximum session question count (${PROBING_LIMITS.MAX_TOTAL_SESSION_QUESTIONS}) reached`
    );
  }

  // Check if a follow-up already exists for this parent
  const existingFollowUps = this.questions.filter((q) => q.parentQuestionId === parentQuestionId);
  if (existingFollowUps.length >= PROBING_LIMITS.MAX_FOLLOW_UPS_PER_QUESTION) {
    throw new Error(`Follow-up already generated for parent question '${parentQuestionId}'`);
  }

  const followUpQuestionId = questionId || generateDomainId('ceq');
  const insertionOrder = parent.order + 1;

  // Shift orders of subsequent questions
  for (const q of this.questions) {
    if (q.order >= insertionOrder) {
      q.order += 1;
    }
  }

  const followUpQuestion = {
    questionId: followUpQuestionId,
    targetClaimIds: targetClaimIds.length > 0 ? targetClaimIds : parent.targetClaimIds,
    targetProjectId: targetProjectId || parent.targetProjectId,
    inquiryType: INQUIRY_TYPES.FOLLOW_UP_PROBE,
    parentQuestionId,
    depth: parent.depth + 1,
    order: insertionOrder,
    questionText,
    timeLimit,
    status: 'pending',
    dimension: dimension || parent.dimension,
    examinationIntent: examinationIntent || parent.examinationIntent,
    difficulty,
    rationale,
    expectedEvidence,
    followUpGuidance,
  };

  this.questions.push(followUpQuestion);
  // Keep questions sorted by order
  this.questions.sort((a, b) => a.order - b.order);

  return followUpQuestion;
};

/**
 * Attaches or updates the session's preparation report.
 */
crossExaminationSessionSchema.methods.attachReport = function (reportData) {
  this.report = reportData;
  return this.report;
};

const CrossExaminationSession = mongoose.model(
  'CrossExaminationSession',
  crossExaminationSessionSchema
);

export default CrossExaminationSession;
