/**
 * @file local.provider.js
 * In-process/sub-process execution provider for Prepper AI.
 * Runs code locally inside the existing Node.js + Express backend using safe
 * child processes, ephemeral directories, strict timeouts, buffer caps, and stripped environment variables.
 */

import { BaseExecutionProvider } from './base.provider.js';
import codeExecutionService from '../../codeExecution/execution.service.js';
import languageRegistry from '../../codeExecution/languageRegistry.js';

export class LocalExecutionProvider extends BaseExecutionProvider {
  constructor() {
    super('local');
  }

  /**
   * Executes code using local child processes.
   */
  async execute({ language, sourceCode, stdin = '', cpuTimeLimit = 5.0, memoryLimitKb = 128000 }) {
    const timeoutMs = Math.round((Number(cpuTimeLimit) || 5.0) * 1000);

    const res = await codeExecutionService.execute({
      language,
      sourceCode,
      stdin,
      timeoutMs,
    });

    return {
      success: res.exitCode === 0,
      stdout: res.stdout,
      stderr: res.stderr,
      compileOutput: res.compileOutput,
      exitCode: res.exitCode,
      statusDescription: res.statusDescription,
      executionTimeMs: res.executionTimeMs,
      memoryKb: res.memoryKb,
      provider: 'local',
    };
  }

  /**
   * Health check verifying at least one runtime is available (Node.js is always available).
   */
  async checkHealth() {
    const available = languageRegistry.getAvailableLanguages();
    return {
      healthy: available.length > 0,
      version: `Node ${process.version}`,
      availableCount: available.length,
      availableLanguages: available.map((l) => l.slug),
    };
  }
}

const localProvider = new LocalExecutionProvider();
export default localProvider;
