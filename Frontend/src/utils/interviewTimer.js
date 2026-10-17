/**
 * Configurable timer constants and helpers for interview sessions.
 */
export const DEFAULT_QUESTION_DURATION = 120; // 120 seconds default per question
export const LOW_TIME_THRESHOLD = 30; // 30 seconds threshold for warning state

/**
 * Format total seconds to MM:SS display format.
 * @param {number} totalSeconds
 * @returns {string} e.g. "02:15"
 */
export const formatTimeMMSS = (totalSeconds) => {
  const safeSec = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Determine timer state for visual styling and telemetry.
 * @param {number} timeLeft
 * @returns {'normal' | 'low' | 'expired'}
 */
export const getTimerStatus = (timeLeft) => {
  if (timeLeft <= 0) return 'expired';
  if (timeLeft <= LOW_TIME_THRESHOLD) return 'low';
  return 'normal';
};
