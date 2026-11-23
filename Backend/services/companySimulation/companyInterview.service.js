import Interview from '../../models/interview.model.js';
import CompanyProfile from '../../models/companyProfile.model.js';
import { getOrGenerateCompanyProfile, recommendInterviewStructure } from './companyIntelligence.service.js';
import { generateCompanyQuestions } from './companyQuestionGenerator.service.js';
import { evaluateCompanyInterview } from './companyEvaluation.service.js';
import { checkUserCredits, deductInterviewCredits, refundInterviewCredits, INTERVIEW_CREDIT_COST } from '../credit.service.js';
import { evaluateAnswerWithEvidence } from '../evidenceEvaluation.service.js';
import codingQuestionService from '../coding/codingQuestion.service.js';
import { DIFFICULTY_LEVELS } from '../../contracts/adaptiveContracts.js';
import { calculateDifficultyDecision } from '../adaptiveDifficulty.service.js';
import {
  deriveApprovedCompetencies,
  updateTopicPerformanceRecord,
  detectKnowledgeGapsAndStrengths,
} from '../knowledgeGap.service.js';


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
  const checkCredits = options.checkUserCredits || checkUserCredits;
  const deductCredits = options.deductInterviewCredits || deductInterviewCredits;

  // 1. Enforce credit check
  const creditCheck = await checkCredits(userId, creditCost);
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

  // 3. Generate tailored company questions and optional coding challenges for OA
  const isCodingRound = matchedRound?.format === 'coding' || interviewRound === 'online_assessment';
  let codingProblems = [];

  if (isCodingRound) {
    try {
      codingProblems = await codingQuestionService.generateCodingProblems({
        role: targetDesignation,
        category: 'Problem Solving',
        difficulty: 'Medium',
        count: Math.min(Number(selectedQuestionCount) || 3, 3),
      });
    } catch (codeErr) {
      console.warn('[companyInterview] Coding problem generation fallback:', codeErr.message);
    }
  }

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
    const deductRes = await deductCredits(userId, creditCost);
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
      mode: isCodingRound ? 'Coding' : 'Technical',
      interviewType: isCodingRound ? 'coding' : 'conceptual',
      codingProblems: codingProblems,
      status: 'Incompleted',
      selectedQuestionCount: mappedQuestions.length,
      targetQuestionCount: mappedQuestions.length,
      creditsCharged: creditCost,
      difficulty: 'medium',
      questions: mappedQuestions,
      currentQuestionIndex: 0,
      currentQuestionStartedAt: new Date(),
      adaptiveState: {
        currentDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
        previousDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
        consecutiveStrongAnswers: 0,
        consecutiveWeakAnswers: 0,
        topicPerformance: [],
        identifiedKnowledgeGaps: [],
        identifiedStrengths: [],
        decisionHistory: [],
        coveredTopics: [],
        followUpCount: 0,
        approvedCompetencies: deriveApprovedCompetencies({
          role: targetDesignation,
          mode: isCodingRound ? 'Coding' : 'Technical',
        }),
      },
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
        const refundFn = options.refundInterviewCredits || refundInterviewCredits;
        await refundFn(userId, creditCost);
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
  let evaluated = null;

  try {
    evaluated = await evaluateAnswerWithEvidence({
      question: currentQ.question,
      answer: currentQ.answer,
      role: interview.companySimulation?.targetDesignation || interview.role,
      experience: interview.experience || 'Intermediate',
      mode: interview.mode || 'Technical',
      difficulty: currentQ.difficulty || 'medium',
      askAIFn: options.askAIFn,
    });
  } catch (err) {
    // Deterministic fallback grading heuristic if evaluation engine throws
    const wordCount = currentQ.answer.split(/\s+/).filter(Boolean).length;
    const fallbackScore10 = wordCount > 40 ? 8 : (wordCount > 15 ? 6 : 4);
    evaluated = {
      overallScore: fallbackScore10,
      summaryFeedback: `Demonstrated technical communication addressing ${currentQ.topic || 'the question'}.`,
      criteria: [
        { name: 'Technical Accuracy', score: fallbackScore10 },
        { name: 'Communication Clarity', score: fallbackScore10 },
      ],
      evaluationConfidence: 0.8,
      evidence: [],
      strengths: wordCount > 30 ? ['Clear explanation of approach'] : [],
      weaknesses: wordCount < 20 ? ['Brief response; could elaborate with more specific system details'] : [],
    };
  }

  const rawScore10 = typeof evaluated?.overallScore === 'number'
    ? evaluated.overallScore
    : (typeof evaluated?.score === 'number' ? evaluated.score : 7);
  const score100 = Math.round(rawScore10 <= 10 ? rawScore10 * 10 : rawScore10);
  const feedback = evaluated?.summaryFeedback || evaluated?.feedback || `Answer evaluated for ${currentQ.topic || 'technical depth'}.`;

  const techAccuracyCrit = evaluated?.criteria?.find((c) => c.name === 'Technical Accuracy');
  const commsCrit = evaluated?.criteria?.find((c) => c.name === 'Communication Clarity');

  currentQ.score = score100;
  currentQ.feedback = feedback;
  currentQ.correctness = techAccuracyCrit?.score ? Math.round(techAccuracyCrit.score * 10) : score100;
  currentQ.communication = commsCrit?.score ? Math.round(commsCrit.score * 10) : score100;
  currentQ.confidence = Math.round((evaluated?.evaluationConfidence || 0.8) * 10);
  currentQ.evidenceEvaluation = evaluated;

  // Module 3: Adaptive Steering & Streak Evaluation
  if (!interview.adaptiveState) {
    interview.adaptiveState = {
      currentDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
      previousDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
      consecutiveStrongAnswers: 0,
      consecutiveWeakAnswers: 0,
      topicPerformance: [],
      identifiedKnowledgeGaps: [],
      identifiedStrengths: [],
      decisionHistory: [],
      coveredTopics: [],
      followUpCount: 0,
      approvedCompetencies: deriveApprovedCompetencies({
        role: interview.role,
        mode: interview.mode,
      }),
    };
  }

  const currentTopic = currentQ.topic || 'General Technical';
  const score10 = Math.round(score100 / 10);

  // 1. Update topic performance metrics
  interview.adaptiveState.topicPerformance = updateTopicPerformanceRecord(
    interview.adaptiveState.topicPerformance,
    currentTopic,
    score10,
    qIdx
  );
  if (!interview.adaptiveState.coveredTopics.includes(currentTopic)) {
    interview.adaptiveState.coveredTopics.push(currentTopic);
  }

  // 2. Extract grounded knowledge gaps and strengths
  const { newGaps, newStrengths } = detectKnowledgeGapsAndStrengths({
    topic: currentTopic,
    score: score10,
    evidenceEvaluation: evaluated,
    questionIndex: qIdx,
  });
  if (newGaps && newGaps.length > 0) {
    interview.adaptiveState.identifiedKnowledgeGaps.push(...newGaps);
  }
  if (newStrengths && newStrengths.length > 0) {
    interview.adaptiveState.identifiedStrengths.push(...newStrengths);
  }

  // 3. Evaluate adaptive difficulty policy
  const isFinalQuestion = qIdx >= interview.questions.length - 1;
  const decision = calculateDifficultyDecision({
    currentDifficulty: interview.adaptiveState.currentDifficulty,
    score: score10,
    evidenceEvaluation: evaluated,
    consecutiveStrong: interview.adaptiveState.consecutiveStrongAnswers,
    consecutiveWeak: interview.adaptiveState.consecutiveWeakAnswers,
    isFinalQuestion,
  });

  interview.adaptiveState.currentDifficulty = decision.newDifficulty;
  interview.adaptiveState.previousDifficulty = decision.previousDifficulty;
  interview.adaptiveState.consecutiveStrongAnswers = decision.consecutiveStrongAnswers;
  interview.adaptiveState.consecutiveWeakAnswers = decision.consecutiveWeakAnswers;

  // Record decision history
  interview.adaptiveState.decisionHistory.push({
    questionIndex: qIdx,
    previousDifficulty: decision.previousDifficulty,
    newDifficulty: decision.newDifficulty,
    action: decision.action,
    reason: decision.reason,
    targetTopic: currentTopic,
    transitionPhrase: '',
    timestamp: new Date(),
  });

  // 4. Steer next question difficulty if not final question
  if (!isFinalQuestion && qIdx + 1 < interview.questions.length) {
    interview.questions[qIdx + 1].difficulty = decision.newDifficulty;
    if (decision.action === 'increase_difficulty') {
      interview.questions[qIdx + 1].transitionPhrase = `Strong depth on that explanation. Let's elevate the challenge to an advanced ${interview.companySimulation?.companyName || 'engineering'} scenario.`;
    } else if (decision.action === 'decrease_difficulty' || decision.action === 'diagnostic_pivot') {
      interview.questions[qIdx + 1].transitionPhrase = `Let's clarify the underlying mechanics with a focused scenario.`;
    }
  }

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
    adaptiveDecision: decision,
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
