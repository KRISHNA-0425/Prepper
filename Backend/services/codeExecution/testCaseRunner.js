/**
 * @file testCaseRunner.js
 * Multi-test-case runner with output normalization, floating-point comparison tolerance,
 * and security sanitization for hidden interview test cases.
 */

import codeExecutionService from './execution.service.js';
import { EXECUTION_LIMITS } from './executionLimits.js';

export class TestCaseRunner {
  /**
   * Normalizes output by converting Windows CRLF to LF, trimming trailing whitespace per line,
   * and trimming outer blank lines.
   */
  static normalizeOutput(output) {
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
   * Compares candidate output against expected test case output.
   * Supports exact string matching and numeric float tolerance (1e-6).
   */
  static compareOutputs(actual, expected) {
    const normActual = this.normalizeOutput(actual);
    const normExpected = this.normalizeOutput(expected);

    if (normActual === normExpected) {
      return true;
    }

    // Floating-point numeric comparison
    const numActual = Number(normActual);
    const numExpected = Number(normExpected);
    if (!Number.isNaN(numActual) && !Number.isNaN(numExpected) && normActual !== '' && normExpected !== '') {
      return Math.abs(numActual - numExpected) < 1e-6;
    }

    return false;
  }

  /**
   * Evaluates code against an array of test cases.
   */
  static async runTestCases({
    language,
    sourceCode,
    testCases = [],
    timeoutMs = EXECUTION_LIMITS.DEFAULT_TIMEOUT_MS,
  }) {
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return {
        passedCount: 0,
        totalCount: 0,
        allPassed: true,
        maxTimeMs: 0,
        results: [],
      };
    }

    const results = [];
    let passedCount = 0;
    let maxTimeMs = 0;
    let cachedCompilationFailure = null;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const isHidden = Boolean(tc.isHidden);

      // Fast-fail if previous case had a compilation error
      if (cachedCompilationFailure) {
        results.push({
          testCaseIndex: i + 1,
          passed: false,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          actualOutput: '',
          stdout: '',
          stderr: cachedCompilationFailure.compileOutput,
          compileOutput: cachedCompilationFailure.compileOutput,
          executionTimeMs: 0,
          statusDescription: cachedCompilationFailure.statusDescription,
          error: cachedCompilationFailure.compileOutput,
          isHidden,
        });
        continue;
      }

      const execution = await codeExecutionService.execute({
        language,
        sourceCode,
        stdin: tc.input || '',
        timeoutMs,
      });

      // Cache compilation failure to avoid recompiling remaining test cases
      if (execution.statusDescription === 'Compilation Error' || execution.statusDescription === 'Compilation Timeout') {
        cachedCompilationFailure = execution;
      }

      const executionTimeMs = execution.executionTimeMs || 0;
      if (executionTimeMs > maxTimeMs) maxTimeMs = executionTimeMs;

      const isOutputCorrect = this.compareOutputs(execution.stdout, tc.expectedOutput);
      const passed = execution.exitCode === 0 && isOutputCorrect;

      if (passed) passedCount++;

      let statusDescription = execution.statusDescription;
      if (execution.exitCode === 0 && !isOutputCorrect) {
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
        statusDescription,
        error: execution.stderr || execution.compileOutput || '',
        isHidden,
      });
    }

    return {
      passedCount,
      totalCount: testCases.length,
      allPassed: passedCount === testCases.length,
      maxTimeMs,
      results,
    };
  }

  /**
   * Sanitizes evaluation results before sending to the client.
   * Completely masks hidden test case input and expectedOutput to protect test integrity.
   */
  static sanitizeResultsForClient(results = []) {
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
}

export default TestCaseRunner;
