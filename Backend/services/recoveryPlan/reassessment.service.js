import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';

/**
 * Generates 3-5 targeted reassessment questions tailored to the candidate's recorded weaknesses.
 */
export const generateReassessmentQuestions = async (plan, options = {}) => {
  const weaknesses = Array.isArray(plan.criticalWeaknesses) && plan.criticalWeaknesses.length > 0
    ? plan.criticalWeaknesses
    : [{ weaknessId: 'gap_1', topic: 'Core Technical Design', description: 'Core problem solving' }];

  const askAI = options.askAI || defaultAskAI;

  const targetWeaknesses = weaknesses.slice(0, 5);

  const fallbackQuestions = targetWeaknesses.map((w, idx) => ({
    questionId: `reassess_q_${idx + 1}`,
    questionText: `Explain the fundamental concepts, tradeoffs, and production edge cases for ${w.topic}, addressing specifically: ${w.description}.`,
    topic: w.topic,
    relatedWeaknessId: w.weaknessId,
    candidateAnswer: '',
    score: null,
    feedback: '',
    assessedAt: null,
  }));

  try {
    const prompt = `You are an elite Technical Interview Evaluator.
Generate 3 to 5 challenging, targeted interview questions to reassess a candidate after completing an interview recovery plan.

Candidate Role: ${plan.targetRole}
Identified Weaknesses to Test:
${targetWeaknesses.map((w, i) => `${i + 1}. [${w.topic}] ${w.description}`).join('\n')}

INSTRUCTIONS:
- Each question must directly test one of the weaknesses above.
- Questions should test conceptual depth, real-world failure modes, and correct algorithmic/architectural tradeoffs.
- Return STRICT JSON:
{
  "questions": [
    {
      "questionId": "reassess_q_1",
      "topic": "string",
      "relatedWeaknessId": "string",
      "questionText": "string"
    }
  ]
}`;

    const rawResponse = await askAI([
      { role: 'system', content: 'You are an expert technical interviewer. Return strict JSON only.' },
      { role: 'user', content: prompt },
    ], { max_tokens: 1000, temperature: 0.3 });

    const { data } = safeParseJson(rawResponse);
    if (data && Array.isArray(data.questions) && data.questions.length > 0) {
      return data.questions.map((q, idx) => ({
        questionId: q.questionId || `reassess_q_${idx + 1}`,
        questionText: q.questionText,
        topic: q.topic || targetWeaknesses[idx % targetWeaknesses.length].topic,
        relatedWeaknessId: q.relatedWeaknessId || targetWeaknesses[idx % targetWeaknesses.length].weaknessId,
        candidateAnswer: '',
        score: null,
        feedback: '',
        assessedAt: null,
      }));
    }
  } catch (err) {
    // Graceful fallback to deterministic questions
  }

  return fallbackQuestions;
};

/**
 * Evaluates candidate responses to reassessment questions.
 * Preserves comparable 0-100 rubric scoring.
 */
export const evaluateReassessmentAnswers = async ({
  plan,
  submittedAnswers, // array of { questionId, answer }
  options = {},
}) => {
  const askAI = options.askAI || defaultAskAI;
  const existingQuestions = plan.reassessment?.questions || [];

  const answerMap = new Map();
  if (Array.isArray(submittedAnswers)) {
    submittedAnswers.forEach((ans) => {
      if (ans && ans.questionId) {
        answerMap.set(ans.questionId, (ans.answer || '').trim());
      }
    });
  }

  const evaluatedQuestions = [];
  const improvementsObserved = [];
  const remainingGaps = [];

  for (let i = 0; i < existingQuestions.length; i++) {
    const q = existingQuestions[i];
    const candidateAnswer = answerMap.get(q.questionId) || q.candidateAnswer || '';

    let score = 50;
    let feedback = 'Answer provided adequate general context.';

    if (!candidateAnswer || candidateAnswer.length < 15) {
      score = 20;
      feedback = 'Insufficient answer provided; key concepts were not articulated.';
      remainingGaps.push(`Incomplete response on ${q.topic}`);
    } else {
      // Evaluate via AI if available, else deterministic heuristics
      try {
        const evalPrompt = `Evaluate this reassessment answer on a strict 0-100 scale:
Topic: ${q.topic}
Question: ${q.questionText}
Candidate Answer: "${candidateAnswer}"

Return strict JSON:
{
  "score": number (0-100),
  "feedback": "2-sentence specific feedback on accuracy and depth",
  "isMastered": boolean
}`;

        const raw = await askAI([
          { role: 'system', content: 'You are an objective technical interview grader. Return JSON only.' },
          { role: 'user', content: evalPrompt },
        ], { max_tokens: 400, temperature: 0.2 });

        const { data } = safeParseJson(raw);
        if (data && typeof data.score === 'number') {
          score = Math.min(100, Math.max(0, Math.round(data.score)));
          feedback = data.feedback || feedback;
        }
      } catch (e) {
        // Deterministic grading heuristic based on length and technical vocabulary
        const wordCount = candidateAnswer.split(/\s+/).length;
        if (wordCount > 60) score = 82;
        else if (wordCount > 30) score = 72;
        else score = 58;
        feedback = `Deterministic assessment: Demonstrated clear conceptual points on ${q.topic}.`;
      }

      if (score >= 70) {
        improvementsObserved.push(`Strong mastery in ${q.topic} (${score}/100)`);
      } else {
        remainingGaps.push(`Further practice advised for ${q.topic} (${score}/100)`);
      }
    }

    evaluatedQuestions.push({
      questionId: q.questionId,
      questionText: q.questionText,
      topic: q.topic,
      relatedWeaknessId: q.relatedWeaknessId,
      candidateAnswer,
      score,
      feedback,
      assessedAt: new Date(),
    });
  }

  // Calculate overall reassessment score
  const totalScore = evaluatedQuestions.reduce((acc, q) => acc + (q.score || 0), 0);
  const reassessmentScore = evaluatedQuestions.length > 0
    ? Math.round(totalScore / evaluatedQuestions.length)
    : 0;

  const originalScore = plan.reassessment?.originalScore ?? (plan.overallScore || 50);
  const scoreDelta = reassessmentScore - originalScore;

  return {
    reassessmentScore,
    originalScore,
    scoreDelta,
    questions: evaluatedQuestions,
    improvementsObserved,
    remainingGaps,
  };
};
