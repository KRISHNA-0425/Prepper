import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    question: { 
        type: String, 
        required: true 
    },
    difficulty: {
        type: String,
        default: 'medium'
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
});

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
    }
}, { timestamps: true });

const Interview = mongoose.model("Interview", interviewSchema);

export default Interview;
