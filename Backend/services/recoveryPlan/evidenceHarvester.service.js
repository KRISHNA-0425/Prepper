import mongoose from 'mongoose';
import Interview from '../../models/interview.model.js';
import CrossExaminationSession from '../../models/crossExaminationSession.model.js';
import CodingSubmission from '../../models/codingSubmission.model.js';

/**
 * Normalizes a topic string for clean aggregation
 */
const normalizeTopic = (topic) => {
  if (!topic || typeof topic !== 'string') return 'Core Fundamentals';
  const trimmed = topic.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * Harvests authentic performance evidence across:
 * 1. Standard conceptual interviews (questions, rubric evaluations, adaptive gaps)
 * 2. Cross-examination interrogation sessions (preparation gaps, verified strengths, dimension scores)
 * 3. Live coding sessions (submissions, test case results, time/space complexity analysis)
 *
 * @param {string|mongoose.Types.ObjectId} interviewId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<object>} Harvested evidence dossier with traceability tags
 */
export const harvestInterviewEvidence = async (interviewId, userId) => {
  if (!interviewId || !userId) {
    throw new Error('Both interviewId and userId are required for evidence harvesting');
  }

  // 1. Fetch primary interview
  const interview = await Interview.findOne({ _id: interviewId, userId }).lean();
  if (!interview) {
    throw new Error(`Interview not found for ID: ${interviewId} and user`);
  }

  const harvestedData = {
    interviewId: interview._id,
    userId: interview.userId,
    targetRole: interview.role || 'Software Engineer',
    experienceLevel: interview.experience || 'Intermediate',
    interviewType: interview.interviewType || (interview.mode === 'Coding' ? 'coding' : 'standard'),
    overallScore: typeof interview.finalScore === 'number' ? interview.finalScore : 0,
    strengths: [],
    weaknesses: [],
    metrics: {
      totalQuestions: 0,
      evaluatedQuestions: 0,
      codingSubmissionsCount: 0,
      hasCrossExam: false,
    },
  };

  const strengthKeys = new Set();
  const weaknessKeys = new Set();

  const addStrength = (strength) => {
    const key = `${strength.topic.toLowerCase()}::${(strength.description || '').toLowerCase()}`;
    if (!strengthKeys.has(key)) {
      strengthKeys.add(key);
      harvestedData.strengths.push({
        strengthId: `str_${harvestedData.strengths.length + 1}`,
        ...strength,
      });
    }
  };

  const addWeakness = (weakness) => {
    const key = `${weakness.topic.toLowerCase()}::${(weakness.description || '').toLowerCase()}`;
    if (!weaknessKeys.has(key)) {
      weaknessKeys.add(key);
      harvestedData.weaknesses.push({
        weaknessId: `gap_${harvestedData.weaknesses.length + 1}`,
        ...weakness,
      });
    }
  };

  // 2. Harvest from Standard Interview & Adaptive State
  if (Array.isArray(interview.questions)) {
    harvestedData.metrics.totalQuestions = interview.questions.length;
    interview.questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const questionTopic = normalizeTopic(q.topic || q.category || 'General Technical');
      const questionId = q._id ? q._id.toString() : `q_${idx}`;

      // Check evidenceEvaluation if populated
      if (q.evidenceEvaluation) {
        harvestedData.metrics.evaluatedQuestions++;
        const evalData = q.evidenceEvaluation;

        // Weaknesses & missing concepts
        if (Array.isArray(evalData.missingConcepts) && evalData.missingConcepts.length > 0) {
          evalData.missingConcepts.forEach((concept) => {
            if (concept && typeof concept === 'string') {
              addWeakness({
                topic: questionTopic,
                severity: 'high',
                description: `Missing fundamental concept: "${concept}" on Question ${qNum}`,
                misconceptionSnippet: q.answer ? q.answer.slice(0, 180) : '',
                evidence: {
                  sourceType: 'standard_interview',
                  sourceId: interview._id,
                  questionOrProblemId: questionId,
                  competency: questionTopic,
                  evidenceExcerpt: q.answer ? `Candidate answer: "${q.answer.slice(0, 160)}..."` : 'Concept omitted from response',
                  identifiedFinding: `Missing concept: ${concept}`,
                },
              });
            }
          });
        }

        if (Array.isArray(evalData.weaknesses) && evalData.weaknesses.length > 0) {
          evalData.weaknesses.forEach((w) => {
            if (w && typeof w === 'string') {
              addWeakness({
                topic: questionTopic,
                severity: 'moderate',
                description: `Identified deficiency: ${w}`,
                misconceptionSnippet: q.answer ? q.answer.slice(0, 180) : '',
                evidence: {
                  sourceType: 'standard_interview',
                  sourceId: interview._id,
                  questionOrProblemId: questionId,
                  competency: questionTopic,
                  evidenceExcerpt: q.answer ? q.answer.slice(0, 160) : '',
                  identifiedFinding: w,
                },
              });
            }
          });
        }

        // Strengths
        if (Array.isArray(evalData.strengths) && evalData.strengths.length > 0) {
          evalData.strengths.forEach((s) => {
            if (s && typeof s === 'string') {
              addStrength({
                topic: questionTopic,
                description: s,
                evidence: {
                  sourceType: 'standard_interview',
                  sourceId: interview._id,
                  questionOrProblemId: questionId,
                  competency: questionTopic,
                  evidenceExcerpt: q.answer ? q.answer.slice(0, 160) : '',
                  identifiedFinding: s,
                },
              });
            }
          });
        }
      }

      // Check low question score (< 60) without explicit evidenceEvaluation
      if (typeof q.score === 'number' && q.score > 0 && q.score < 60) {
        addWeakness({
          topic: questionTopic,
          severity: q.score < 40 ? 'critical' : 'high',
          description: `Low accuracy (${q.score}/100) demonstrated on topic ${questionTopic}. ${q.feedback ? q.feedback.slice(0, 200) : ''}`,
          misconceptionSnippet: q.answer ? q.answer.slice(0, 180) : '',
          evidence: {
            sourceType: 'standard_interview',
            sourceId: interview._id,
            questionOrProblemId: questionId,
            competency: questionTopic,
            evidenceExcerpt: q.answer ? q.answer.slice(0, 160) : '',
            identifiedFinding: `Question score ${q.score}/100 below passing threshold`,
          },
        });
      }
    });
  }

  // Harvest from adaptiveState if available
  if (interview.adaptiveState) {
    if (Array.isArray(interview.adaptiveState.identifiedKnowledgeGaps)) {
      interview.adaptiveState.identifiedKnowledgeGaps.forEach((gap) => {
        addWeakness({
          topic: normalizeTopic(gap.topic),
          severity: gap.severity === 'critical' ? 'critical' : (gap.severity === 'moderate' ? 'high' : 'moderate'),
          description: gap.description || `Knowledge gap in ${gap.topic}`,
          misconceptionSnippet: gap.misconceptionSnippet || '',
          evidence: {
            sourceType: 'standard_interview',
            sourceId: interview._id,
            questionOrProblemId: `q_${gap.detectedAtQuestionIndex || 0}`,
            competency: normalizeTopic(gap.topic),
            evidenceExcerpt: gap.misconceptionSnippet || '',
            identifiedFinding: gap.description,
          },
        });
      });
    }

    if (Array.isArray(interview.adaptiveState.identifiedStrengths)) {
      interview.adaptiveState.identifiedStrengths.forEach((str) => {
        addStrength({
          topic: normalizeTopic(str.topic),
          description: `Demonstrated ${str.proficiency || 'proficient'} competency in ${str.topic}`,
          evidence: {
            sourceType: 'standard_interview',
            sourceId: interview._id,
            questionOrProblemId: `q_${str.detectedAtQuestionIndex || 0}`,
            competency: normalizeTopic(str.topic),
            evidenceExcerpt: str.evidenceExcerpt || '',
            identifiedFinding: `Verified ${str.proficiency} proficiency`,
          },
        });
      });
    }
  }

  // 3. Harvest from Cross-Examination Session
  try {
    const crossExam = await CrossExaminationSession.findOne({
      $or: [
        { interviewId: interview._id, userId },
        { userId, 'context.targetRole': interview.role, status: 'COMPLETED' },
      ],
    }).sort({ createdAt: -1 }).lean();

    if (crossExam && crossExam.report) {
      harvestedData.metrics.hasCrossExam = true;
      const report = crossExam.report;

      if (Array.isArray(report.preparationGaps)) {
        report.preparationGaps.forEach((gap, idx) => {
          const gapDesc = typeof gap === 'string' ? gap : (gap.description || gap.title || '');
          const gapTopic = typeof gap === 'object' && gap.competency ? gap.competency : 'System Architecture & Claim Defense';
          const gapSev = typeof gap === 'object' && gap.severity ? gap.severity.toLowerCase() : 'high';

          if (gapDesc) {
            addWeakness({
              topic: normalizeTopic(gapTopic),
              severity: ['critical', 'high', 'moderate', 'minor'].includes(gapSev) ? gapSev : 'high',
              description: `Cross-Examination Finding: ${gapDesc}`,
              misconceptionSnippet: '',
              evidence: {
                sourceType: 'cross_examination',
                sourceId: crossExam._id,
                questionOrProblemId: `claim_gap_${idx}`,
                competency: normalizeTopic(gapTopic),
                evidenceExcerpt: `Cross-exam verification contradiction: ${gapDesc}`,
                identifiedFinding: gapDesc,
              },
            });
          }
        });
      }

      if (Array.isArray(report.demonstratedStrengths)) {
        report.demonstratedStrengths.forEach((str) => {
          const title = str.title || str;
          const desc = str.description || title;
          addStrength({
            topic: 'System Defense & Real-world Experience',
            description: `Validated Claim: ${title} - ${desc}`,
            evidence: {
              sourceType: 'cross_examination',
              sourceId: crossExam._id,
              questionOrProblemId: str.id || 'cross_strength',
              competency: 'System Defense',
              evidenceExcerpt: desc,
              identifiedFinding: title,
            },
          });
        });
      }
    }
  } catch (err) {
    // Cross-examination is optional; proceed smoothly if not found
  }

  // 4. Harvest from Coding Submissions
  try {
    const codingSubmissions = await CodingSubmission.find({
      interviewId: interview._id,
      userId,
    }).sort({ createdAt: -1 }).lean();

    if (Array.isArray(codingSubmissions) && codingSubmissions.length > 0) {
      harvestedData.metrics.codingSubmissionsCount = codingSubmissions.length;

      codingSubmissions.forEach((sub, sIdx) => {
        const probLabel = sub.problemId || `Problem #${sIdx + 1}`;
        const subId = sub._id ? sub._id.toString() : `sub_${sIdx}`;

        // Check test failure verdicts
        if (sub.verdict && sub.verdict !== 'Accepted') {
          addWeakness({
            topic: `Algorithmic Problem Solving (${sub.language || 'Code'})`,
            severity: 'critical',
            description: `Failed solution submission on ${probLabel}: Verdict '${sub.verdict}'. Passed ${sub.passedCount || 0}/${sub.totalCount || 0} test cases.`,
            misconceptionSnippet: sub.sourceCode ? sub.sourceCode.slice(0, 180) : '',
            evidence: {
              sourceType: 'coding_interview',
              sourceId: sub._id,
              questionOrProblemId: subId,
              competency: 'Algorithmic Problem Solving',
              evidenceExcerpt: `Test pass rate: ${sub.passedCount}/${sub.totalCount}, verdict: ${sub.verdict}`,
              identifiedFinding: `Code execution failure: ${sub.verdict}`,
            },
          });
        }

        // Check evaluation details if present
        if (sub.evaluation) {
          const ev = sub.evaluation;
          if (Array.isArray(ev.weaknesses)) {
            ev.weaknesses.forEach((cw) => {
              addWeakness({
                topic: `Data Structures & Algorithms (${probLabel})`,
                severity: 'high',
                description: `Coding analysis: ${cw}. Time complexity observed: ${ev.timeComplexity || 'unspecified'}.`,
                misconceptionSnippet: ev.approach ? ev.approach.slice(0, 180) : '',
                evidence: {
                  sourceType: 'coding_interview',
                  sourceId: sub._id,
                  questionOrProblemId: subId,
                  competency: 'Data Structures & Algorithms',
                  evidenceExcerpt: ev.overallFeedback || cw,
                  identifiedFinding: cw,
                },
              });
            });
          }

          if (Array.isArray(ev.strengths)) {
            ev.strengths.forEach((cs) => {
              addStrength({
                topic: `Data Structures & Algorithms (${probLabel})`,
                description: `Coding strength: ${cs}`,
                evidence: {
                  sourceType: 'coding_interview',
                  sourceId: sub._id,
                  questionOrProblemId: subId,
                  competency: 'Data Structures & Algorithms',
                  evidenceExcerpt: cs,
                  identifiedFinding: cs,
                },
              });
            });
          }
        }
      });
    }
  } catch (err) {
    // Coding submissions optional; proceed smoothly if not present
  }

  return harvestedData;
};
