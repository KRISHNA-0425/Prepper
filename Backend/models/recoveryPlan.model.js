import mongoose from 'mongoose';

/**
 * Sub-schema for traceable evidence references.
 * Every strength, weakness, or task maps to concrete interview findings.
 */
const evidenceTraceSchema = new mongoose.Schema({
  sourceType: {
    type: String,
    enum: ['standard_interview', 'cross_examination', 'coding_interview'],
    required: true,
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  questionOrProblemId: {
    type: String,
    default: '',
  },
  competency: {
    type: String,
    required: true,
    trim: true,
  },
  evidenceExcerpt: {
    type: String,
    default: '',
  },
  identifiedFinding: {
    type: String,
    default: '',
  },
}, { _id: false });

/**
 * Sub-schema for identified strengths
 */
const recoveryStrengthSchema = new mongoose.Schema({
  strengthId: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  evidence: {
    type: evidenceTraceSchema,
    default: null,
  },
}, { _id: false });

/**
 * Sub-schema for identified critical weaknesses
 */
const recoveryWeaknessSchema = new mongoose.Schema({
  weaknessId: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
    trim: true,
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'moderate', 'minor'],
    default: 'high',
  },
  description: {
    type: String,
    required: true,
  },
  misconceptionSnippet: {
    type: String,
    default: '',
  },
  evidence: {
    type: evidenceTraceSchema,
    default: null,
  },
}, { _id: false });

/**
 * Sub-schema for individual daily recovery tasks
 */
const recoveryTaskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
  },
  dayNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  relatedWeaknessId: {
    type: String,
    default: '',
  },
  relatedWeaknessTopic: {
    type: String,
    default: '',
  },
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  estimatedMinutes: {
    type: Number,
    default: 45,
    min: 5,
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
  },
  category: {
    type: String,
    enum: ['theory', 'coding_practice', 'system_design', 'mock_drill', 'revision'],
    default: 'theory',
  },
  expectedOutcome: {
    type: String,
    required: true,
  },
  completionCriteria: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
    default: null,
  },
  candidateNotes: {
    type: String,
    default: '',
    maxLength: 4000,
  },
  evidence: {
    type: evidenceTraceSchema,
    default: null,
  },
}, { _id: false });

/**
 * Sub-schema for reassessment questions and evaluations
 */
const reassessmentQuestionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  relatedWeaknessId: {
    type: String,
    default: '',
  },
  candidateAnswer: {
    type: String,
    default: '',
  },
  score: {
    type: Number,
    default: null,
    min: 0,
    max: 100,
  },
  feedback: {
    type: String,
    default: '',
  },
  assessedAt: {
    type: Date,
    default: null,
  },
}, { _id: false });

/**
 * Main RecoveryPlan Schema
 */
const recoveryPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true,
    index: true,
  },
  targetRole: {
    type: String,
    required: true,
    trim: true,
  },
  experienceLevel: {
    type: String,
    default: 'Intermediate',
  },
  interviewType: {
    type: String,
    enum: ['standard', 'cross-examination', 'coding', 'hybrid'],
    default: 'standard',
  },
  scheduleDurationDays: {
    type: Number,
    enum: [7, 14, 30],
    required: true,
    default: 14,
  },
  dailyStudyMinutes: {
    type: Number,
    default: 45,
    min: 15,
    max: 240,
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
    default: 'not_started',
    index: true,
  },
  isFallbackGenerated: {
    type: Boolean,
    default: false,
  },
  fallbackReason: {
    type: String,
    default: '',
  },
  overallAssessment: {
    type: String,
    required: true,
  },
  strengths: {
    type: [recoveryStrengthSchema],
    default: [],
  },
  criticalWeaknesses: {
    type: [recoveryWeaknessSchema],
    default: [],
  },
  tasks: {
    type: [recoveryTaskSchema],
    default: [],
  },
  progress: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    currentDay: { type: Number, default: 1 },
  },
  reassessment: {
    status: {
      type: String,
      enum: ['not_eligible', 'ready', 'in_progress', 'completed'],
      default: 'not_eligible',
    },
    originalScore: { type: Number, default: 0 },
    reassessmentScore: { type: Number, default: null },
    scoreDelta: { type: Number, default: null },
    reassessedAt: { type: Date, default: null },
    questions: { type: [reassessmentQuestionSchema], default: [] },
    improvementsObserved: { type: [String], default: [] },
    remainingGaps: { type: [String], default: [] },
  },
  idempotencyKey: {
    type: String,
    sparse: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound unique index prevents race condition / duplicate generation for same user, interview, and schedule duration
recoveryPlanSchema.index(
  { userId: 1, interviewId: 1, scheduleDurationDays: 1 },
  { unique: true }
);

// Method to recalculate progress accurately
recoveryPlanSchema.methods.recalculateProgress = function () {
  const total = this.tasks.length;
  const completed = this.tasks.filter((t) => t.status === 'completed').length;
  this.progress.totalTasks = total;
  this.progress.completedTasks = completed;
  this.progress.completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Determine currentDay as the day of the first uncompleted task
  const firstPending = this.tasks.find((t) => t.status !== 'completed');
  if (firstPending) {
    this.progress.currentDay = firstPending.dayNumber;
  } else if (total > 0) {
    this.progress.currentDay = this.scheduleDurationDays;
  }

  // Update plan status and reassessment eligibility
  if (completed === total && total > 0) {
    this.status = 'completed';
    if (this.reassessment.status === 'not_eligible' || this.reassessment.status === 'ready') {
      this.reassessment.status = 'ready';
    }
  } else if (completed > 0 || this.status === 'in_progress') {
    this.status = 'in_progress';
    // If at least 70% completed, candidate becomes eligible for reassessment
    if (this.progress.completionPercentage >= 70 && this.reassessment.status === 'not_eligible') {
      this.reassessment.status = 'ready';
    }
  }

  return this;
};

const RecoveryPlan = mongoose.model('RecoveryPlan', recoveryPlanSchema);

export default RecoveryPlan;
