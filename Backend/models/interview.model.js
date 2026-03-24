import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
    // Changed from 'questions' to 'question' to match controller logic
    question: { 
        type: String, 
        required: true 
    },
    difficulty: String,
    timeLimit: Number,
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
})

const interviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Matches 'role' in your controller
    role: { 
        type: String, 
        required: true 
    },
    // Fixed spelling: experince -> experience
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
    }
}, { timestamps: true })

const Interview = mongoose.model("Interview", interviewSchema);

export default Interview