import {
  getAvailableCompanies,
  getOrGenerateCompanyProfile,
  recommendInterviewStructure,
} from '../services/companySimulation/companyIntelligence.service.js';
import {
  createCompanyInterviewSession,
  getCompanyInterviewSession,
  submitCompanyAnswer,
  finishCompanyInterview,
  getUserCompanySimulations,
} from '../services/companySimulation/companyInterview.service.js';
import { findCuratedProfile } from '../services/companySimulation/curatedCompanyProfiles.js';
import CompanyProfile from '../models/companyProfile.model.js';

/**
 * Retrieves all available company profiles (curated + cached DB entries)
 * GET /api/company-interview/companies
 */
export const getCompanies = async (req, res) => {
  try {
    const companies = await getAvailableCompanies();
    return res.status(200).json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch company list',
    });
  }
};

/**
 * Retrieves a specific company profile by slug or name
 * GET /api/company-interview/companies/:slug
 */
export const getCompanyBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const cleanSlug = (slug || '').toLowerCase().trim();

    // 1. Check curated
    const curated = findCuratedProfile(cleanSlug);
    if (curated) {
      return res.status(200).json({ success: true, company: curated });
    }

    // 2. Check DB
    const profile = await CompanyProfile.findOne({ slug: cleanSlug }).lean();
    if (profile) {
      return res.status(200).json({ success: true, company: profile });
    }

    return res.status(404).json({
      success: false,
      message: `Company '${slug}' not found in registry`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching company profile',
    });
  }
};

/**
 * Generates or retrieves intelligence for a custom company on demand
 * POST /api/company-interview/intelligence
 */
export const getCompanyIntelligence = async (req, res) => {
  try {
    const userId = req.userId;
    const { companyName, targetRole, jobDescription } = req.body;

    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'companyName is required',
      });
    }

    const profile = await getOrGenerateCompanyProfile({
      companyName: companyName.trim(),
      targetRole: targetRole || 'Software Engineer',
      jobDescription: jobDescription || '',
      userId,
    });

    return res.status(200).json({
      success: true,
      company: profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to synthesize company intelligence',
    });
  }
};

/**
 * Recommends an interview round and structure based on company, role, and experience
 * POST /api/company-interview/recommend-structure
 */
export const recommendStructure = async (req, res) => {
  try {
    const { companyName, targetRole, experienceLevel } = req.body;

    let companyProfile = null;
    if (companyName) {
      companyProfile = findCuratedProfile(companyName);
      if (!companyProfile) {
        companyProfile = await CompanyProfile.findOne({
          slug: companyName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
        }).lean();
      }
    }

    const recommendation = recommendInterviewStructure({
      companyProfile,
      targetRole: targetRole || 'Software Engineer',
      experienceLevel: experienceLevel || 'Intermediate',
    });

    return res.status(200).json({
      success: true,
      recommendation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate interview recommendation',
    });
  }
};

/**
 * Initializes a new company-specific interview session with atomic credit deduction
 * POST /api/company-interview/create-session
 */
export const createSession = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      companyName,
      targetDesignation,
      experienceLevel,
      interviewRound,
      requiredSkills,
      jobDescription,
      selectedQuestionCount,
    } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: 'companyName is required to start a company simulation',
      });
    }

    const { interview, companyProfile, interviewerGreeting } = await createCompanyInterviewSession({
      userId,
      companyName: companyName.trim(),
      targetDesignation: targetDesignation || 'Software Engineer',
      experienceLevel: experienceLevel || 'Intermediate',
      interviewRound: interviewRound || 'technical_round_1',
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      jobDescription: jobDescription || '',
      selectedQuestionCount: selectedQuestionCount ? Number(selectedQuestionCount) : 5,
    });

    return res.status(201).json({
      success: true,
      message: 'Company interview simulation initialized',
      interviewId: interview._id,
      interview,
      companyProfile,
      interviewerGreeting,
    });
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to create company interview session',
    });
  }
};

/**
 * Retrieves a company interview session with anti-IDOR verification
 * GET /api/company-interview/session/:id
 */
export const getSession = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const interview = await getCompanyInterviewSession(id, userId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Company interview session not found',
      });
    }

    return res.status(200).json({
      success: true,
      interview,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error fetching interview session',
    });
  }
};

/**
 * Submits an answer to a question in the company interview
 * POST /api/company-interview/submit-answer
 */
export const submitAnswer = async (req, res) => {
  try {
    const userId = req.userId;
    const { interviewId, questionIndex, answer, timeTaken } = req.body;

    if (!interviewId || questionIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'interviewId and questionIndex are required',
      });
    }

    const result = await submitCompanyAnswer({
      interviewId,
      questionIndex,
      answer,
      timeTaken: Number(timeTaken) || 0,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Answer submitted and evaluated',
      evaluatedQuestion: result.evaluatedQuestion,
      interview: result.interview,
      isLastQuestion: result.isLastQuestion,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to submit answer',
    });
  }
};

/**
 * Concludes the company interview and compiles role readiness report
 * POST /api/company-interview/finish
 */
export const finishSession = async (req, res) => {
  try {
    const userId = req.userId;
    const { interviewId } = req.body;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: 'interviewId is required to finalize simulation',
      });
    }

    const finalizedInterview = await finishCompanyInterview(interviewId, userId);

    return res.status(200).json({
      success: true,
      message: 'Company interview simulation completed',
      interview: finalizedInterview,
      readinessAssessment: finalizedInterview.companySimulation?.readinessAssessment,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to finish interview simulation',
    });
  }
};

/**
 * Retrieves candidate's past company simulations
 * GET /api/company-interview/history
 */
export const getMyCompanySimulations = async (req, res) => {
  try {
    const userId = req.userId;
    const simulations = await getUserCompanySimulations(userId);

    return res.status(200).json({
      success: true,
      count: simulations.length,
      simulations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch company simulation history',
    });
  }
};
