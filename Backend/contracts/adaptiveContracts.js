/**
 * @file adaptiveContracts.js
 * Domain contracts, enums, configurable thresholds, and transition phrase templates
 * for Prepper AI's Dynamic Adaptive Questioning & Real-Time Performance Steering Engine.
 */

export const DIFFICULTY_LEVELS = Object.freeze({
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
});

export const ALL_DIFFICULTY_LEVELS = Object.freeze(Object.values(DIFFICULTY_LEVELS));

export const STEERING_ACTIONS = Object.freeze({
  INCREASE_DIFFICULTY: 'increase_difficulty',
  DECREASE_DIFFICULTY: 'decrease_difficulty',
  MAINTAIN_DIFFICULTY: 'maintain_difficulty',
  FOLLOW_UP_PROBE: 'follow_up_probe',
  DIAGNOSTIC_PIVOT: 'diagnostic_pivot',
  TOPIC_PIVOT: 'topic_pivot',
});

export const ALL_STEERING_ACTIONS = Object.freeze(Object.values(STEERING_ACTIONS));

export const TOPIC_STATUS = Object.freeze({
  STRONG: 'strong',
  AVERAGE: 'average',
  WEAK: 'weak',
});

export const GAP_SEVERITY = Object.freeze({
  MINOR: 'minor',
  MODERATE: 'moderate',
  CRITICAL: 'critical',
});

/**
 * Strict Configurable Decision Policy Thresholds
 */
export const ADAPTIVE_CONFIG = Object.freeze({
  STRONG_SCORE_THRESHOLD: 8.0,
  WEAK_SCORE_THRESHOLD: 5.0,
  CONSECUTIVE_STRONG_FOR_PROMOTION: 2, // Never promote on a single answer alone
  CONSECUTIVE_WEAK_FOR_DEMOTION: 2,   // Never demote on a single answer alone (unless critical misconception)
  MAX_FOLLOW_UPS_PER_INTERVIEW: 2,
  MAX_FOLLOW_UP_DEPTH: 1,
  MAX_CONSECUTIVE_SAME_TOPIC: 2,     // Anti-loop safeguard to prevent topic fixation
});

/**
 * Natural Conversational Transition Phrase Templates
 */
export const TRANSITION_PHRASES = Object.freeze({
  [STEERING_ACTIONS.INCREASE_DIFFICULTY]: [
    "You've shown strong mastery here. Let's elevate the challenge to a more complex architectural scenario.",
    "Excellent explanation. Let's explore how this scales under high concurrency and real-world edge cases.",
    "Great depth. Let's step up to an advanced problem involving system trade-offs."
  ],
  [STEERING_ACTIONS.DECREASE_DIFFICULTY]: [
    "Let's step back and revisit the foundational mechanics of this topic.",
    "Let's break this down into a more fundamental scenario to examine how it works under the hood.",
    "Let's focus on the core concepts before tackling more complex implementations."
  ],
  [STEERING_ACTIONS.MAINTAIN_DIFFICULTY]: [
    "Understood. Let's examine another practical scenario around this concept.",
    "Good. Let's look at another application of this principle.",
    "Clear. Let's continue with another implementation question."
  ],
  [STEERING_ACTIONS.FOLLOW_UP_PROBE]: [
    "Let's explore that specific aspect a little further.",
    "You touched on an interesting point. Can you elaborate on how you would handle that in practice?",
    "Let's drill into the implementation details of what you just mentioned."
  ],
  [STEERING_ACTIONS.DIAGNOSTIC_PIVOT]: [
    "To better pinpoint your approach here, let's explore a foundational diagnostic question.",
    "Let's clarify the underlying mechanism with a quick targeted question.",
    "Let's verify the core building block behind that solution."
  ],
  [STEERING_ACTIONS.TOPIC_PIVOT]: [
    "Thanks for that explanation. Now, let's transition to another key competency.",
    "Understood. Let's shift our focus to a different domain from your technical background.",
    "Great. Moving forward, let's explore your experience with another core area."
  ]
});

/**
 * Normalizes and clamps difficulty level strictly within known bounds.
 * @param {string} difficulty 
 * @returns {string} One of DIFFICULTY_LEVELS
 */
export const normalizeDifficulty = (difficulty) => {
  const safe = String(difficulty || '').toLowerCase().trim();
  if (safe === 'beginner' || safe === 'easy') return DIFFICULTY_LEVELS.BEGINNER;
  if (safe === 'advanced' || safe === 'hard') return DIFFICULTY_LEVELS.ADVANCED;
  return DIFFICULTY_LEVELS.INTERMEDIATE;
};

/**
 * Gets a random conversational transition phrase for a specific action.
 * @param {string} action - One of STEERING_ACTIONS
 * @param {string} [customTopic]
 * @returns {string}
 */
export const getTransitionPhrase = (action, customTopic = '') => {
  const phrases = TRANSITION_PHRASES[action] || TRANSITION_PHRASES[STEERING_ACTIONS.MAINTAIN_DIFFICULTY];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  if (customTopic && action === STEERING_ACTIONS.TOPIC_PIVOT) {
    return `Thanks for that explanation. Now, let's shift our focus to ${customTopic}.`;
  }
  return phrase;
};
