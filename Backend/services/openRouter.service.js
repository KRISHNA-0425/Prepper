import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const DEFAULT_OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_TIMEOUT_MS = 120000; // 120 seconds default timeout
export const DEFAULT_MAX_RETRIES = 2; // Up to 2 retries (3 total attempts)

/**
 * Detects whether an OpenRouter error indicates daily free-model quota exhaustion
 * (e.g. "Rate limit exceeded: free-models-per-day").
 *
 * @param {Error} error
 * @returns {boolean}
 */
export const isFreeModelDailyQuotaExceeded = (error) => {
  const providerMessage = error?.response?.data?.error?.message || '';
  const errorMsg = error?.message || '';
  const combined = `${providerMessage} ${errorMsg}`.toLowerCase();

  return (
    combined.includes('free-models-per-day') ||
    (combined.includes('rate limit') && combined.includes('free-model')) ||
    combined.includes('daily free-model') ||
    combined.includes('free model daily quota')
  );
};

/**
 * Validates OpenRouter configuration parameters safely without leaking sensitive API keys.
 *
 * @param {object} [options={}]
 * @param {string} [options.apiKey]
 * @param {string} [options.model]
 * @param {string} [options.url]
 * @returns {{ apiKey: string, model: string, endpoint: string }}
 */
export const validateOpenRouterConfig = (options = {}) => {
  const rawApiKey = options.apiKey !== undefined ? options.apiKey : process.env.OPEN_ROUTER_APIKEY;
  const apiKey = (rawApiKey || '').trim();
  if (!apiKey) {
    throw new Error('OpenRouter API key is missing. Please configure OPEN_ROUTER_APIKEY in environment variables.');
  }

  const rawModel = options.model !== undefined ? options.model : process.env.OPEN_ROUTER_MODEL;
  const model = (rawModel || '').trim();
  if (!model) {
    throw new Error('OpenRouter model is missing. Please configure OPEN_ROUTER_MODEL in environment variables.');
  }

  const rawUrl = (options.url !== undefined ? options.url : (process.env.OPEN_ROUTER_URL || DEFAULT_OPENROUTER_ENDPOINT) || '').trim();
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
  } catch {
    const hint = rawUrl.includes('/') && !rawUrl.includes('://')
      ? ' It looks like a model name was provided as the URL instead of an HTTP/HTTPS endpoint.'
      : '';
    throw new Error(`Invalid OpenRouter endpoint URL: "${rawUrl}". Expected a valid URL (e.g. "${DEFAULT_OPENROUTER_ENDPOINT}").${hint}`);
  }

  return {
    apiKey,
    model,
    endpoint: rawUrl,
  };
};

/**
 * Classifies an error into operational categories without exposing credentials.
 * @param {Error} error
 * @returns {string} 'FREE_MODEL_DAILY_LIMIT_EXCEEDED' | 'TIMEOUT' | 'RATE_LIMIT' | 'CLIENT_ERROR' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN'
 */
export const categorizeError = (error) => {
  if (isFreeModelDailyQuotaExceeded(error)) {
    return 'FREE_MODEL_DAILY_LIMIT_EXCEEDED';
  }

  const statusCode = error?.response?.status;
  const code = error?.code;
  const message = error?.message || '';

  if (code === 'ECONNABORTED' || message.toLowerCase().includes('timeout')) {
    return 'TIMEOUT';
  }
  if (statusCode === 429) {
    return 'RATE_LIMIT';
  }
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return 'CLIENT_ERROR';
  }
  if (statusCode && statusCode >= 500) {
    return 'SERVER_ERROR';
  }
  if (code === 'ENOTFOUND' || code === 'ECONNRESET' || code === 'ERR_NETWORK') {
    return 'NETWORK_ERROR';
  }
  return 'UNKNOWN';
};

/**
 * Determines whether an error is transient and eligible for retry.
 * Permanent errors (400, 401, 403, 404, 422) and daily free quota exhaustion are NOT retried.
 * Timeouts, temporary 429, and 5xx are retried.
 * @param {Error} error
 * @returns {boolean}
 */
export const isTransientError = (error) => {
  if (isFreeModelDailyQuotaExceeded(error)) {
    return false; // Permanent for the current day; retries cannot resolve daily quota exhaustion
  }
  const category = categorizeError(error);
  if (category === 'TIMEOUT' || category === 'RATE_LIMIT' || category === 'SERVER_ERROR' || category === 'NETWORK_ERROR') {
    return true;
  }
  return false;
};

/**
 * Calculates exponential backoff delay, respecting Retry-After header for temporary 429 rate limits.
 * @param {number} attempt
 * @param {Error} error
 * @param {number} [baseDelayMs=1000]
 * @returns {number}
 */
export const calculateRetryDelay = (attempt, error, baseDelayMs = 1000) => {
  if (error?.response?.status === 429) {
    const retryAfter = error?.response?.headers?.['retry-after'];
    if (retryAfter) {
      const parsedSeconds = Number(retryAfter);
      if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        return Math.min(30000, parsedSeconds * 1000);
      }
    }
  }
  // Exponential backoff: baseDelay * 2^(attempt - 1)
  const delay = baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(10000, delay);
};

export const askAI = async (messages, options = {}) => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error('No messages provided to askAI');
  }

  const { apiKey, model, endpoint } = validateOpenRouterConfig(options);
  const maxTokens = options.max_tokens || 800;

  // Resolves timeout: options.timeout || OPEN_ROUTER_TIMEOUT from env || 120000 (120s)
  const envTimeout = Number(process.env.OPEN_ROUTER_TIMEOUT);
  const timeout = options.timeout || (!isNaN(envTimeout) && envTimeout > 0 ? envTimeout : DEFAULT_TIMEOUT_MS);

  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.retryDelayMs !== undefined ? options.retryDelayMs : 1000;
  const axiosClient = options.axiosInstance || axios;

  const payload = {
    model,
    messages,
    max_tokens: maxTokens,
  };

  let lastError;
  const totalStartTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const attemptStartTime = Date.now();
    try {
      const response = await axiosClient.post(
        endpoint,
        payload,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout,
        }
      );

      const content = response?.data?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        throw new Error('Empty response content received from OpenRouter API');
      }

      return content;
    } catch (error) {
      const elapsedMs = Date.now() - attemptStartTime;
      const statusCode = error?.response?.status;
      const category = categorizeError(error);
      const isDailyQuota = isFreeModelDailyQuotaExceeded(error);
      const providerMessage = error?.response?.data?.error?.message;
      const safeMessage = providerMessage || error?.message || 'Error occurred while communicating with OpenRouter';

      const wrappedError = new Error(safeMessage);
      if (statusCode) wrappedError.status = statusCode;
      if (isDailyQuota) {
        wrappedError.code = 'FREE_MODEL_DAILY_LIMIT_EXCEEDED';
        wrappedError.errorCode = 'FREE_MODEL_DAILY_LIMIT_EXCEEDED';
      } else {
        wrappedError.code = error?.code;
      }
      lastError = wrappedError;

      const isTransient = !isDailyQuota && isTransientError(error);
      const canRetry = attempt <= maxRetries && isTransient;

      if (canRetry) {
        const delayMs = calculateRetryDelay(attempt, error, baseDelayMs);
        console.warn(
          `[openRouter.service] Attempt ${attempt}/${maxRetries + 1} failed in ${elapsedMs}ms. ` +
          `Category: ${category}, Status: ${statusCode || 'N/A'}. Retrying in ${delayMs}ms... Error: ${safeMessage}`
        );
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } else {
        const totalElapsedMs = Date.now() - totalStartTime;
        console.error(
          `[openRouter.service] Request failed on attempt ${attempt}/${maxRetries + 1} ` +
          `(elapsed: ${elapsedMs}ms, total: ${totalElapsedMs}ms). ` +
          `Category: ${category}, Status: ${statusCode || 'N/A'}. ` +
          `${isDailyQuota ? 'Daily free-model quota exhausted. Bailing out immediately without retries.' : isTransient ? 'Max retries exhausted.' : 'Permanent error, not retrying.'} ` +
          `Error: ${safeMessage}`
        );
        throw wrappedError;
      }
    }
  }

  throw lastError;
};
