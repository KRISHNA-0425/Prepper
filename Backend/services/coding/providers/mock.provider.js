/**
 * @file mock.provider.js
 * Deterministic hermetic execution provider for local unit testing and offline development.
 */

import { BaseExecutionProvider } from './base.provider.js';

export class MockExecutionProvider extends BaseExecutionProvider {
  constructor() {
    super('mock');
  }

  async checkHealth() {
    return {
      healthy: true,
      version: 'Mock Sandbox v1.0',
      details: { environment: 'hermetic-mock' }
    };
  }

  async execute({ language, sourceCode, stdin = '', cpuTimeLimit = 5.0, memoryLimitKb = 128000 }) {
    const startTime = Date.now();

    // Check for simulated compilation failure
    if (sourceCode.includes('// SIMULATE_COMPILE_ERROR') || sourceCode.includes('#error_syntax')) {
      return {
        success: true,
        exitCode: 1,
        stdout: '',
        stderr: '',
        compileOutput: `error: syntax error in source file (${language}): expected identifier before ';' token`,
        executionTimeMs: 15,
        memoryKb: 1240,
        statusDescription: 'Compilation Error'
      };
    }

    // Check for simulated runtime error
    if (sourceCode.includes('// SIMULATE_RUNTIME_ERROR') || sourceCode.includes('throw new Error') || sourceCode.includes('raise Exception')) {
      return {
        success: true,
        exitCode: 139,
        stdout: '',
        stderr: 'Runtime Exception: Division by zero / Segmentation Fault (SIGSEGV)',
        compileOutput: '',
        executionTimeMs: 25,
        memoryKb: 3450,
        statusDescription: 'Runtime Error'
      };
    }

    // Check for simulated timeout (TLE)
    if (sourceCode.includes('// SIMULATE_TIMEOUT') || sourceCode.includes('while(true)') || sourceCode.includes('while True:')) {
      return {
        success: true,
        exitCode: 124,
        stdout: '',
        stderr: 'Time Limit Exceeded: Process killed after timeout limit',
        compileOutput: '',
        executionTimeMs: Math.round(cpuTimeLimit * 1000),
        memoryKb: 4500,
        statusDescription: 'Time Limit Exceeded'
      };
    }

    // Check for simulated memory limit (MLE)
    if (sourceCode.includes('// SIMULATE_MLE')) {
      return {
        success: true,
        exitCode: 137,
        stdout: '',
        stderr: 'Memory Limit Exceeded: Process allocated beyond allowable limit',
        compileOutput: '',
        executionTimeMs: 40,
        memoryKb: memoryLimitKb + 1024,
        statusDescription: 'Memory Limit Exceeded'
      };
    }

    // Normal deterministic execution
    // If output is specifically requested via comments (supports // and # styles):
    const outputMatch = sourceCode.match(/(?:\/\/|#)\s*OUTPUT:\s*(.+)$/m);
    let mockOutput = '';
    if (outputMatch) {
      mockOutput = outputMatch[1].trim();
    } else {
      // Default: parse stdin and echo or produce simple computed output
      mockOutput = stdin ? stdin.trim() : 'Execution completed successfully';
    }

    const duration = Math.min(Math.round((Date.now() - startTime) + 12), 150);

    return {
      success: true,
      exitCode: 0,
      stdout: mockOutput,
      stderr: '',
      compileOutput: '',
      executionTimeMs: duration,
      memoryKb: 8192,
      statusDescription: 'Accepted'
    };
  }
}

export default new MockExecutionProvider();
