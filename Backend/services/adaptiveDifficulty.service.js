/**
 * @file adaptiveDifficulty.service.js
 * Multi-factor, rule-governed Adaptive Difficulty Decision Engine for Prepper AI.
 * 
 * Enforces strict consecutive-performance thresholds, evidence-grounded difficulty promotion/demotion,
 * critical misconception handling, and bounded difficulty progression.
 */

import {
  DIFFICULTY_LEVELS,
  STEERING_ACTIONS,
  ADAPTIVE_CONFIG,
  normalizeDifficulty
} from '../contracts/adaptiveContracts.js';

/**
 * Evaluates the candidate's performance on the current question and determines
 * the next difficulty level and steering action according to strict policy rules.
 * 
 * @param {Object} params
 * @param {string} params.currentDifficulty - Current difficulty ('beginner' | 'intermediate' | 'advanced')
 * @param {number} params.score - Current question score (0 to 10)
 * @param {Object} [params.evidenceEvaluation] - Evidence-based evaluation from Module 2
 * @param {number} [params.consecutiveStrong=0] - Current consecutive strong answer streak
 * @param {number} [params.consecutiveWeak=0] - Current consecutive weak answer streak
 * @param {number} [params.followUpCount=0] - Number of follow-ups conducted so far
 * @param {number} [params.currentQuestionDepth=0] - Depth of the current question
 * @param {boolean} [params.isFinalQuestion=false] - Whether this is the final question in allocation
 * @returns {Object} Decision result
 */
export const calculateDifficultyDecision = ({
  currentDifficulty = DIFFICULTY_LEVELS.INTERMEDIATE,
  score = 6,
  evidenceEvaluation = null,
  consecutiveStrong = 0,
  consecutiveWeak = 0,
  followUpCount = 0,
  currentQuestionDepth = 0,
  isFinalQuestion = false
}) => {
  const safeCurrentDiff = normalizeDifficulty(currentDifficulty);
  const numScore = Number(score) || 0;

  // Final question boundary: No further adaptation needed
  if (isFinalQuestion) {
    return {
      previousDifficulty: safeCurrentDiff,
      newDifficulty: safeCurrentDiff,
      action: STEERING_ACTIONS.MAINTAIN_DIFFICULTY,
      reason: "Interview allocation completed; finalized session at current difficulty.",
      consecutiveStrongAnswers: consecutiveStrong,
      consecutiveWeakAnswers: consecutiveWeak,
      isEligibleForFollowUp: false,
      hasCriticalMisconception: false
    };
  }

  // 1. Analyze evidence for critical misconceptions or unsupported claims
  const evidenceList = Array.isArray(evidenceEvaluation?.evidence) ? evidenceEvaluation.evidence : [];
  const criticalMisconceptions = evidenceList.filter(
    e => e.classification === 'misunderstanding' || (e.classification === 'incorrect' && numScore < 4.0)
  );
  const hasCriticalMisconception = criticalMisconceptions.length > 0;

  // Check technical accuracy criterion
  const techAccuracyScore = evidenceEvaluation?.criteriaScores?.find(
    c => c.name === 'Technical Accuracy' || c.criterion === 'technical_accuracy'
  )?.score ?? numScore;

  let newConsecutiveStrong = consecutiveStrong;
  let newConsecutiveWeak = consecutiveWeak;
  let newDifficulty = safeCurrentDiff;
  let action = STEERING_ACTIONS.MAINTAIN_DIFFICULTY;
  let reason = "";

  // 2. High Performance / Promotion Evaluation
  if (numScore >= ADAPTIVE_CONFIG.STRONG_SCORE_THRESHOLD && techAccuracyScore >= 7.0 && !hasCriticalMisconception) {
    newConsecutiveStrong = consecutiveStrong + 1;
    newConsecutiveWeak = 0;

    // Rule: Never promote on a single answer alone. Require CONSECUTIVE_STRONG_FOR_PROMOTION.
    if (newConsecutiveStrong >= ADAPTIVE_CONFIG.CONSECUTIVE_STRONG_FOR_PROMOTION) {
      if (safeCurrentDiff === DIFFICULTY_LEVELS.BEGINNER) {
        newDifficulty = DIFFICULTY_LEVELS.INTERMEDIATE;
        action = STEERING_ACTIONS.INCREASE_DIFFICULTY;
        reason = `Candidate achieved ${newConsecutiveStrong} consecutive strong answers (current: ${numScore}/10). Promoting difficulty from Beginner to Intermediate.`;
      } else if (safeCurrentDiff === DIFFICULTY_LEVELS.INTERMEDIATE) {
        newDifficulty = DIFFICULTY_LEVELS.ADVANCED;
        action = STEERING_ACTIONS.INCREASE_DIFFICULTY;
        reason = `Candidate demonstrated consistent technical depth across ${newConsecutiveStrong} answers (current: ${numScore}/10). Elevating to Advanced architectural scenarios.`;
      } else {
        newDifficulty = DIFFICULTY_LEVELS.ADVANCED;
        action = STEERING_ACTIONS.MAINTAIN_DIFFICULTY;
        reason = `Candidate maintained advanced mastery (score: ${numScore}/10). Retaining Advanced difficulty for complex edge-case exploration.`;
      }
      newConsecutiveStrong = 0; // Reset streak upon tier promotion
    } else {
      newDifficulty = safeCurrentDiff;
      action = STEERING_ACTIONS.MAINTAIN_DIFFICULTY;
      reason = `Candidate gave a strong answer (${numScore}/10). Maintaining ${safeCurrentDiff} to verify consistency before difficulty promotion (Streak: ${newConsecutiveStrong}/${ADAPTIVE_CONFIG.CONSECUTIVE_STRONG_FOR_PROMOTION}).`;
    }

  // 3. Low Performance / Critical Misconception / Demotion Evaluation
  } else if (hasCriticalMisconception || numScore < ADAPTIVE_CONFIG.WEAK_SCORE_THRESHOLD) {
    newConsecutiveWeak = consecutiveWeak + 1;
    newConsecutiveStrong = 0;

    if (hasCriticalMisconception) {
      // Immediate diagnostic intervention for critical misconception
      if (safeCurrentDiff === DIFFICULTY_LEVELS.ADVANCED) {
        newDifficulty = DIFFICULTY_LEVELS.INTERMEDIATE;
        action = STEERING_ACTIONS.DIAGNOSTIC_PIVOT;
        reason = `Critical misconception detected in technical explanation. Stepping down to Intermediate for foundational diagnosis.`;
      } else if (safeCurrentDiff === DIFFICULTY_LEVELS.INTERMEDIATE && newConsecutiveWeak >= 2) {
        newDifficulty = DIFFICULTY_LEVELS.BEGINNER;
        action = STEERING_ACTIONS.DECREASE_DIFFICULTY;
        reason = `Persistent technical misunderstanding detected. Transitioning to Beginner to examine core mechanics.`;
      } else {
        newDifficulty = safeCurrentDiff;
        action = STEERING_ACTIONS.DIAGNOSTIC_PIVOT;
        reason = `Specific misunderstanding detected (${criticalMisconceptions[0]?.description || 'concept gap'}). Pivoting to targeted diagnostic question.`;
      }
    } else if (newConsecutiveWeak >= ADAPTIVE_CONFIG.CONSECUTIVE_WEAK_FOR_DEMOTION) {
      // Demotion threshold met
      if (safeCurrentDiff === DIFFICULTY_LEVELS.ADVANCED) {
        newDifficulty = DIFFICULTY_LEVELS.INTERMEDIATE;
        action = STEERING_ACTIONS.DECREASE_DIFFICULTY;
        reason = `Candidate recorded ${newConsecutiveWeak} consecutive struggling answers. Demoting difficulty to Intermediate practical scenarios.`;
      } else if (safeCurrentDiff === DIFFICULTY_LEVELS.INTERMEDIATE) {
        newDifficulty = DIFFICULTY_LEVELS.BEGINNER;
        action = STEERING_ACTIONS.DECREASE_DIFFICULTY;
        reason = `Candidate struggled on consecutive answers. Adjusting to Beginner to reinforce foundational understanding.`;
      } else {
        newDifficulty = DIFFICULTY_LEVELS.BEGINNER;
        action = STEERING_ACTIONS.MAINTAIN_DIFFICULTY;
        reason = `Candidate is at Beginner tier. Maintaining Beginner difficulty and investigating fundamental concepts.`;
      }
      newConsecutiveWeak = 0; // Reset streak upon demotion
    } else {
      newDifficulty = safeCurrentDiff;
      action = STEERING_ACTIONS.MAINTAIN_DIFFICULTY;
      reason = `Candidate gave a weak answer (${numScore}/10). Maintaining ${safeCurrentDiff} to assess whether weakness is isolated or systemic (Streak: ${newConsecutiveWeak}/${ADAPTIVE_CONFIG.CONSECUTIVE_WEAK_FOR_DEMOTION}).`;
    }

  // 4. Moderate / Average Performance (Score 5.0 to 7.9)
  } else {
    newConsecutiveStrong = 0;
    newConsecutiveWeak = 0;
    newDifficulty = safeCurrentDiff;

    // Check if an interesting detail warrants a contextual follow-up
    const isEligibleForFollowUp = 
      followUpCount < ADAPTIVE_CONFIG.MAX_FOLLOW_UPS_PER_INTERVIEW &&
      currentQuestionDepth < ADAPTIVE_CONFIG.MAX_FOLLOW_UP_DEPTH &&
      evidenceList.some(e => e.classification === 'partially_correct' || e.classification === 'alternative_approach');

    if (isEligibleForFollowUp) {
      action = STEERING_ACTIONS.FOLLOW_UP_PROBE;
      reason = `Candidate provided a satisfactory response with partial nuances. Probing deeper into implementation specifics.`;
    } else {
      action = STEERING_ACTIONS.MAINTAIN_DIFFICULTY;
      reason = `Candidate demonstrated solid standard competency (${numScore}/10). Maintaining ${safeCurrentDiff} difficulty.`;
    }
  }

  return {
    previousDifficulty: safeCurrentDiff,
    newDifficulty,
    action,
    reason,
    consecutiveStrongAnswers: newConsecutiveStrong,
    consecutiveWeakAnswers: newConsecutiveWeak,
    hasCriticalMisconception,
    criticalMisconceptions
  };
};
