/**
 * @file crossExamination.controller.js
 * Controller for Cross-Examination Session Lifecycle and Backend APIs.
 * Enforces authenticated ownership, deterministic progression state machines,
 * privacy masking of internal evaluation metadata, and safe failure handling.
 */

import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mongoose from 'mongoose';
import CrossExaminationSession from '../models/crossExaminationSession.model.js';
import { extractResumeClaims, verifySourceExcerpt } from '../services/resumeIntelligence.service.js';
import { analyzeProjectClaims } from '../services/projectClaimAnalysis.service.js';
import { generateCrossExaminationQuestions, ENGINE_LIMITS } from '../services/questionEngine.service.js';
import {
  evaluateCandidateAnswer,
  generateFollowUpProbe,
} from '../services/answerAnalysis.service.js';
import { generatePreparationReport } from '../services/reportGeneration.service.js';
import {
  SESSION_STATUSES,
  PROVENANCE_TYPES,
  CONFIDENCE_LEVELS,
  PROBING_LIMITS,
  REPORT_SCHEMA_VERSION,
  validateProjectProfileContract,
  hashSourceText,
} from '../contracts/crossExamination.contracts.js';

/**
 * Extracts plain text from an uploaded PDF file path using pdfjs-dist.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export const defaultParsePdf = async (filePath) => {
  const fileBuffer = await fs.promises.readFile(filePath);
  const uint8Array = new Uint8Array(fileBuffer);
  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
  let resumeText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    resumeText += pageText + '\n';
  }
  return resumeText.replace(/\s+/g, ' ').trim();
};

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
 * Sanitizes a preparation report object for candidate-facing responses.
 * Strips internal IDs and any non-public metadata.
 *
 * @param {object} report
 * @returns {object|null}
 */
export const sanitizeReportForCandidate = (report) => {
  if (!report) return null;
  const rObj = typeof report.toObject === 'function' ? report.toObject() : { ...report };
  delete rObj._id;
  delete rObj.__v;
  return rObj;
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
    report: isCompleted && sObj.report ? sanitizeReportForCandidate(sObj.report) : null,
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
  evaluateAnswerFn = evaluateCandidateAnswer,
  generateFollowUpFn = generateFollowUpProbe,
  generateReportFn = generatePreparationReport,
  parsePdfFn = defaultParsePdf,
  verifyExcerptFn = verifySourceExcerpt,
} = {}) => {
  /**
   * POST /api/cross-examination/sessions
   * Creates an authenticated, initialized cross-examination session.
   */
  const createSession = async (req, res) => {
    let userId = null;
    let idempotencyKey = null;
    try {
      userId = req.userId || req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check for Idempotency-Key
      const rawKey = req.headers?.['idempotency-key'] || req.body?.idempotencyKey;
      idempotencyKey = (rawKey && typeof rawKey === 'string' && rawKey.trim()) ? rawKey.trim() : null;
      if (idempotencyKey) {
        const existingSession = await SessionModel.findOne({
          userId,
          idempotencyKey,
        });
        if (existingSession) {
          return res.status(200).json({
            message: 'Existing session retrieved for idempotency key',
            session: sanitizeSessionForCandidate(existingSession),
            isIdempotentReplay: true,
          });
        }
      }

      const {
        resumeText: rawResumeText,
        crossExaminationProfile,
        targetRole: rawRole,
        targetDomain: rawDomain,
        questionCount: rawCount,
      } = req.body || {};

      let resumeText = rawResumeText;

      // Handle resume file upload if present
      if (req.file) {
        try {
          resumeText = await parsePdfFn(req.file.path);
        } catch (pdfErr) {
          return res.status(400).json({
            message: 'Failed to parse uploaded PDF resume file. Ensure the file is a valid PDF.',
            error: pdfErr.message,
          });
        } finally {
          if (req.file?.path && fs.existsSync(req.file.path)) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (_) {}
          }
        }
      }

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

        // Provenance boundary verification: guard against forged provenance in client-supplied profile
        const sourceForVerification = resumeText || profile.resumeExcerpt || '';
        for (const prj of profile.projects) {
          for (const clm of prj.claims || []) {
            if (clm.provenanceType === PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT) {
              if (!sourceForVerification) {
                // Cannot prove explicit source statement without source text; demote
                clm.provenanceType = PROVENANCE_TYPES.AI_INFERRED_CATEGORY;
                clm.confidence = CONFIDENCE_LEVELS.UNCERTAIN;
              } else {
                const verification = verifyExcerptFn(sourceForVerification, clm.sourceExcerpt || '');
                if (!verification.isVerified) {
                  // Forged or ungrounded excerpt detected; demote claim
                  clm.provenanceType = PROVENANCE_TYPES.AI_INFERRED_CATEGORY;
                  clm.confidence = CONFIDENCE_LEVELS.UNCERTAIN;
                }
              }
            }
          }
        }

        resumeExcerpt = typeof profile.resumeExcerpt === 'string' ? profile.resumeExcerpt.slice(0, 3000) : (resumeText ? resumeText.slice(0, 3000) : '');
        resumeHash = profile.resumeHash || (resumeText ? hashSourceText(resumeText) : '');
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
        idempotencyKey: idempotencyKey && typeof idempotencyKey === 'string' ? idempotencyKey.trim() : undefined,
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
      // Handle concurrent creation race condition when duplicate key error (E11000) occurs on idempotencyKey
      if (err.code === 11000 && idempotencyKey && userId) {
        const winningSession = await SessionModel.findOne({ userId, idempotencyKey });
        if (winningSession) {
          return res.status(200).json({
            message: 'Existing session retrieved for idempotency key',
            session: sanitizeSessionForCandidate(winningSession),
            isIdempotentReplay: true,
          });
        }
      }

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
      const userId = req.userId || req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
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
      const userId = req.userId || req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
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
      const userId = req.userId || req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
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

      // Phase 7: Evidence-grounded answer evaluation
      let evaluation = null;
      try {
        const project =
          session.projects?.find((p) => p.projectId === activeQuestion.targetProjectId) || {};
        const claim =
          project.claims?.find((c) => activeQuestion.targetClaimIds?.includes(c.claimId)) || {};

        const evalResult = await evaluateAnswerFn({
          question: activeQuestion,
          answer: recordedAnswer,
          projectContext: project,
          claimContext: claim,
        });

        if (evalResult && evalResult.success && evalResult.evaluation) {
          evaluation = evalResult.evaluation;
          if (typeof session.attachAnswerEvaluation === 'function') {
            session.attachAnswerEvaluation(questionId, evaluation);
          }
        }
      } catch (evalErr) {
        // Safe degradation: evaluation failure does not abort answer submission
        console.warn(`[crossExamination] Answer evaluation error for question ${questionId}:`, evalErr.message);
      }

      // Phase 7: Adaptive targeted follow-up probing
      if (
        evaluation &&
        evaluation.followUpEligible &&
        typeof session.addFollowUpQuestion === 'function' &&
        (activeQuestion.depth || 0) < PROBING_LIMITS.MAX_FOLLOW_UP_DEPTH &&
        session.questions.length < PROBING_LIMITS.MAX_TOTAL_SESSION_QUESTIONS
      ) {
        try {
          const followUpResult = await generateFollowUpFn({
            parentQuestion: activeQuestion,
            answer: recordedAnswer,
            evaluation,
            projectContext:
              session.projects?.find((p) => p.projectId === activeQuestion.targetProjectId) || {},
          });

          if (followUpResult && followUpResult.success && followUpResult.followUpQuestion) {
            session.addFollowUpQuestion(followUpResult.followUpQuestion);
          }
        } catch (followUpErr) {
          console.warn(`[crossExamination] Follow-up generation error for question ${questionId}:`, followUpErr.message);
        }
      }

      // Handle optional autoAdvance
      let nextQuestion = null;
      if (autoAdvance === true) {
        nextQuestion = session.advanceQuestion();
        if (!nextQuestion) {
          session.status = SESSION_STATUSES.ACTIVE;
        }
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
      const userId = req.userId || req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      // Resource-level authorization: match ID and authenticated owner
      const session = await SessionModel.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      if (
        session.status === SESSION_STATUSES.COMPLETED ||
        session.status === SESSION_STATUSES.FAILED ||
        session.status === SESSION_STATUSES.ABANDONED
      ) {
        return res.status(409).json({
          message: `Cannot advance a session with status '${session.status}'`,
        });
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
      const userId = req.userId || req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
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

      // Generate evidence-linked preparation report upon completion
      try {
        const reportResult = await generateReportFn({ session });
        if (reportResult && reportResult.success && reportResult.report) {
          session.report = reportResult.report;
        }
      } catch (repErr) {
        console.warn(`[crossExamination] Report generation warning on complete: ${repErr.message}`);
        if (!session.report) {
          session.report = {
            completedAt: new Date(),
            summary: 'Session completed. Preparation report generation pending.',
            verifiedClaimsCount: 0,
            unverifiedClaimsCount: 0,
            contradictionsCount: 0,
            preparationGaps: [],
            recommendedFollowUps: [],
          };
        }
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

  /**
   * POST /api/cross-examination/sessions/:sessionId/report
   * Generates or regenerates an evidence-linked preparation report.
   */
  const generateReport = async (req, res) => {
    try {
      const userId = req.userId || req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { sessionId } = req.params;
      const regenerate = Boolean(req.query?.regenerate === 'true' || req.body?.regenerate);

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      const session = await SessionModel.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      if (session.status !== SESSION_STATUSES.COMPLETED) {
        return res.status(400).json({
          message: 'Cannot generate preparation report for an incomplete session',
        });
      }

      // Idempotency: return existing report if already generated and regenerate not requested
      if (
        !regenerate &&
        session.report &&
        session.report.version === REPORT_SCHEMA_VERSION &&
        session.report.claimVerificationMatrix &&
        session.report.claimVerificationMatrix.length > 0
      ) {
        return res.status(200).json({
          message: 'Preparation report retrieved successfully',
          report: sanitizeReportForCandidate(session.report),
        });
      }

      // Generate report using service
      const reportResult = await generateReportFn({ session });
      if (!reportResult || !reportResult.success || !reportResult.report) {
        return res.status(500).json({
          message: 'Failed to generate preparation report',
        });
      }

      session.report = reportResult.report;
      await session.save();

      return res.status(200).json({
        message: 'Preparation report generated successfully',
        report: sanitizeReportForCandidate(session.report),
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Internal server error generating report',
        error: err.message,
      });
    }
  };

  /**
   * GET /api/cross-examination/sessions/:sessionId/report
   * Retrieves an evidence-linked preparation report for an authorized session.
   */
  const getReport = async (req, res) => {
    try {
      const userId = req.userId || req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      const session = await SessionModel.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ message: 'Cross-examination session not found' });
      }

      if (session.status !== SESSION_STATUSES.COMPLETED) {
        return res.status(400).json({
          message: 'Cannot retrieve preparation report for an incomplete session',
        });
      }

      // If report already generated with full matrix, return it
      if (session.report && session.report.claimVerificationMatrix && session.report.claimVerificationMatrix.length > 0) {
        return res.status(200).json({
          report: sanitizeReportForCandidate(session.report),
        });
      }

      // Otherwise generate on-the-fly and persist
      const reportResult = await generateReportFn({ session });
      if (reportResult && reportResult.success && reportResult.report) {
        session.report = reportResult.report;
        await session.save();
      }

      return res.status(200).json({
        report: sanitizeReportForCandidate(session.report),
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Internal server error retrieving report',
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
    generateReport,
    getReport,
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
export const generateReport = defaultController.generateReport;
export const getReport = defaultController.getReport;
