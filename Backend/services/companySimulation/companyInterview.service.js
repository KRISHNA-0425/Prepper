import Interview from '../../models/interview.model.js';
import CompanyProfile from '../../models/companyProfile.model.js';
import { getOrGenerateCompanyProfile, recommendInterviewStructure } from './companyIntelligence.service.js';
import { generateCompanyQuestions } from './companyQuestionGenerator.service.js';
import { evaluateCompanyInterview } from './companyEvaluation.service.js';
import { checkUserCredits, deductInterviewCredits, refundInterviewCredits, INTERVIEW_CREDIT_COST } from '../credit.service.js';
import { evaluateAnswerEvidence } from '../evidenceEvaluation.service.js';

/**
 * Creates and initializes a new company-specific interview simulation session.
 */
export const createCompanyInterviewSession = async ({
  userId,
  companyName,
  targetDesignation = 'Software Engineer',
  experienceLevel = 'Intermediate',
  interviewRound = 'technical_round_1',
  requiredSkills = [],
  jobDescription = '',
  selectedQuestionCount = 5,
  options = {},
}) => {
  if (!userId) throw new Error('userId is required');
  if (!companyName) throw new Error('companyName is required');

  const creditCost = INTERVIEW_CREDIT_COST || 50;

  // 1. Enforce credit check
  const creditCheck = await checkUserCredits(userId, creditCost);
  if (!creditCheck.hasCredits) {
    const error = new Error(creditCheck.message || 'Insufficient credits to start company interview simulation');
    error.statusCode = 400;
    throw error;
  }

  // 2. Fetch or dynamically synthesize company intelligence
  const companyProfile = await getOrGenerateCompanyProfile({
    companyName,
    targetRole: targetDesignation,
    jobDescription,
    userId,
    options,
  });

  const matchedRound = companyProfile?.supportedRounds?.find((r) => r.roundId === interviewRound);
  const roundTitle = matchedRound ? matchedRound.name : interviewRound.replace(/_/g, ' ').toUpperCase();

  // 3. Generate tailored company questions
  const { interviewerGreeting, questions } = await generateCompanyQuestions({
    companyProfile,
    targetRole: targetDesignation,
    experienceLevel,
    interviewRound,
    roundTitle,
    requiredSkills,
    jobDescription,
    questionCount: selectedQuestionCount,
    difficulty: 'medium',
    options,
  });

  // 4. Deduct credits atomically
  let creditsDeducted = false;
  try {
    const deductRes = await deductInterviewCredits(userId, creditCost);
    if (!deductRes.success) {
      throw new Error(deductRes.message || 'Failed to deduct credits');
    }
    creditsDeducted = true;
  } catch (deductErr) {
    const error = new Error(deductErr.message || 'Credit deduction failed');
    error.statusCode = 400;
    throw error;
  }

  // 5. Construct and persist Interview document
  try {
    const mappedQuestions = questions.map((q, idx) => ({
      question: q.question,
      category: q.category || 'Technical',
      topic: q.topic || 'Engineering',
      difficulty: q.difficulty || 'medium',
      timeLimit: q.timeLimit || 60,
      answer: '',
      feedback: '',
      score: 0,
      confidence: 0,
      communication: 0,
      correctness: 0,
      transitionPhrase: q.transitionPhrase || (idx === 0 ? interviewerGreeting : ''),
      evidenceEvaluation: null,
    }));

    const interview = new Interview({
      userId,
      role: targetDesignation,
      experience: experienceLevel,
      mode: 'Technical',
      interviewType: matchedRound?.format === 'coding' ? 'coding' : 'conceptual',
      status: 'Incompleted',
      selectedQuestionCount: mappedQuestions.length,
      targetQuestionCount: mappedQuestions.length,
      creditsCharged: creditCost,
      difficulty: 'medium',
      questions: mappedQuestions,
      currentQuestionIndex: 0,
      currentQuestionStartedAt: new Date(),
      companySimulation: {
        isCompanySimulation: true,
        companyId: companyProfile._id || null,
        companyName: companyProfile.name,
        companyTier: companyProfile.tier || 'Tier 1 Product',
        interviewRound,
        roundTitle,
        jobCategory: companyProfile.industry || 'Technology',
        targetDesignation,
        requiredSkills,
        jobDescription,
        companyPreparationNotes: interviewerGreeting,
        readinessAssessment: null,
      },
    });

    await interview.save();
    return { interview, companyProfile, interviewerGreeting };
  } catch (saveErr) {
    // Automatic refund safeguard on persistence failure
    if (creditsDeducted) {
      try {
        await refundInterviewCredits(userId, creditCost);
      } catch (refundErr) {
        console.error('Failed to refund credits after session creation error:', refundErr);
      }
    }
    throw saveErr;
  }
};

/**
 * Retrieves a company interview session with anti-IDOR verification.
 */
export const getCompanyInterviewSession = async (interviewId, userId) => {
  if (!interviewId || !userId) throw new Error('interviewId and userId are required');

  const interview = await Interview.findById(interviewId);
  if (!interview) return null;

  if (interview.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized: You do not own this company interview simulation');
    error.status = 403;
    throw error;
  }

  return interview;
};

/**
 * Evaluates candidate response to a question in a company interview.
 */
export const submitCompanyAnswer = async ({
  interviewId,
  questionIndex,
  answer,
  timeTaken = 0,
  userId,
  options = {},
}) => {
  const interview = await getCompanyInterviewSession(interviewId, userId);
  if (!interview) throw new Error('Interview session not found');

  if (interview.status === 'Completed') {
    throw new Error('Interview session is already completed');
  }

  const qIdx = Number(questionIndex);
  if (isNaN(qIdx) || qIdx < 0 || qIdx >= interview.questions.length) {
    throw new Error(`Invalid question index: ${questionIndex}`);
  }

  const currentQ = interview.questions[qIdx];
  currentQ.answer = (answer || '').trim();

  // Evaluate candidate answer using evidence evaluation engine
  let evalResult = {
    score: 7,
    feedback: 'Good structured answer demonstrating relevant technical understanding.',
    correctness: 7,
    communication: 7,
    confidence: 7,
    evidenceEvaluation: null,
  };

  try {
    const evaluated = await evaluateAnswerEvidence({
      question: currentQ.question,
      answer: currentQ.answer,
      jobRole: interview.companySimulation?.targetDesignation || interview.role,
      options,
    });
    if (evaluated && typeof evaluated.score === 'number') {
      evalResult = evaluated;
    }
  } catch (err) {
    // Deterministic grading heuristic if evaluation engine throws
    const wordCount = currentQ.answer.split(/\s+/).filter(Boolean).length;
    const fallbackScore = wordCount > 40 ? 8 : (wordCount > 15 ? 6 : 4);
    evalResult = {
      score: fallbackScore,
      feedback: `Demonstrated technical communication addressing ${currentQ.topic || 'the question'}.`,
      correctness: fallbackScore,
      communication: fallbackScore,
      confidence: fallbackScore,
      evidenceEvaluation: null,
    };
  }

  currentQ.score = evalResult.score;
  currentQ.feedback = evalResult.feedback;
  currentQ.correctness = evalResult.correctness || evalResult.score;
  currentQ.communication = evalResult.communication || evalResult.score;
  currentQ.confidence = evalResult.confidence || evalResult.score;
  currentQ.evidenceEvaluation = evalResult.evidenceEvaluation || null;

  // Advance currentQuestionIndex
  if (qIdx + 1 < interview.questions.length) {
    interview.currentQuestionIndex = qIdx + 1;
    interview.currentQuestionStartedAt = new Date();
  }

  await interview.save();
  return {
    interview,
    evaluatedQuestion: currentQ,
    isLastQuestion: qIdx + 1 >= interview.questions.length,
  };
};

/**
 * Finalizes the company simulation, grades overall readiness, and generates company-role assessment.
 */
export const finishCompanyInterview = async (interviewId, userId, options = {}) => {
  const interview = await getCompanyInterviewSession(interviewId, userId);
  if (!interview) throw new Error('Interview session not found');

  // Fetch company profile for context
  let companyProfile = null;
  if (interview.companySimulation?.companyName) {
    companyProfile = await getOrGenerateCompanyProfile({
      companyName: interview.companySimulation.companyName,
      targetRole: interview.companySimulation.targetDesignation || interview.role,
      userId,
      options,
    });
  }

  const readiness = await evaluateCompanyInterview({
    interview,
    companyProfile,
    options,
  });

  interview.companySimulation.readinessAssessment = readiness;
  interview.finalScore = readiness.readinessScore;
  interview.status = 'Completed';

  await interview.save();
  return interview;
};

/**
 * Retrieves past company simulations for candidate.
 */
export const getUserCompanySimulations = async (userId) => {
  if (!userId) throw new Error('userId is required');
  return Interview.find({
    userId,
    'companySimulation.isCompanySimulation': true,
  }).sort({ createdAt: -1 });
};
