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
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    completedAt: {
      type: Date,
      default: Date.now,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
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
    preparationGaps: {
      type: [String],
      default: [],
    },
    recommendedFollowUps: {
      type: [String],
      default: [],
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
crossExaminationSessionSchema.index({ userId: 1, idempotencyKey: 1 }, { sparse: true });

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

const CrossExaminationSession = mongoose.model(
  'CrossExaminationSession',
  crossExaminationSessionSchema
);

export default CrossExaminationSession;
