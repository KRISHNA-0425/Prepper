/**
 * @file codingProblem.model.js
 * Standalone Mongoose model for coding challenges, test cases, and multi-language starter templates.
 */

import mongoose from 'mongoose';

const testCaseItemSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  explanation: { type: String, default: '' },
  weight: { type: Number, default: 1 }
}, { _id: false });

const exampleItemSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String, default: '' }
}, { _id: false });

const codingProblemSchema = new mongoose.Schema({
  problemId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
    index: true
  },
  category: {
    type: String,
    default: 'Problem Solving',
    index: true
  },
  constraints: {
    type: [String],
    default: []
  },
  examples: {
    type: [exampleItemSchema],
    default: []
  },
  supportedLanguages: {
    type: [String],
    default: ['c', 'cpp', 'python', 'java', 'javascript']
  },
  starterCode: {
    type: Map,
    of: String,
    default: {}
  },
  executionMode: {
    type: String,
    enum: ['stdin', 'function'],
    default: 'stdin'
  },
  timeLimit: {
    type: Number,
    default: 5.0 // in seconds
  },
  memoryLimit: {
    type: Number,
    default: 128000 // in KB
  },
  publicTestCases: {
    type: [testCaseItemSchema],
    default: []
  },
  hiddenTestCases: {
    type: [testCaseItemSchema],
    default: []
  },
  optimalTimeComplexity: {
    type: String,
    default: 'O(n)'
  },
  optimalSpaceComplexity: {
    type: String,
    default: 'O(1)'
  }
}, {
  timestamps: true
});

const CodingProblem = mongoose.model('CodingProblem', codingProblemSchema);
export default CodingProblem;
