/**
 * @file crossExamination.controller.js
 * Controller for Cross-Examination Session Lifecycle and Backend APIs.
 * Enforces authenticated ownership, deterministic progression state machines,
 * privacy masking of internal evaluation metadata, and safe failure handling.
 */

import mongoose from 'mongoose';
import CrossExaminationSession from '../models/crossExaminationSession.model.js';
import { extractResumeClaims } from '../services/resumeIntelligence.service.js';
import { analyzeProjectClaims } from '../services/projectClaimAnalysis.service.js';
import { generateCrossExaminationQuestions, ENGINE_LIMITS } from '../services/questionEngine.service.js';
import {
  SESSION_STATUSES,
  validateProjectProfileContract,
  hashSourceText,
} from '../contracts/crossExamination.contracts.js';

/**
 * Sanitizes a question object for candidate-facing payloads.
 * Strips internal evaluation metadata (expectedEvidence, rationale, followUpGuidance)
 * during active interviews.
 *
 * @param {object} question
 * @param {boolean} isCompleted
 * @returns {object}
 */
export const sanitizeQuestionForCandidate = (question, isCompleted = false) => {
  if (!question) return null;
  const qObj = typeof question.toObject === 'function' ? question.toObject() : { ...question };

  if (!isCompleted) {
    delete qObj.rationale;
    delete qObj.expectedEvidence;
    delete qObj.followUpGuidance;
  }

  return qObj;
};

/**
 * Sanitizes an entire session document for candidate-facing response.
 *
 * @param {object} session
 * @returns {object}
 */
export const sanitizeSessionForCandidate = (session) => {
  if (!session) return null;
  const sObj = typeof session.toObject === 'function' ? session.toObject() : { ...session };
  const isCompleted = sObj.status === SESSION_STATUSES.COMPLETED;

  const totalQuestions = Array.isArray(sObj.questions) ? sObj.questions.length : 0;
  const answeredCount = Array.isArray(sObj.answers) ? sObj.answers.length : 0;

  const activeQuestion = Array.isArray(sObj.questions)
    ? sObj.questions.find((q) => q.status === 'current') || null
    : null;

  const sanitizedQuestions = Array.isArray(sObj.questions)
    ? sObj.questions.map((q) => sanitizeQuestionForCandidate(q, isCompleted))
    : [];

  return {
    sessionId: sObj._id,
    sessionTitle: sObj.sessionTitle,
    targetRole: sObj.targetRole,
    targetDomain: sObj.targetDomain,
    status: sObj.status,
    createdAt: sObj.createdAt,
    updatedAt: sObj.updatedAt,
    progress: {
      totalQuestions,
      answeredCount,
      currentQuestionIndex: activeQuestion ? activeQuestion.order : null,
      isFinished: answeredCount >= totalQuestions && totalQuestions > 0,
    },
    currentQuestion: activeQuestion ? sanitizeQuestionForCandidate(activeQuestion, isCompleted) : null,
    questions: sanitizedQuestions,
    answersCount: answeredCount,
    report: isCompleted ? sObj.report : null,
  };
};

/**
 * Factory creating cross-examination controllers with configurable dependencies.
 * Allows pure in-memory deterministic testing without external database or AI requirements.
 */
export const createCrossExaminationController = ({
  SessionModel = CrossExaminationSession,
  extractClaimsFn = extractResumeClaims,
  analyzeBlueprintFn = analyzeProjectClaims,
  generateQuestionsFn = generateCrossExaminationQuestions,
} = {}) => {
  /**
   * POST /api/cross-examination/sessions
   * Creates an authenticated, initialized cross-examination session.
   */
  const createSession = async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const {
        resumeText,
        crossExaminationProfile,
        targetRole: rawRole,
        targetDomain: rawDomain,
        questionCount: rawCount,
      } = req.body || {};

      // 1. Validate role and domain
      const targetRole = typeof rawRole === 'string' ? rawRole.trim().slice(0, 120) : '';
      const targetDomain = typeof rawDomain === 'string' ? rawDomain.trim().slice(0, 120) : 'General Software Engineering';

      // 2. Validate questionCount
      let questionCount = ENGINE_LIMITS.DEFAULT_QUESTION_COUNT;
      if (rawCount !== undefined) {
        const parsed = parseInt(rawCount, 10);
        if (isNaN(parsed) || parsed < ENGINE_LIMITS.MIN_QUESTION_COUNT || parsed > ENGINE_LIMITS.MAX_QUESTION_COUNT) {
          return res.status(400).json({
            message: `questionCount must be an integer between ${ENGINE_LIMITS.MIN_QUESTION_COUNT} and ${ENGINE_LIMITS.MAX_QUESTION_COUNT}`,
          });
        }
        questionCount = parsed;
      }

      // 3. Resolve or extract profile
      let profile = crossExaminationProfile;
      let resumeExcerpt = '';
      let resumeHash = '';

      if (!profile) {
        if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
          return res.status(400).json({
            message: 'A valid resumeText (min 50 characters) or crossExaminationProfile is required to create a session',
          });
        }

        if (resumeText.length > 30000) {
          return res.status(400).json({
            message: 'resumeText exceeds maximum allowed length of 30,000 characters',
          });
        }

        // Execute resume extraction pipeline
        const extraction = await extractClaimsFn({ resumeText });
        profile = {
          projects: extraction.projects || [],
          standaloneClaims: extraction.standaloneClaims || [],
          allClaims: extraction.allClaims || [],
          resumeHash: extraction.resumeHash || hashSourceText(resumeText),
          provenanceStats: extraction.provenanceStats,
        };
        resumeExcerpt = resumeText.slice(0, 3000);
        resumeHash = profile.resumeHash;
      } else {
        // Validate client-provided crossExaminationProfile
        if (typeof profile !== 'object' || !Array.isArray(profile.projects) || profile.projects.length === 0) {
          return res.status(400).json({
            message: 'crossExaminationProfile must be an object containing at least one project in the projects array',
          });
        }

        for (let i = 0; i < profile.projects.length; i++) {
          const val = validateProjectProfileContract(profile.projects[i]);
          if (!val.isValid) {
            return res.status(400).json({
              message: `Invalid project profile at index ${i}: ${val.errors.join('; ')}`,
            });
          }
        }

        resumeExcerpt = typeof profile.resumeExcerpt === 'string' ? profile.resumeExcerpt.slice(0, 3000) : '';
        resumeHash = profile.resumeHash || '';
      }

      const effectiveRole = targetRole || (profile.role || 'Software Engineer');

      // 4. Generate project examination blueprint
      const blueprint = analyzeBlueprintFn({ crossExaminationProfile: profile });
      if (!blueprint || !Array.isArray(blueprint.allOpportunitiesSorted) || blueprint.allOpportunitiesSorted.length === 0) {
        return res.status(422).json({
          message: 'Unable to derive examination opportunities from the provided resume/project claims',
          warnings: blueprint?.warnings || [],
        });
      }

      // 5. Generate and validate questions
      const questionGenResult = await generateQuestionsFn({
        examinationBlueprint: blueprint,
        questionCount,
      });

      if (!questionGenResult || !questionGenResult.success || !Array.isArray(questionGenResult.questions) || questionGenResult.questions.length === 0) {
        return res.status(502).json({
          message: 'Failed to generate cross-examination questions',
          error: questionGenResult?.error || 'Question generation service failure',
          warnings: questionGenResult?.warnings || [],
        });
      }

      // 6. Initialize question statuses (Question 1 is 'current', rest 'pending')
      const initializedQuestions = questionGenResult.questions.map((q, idx) => ({
        ...q,
        order: idx + 1,
        status: idx === 0 ? 'current' : 'pending',
      }));

      // 7. Persist session with explicit ownership
      const sessionInstance = new SessionModel({
        userId,
        sessionTitle: `${effectiveRole} Cross-Examination`,
        targetRole: effectiveRole,
        targetDomain,
        status: SESSION_STATUSES.AWAITING_ANSWER,
        sourceProvenance: {
          resumeTextExcerpt: resumeExcerpt,
          resumeHash,
          extractedAt: new Date(),
        },
        projects: (profile.projects || []).map((p) => ({
          title: p.title,
          description: p.description || '',
          candidateRole: p.candidateRole || '',
          technologies: p.technologies || [],
          claims: (p.claims || []).map((c) => ({
            category: c.category,
            statement: c.statement,
            sourceExcerpt: c.sourceExcerpt || '',
            provenanceType: c.provenanceType,
            confidence: c.confidence,
            verificationStatus: c.verificationStatus,
          })),
        })),
        questions: initializedQuestions,
        answers: [],
      });

      const savedSession = await sessionInstance.save();

      // 8. Return candidate-sanitized payload
      return res.status(201).json({
        message: 'Cross-examination session created successfully',
        session: sanitizeSessionForCandidate(savedSession),
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Internal server error creating cross-examination session',
        error: err.message,
      });
    }
  };

  /**
   * GET /api/cross-examination/sessions/:sessionId
   * Retrieves an owned session by ID, masking evaluation details for active sessions.
   */
  const getSession = async (req, res) => {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      // Resource-level authorization: match ID and authenticated owner
      const session = await SessionModel.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      return res.status(200).json({
        session: sanitizeSessionForCandidate(session),
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Internal server error retrieving session',
        error: err.message,
      });
    }
  };

  /**
   * GET /api/cross-examination/sessions
   * Lists the authenticated user's sessions.
   */
  const listSessions = async (req, res) => {
    try {
      const userId = req.userId;
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

      const sessions = await SessionModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id sessionTitle targetRole targetDomain status questions answers createdAt updatedAt');

      const summaries = sessions.map((s) => ({
        sessionId: s._id,
        sessionTitle: s.sessionTitle,
        targetRole: s.targetRole,
        targetDomain: s.targetDomain,
        status: s.status,
        totalQuestions: Array.isArray(s.questions) ? s.questions.length : 0,
        answeredCount: Array.isArray(s.answers) ? s.answers.length : 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));

      return res.status(200).json({
        sessions: summaries,
        count: summaries.length,
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Internal server error listing sessions',
        error: err.message,
      });
    }
  };

  /**
   * POST /api/cross-examination/sessions/:sessionId/answers
   * Submits candidate answer for the active question.
   */
  const submitAnswer = async (req, res) => {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      // Resource-level authorization: match ID and authenticated owner
      const session = await SessionModel.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      // Check session status: prevent answering completed or abandoned sessions
      if (
        session.status === SESSION_STATUSES.COMPLETED ||
        session.status === SESSION_STATUSES.FAILED ||
        session.status === SESSION_STATUSES.ABANDONED
      ) {
        return res.status(409).json({
          message: `Cannot submit answer to a session with status '${session.status}'`,
        });
      }

      const { questionId, rawTranscript, timeTaken, autoAdvance } = req.body || {};

      // Validate rawTranscript
      if (typeof rawTranscript !== 'string' || !rawTranscript.trim()) {
        return res.status(400).json({
          message: 'rawTranscript is required and must be a non-empty string',
        });
      }

      const trimmedTranscript = rawTranscript.trim();
      if (trimmedTranscript.length > 5000) {
        return res.status(400).json({
          message: 'rawTranscript exceeds maximum allowed length of 5000 characters',
        });
      }

      // Validate questionId
      if (!questionId || typeof questionId !== 'string') {
        return res.status(400).json({ message: 'questionId is required' });
      }

      const activeQuestion = typeof session.getActiveQuestion === 'function'
        ? session.getActiveQuestion()
        : session.questions.find((q) => q.status === 'current');

      if (!activeQuestion) {
        return res.status(400).json({
          message: 'No active question currently awaiting an answer in this session',
        });
      }

      if (activeQuestion.questionId !== questionId) {
        return res.status(400).json({
          message: `Cannot submit answer for question '${questionId}'. The active question is '${activeQuestion.questionId}'`,
        });
      }

      // Check for duplicate answer
      const isAlreadyAnswered = session.answers.some((a) => a.questionId === questionId);
      if (isAlreadyAnswered) {
        return res.status(409).json({
          message: `Answer for question '${questionId}' has already been submitted`,
        });
      }

      // Record answer
      const recordedAnswer = session.recordAnswer({
        questionId,
        rawTranscript: trimmedTranscript,
        timeTaken: typeof timeTaken === 'number' && timeTaken >= 0 ? timeTaken : 0,
      });

      // Handle optional autoAdvance
      let nextQuestion = null;
      if (autoAdvance === true) {
        nextQuestion = session.advanceQuestion();
      } else {
        // Transition session to ACTIVE awaiting next advance
        if (session.status === SESSION_STATUSES.AWAITING_ANSWER) {
          session.status = SESSION_STATUSES.ACTIVE;
        }
      }

      await session.save();

      const totalQuestions = session.questions.length;
      const answeredCount = session.answers.length;

      return res.status(200).json({
        message: 'Answer submitted successfully',
        answer: {
          answerId: recordedAnswer.answerId,
          questionId: recordedAnswer.questionId,
          submittedAt: recordedAnswer.submittedAt,
        },
        progress: {
          totalQuestions,
          answeredCount,
          currentQuestionIndex: nextQuestion ? nextQuestion.order : null,
          isFinished: answeredCount >= totalQuestions,
        },
        nextQuestion: nextQuestion ? sanitizeQuestionForCandidate(nextQuestion, false) : null,
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Internal server error submitting answer',
        error: err.message,
      });
    }
  };

  /**
   * POST /api/cross-examination/sessions/:sessionId/advance
   * Advances the session to the next pending question.
   */
  const advanceQuestion = async (req, res) => {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      // Resource-level authorization: match ID and authenticated owner
      const session = await SessionModel.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      if (session.status === SESSION_STATUSES.COMPLETED) {
        return res.status(409).json({ message: 'Cannot advance a completed session' });
      }

      // Enforce that any active question is already answered before advancing
      const activeQuestion = typeof session.getActiveQuestion === 'function'
        ? session.getActiveQuestion()
        : session.questions.find((q) => q.status === 'current');

      if (activeQuestion) {
        const isAnswered = session.answers.some((a) => a.questionId === activeQuestion.questionId);
        if (!isAnswered) {
          return res.status(400).json({
            message: `Cannot advance while current question '${activeQuestion.questionId}' is unanswered`,
          });
        }
      }

      // Advance to next pending question
      const nextQuestion = session.advanceQuestion();

      if (!nextQuestion) {
        // No more pending questions: all questions answered
        session.status = SESSION_STATUSES.ACTIVE;
        await session.save();

        return res.status(200).json({
          message: 'All questions in this session have been answered',
          isFinished: true,
          progress: {
            totalQuestions: session.questions.length,
            answeredCount: session.answers.length,
            currentQuestionIndex: null,
            isFinished: true,
          },
          currentQuestion: null,
        });
      }

      await session.save();

      return res.status(200).json({
        message: 'Advanced to next question',
        progress: {
          totalQuestions: session.questions.length,
          answeredCount: session.answers.length,
          currentQuestionIndex: nextQuestion.order,
          isFinished: false,
        },
        currentQuestion: sanitizeQuestionForCandidate(nextQuestion, false),
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Internal server error advancing question',
        error: err.message,
      });
    }
  };

  /**
   * POST /api/cross-examination/sessions/:sessionId/complete
   * Marks session as completed and prepares it for evaluation.
   */
  const completeSession = async (req, res) => {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      // Resource-level authorization: match ID and authenticated owner
      const session = await SessionModel.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      if (session.status === SESSION_STATUSES.COMPLETED) {
        return res.status(400).json({ message: 'Session is already completed' });
      }

      if (!session.canTransitionTo(SESSION_STATUSES.COMPLETED)) {
        return res.status(400).json({
          message: `Illegal transition: Cannot complete session from status '${session.status}'`,
        });
      }

      session.transitionTo(SESSION_STATUSES.COMPLETED);

      // Mark any remaining pending/current questions as skipped
      session.questions.forEach((q) => {
        if (q.status === 'pending' || q.status === 'current') {
          q.status = 'skipped';
        }
      });

      // Initialize placeholder report structure if not present
      if (!session.report) {
        session.report = {
          completedAt: new Date(),
          summary: 'Session completed. Ready for answer analysis.',
          verifiedClaimsCount: 0,
          unverifiedClaimsCount: 0,
          contradictionsCount: 0,
          preparationGaps: [],
          recommendedFollowUps: [],
        };
      }

      await session.save();

      return res.status(200).json({
        message: 'Cross-examination session completed successfully',
        session: sanitizeSessionForCandidate(session),
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Internal server error completing session',
        error: err.message,
      });
    }
  };

  return {
    createSession,
    getSession,
    listSessions,
    submitAnswer,
    advanceQuestion,
    completeSession,
  };
};

// Export default singleton controller using production models and services
const defaultController = createCrossExaminationController();
export const createSession = defaultController.createSession;
export const getSession = defaultController.getSession;
export const listSessions = defaultController.listSessions;
export const submitAnswer = defaultController.submitAnswer;
export const advanceQuestion = defaultController.advanceQuestion;
export const completeSession = defaultController.completeSession;
