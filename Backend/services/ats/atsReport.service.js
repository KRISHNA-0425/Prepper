/**
 * @file atsReport.service.js
 * Master Orchestrator and Lifecycle Manager for Module 7: AI Resume-to-Job ATS Intelligence.
 * Handles credit safety, multi-engine matching, report persistence, and cross-module bridges.
 */

import Resume from '../../models/resume.model.js';
import ATSAnalysis from '../../models/atsAnalysis.model.js';
import User from '../../models/user.model.js';
import {
  checkUserCredits as defaultCheckCredits,
  deductInterviewCredits as defaultDeductCredits,
  refundInterviewCredits as defaultRefundCredits,
} from '../credit.service.js';
import { parseResumeDocument } from './atsDocumentParser.service.js';
import { extractResumeProfile } from './atsResumeExtractor.service.js';
import { analyzeJobDescription } from './atsJobAnalyzer.service.js';
import { matchResumeToJob } from './atsMatcher.service.js';
import { generateResumeImprovements } from './atsResumeImprovement.service.js';

export const ATS_ANALYSIS_CREDIT_COST = Number(process.env.ATS_CREDIT_COST) || 10;

/**
 * Uploads, parses, and persists a resume document.
 * Free operation (0 credits).
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {Buffer} params.buffer
 * @param {string} params.originalName
 * @param {string} [params.mimeType]
 * @param {object} [options={}]
 * @returns {Promise<object>} Persisted Resume document
 */
export const processAndSaveResume = async ({
  userId,
  buffer,
  originalName,
  mimeType,
  options = {},
}) => {
  if (!userId) throw new Error('User ID is required');

  const { rawText, fileType, sanitizedName, contentHash, sizeBytes } = await parseResumeDocument({
    buffer,
    originalName,
    mimeType,
  });

  // Check if identical resume content was already uploaded by this user
  let resume = await Resume.findOne({ userId, contentHash });
  if (resume) {
    return resume;
  }

  // Extract structured profile
  const structuredData = await extractResumeProfile(rawText, options);

  resume = new Resume({
    userId,
    originalFileName: sanitizedName,
    fileType,
    fileSize: sizeBytes,
    contentHash,
    rawText,
    structuredData,
    experienceLevel: structuredData.experienceLevel || 'Fresher (0 years)',
    totalYearsExperience: structuredData.totalYearsExperience || 0,
    isExtractionComplete: true,
  });

  await resume.save();
  return resume;
};

/**
 * Runs ATS analysis comparing a saved resume against a job description.
 * Deducts 10 credits atomically with refund rollback on error.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.resumeId
 * @param {string} params.jobTitle
 * @param {string} params.rawJobDescription
 * @param {string} [params.companyName='']
 * @param {object} [options={}]
 * @returns {Promise<object>} Persisted ATSAnalysis document
 */
export const runAtsAnalysis = async ({
  userId,
  resumeId,
  jobTitle,
  rawJobDescription,
  companyName = '',
  options = {},
}) => {
  if (!userId) throw new Error('User ID is required');
  if (!resumeId) throw new Error('Resume ID is required');
  if (!rawJobDescription || !rawJobDescription.trim()) {
    throw new Error('Job description is required for ATS analysis');
  }

  // 1. Verify candidate owns the resume
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    const error = new Error('Resume not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  // 2. Financial verification: Check user credits
  const checkCredits = options.checkUserCredits || defaultCheckCredits;
  const deductCredits = options.deductInterviewCredits || defaultDeductCredits;
  const refundCredits = options.refundInterviewCredits || defaultRefundCredits;

  const creditCheck = await checkCredits(userId, User, ATS_ANALYSIS_CREDIT_COST);
  if (!creditCheck.hasCredits) {
    const error = new Error(creditCheck.message || 'Insufficient credits to run ATS analysis');
    error.statusCode = creditCheck.statusCode || 400;
    throw error;
  }

  // 3. Atomically deduct credits
  const deduction = await deductCredits(userId, User, ATS_ANALYSIS_CREDIT_COST);
  if (!deduction.success) {
    const error = new Error(deduction.message || 'Failed to deduct credits for ATS analysis');
    error.statusCode = deduction.statusCode || 400;
    throw error;
  }

  let creditsDeducted = true;

  try {
    // 4. Analyze Job Description
    const jobProfile = await analyzeJobDescription({
      rawJobDescription,
      jobTitle,
      companyName,
      options,
    });

    // 5. Run hybrid ATS match analysis
    const matchResults = await matchResumeToJob({
      resume,
      jobDescription: jobProfile,
      options,
    });

    // 6. Generate grounded resume improvements
    const improvements = await generateResumeImprovements({
      resume,
      jobDescription: jobProfile,
      options,
    });

    // 7. Persist ATS Analysis document
    const analysis = new ATSAnalysis({
      userId,
      resumeId: resume._id,
      jobDetails: {
        companyName: jobProfile.companyName,
        jobTitle: jobProfile.jobTitle,
        rawJobDescription,
        experienceRequirement: jobProfile.experienceRequirement,
        seniorityLevel: jobProfile.seniorityLevel,
        extractedRequirements: jobProfile.extractedRequirements,
      },
      scoring: {
        overallScore: matchResults.overallScore,
        matchCategory: matchResults.matchCategory,
        isInsufficientData: matchResults.isInsufficientData,
        dimensionScores: matchResults.dimensionScores,
        scoringFormula: matchResults.scoringFormula,
      },
      skillGaps: matchResults.skillGaps,
      strengths: matchResults.strengths,
      resumeImprovements: improvements,
      readinessReport: matchResults.readinessReport,
      status: 'completed',
      creditsCharged: ATS_ANALYSIS_CREDIT_COST,
    });

    await analysis.save();
    return analysis;
  } catch (error) {
    // Safe refund rollback on processing or persistence failure
    if (creditsDeducted) {
      try {
        await refundCredits(userId, User, ATS_ANALYSIS_CREDIT_COST);
      } catch (refundErr) {
        console.error('Failed to refund credits after ATS analysis error:', refundErr);
      }
    }
    throw error;
  }
};

/**
 * Retrieves a single ATS analysis by ID with strict ownership validation (anti-IDOR).
 * @param {string} analysisId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export const getAtsAnalysisById = async (analysisId, userId) => {
  if (!analysisId || !userId) throw new Error('analysisId and userId are required');

  const analysis = await ATSAnalysis.findById(analysisId).populate('resumeId', 'originalFileName fileType createdAt');
  if (!analysis) return null;

  if (analysis.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized: You do not own this ATS analysis report');
    error.statusCode = 403;
    throw error;
  }

  return analysis;
};

/**
 * Lists user's past ATS analyses with pagination and optional category filter.
 * @param {string} userId
 * @param {object} [query={}]
 * @returns {Promise<{ analyses: Array, total: number, page: number, totalPages: number }>}
 */
export const getUserAtsAnalyses = async (userId, query = {}) => {
  if (!userId) throw new Error('userId is required');

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { userId };
  if (query.matchCategory) {
    filter['scoring.matchCategory'] = query.matchCategory;
  }

  const [analyses, total] = await Promise.all([
    ATSAnalysis.find(filter)
      .populate('resumeId', 'originalFileName fileType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ATSAnalysis.countDocuments(filter),
  ]);

  return {
    analyses,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Deletes an ATS analysis with strict ownership verification.
 * @param {string} analysisId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export const deleteAtsAnalysis = async (analysisId, userId) => {
  const analysis = await ATSAnalysis.findById(analysisId);
  if (!analysis) {
    const error = new Error('ATS analysis not found');
    error.statusCode = 404;
    throw error;
  }

  if (analysis.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized: You do not own this ATS analysis');
    error.statusCode = 403;
    throw error;
  }

  await ATSAnalysis.findByIdAndDelete(analysisId);
  return true;
};

/**
 * Updates status of an improvement suggestion (accepted, rejected, pending).
 * @param {object} params
 * @param {string} params.analysisId
 * @param {string} params.userId
 * @param {string} params.itemType - 'summary' | 'bullet' | 'project'
 * @param {string} [params.itemId] - ID of bullet or project
 * @param {string} params.status - 'accepted' | 'rejected' | 'pending'
 * @returns {Promise<object>}
 */
export const updateImprovementStatus = async ({
  analysisId,
  userId,
  itemType,
  itemId,
  status,
}) => {
  const analysis = await getAtsAnalysisById(analysisId, userId);
  if (!['accepted', 'rejected', 'pending'].includes(status)) {
    throw new Error('Invalid status. Must be accepted, rejected, or pending.');
  }

  if (itemType === 'summary') {
    analysis.resumeImprovements.professionalSummary.status = status;
  } else if (itemType === 'bullet') {
    const bullet = analysis.resumeImprovements.experienceBullets.find((b) => b.id === itemId || b._id?.toString() === itemId);
    if (bullet) bullet.status = status;
  } else if (itemType === 'project') {
    const proj = analysis.resumeImprovements.projectImprovements.find((p) => p.id === itemId || p._id?.toString() === itemId);
    if (proj) proj.status = status;
  }

  await analysis.save();
  return analysis;
};
