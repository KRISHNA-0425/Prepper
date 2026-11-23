/**
 * @file atsAnalysis.model.js
 * Mongoose schema for Module 7: AI Resume-to-Job ATS & Application Intelligence.
 * Stores explainable scoring, dimension breakdowns, skill gaps, resume improvements,
 * and cross-module integration bridges.
 */

import mongoose from 'mongoose';

const dimensionScoreSchema = new mongoose.Schema({
  score: { type: Number, required: true, default: 0 },
  weight: { type: Number, required: true, default: 0 },
  maxScore: { type: Number, required: true, default: 100 },
  percentage: { type: Number, required: true, default: 0 },
  explanation: { type: String, default: '' },
}, { _id: false });

const skillGapSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  importance: { type: String, enum: ['mandatory', 'preferred'], default: 'mandatory' },
  whyItMatters: { type: String, default: '' },
  resumeEvidence: { type: String, default: 'None detected in resume' },
  missingEvidence: { type: String, default: '' },
  suggestedActivity: { type: String, default: '' },
  impactPriority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
}, { _id: false });

const strengthSchema = new mongoose.Schema({
  area: { type: String, required: true },
  evidence: { type: String, default: '' },
  relevanceToJob: { type: String, default: '' },
}, { _id: false });

const bulletImprovementSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  original: { type: String, required: true },
  suggested: { type: String, required: true },
  company: { type: String, default: '' },
  role: { type: String, default: '' },
  actionVerb: { type: String, default: '' },
  rationale: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { _id: false });

const projectImprovementSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  projectName: { type: String, required: true },
  originalDescription: { type: String, default: '' },
  suggestedDescription: { type: String, required: true },
  relevantKeywords: { type: [String], default: [] },
  rationale: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { _id: false });

const keywordRecommendationSchema = new mongoose.Schema({
  keyword: { type: String, required: true },
  placementSuggestion: { type: String, default: '' },
  context: { type: String, default: '' },
}, { _id: false });

const atsAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true,
    index: true,
  },
  jobDetails: {
    companyName: { type: String, default: '' },
    jobTitle: { type: String, required: true, trim: true },
    rawJobDescription: { type: String, required: true },
    experienceRequirement: { type: String, default: '' },
    seniorityLevel: { type: String, default: 'Mid-Level' },
    extractedRequirements: {
      requiredTechnicalSkills: { type: [String], default: [] },
      preferredTechnicalSkills: { type: [String], default: [] },
      programmingLanguages: { type: [String], default: [] },
      frameworks: { type: [String], default: [] },
      databases: { type: [String], default: [] },
      tools: { type: [String], default: [] },
      responsibilities: { type: [String], default: [] },
      educationRequirements: { type: [String], default: [] },
      certifications: { type: [String], default: [] },
      domainKnowledge: { type: [String], default: [] },
      keywords: { type: [String], default: [] },
    },
  },
  scoring: {
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    matchCategory: {
      type: String,
      enum: ['Excellent Match', 'Strong Match', 'Moderate Match', 'Weak Match', 'Low Match'],
      required: true,
    },
    isInsufficientData: { type: Boolean, default: false },
    dimensionScores: {
      requiredSkills: { type: dimensionScoreSchema, default: () => ({}) },
      preferredSkills: { type: dimensionScoreSchema, default: () => ({}) },
      experienceRelevance: { type: dimensionScoreSchema, default: () => ({}) },
      projectRelevance: { type: dimensionScoreSchema, default: () => ({}) },
      responsibilitiesAlignment: { type: dimensionScoreSchema, default: () => ({}) },
      keywordCoverage: { type: dimensionScoreSchema, default: () => ({}) },
      educationRelevance: { type: dimensionScoreSchema, default: () => ({}) },
    },
    scoringFormula: {
      type: String,
      default: 'Overall = 0.30*ReqSkills + 0.20*Exp + 0.15*Projects + 0.10*PrefSkills + 0.10*Resp + 0.10*Keywords + 0.05*Edu',
    },
    disclaimer: {
      type: String,
      default: 'This score represents estimated algorithmic alignment with the provided job description and does not guarantee ATS selection, interview shortlisting, or hiring outcomes.',
    },
  },
  skillGaps: {
    type: [skillGapSchema],
    default: [],
  },
  strengths: {
    type: [strengthSchema],
    default: [],
  },
  resumeImprovements: {
    professionalSummary: {
      original: { type: String, default: '' },
      suggested: { type: String, default: '' },
      rationale: { type: String, default: '' },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    },
    experienceBullets: {
      type: [bulletImprovementSchema],
      default: [],
    },
    projectImprovements: {
      type: [projectImprovementSchema],
      default: [],
    },
    keywordRecommendations: {
      type: [keywordRecommendationSchema],
      default: [],
    },
  },
  readinessReport: {
    summary: { type: String, default: '' },
    strongestAreas: { type: [String], default: [] },
    criticalGaps: { type: [String], default: [] },
    nextSteps: { type: [String], default: [] },
    interviewPrepRecommendations: { type: [String], default: [] },
  },
  integrationLinks: {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', default: null },
    recoveryPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecoveryPlan', default: null },
    companyProfileSlug: { type: String, default: null },
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'in_progress'],
    default: 'completed',
  },
  creditsCharged: {
    type: Number,
    default: 10,
  },
}, {
  timestamps: true,
});

atsAnalysisSchema.index({ userId: 1, createdAt: -1 });
atsAnalysisSchema.index({ userId: 1, resumeId: 1 });

const ATSAnalysis = mongoose.models.ATSAnalysis || mongoose.model('ATSAnalysis', atsAnalysisSchema);

export default ATSAnalysis;
