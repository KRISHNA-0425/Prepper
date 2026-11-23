/**
 * @file piston.provider.js
 * Execution adapter for Piston (engineer-man/piston) execution engine.
 */

import axios from 'axios';
import { BaseExecutionProvider } from './base.provider.js';

export class PistonExecutionProvider extends BaseExecutionProvider {
  constructor(baseUrl = process.env.CODE_EXECUTION_URL || 'http://localhost:2000') {
    super('piston');
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  getClient() {
    const currentBaseUrl = (process.env.CODE_EXECUTION_URL || this.baseUrl || 'http://localhost:2000').replace(/\/$/, '');
    const apiKey = process.env.CODE_EXECUTION_API_KEY;
    return axios.create({
      baseURL: currentBaseUrl,
      timeout: Number(process.env.CODE_EXECUTION_TIMEOUT) || 12000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: apiKey } : {})
      }
    });
  }

  async checkHealth() {
    try {
      const response = await this.getClient().get('/api/v2/runtimes');
      return {
        healthy: Array.isArray(response.data),
        version: 'Piston Engine v2',
        details: { runtimesCount: Array.isArray(response.data) ? response.data.length : 0 }
      };
    } catch (err) {
      return {
        healthy: false,
        error: `Piston connection error: ${err.message}`
      };
    }
  }

  async execute({ language, sourceCode, stdin = '', cpuTimeLimit = 5.0, memoryLimitKb = 128000 }) {
    const langMap = {
      c: { language: 'c', version: '10.2.0', filename: 'main.c' },
      cpp: { language: 'c++', version: '10.2.0', filename: 'main.cpp' },
      python: { language: 'python', version: '3.10.0', filename: 'main.py' },
      java: { language: 'java', version: '15.0.2', filename: 'Solution.java' },
      javascript: { language: 'javascript', version: '18.15.0', filename: 'main.js' }
    };

    const target = langMap[language] || langMap.javascript;

    const payload = {
      language: target.language,
      version: target.version,
      files: [{ name: target.filename, content: sourceCode }],
      stdin: stdin || '',
      run_timeout: Math.round(cpuTimeLimit * 1000),
      compile_timeout: 10000
    };

    const response = await this.getClient().post('/api/v2/execute', payload);
    const data = response.data;

    if (!data) {
      throw new Error('No data received from Piston execution engine');
    }

    if (data.compile && data.compile.code !== 0) {
      return {
        success: true,
        exitCode: data.compile.code || 1,
        stdout: '',
        stderr: '',
        compileOutput: data.compile.stderr || data.compile.output || 'Compilation failed',
        executionTimeMs: 0,
        memoryKb: 0,
        statusDescription: 'Compilation Error'
      };
    }

    const run = data.run || {};
    let statusDescription = 'Accepted';
    if (run.signal === 'SIGKILL' || run.signal === 'SIGXCPU') {
      statusDescription = 'Time Limit Exceeded';
    } else if (run.code !== 0) {
      statusDescription = 'Runtime Error';
    }

    return {
      success: true,
      exitCode: run.code ?? 0,
      stdout: run.stdout || run.output || '',
      stderr: run.stderr || '',
      compileOutput: '',
      executionTimeMs: Math.round(run.time || 20),
      memoryKb: Math.round((run.memory || 0) / 1024),
      statusDescription
    };
  }
}

export default new PistonExecutionProvider();
