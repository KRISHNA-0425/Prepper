/**
 * @file testCase.service.js
 * Evaluates candidate code against test cases with output normalization, whitespace handling,
 * numeric float tolerance, and security masking for hidden evaluation test cases.
 */

import executionAdapter from './executionAdapter.service.js';
import driverTemplateService from './driverTemplate.service.js';

export class TestCaseService {
  /**
   * Normalizes output string by stripping CRLF, trimming trailing whitespace per line,
   * and removing leading/trailing empty lines.
   */
  normalizeOutput(output) {
    if (output === null || output === undefined) return '';
    return String(output)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }

  /**
   * Compares expected and actual output.
   * Supports strict string match and numeric float tolerance if both are numeric.
   */
  compareOutputs(actual, expected) {
    const normActual = this.normalizeOutput(actual);
    const normExpected = this.normalizeOutput(expected);

    if (normActual === normExpected) {
      return true;
    }

    // Try numeric comparison if both are numbers (handles precision differences like 3.14 vs 3.140)
    const numActual = Number(normActual);
    const numExpected = Number(normExpected);
    if (!Number.isNaN(numActual) && !Number.isNaN(numExpected) && normActual !== '' && normExpected !== '') {
      return Math.abs(numActual - numExpected) < 1e-6;
    }

    return false;
  }

  /**
   * Masks test case results for client security.
   * If a test case is hidden, its input and expectedOutput are completely wiped/masked.
   */
  sanitizeResultsForClient(results = []) {
    return results.map((res) => {
      if (res.isHidden) {
        return {
          testCaseIndex: res.testCaseIndex,
          passed: res.passed,
          input: '[HIDDEN TEST CASE]',
          expectedOutput: '[HIDDEN EXPECTED OUTPUT]',
          actualOutput: res.passed ? '[PASSED]' : '[HIDDEN ACTUAL OUTPUT]',
          stdout: '',
          stderr: res.stderr ? '[EXECUTION ERROR]' : '',
          compileOutput: res.compileOutput || '',
          executionTimeMs: res.executionTimeMs,
          memoryKb: res.memoryKb,
          statusDescription: res.statusDescription,
          error: res.error ? '[EXECUTION ERROR]' : '',
          isHidden: true,
        };
      }
      return {
        ...res,
        isHidden: false,
      };
    });
  }

  /**
   * Executes code against an array of test cases using the pluggable execution adapter.
   *
   * @param {object} params
   * @param {string} params.sourceCode
   * @param {string} params.language - 'c' | 'cpp' | 'python' | 'java' | 'javascript'
   * @param {Array<{ input: string, expectedOutput: string, isHidden?: boolean }>} params.testCases
   * @param {number} [params.cpuTimeLimit=5.0]
   * @param {number} [params.memoryLimitKb=128000]
   * @param {string} [params.executionMode='stdin']
   * @returns {Promise<{ passedCount: number, totalCount: number, allPassed: boolean, results: Array<object>, maxTimeMs: number, maxMemoryKb: number }>}
   */
  async executeTestCases({
    sourceCode,
    language,
    testCases = [],
    cpuTimeLimit = 5.0,
    memoryLimitKb = 128000,
    executionMode = 'stdin'
  }) {
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return {
        passedCount: 0,
        totalCount: 0,
        allPassed: true,
        results: [],
        maxTimeMs: 0,
        maxMemoryKb: 0,
      };
    }

    // Wrap code if problem specifies function-based execution mode
    const executableCode = driverTemplateService.wrapCode({
      language,
      sourceCode,
      executionMode
    });

    const results = [];
    let passedCount = 0;
    let maxTimeMs = 0;
    let maxMemoryKb = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const isHidden = Boolean(tc.isHidden);

      try {
        const execution = await executionAdapter.execute({
          language,
          sourceCode: executableCode,
          stdin: tc.input || '',
          cpuTimeLimit,
          memoryLimitKb,
        });

        const executionTimeMs = execution.executionTimeMs || 0;
        const memoryKb = execution.memoryKb || 0;
        if (executionTimeMs > maxTimeMs) maxTimeMs = executionTimeMs;
        if (memoryKb > maxMemoryKb) maxMemoryKb = memoryKb;

        const isOutputCorrect = this.compareOutputs(execution.stdout, tc.expectedOutput);
        const passed = execution.exitCode === 0 && isOutputCorrect;

        if (passed) passedCount++;

        let statusDescription = execution.statusDescription;
        if (execution.statusDescription === 'Accepted' && !isOutputCorrect) {
          statusDescription = 'Wrong Answer';
        }

        results.push({
          testCaseIndex: i + 1,
          passed,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          actualOutput: execution.stdout || '',
          stdout: execution.stdout || '',
          stderr: execution.stderr || '',
          compileOutput: execution.compileOutput || '',
          executionTimeMs,
          memoryKb,
          statusDescription,
          error: execution.stderr || execution.compileOutput || '',
          isHidden,
        });
      } catch (err) {
        // Critical: If the execution provider itself is down or unavailable (503),
        // rethrow immediately so the system does NOT treat infrastructure outages as candidate test failures
        // and does NOT silently fall back to mock.
        if (err.statusCode === 503 || err.code === 'EXECUTION_PROVIDER_UNAVAILABLE') {
          throw err;
        }

        results.push({
          testCaseIndex: i + 1,
          passed: false,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          actualOutput: '',
          stdout: '',
          stderr: err.message,
          compileOutput: '',
          executionTimeMs: 0,
          memoryKb: 0,
          statusDescription: 'Execution Error',
          error: err.message,
          isHidden,
        });
      }
    }

    return {
      passedCount,
      totalCount: testCases.length,
      allPassed: passedCount === testCases.length,
      results,
      maxTimeMs,
      maxMemoryKb,
    };
  }
}

export default new TestCaseService();
