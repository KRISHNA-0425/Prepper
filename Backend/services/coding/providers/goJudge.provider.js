/**
 * @file goJudge.provider.js
 * Execution adapter for standalone Go Judge REST API (criyle/go-judge).
 */

import axios from 'axios';
import { BaseExecutionProvider } from './base.provider.js';

export class GoJudgeExecutionProvider extends BaseExecutionProvider {
  constructor(baseUrl = process.env.CODE_EXECUTION_URL || 'http://localhost:5050') {
    super('go-judge');
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  getClient() {
    const currentBaseUrl = (process.env.CODE_EXECUTION_URL || this.baseUrl || 'http://localhost:5050').replace(/\/$/, '');
    const apiKey = process.env.CODE_EXECUTION_API_KEY;
    return axios.create({
      baseURL: currentBaseUrl,
      timeout: Number(process.env.CODE_EXECUTION_TIMEOUT) || 12000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      }
    });
  }

  async checkHealth() {
    try {
      const response = await this.getClient().get('/version');
      return {
        healthy: true,
        version: response.data?.version || 'Go-Judge Standalone',
        details: response.data
      };
    } catch (err) {
      return {
        healthy: false,
        error: `Go Judge connection error: ${err.message}`
      };
    }
  }

  /**
   * Builds execution command structure according to Go Judge API specification.
   */
  buildGoJudgeCmd({ language, sourceCode, stdin = '', cpuTimeLimit = 5.0, memoryLimitKb = 128000 }) {
    const cpuLimitNs = Math.round(cpuTimeLimit * 1e9);
    const memoryLimitBytes = Math.round(memoryLimitKb * 1024);

    switch (language) {
      case 'c':
        return [
          {
            args: ['/usr/bin/gcc', '-O2', 'src.c', '-o', 'prog'],
            env: ['PATH=/usr/bin:/bin'],
            files: [{ content: '' }, { name: 'stdout', max: 10240 }, { name: 'stderr', max: 10240 }],
            cpuLimit: cpuLimitNs,
            memoryLimit: memoryLimitBytes,
            copyIn: { 'src.c': { content: sourceCode } }
          },
          {
            args: ['./prog'],
            env: ['PATH=/usr/bin:/bin'],
            files: [{ content: stdin }, { name: 'stdout', max: 65536 }, { name: 'stderr', max: 65536 }],
            cpuLimit: cpuLimitNs,
            memoryLimit: memoryLimitBytes
          }
        ];

      case 'cpp':
        return [
          {
            args: ['/usr/bin/g++', '-O2', 'src.cpp', '-o', 'prog'],
            env: ['PATH=/usr/bin:/bin'],
            files: [{ content: '' }, { name: 'stdout', max: 10240 }, { name: 'stderr', max: 10240 }],
            cpuLimit: cpuLimitNs,
            memoryLimit: memoryLimitBytes,
            copyIn: { 'src.cpp': { content: sourceCode } }
          },
          {
            args: ['./prog'],
            env: ['PATH=/usr/bin:/bin'],
            files: [{ content: stdin }, { name: 'stdout', max: 65536 }, { name: 'stderr', max: 65536 }],
            cpuLimit: cpuLimitNs,
            memoryLimit: memoryLimitBytes
          }
        ];

      case 'python':
        return [
          {
            args: ['/usr/bin/python3', 'main.py'],
            env: ['PATH=/usr/bin:/bin', 'PYTHONUNBUFFERED=1'],
            files: [{ content: stdin }, { name: 'stdout', max: 65536 }, { name: 'stderr', max: 65536 }],
            cpuLimit: cpuLimitNs,
            memoryLimit: memoryLimitBytes,
            copyIn: { 'main.py': { content: sourceCode } }
          }
        ];

      case 'java':
        return [
          {
            args: ['/usr/bin/javac', 'Solution.java'],
            env: ['PATH=/usr/bin:/bin'],
            files: [{ content: '' }, { name: 'stdout', max: 10240 }, { name: 'stderr', max: 10240 }],
            cpuLimit: cpuLimitNs,
            memoryLimit: memoryLimitBytes,
            copyIn: { 'Solution.java': { content: sourceCode } }
          },
          {
            args: ['/usr/bin/java', '-Xmx128m', 'Solution'],
            env: ['PATH=/usr/bin:/bin'],
            files: [{ content: stdin }, { name: 'stdout', max: 65536 }, { name: 'stderr', max: 65536 }],
            cpuLimit: cpuLimitNs,
            memoryLimit: memoryLimitBytes
          }
        ];

      case 'javascript':
      default:
        return [
          {
            args: ['/usr/bin/node', 'main.js'],
            env: ['PATH=/usr/bin:/bin', 'NODE_PATH=/usr/local/lib/node_modules'],
            files: [{ content: stdin }, { name: 'stdout', max: 65536 }, { name: 'stderr', max: 65536 }],
            cpuLimit: cpuLimitNs,
            memoryLimit: memoryLimitBytes,
            copyIn: { 'main.js': { content: sourceCode } }
          }
        ];
    }
  }

  async execute(params) {
    const cmdList = this.buildGoJudgeCmd(params);
    const response = await this.getClient().post('/run', { cmd: cmdList });
    const results = response.data;

    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Invalid response structure from Go Judge');
    }

    // If compilation stage failed in compiled languages (C, C++, Java)
    const isCompiledLang = ['c', 'cpp', 'java'].includes(params.language);
    if ((results.length > 1 || isCompiledLang) && results[0].status !== 'Accepted') {
      const compileStep = results[0];
      return {
        success: true,
        exitCode: compileStep.exitStatus || 1,
        stdout: '',
        stderr: '',
        compileOutput: compileStep.files?.stderr || compileStep.files?.stdout || 'Compilation failed',
        executionTimeMs: Math.round((compileStep.time || 0) / 1e6),
        memoryKb: Math.round((compileStep.memory || 0) / 1024),
        statusDescription: 'Compilation Error'
      };
    }

    const runStep = results.length > 1 ? results[1] : results[0];
    const statusMap = {
      Accepted: 'Accepted',
      'Time Limit Exceeded': 'Time Limit Exceeded',
      'Memory Limit Exceeded': 'Memory Limit Exceeded',
      'Nonzero Exit Status': 'Runtime Error',
      'Signalled': 'Runtime Error',
      'Dangerous Syscall': 'Restricted System Call'
    };

    return {
      success: true,
      exitCode: runStep.exitStatus ?? 0,
      stdout: runStep.files?.stdout || '',
      stderr: runStep.files?.stderr || '',
      compileOutput: '',
      executionTimeMs: Math.round((runStep.time || 0) / 1e6),
      memoryKb: Math.round((runStep.memory || 0) / 1024),
      statusDescription: statusMap[runStep.status] || runStep.status || 'Accepted'
    };
  }
}

export default new GoJudgeExecutionProvider();
