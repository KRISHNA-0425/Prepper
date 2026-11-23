import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema({
  testCaseIndex: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  input: { type: String, default: '' }, // Masked for hidden test cases
  expectedOutput: { type: String, default: '' }, // Masked for hidden test cases
  actualOutput: { type: String, default: '' },
  stdout: { type: String, default: '' },
  stderr: { type: String, default: '' },
  compileOutput: { type: String, default: '' },
  executionTimeMs: { type: Number, default: 0 },
  memoryKb: { type: Number, default: 0 },
  statusDescription: { type: String, default: 'Accepted' },
  error: { type: String, default: '' },
  isHidden: { type: Boolean, default: false }
}, { _id: false });

const codingEvaluationSchema = new mongoose.Schema({
  score: { type: Number, default: 0 },
  correctness: { type: Number, default: 0 },
  efficiency: { type: Number, default: 0 },
  readability: { type: Number, default: 0 },
  approach: { type: String, default: '' },
  timeComplexity: { type: String, default: 'O(n)' },
  spaceComplexity: { type: String, default: 'O(1)' },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
  overallFeedback: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
}, { _id: false });

const codingSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true,
    index: true
  },
  problemId: {
    type: String,
    required: true
  },
  problemIndex: {
    type: Number,
    default: 0
  },
  languageId: {
    type: Number,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  sourceCode: {
    type: String,
    required: true
  },
  runType: {
    type: String,
    enum: ['run', 'submit'],
    default: 'run'
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'completed'
  },
  passedTestCases: {
    type: Number,
    default: 0
  },
  totalTestCases: {
    type: Number,
    default: 0
  },
  testResults: {
    type: [testResultSchema],
    default: []
  },
  overallExecutionTimeMs: {
    type: Number,
    default: 0
  },
  overallMemoryKb: {
    type: Number,
    default: 0
  },
  candidateExplanation: {
    type: String,
    default: ''
  },
  evaluation: {
    type: codingEvaluationSchema,
    default: () => ({ status: 'pending' })
  }
}, { timestamps: true });

const CodingSubmission = mongoose.model('CodingSubmission', codingSubmissionSchema);

export default CodingSubmission;
