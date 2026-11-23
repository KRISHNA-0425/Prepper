/**
 * @file executionLimits.js
 * Authoritative resource bounds, timeouts, and sanitized environment variables
 * for safe child-process code execution inside the Node.js backend.
 */

export const EXECUTION_LIMITS = {
  // Execution time bounds (milliseconds)
  DEFAULT_TIMEOUT_MS: 5000, // 5.0 seconds per test case
  MAX_TIMEOUT_MS: 10000,
  COMPILATION_TIMEOUT_MS: 10000, // 10.0 seconds for gcc/g++/javac

  // Payload and buffer bounds (bytes)
  MAX_SOURCE_CODE_BYTES: 64 * 1024, // 64 KB
  MAX_OUTPUT_BUFFER_BYTES: 64 * 1024, // 64 KB stdout/stderr limit

  // Concurrency bounds
  MAX_CONCURRENT_EXECUTIONS: Number(process.env.MAX_CONCURRENT_EXECUTIONS) || 10,

  // Rate limiting (milliseconds between runs per user)
  RUN_RATE_LIMIT_MS: 1500,

  // Memory limits passed to runtimes
  JAVA_MAX_HEAP: '-Xmx128m',
  NODE_MAX_OLD_SPACE: '--max-old-space-size=128',
};

/**
 * Returns a strictly sanitized environment dictionary.
 * Strips all application secrets (MONGO_URL, JWT_SECRET, OPEN_ROUTER_*, RAZORPAY_*, etc.)
 * to prevent candidate code from accessing credentials via process.env.
 */
export function getSanitizedEnv() {
  const safeEnv = {
    PATH: process.env.PATH || '',
    NODE_ENV: 'sandbox',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    TEMP: process.env.TEMP || process.env.TMP || '/tmp',
    TMP: process.env.TEMP || process.env.TMP || '/tmp',
  };

  // Windows system essentials for standard library DLLs and runtime resolution
  if (process.platform === 'win32') {
    if (process.env.SystemRoot) safeEnv.SystemRoot = process.env.SystemRoot;
    if (process.env.COMSPEC) safeEnv.COMSPEC = process.env.COMSPEC;
    if (process.env.PATHEXT) safeEnv.PATHEXT = process.env.PATHEXT;
    if (process.env.USERPROFILE) safeEnv.USERPROFILE = process.env.USERPROFILE;
    if (process.env.LOCALAPPDATA) safeEnv.LOCALAPPDATA = process.env.LOCALAPPDATA;
    if (process.env.APPDATA) safeEnv.APPDATA = process.env.APPDATA;
  } else {
    safeEnv.HOME = '/tmp';
  }

  return safeEnv;
}
