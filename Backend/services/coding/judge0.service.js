/**
 * @file judge0.service.js
 * Production Client for Self-Hosted Judge0 Community Edition (CE).
 * Handles language retrieval, submission creation, async polling, and status decoding.
 */

import axios from 'axios';

export const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
};

// Fallback metadata for core languages when Judge0 is starting up or in unit test mode
export const DEFAULT_LANGUAGE_CATALOG = [
  { id: 63, name: 'JavaScript (Node.js 12.14.0)', slug: 'javascript', monacoLang: 'javascript', extension: 'js' },
  { id: 74, name: 'TypeScript (3.7.4)', slug: 'typescript', monacoLang: 'typescript', extension: 'ts' },
  { id: 71, name: 'Python (3.8.1)', slug: 'python', monacoLang: 'python', extension: 'py' },
  { id: 54, name: 'C++ (GCC 9.2.0)', slug: 'cpp', monacoLang: 'cpp', extension: 'cpp' },
  { id: 62, name: 'Java (OpenJDK 13.0.1)', slug: 'java', monacoLang: 'java', extension: 'java' },
  { id: 50, name: 'C (GCC 9.2.0)', slug: 'c', monacoLang: 'c', extension: 'c' },
  { id: 51, name: 'C# (Mono 6.6.0.161)', slug: 'csharp', monacoLang: 'csharp', extension: 'cs' },
  { id: 60, name: 'Go (1.13.5)', slug: 'go', monacoLang: 'go', extension: 'go' },
];

let cachedLanguages = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const encodeBase64 = (str) => {
  if (typeof str !== 'string') return '';
  return Buffer.from(str, 'utf-8').toString('base64');
};

export const decodeBase64 = (str) => {
  if (!str || typeof str !== 'string') return '';
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch {
    return str;
  }
};

export class Judge0Service {
  constructor(baseUrl = process.env.JUDGE0_API_URL || 'http://localhost:2358') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Checks if Judge0 API and worker cluster are reachable.
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/about');
      return {
        healthy: true,
        version: response.data?.version || 'Community Edition',
        details: response.data,
      };
    } catch (err) {
      return {
        healthy: false,
        error: err.message,
      };
    }
  }

  /**
   * Retrieves available programming languages from Judge0, enriched with frontend metadata.
   */
  async getLanguages(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedLanguages && (now - lastCacheTime < CACHE_TTL_MS)) {
      return cachedLanguages;
    }

    try {
      const response = await this.client.get('/languages');
      const rawList = Array.isArray(response.data) ? response.data : [];

      if (rawList.length > 0) {
        // Map raw Judge0 languages to enriched representations
        const enriched = rawList.map((lang) => {
          const lowerName = lang.name.toLowerCase();
          let slug = 'unknown';
          let monacoLang = 'plaintext';
          let extension = 'txt';

          if (lowerName.includes('javascript') || lowerName.includes('node')) {
            slug = 'javascript';
            monacoLang = 'javascript';
            extension = 'js';
          } else if (lowerName.includes('typescript')) {
            slug = 'typescript';
            monacoLang = 'typescript';
            extension = 'ts';
          } else if (lowerName.includes('python')) {
            slug = 'python';
            monacoLang = 'python';
            extension = 'py';
          } else if (lowerName.includes('c++')) {
            slug = 'cpp';
            monacoLang = 'cpp';
            extension = 'cpp';
          } else if (lowerName.includes('java ') || lowerName.startsWith('java')) {
            slug = 'java';
            monacoLang = 'java';
            extension = 'java';
          } else if (lowerName.includes('c (')) {
            slug = 'c';
            monacoLang = 'c';
            extension = 'c';
          } else if (lowerName.includes('c#')) {
            slug = 'csharp';
            monacoLang = 'csharp';
            extension = 'cs';
          } else if (lowerName.includes('go')) {
            slug = 'go';
            monacoLang = 'go';
            extension = 'go';
          }

          return {
            id: lang.id,
            name: lang.name,
            slug,
            monacoLang,
            extension,
            isArchived: Boolean(lang.is_archived),
          };
        });

        cachedLanguages = enriched;
        lastCacheTime = now;
        return enriched;
      }
    } catch {
      // Fallback if Judge0 is currently initializing
    }

    return DEFAULT_LANGUAGE_CATALOG;
  }

  /**
   * Submits code to Judge0 for isolated execution.
   */
  async createSubmission({
    sourceCode,
    languageId,
    stdin = '',
    expectedOutput = '',
    cpuTimeLimit = 5.0,
    wallTimeLimit = 10.0,
    memoryLimitKb = 128000,
  }) {
    const payload = {
      source_code: encodeBase64(sourceCode),
      language_id: Number(languageId),
      stdin: encodeBase64(stdin),
      expected_output: expectedOutput ? encodeBase64(expectedOutput) : undefined,
      cpu_time_limit: Math.max(1, Math.min(15, Number(cpuTimeLimit) || 5)),
      wall_time_limit: Math.max(2, Math.min(20, Number(wallTimeLimit) || 10)),
      memory_limit: Math.max(16000, Math.min(256000, Number(memoryLimitKb) || 128000)),
    };

    const response = await this.client.post('/submissions?base64_encoded=true&wait=false', payload);
    return response.data?.token;
  }

  /**
   * Polls submission result until finished or timed out.
   */
  async pollSubmission(token, maxWaitMs = 12000, intervalMs = 400) {
    if (!token) throw new Error('Submission token is required for polling');

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const response = await this.client.get(`/submissions/${token}?base64_encoded=true`);
      const data = response.data;
      const statusId = data?.status?.id;

      // Status 1 (In Queue) or 2 (Processing) mean it's still running
      if (statusId !== JUDGE0_STATUS.IN_QUEUE && statusId !== JUDGE0_STATUS.PROCESSING) {
        return {
          token: data.token,
          statusId,
          statusDescription: data.status?.description || 'Unknown',
          stdout: decodeBase64(data.stdout),
          stderr: decodeBase64(data.stderr),
          compileOutput: decodeBase64(data.compile_output),
          message: decodeBase64(data.message),
          time: parseFloat(data.time || '0'),
          memory: parseInt(data.memory || '0', 10),
          passed: statusId === JUDGE0_STATUS.ACCEPTED,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Judge0 submission timed out during polling');
  }

  /**
   * High-level helper: Submits and waits for execution output.
   */
  async executeCode(options) {
    const token = await this.createSubmission(options);
    return await this.pollSubmission(token);
  }
}

export default new Judge0Service();
