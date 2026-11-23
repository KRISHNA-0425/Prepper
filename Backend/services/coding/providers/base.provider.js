/**
 * @file base.provider.js
 * Base abstract interface for isolated code execution providers.
 */

export class BaseExecutionProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Executes code with the given parameters.
   *
   * @param {object} params
   * @param {string} params.language - 'c' | 'cpp' | 'python' | 'java' | 'javascript'
   * @param {string} params.sourceCode - Raw source code
   * @param {string} [params.stdin=''] - Standard input string
   * @param {number} [params.cpuTimeLimit=5.0] - Timeout in seconds
   * @param {number} [params.memoryLimitKb=128000] - Memory limit in KB
   * @returns {Promise<ExecutionResult>}
   */
  async execute(params) {
    throw new Error(`execute() must be implemented by ${this.name} provider`);
  }

  /**
   * Health check for execution provider.
   *
   * @returns {Promise<{ healthy: boolean, version?: string, error?: string }>}
   */
  async checkHealth() {
    throw new Error(`checkHealth() must be implemented by ${this.name} provider`);
  }
}
