/**
 * @file ats.controller.js
 * Controller for Module 7: AI Resume-to-Job ATS & Application Intelligence.
 * Exposes endpoints for resume upload, ATS job matching, report retrieval, and cross-module bridges.
 */

import Resume from '../models/resume.model.js';
import ATSAnalysis from '../models/atsAnalysis.model.js';
import {
  processAndSaveResume,
  runAtsAnalysis,
  getAtsAnalysisById,
  getUserAtsAnalyses,
  deleteAtsAnalysis,
  updateImprovementStatus,
  ATS_ANALYSIS_CREDIT_COST,
} from '../services/ats/atsReport.service.js';

/**
 * Uploads and extracts a candidate resume (PDF, DOCX, TXT).
 * Free operation (0 credits).
 */
export const uploadResumeHandler = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No resume document provided. Please attach a file.' });
    }

    const resume = await processAndSaveResume({
      userId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    return res.status(201).json({
      success: true,
      message: 'Resume parsed and profile extracted successfully',
      resume: {
        _id: resume._id,
        originalFileName: resume.originalFileName,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        experienceLevel: resume.experienceLevel,
        totalYearsExperience: resume.totalYearsExperience,
        structuredData: resume.structuredData,
        createdAt: resume.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in uploadResumeHandler:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to upload and extract resume',
    });
  }
};

/**
 * Runs ATS analysis comparing a saved resume against a job description.
 * Deducts 10 credits atomically.
 */
export const analyzeAtsHandler = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { resumeId, jobTitle, rawJobDescription, companyName } = req.body;

    if (!resumeId) {
      return res.status(400).json({ success: false, message: 'resumeId is required' });
    }
    if (!jobTitle || !jobTitle.trim()) {
      return res.status(400).json({ success: false, message: 'jobTitle is required' });
    }
    if (!rawJobDescription || !rawJobDescription.trim()) {
      return res.status(400).json({ success: false, message: 'rawJobDescription is required' });
    }

    const analysis = await runAtsAnalysis({
      userId,
      resumeId,
      jobTitle: jobTitle.trim(),
      rawJobDescription: rawJobDescription.trim(),
      companyName: (companyName || '').trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'ATS analysis completed successfully',
      analysis,
    });
  } catch (error) {
    console.error('Error in analyzeAtsHandler:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to analyze job alignment',
    });
  }
};

/**
 * Convenience endpoint: Uploads resume AND runs ATS analysis in a single request.
 */
export const analyzeDirectHandler = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No resume document provided.' });
    }

    const { jobTitle, rawJobDescription, companyName } = req.body;
    if (!jobTitle || !jobTitle.trim()) {
      return res.status(400).json({ success: false, message: 'jobTitle is required' });
    }
    if (!rawJobDescription || !rawJobDescription.trim()) {
      return res.status(400).json({ success: false, message: 'rawJobDescription is required' });
    }

    // 1. Process resume
    const resume = await processAndSaveResume({
      userId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    // 2. Run analysis
    const analysis = await runAtsAnalysis({
      userId,
      resumeId: resume._id,
      jobTitle: jobTitle.trim(),
      rawJobDescription: rawJobDescription.trim(),
      companyName: (companyName || '').trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Direct ATS analysis completed successfully',
      resumeId: resume._id,
      analysis,
    });
  } catch (error) {
    console.error('Error in analyzeDirectHandler:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to process direct ATS analysis',
    });
  }
};

/**
 * Retrieves a single ATS analysis report by ID.
 * Enforces anti-IDOR ownership check.
 */
export const getAtsAnalysisHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const analysis = await getAtsAnalysisById(id, userId);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'ATS analysis report not found' });
    }

    return res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch ATS analysis report',
    });
  }
};

/**
 * Lists user's past ATS analyses with pagination.
 */
export const getUserAnalysesHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await getUserAtsAnalyses(userId, req.query);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve analyses',
    });
  }
};

/**
 * Deletes an ATS analysis report.
 */
export const deleteAtsAnalysisHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    await deleteAtsAnalysis(id, userId);

    return res.status(200).json({
      success: true,
      message: 'ATS analysis report deleted successfully',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete ATS analysis',
    });
  }
};

/**
 * Updates status of an individual improvement suggestion (accepted, rejected, pending).
 */
export const updateImprovementStatusHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { itemType, itemId, status } = req.body;

    if (!itemType || !status) {
      return res.status(400).json({ success: false, message: 'itemType and status are required' });
    }

    const updated = await updateImprovementStatus({
      analysisId: id,
      userId,
      itemType,
      itemId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: `Improvement marked as ${status}`,
      resumeImprovements: updated.resumeImprovements,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update improvement status',
    });
  }
};

/**
 * Lists candidate's uploaded resumes.
 */
export const getUserResumesHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const resumes = await Resume.find({ userId })
      .select('originalFileName fileType fileSize experienceLevel totalYearsExperience createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      resumes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch resumes',
    });
  }
};

/**
 * Retrieves a single resume by ID.
 */
export const getResumeByIdHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    return res.status(200).json({
      success: true,
      resume,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch resume',
    });
  }
};

/**
 * Bridge endpoint: Formats ATS analysis data into Module 1 Interview setup parameters.
 */
export const bridgeToInterviewHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const { analysisId } = req.body;

    const analysis = await getAtsAnalysisById(analysisId, userId);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'ATS analysis not found' });
    }

    const requiredSkills = analysis.jobDetails?.extractedRequirements?.requiredTechnicalSkills || [];

    return res.status(200).json({
      success: true,
      interviewSetupData: {
        role: analysis.jobDetails?.jobTitle || 'Software Engineer',
        experience: analysis.jobDetails?.seniorityLevel || 'Mid-Level',
        mode: 'Technical',
        requiredSkills,
        targetCompany: analysis.jobDetails?.companyName || '',
        jobDescription: analysis.jobDetails?.rawJobDescription || '',
        sourceAtsAnalysisId: analysis._id,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to bridge to interview setup',
    });
  }
};

/**
 * Bridge endpoint: Formats ATS missing skill gaps into Module 5 Recovery Plan creation parameters.
 */
export const bridgeToRecoveryPlanHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const { analysisId } = req.body;

    const analysis = await getAtsAnalysisById(analysisId, userId);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'ATS analysis not found' });
    }

    const missingSkills = (analysis.skillGaps || []).map((g) => ({
      skill: g.skill,
      importance: g.importance,
      whyItMatters: g.whyItMatters,
      suggestedActivity: g.suggestedActivity,
    }));

    return res.status(200).json({
      success: true,
      recoveryPlanSetupData: {
        targetRole: `${analysis.jobDetails?.jobTitle}${analysis.jobDetails?.companyName ? ' at ' + analysis.jobDetails.companyName : ''}`,
        sourceType: 'ats_analysis',
        sourceDocumentId: analysis._id,
        weaknesses: missingSkills,
        overallScore: analysis.scoring?.overallScore || 50,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to bridge to recovery plan',
    });
  }
};
