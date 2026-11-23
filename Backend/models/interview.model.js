import mongoose from 'mongoose';
import { DIFFICULTY_LEVELS, ALL_DIFFICULTY_LEVELS, ALL_STEERING_ACTIONS, TOPIC_STATUS, GAP_SEVERITY } from '../contracts/adaptiveContracts.js';

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        default: 'medium'
    },
    topic: {
        type: String,
        default: 'General'
    },
    category: {
        type: String,
        default: 'technical'
    },
    timeLimit: {
        type: Number,
        default: 60
    },
    answer: {
        type: String,
        default: ""
    },
    feedback: {
        type: String,
        default: ""
    },
    score: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    correctness: { type: Number, default: 0 },
    isFollowUp: {
        type: Boolean,
        default: false
    },
    parentQuestionIndex: {
        type: Number,
        default: null
    },
    depth: {
        type: Number,
        default: 0
    },
    transitionPhrase: {
        type: String,
        default: ""
    },
    adaptiveReason: {
        type: String,
        default: ""
    },
    evidenceEvaluation: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
});

const topicPerformanceSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    totalQuestions: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    scores: { type: [Number], default: [] },
    status: { type: String, enum: Object.values(TOPIC_STATUS), default: TOPIC_STATUS.AVERAGE },
    lastCoveredQuestionIndex: { type: Number, default: 0 }
}, { _id: false });

const knowledgeGapSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    severity: { type: String, enum: Object.values(GAP_SEVERITY), default: GAP_SEVERITY.MODERATE },
    detectedAtQuestionIndex: { type: Number, required: true },
    description: { type: String, required: true },
    misconceptionSnippet: { type: String, default: "" }
}, { _id: false });

const identifiedStrengthSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    proficiency: { type: String, enum: ['proficient', 'advanced', 'expert'], default: 'proficient' },
    detectedAtQuestionIndex: { type: Number, required: true },
    evidenceExcerpt: { type: String, default: "" }
}, { _id: false });

const decisionHistorySchema = new mongoose.Schema({
    questionIndex: { type: Number, required: true },
    previousDifficulty: { type: String, enum: ALL_DIFFICULTY_LEVELS, required: true },
    newDifficulty: { type: String, enum: ALL_DIFFICULTY_LEVELS, required: true },
    action: { type: String, enum: ALL_STEERING_ACTIONS, required: true },
    reason: { type: String, required: true },
    targetTopic: { type: String, default: 'General' },
    transitionPhrase: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const adaptiveStateSchema = new mongoose.Schema({
    currentDifficulty: {
        type: String,
        enum: ALL_DIFFICULTY_LEVELS,
        default: DIFFICULTY_LEVELS.INTERMEDIATE
    },
    previousDifficulty: {
        type: String,
        enum: ALL_DIFFICULTY_LEVELS,
        default: DIFFICULTY_LEVELS.INTERMEDIATE
    },
    consecutiveStrongAnswers: { type: Number, default: 0 },
    consecutiveWeakAnswers: { type: Number, default: 0 },
    topicPerformance: { type: [topicPerformanceSchema], default: [] },
    identifiedKnowledgeGaps: { type: [knowledgeGapSchema], default: [] },
    identifiedStrengths: { type: [identifiedStrengthSchema], default: [] },
    decisionHistory: { type: [decisionHistorySchema], default: [] },
    coveredTopics: { type: [String], default: [] },
    followUpCount: { type: Number, default: 0 },
    approvedCompetencies: { type: [String], default: [] }
}, { _id: false });

const interviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    role: {
        type: String,
        required: true
    },
    experience: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        enum: ["HR", "Technical"],
        required: true,
        default: "Technical"
    },
    resumeText: {
        type: String,
    },
    questions: [questionSchema],
    finalScore: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["Completed", "Incompleted"],
        default: "Incompleted"
    },
    enableCrossQuestioning: {
        type: Boolean,
        default: false
    },
    crossQuestioningType: {
        type: String,
        enum: ["Technical", "Behavioral"],
        default: "Technical"
    },

    // --- Packaging, Pricing & Timing Fields ---
    interviewMode: {
        type: String,
        enum: ["question_based", "time_based"],
        default: "question_based"
    },
    selectedQuestionCount: {
        type: Number,
        default: 10
    },
    selectedDurationMinutes: {
        type: Number,
        default: null
    },
    targetQuestionCount: {
        type: Number,
        default: 10
    },
    creditsCharged: {
        type: Number,
        default: 50
    },
    difficulty: {
        type: String,
        default: "medium"
    },
    answerTimeLimitSeconds: {
        type: Number,
        default: 60
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null
    },
    currentQuestionIndex: {
        type: Number,
        default: 0
    },
    currentQuestionStartedAt: {
        type: Date,
        default: Date.now
    },
    currentQuestionDeadline: {
        type: Date,
        default: null
    },
    isEvaluating: {
        type: Boolean,
        default: false
    },
    analytics: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    adaptiveState: {
        type: adaptiveStateSchema,
        default: () => ({
            currentDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
            previousDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
            consecutiveStrongAnswers: 0,
            consecutiveWeakAnswers: 0,
            topicPerformance: [],
            identifiedKnowledgeGaps: [],
            identifiedStrengths: [],
            decisionHistory: [],
            coveredTopics: [],
            followUpCount: 0,
            approvedCompetencies: []
        })
    }
}, { timestamps: true });

const Interview = mongoose.model("Interview", interviewSchema);

export default Interview;
