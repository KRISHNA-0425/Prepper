/**
 * @file interviewPricing.service.js
 * Authoritative Server-Side Pricing, Packaging and Timing Rules for Prepper AI Interviews.
 * Enforces question-based and time-based packaging parity, strict medium difficulty,
 * server-side answer deadlines (60s), and overall session expiration.
 */

export const QUESTION_PRICING_RATE = 5; // 5 credits per question
export const MIN_QUESTION_COUNT = 5;
export const MAX_QUESTION_COUNT = 20;
export const DEFAULT_QUESTION_COUNT = 10;
export const ANSWER_TIME_LIMIT_SECONDS = 60; // Strict 60 seconds per answer
export const ANSWER_GRACE_PERIOD_SECONDS = 5; // Grace period for network transit
export const STANDARDIZED_DIFFICULTY = 'medium';

// Dedicated Live Coding Pricing & Constraints
export const MIN_CODING_QUESTION_COUNT = 1;
export const MAX_CODING_QUESTION_COUNT = 5;
export const DEFAULT_CODING_QUESTION_COUNT = 2;
export const CODING_QUESTION_PRICING_RATE = 10; // 10 credits per coding question

export const TIME_PACKAGES = {
  '30': {
    id: '30_minutes',
    durationMinutes: 30,
    targetQuestions: 10,
    credits: 50,
    label: 'Half an hour',
  },
  '60': {
    id: '60_minutes',
    durationMinutes: 60,
    targetQuestions: 15,
    credits: 75,
    label: 'One hour',
  },
  '120': {
    id: '120_minutes',
    durationMinutes: 120,
    targetQuestions: 30,
    credits: 150,
    label: 'Two hours',
  },
};

/**
 * Normalizes and validates interview mode and packaging details.
 * Calculates authoritative credit price on the server. Never trusts client prices.
 *
 * @param {object} params
 * @param {string} [params.interviewMode] - 'question_based' or 'time_based'
 * @param {number|string} [params.selectedQuestionCount] - 5 to 20 for question-based
 * @param {number|string} [params.durationMinutes] - 30, 60, or 120 for time-based
 * @param {string} [params.timePackage] - '30', '60', '120', '30_minutes', etc.
 * @returns {{ valid: boolean, error?: string, interviewMode: string, selectedQuestionCount: number, selectedDurationMinutes: number|null, targetQuestionCount: number, creditsCharged: number, difficulty: string, answerTimeLimitSeconds: number }}
 */
export const calculateInterviewPricing = (params = {}) => {
  const {
    interviewMode,
    selectedQuestionCount,
    durationMinutes,
    timePackage,
    interviewType,
    isCoding,
    mode,
  } = params;

  // 0. Dedicated Live Coding Mode (1 to 5 questions, custom duration, 10 credits/question)
  const isCodingSession = interviewType === 'coding' || isCoding || mode === 'Coding';
  if (isCodingSession) {
    let count = Number(selectedQuestionCount);
    if (!Number.isInteger(count) || count < MIN_CODING_QUESTION_COUNT || count > MAX_CODING_QUESTION_COUNT) {
      if (selectedQuestionCount === undefined || selectedQuestionCount === null) {
        count = DEFAULT_CODING_QUESTION_COUNT;
      } else {
        return {
          valid: false,
          error: `Coding question count must be an integer between ${MIN_CODING_QUESTION_COUNT} and ${MAX_CODING_QUESTION_COUNT} problems.`,
          interviewMode: 'coding',
          selectedQuestionCount: count,
          selectedDurationMinutes: null,
          targetQuestionCount: count,
          creditsCharged: 0,
          difficulty: params.difficulty || STANDARDIZED_DIFFICULTY,
          answerTimeLimitSeconds: 1800,
        };
      }
    }

    let parsedDuration = null;
    if (durationMinutes) {
      parsedDuration = Number(durationMinutes);
    } else if (timePackage && !isNaN(Number(timePackage))) {
      parsedDuration = Number(timePackage);
    }

    if (parsedDuration && (isNaN(parsedDuration) || parsedDuration < 10 || parsedDuration > 240)) {
      return {
        valid: false,
        error: 'Coding interview duration must be between 10 and 240 minutes.',
        interviewMode: 'time_based',
        selectedQuestionCount: count,
        selectedDurationMinutes: null,
        targetQuestionCount: count,
        creditsCharged: 0,
        difficulty: params.difficulty || STANDARDIZED_DIFFICULTY,
        answerTimeLimitSeconds: 1800,
      };
    }

    const creditsCharged = count * CODING_QUESTION_PRICING_RATE;

    return {
      valid: true,
      interviewMode: parsedDuration ? 'time_based' : 'question_based',
      selectedQuestionCount: count,
      selectedDurationMinutes: parsedDuration,
      targetQuestionCount: count,
      creditsCharged,
      difficulty: params.difficulty || STANDARDIZED_DIFFICULTY,
      answerTimeLimitSeconds: parsedDuration ? parsedDuration * 60 : 3600,
    };
  }

  // 1. Time-Based Mode
  if (interviewMode === 'time_based') {
    const rawKey = String(durationMinutes || timePackage || '').trim().toLowerCase();
    
    // Explicit whitelist of authorized package representations - strict exact matching
    const ALLOWED_30 = new Set(['30', '30_minutes', '30m', '30min', '30mins', 'half', 'half an hour', 'half-hour']);
    const ALLOWED_60 = new Set(['60', '60_minutes', '60m', '60min', '60mins', 'one', 'one hour', '1 hour', '1hr']);
    const ALLOWED_120 = new Set(['120', '120_minutes', '120m', '120min', '120mins', 'two', 'two hours', '2 hours', '2hr', '2hrs']);

    let matchedKey = null;
    if (ALLOWED_30.has(rawKey)) {
      matchedKey = '30';
    } else if (ALLOWED_60.has(rawKey)) {
      matchedKey = '60';
    } else if (ALLOWED_120.has(rawKey)) {
      matchedKey = '120';
    }

    if (!matchedKey || !TIME_PACKAGES[matchedKey]) {
      return {
        valid: false,
        error: 'Invalid time-based package. Supported packages are 30 minutes (50 credits), 60 minutes (75 credits), and 120 minutes (150 credits).',
        interviewMode: 'time_based',
        selectedQuestionCount: 0,
        selectedDurationMinutes: null,
        targetQuestionCount: 0,
        creditsCharged: 0,
        difficulty: STANDARDIZED_DIFFICULTY,
        answerTimeLimitSeconds: ANSWER_TIME_LIMIT_SECONDS,
      };
    }

    const pkg = TIME_PACKAGES[matchedKey];
    return {
      valid: true,
      interviewMode: 'time_based',
      selectedQuestionCount: pkg.targetQuestions,
      selectedDurationMinutes: pkg.durationMinutes,
      targetQuestionCount: pkg.targetQuestions,
      creditsCharged: pkg.credits,
      difficulty: STANDARDIZED_DIFFICULTY,
      answerTimeLimitSeconds: ANSWER_TIME_LIMIT_SECONDS,
    };
  }

  // 2. Question-Based Mode (Explicit or default)
  const isExplicitQuestionMode = interviewMode === 'question_based' || !interviewMode;
  if (isExplicitQuestionMode) {
    // If selectedQuestionCount is completely omitted in legacy requests, default to 10 (or 5 for legacy 5-question tests)
    let count;
    if (selectedQuestionCount === undefined || selectedQuestionCount === null) {
      count = DEFAULT_QUESTION_COUNT;
    } else {
      count = Number(selectedQuestionCount);
    }

    if (!Number.isInteger(count) || count < MIN_QUESTION_COUNT || count > MAX_QUESTION_COUNT) {
      return {
        valid: false,
        error: `Question count must be an integer between ${MIN_QUESTION_COUNT} and ${MAX_QUESTION_COUNT} questions.`,
        interviewMode: 'question_based',
        selectedQuestionCount: count,
        selectedDurationMinutes: null,
        targetQuestionCount: count,
        creditsCharged: 0,
        difficulty: STANDARDIZED_DIFFICULTY,
        answerTimeLimitSeconds: ANSWER_TIME_LIMIT_SECONDS,
      };
    }

    const creditsCharged = count * QUESTION_PRICING_RATE;

    return {
      valid: true,
      interviewMode: 'question_based',
      selectedQuestionCount: count,
      selectedDurationMinutes: null,
      targetQuestionCount: count,
      creditsCharged,
      difficulty: STANDARDIZED_DIFFICULTY,
      answerTimeLimitSeconds: ANSWER_TIME_LIMIT_SECONDS,
    };
  }

  // 3. Unrecognized mode
  return {
    valid: false,
    error: "Invalid interview mode. Must be 'question_based' or 'time_based'.",
    interviewMode,
    selectedQuestionCount: 0,
    selectedDurationMinutes: null,
    targetQuestionCount: 0,
    creditsCharged: 0,
    difficulty: STANDARDIZED_DIFFICULTY,
    answerTimeLimitSeconds: ANSWER_TIME_LIMIT_SECONDS,
  };
};

/**
 * Calculates the exact server-side deadline for an active question.
 * If overall session expiration is sooner than the 60s question limit,
 * the overall deadline takes strict priority.
 *
 * @param {object} params
 * @param {Date|string|number} [params.currentQuestionStartedAt]
 * @param {number} [params.answerTimeLimitSeconds]
 * @param {Date|string|number} [params.expiresAt]
 * @returns {Date}
 */
export const calculateQuestionDeadline = ({
  currentQuestionStartedAt = new Date(),
  answerTimeLimitSeconds = ANSWER_TIME_LIMIT_SECONDS,
  expiresAt = null,
} = {}) => {
  const started = new Date(currentQuestionStartedAt);
  const nominalDeadline = new Date(started.getTime() + answerTimeLimitSeconds * 1000);

  if (expiresAt) {
    const sessionExpires = new Date(expiresAt);
    if (sessionExpires < nominalDeadline) {
      return sessionExpires;
    }
  }

  return nominalDeadline;
};

/**
 * Evaluates whether an answer submission occurred after the server deadline.
 *
 * @param {object} params
 * @param {Date|string|number} params.currentQuestionStartedAt
 * @param {Date|string|number} [params.currentQuestionDeadline]
 * @param {number} [params.answerTimeLimitSeconds=60]
 * @param {number} [params.gracePeriodSeconds=5]
 * @param {Date} [params.now=new Date()]
 * @returns {{ isTimedOut: boolean, elapsedSeconds: number }}
 */
export const verifyAnswerDeadline = ({
  currentQuestionStartedAt,
  currentQuestionDeadline,
  answerTimeLimitSeconds = ANSWER_TIME_LIMIT_SECONDS,
  gracePeriodSeconds = ANSWER_GRACE_PERIOD_SECONDS,
  now = new Date(),
} = {}) => {
  const startedTime = currentQuestionStartedAt ? new Date(currentQuestionStartedAt).getTime() : now.getTime();
  const elapsedSeconds = Math.max(0, (now.getTime() - startedTime) / 1000);

  let deadlineTime = currentQuestionDeadline ? new Date(currentQuestionDeadline).getTime() : null;
  if (!deadlineTime) {
    deadlineTime = startedTime + answerTimeLimitSeconds * 1000;
  }

  const isTimedOut = now.getTime() > (deadlineTime + gracePeriodSeconds * 1000);
  return { isTimedOut, elapsedSeconds: Math.round(elapsedSeconds) };
};

