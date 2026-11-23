/**
 * @file execution.service.js
 * Core safe child-process execution service for Prepper AI.
 * Compiles and runs candidate code directly within the Express backend using
 * isolated temporary directories, sanitized environments, buffer limits, and strict timeouts.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { EXECUTION_LIMITS, getSanitizedEnv } from './executionLimits.js';
import languageRegistry from './languageRegistry.js';

export class CodeExecutionService {
  /**
   * Compiles source code if required by the language.
   */
  async compileSource({ langDef, runDir, outName }) {
    const compileStartTime = Date.now();
    const compileArgs = langDef.getCompileArgs(langDef.fileName, outName);

    return new Promise((resolve) => {
      let compileStdout = '';
      let compileStderr = '';
      let isTimedOut = false;

      const proc = spawn(langDef.compileExecutable, compileArgs, {
        cwd: runDir,
        env: getSanitizedEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch {}
      }, EXECUTION_LIMITS.COMPILATION_TIMEOUT_MS);

      proc.stdout.on('data', (chunk) => {
        if (compileStdout.length < EXECUTION_LIMITS.MAX_OUTPUT_BUFFER_BYTES) {
          compileStdout += chunk.toString();
        }
      });

      proc.stderr.on('data', (chunk) => {
        if (compileStderr.length < EXECUTION_LIMITS.MAX_OUTPUT_BUFFER_BYTES) {
          compileStderr += chunk.toString();
        }
      });

      proc.on('close', (exitCode) => {
        clearTimeout(timer);
        const compileTimeMs = Date.now() - compileStartTime;

        if (isTimedOut) {
          resolve({
            success: false,
            exitCode: 124,
            statusDescription: 'Compilation Timeout',
            compileOutput: 'Compilation exceeded 10.0s time limit.',
            compileTimeMs,
          });
          return;
        }

        if (exitCode !== 0) {
          resolve({
            success: false,
            exitCode: exitCode ?? 1,
            statusDescription: 'Compilation Error',
            compileOutput: (compileStderr || compileStdout).trim() || 'Compilation failed with non-zero exit code.',
            compileTimeMs,
          });
          return;
        }

        resolve({
          success: true,
          exitCode: 0,
          statusDescription: 'Compiled',
          compileOutput: '',
          compileTimeMs,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          exitCode: 1,
          statusDescription: 'Compilation Error',
          compileOutput: `Compiler error: ${err.message}`,
          compileTimeMs: Date.now() - compileStartTime,
        });
      });
    });
  }

  /**
   * Executes a single program against provided stdin input.
   */
  async runProgram({ executable, args, runDir, stdin, timeoutMs }) {
    const startTime = Date.now();
    const effectiveTimeout = Math.min(
      Math.max(1000, Number(timeoutMs) || EXECUTION_LIMITS.DEFAULT_TIMEOUT_MS),
      EXECUTION_LIMITS.MAX_TIMEOUT_MS
    );

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let outputLimitExceeded = false;
      let forceKillTimer = null;

      const proc = spawn(executable, args, {
        cwd: runDir,
        env: getSanitizedEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      });

      // Strict timeout monitor
      const timeoutTimer = setTimeout(() => {
        timedOut = true;
        try {
          if (process.platform !== 'win32' && proc.pid) {
            process.kill(-proc.pid, 'SIGTERM');
          } else {
            proc.kill('SIGTERM');
          }
        } catch {}

        forceKillTimer = setTimeout(() => {
          try {
            if (process.platform !== 'win32' && proc.pid) {
              process.kill(-proc.pid, 'SIGKILL');
            } else {
              proc.kill('SIGKILL');
            }
          } catch {}
        }, 500);
      }, effectiveTimeout);

      // Write stdin
      try {
        if (stdin) {
          proc.stdin.write(String(stdin));
        }
        proc.stdin.end();
      } catch {
        // Stream may have already closed
      }

      // Collect stdout with output buffer cap
      proc.stdout.on('data', (chunk) => {
        if (stdout.length + chunk.length > EXECUTION_LIMITS.MAX_OUTPUT_BUFFER_BYTES) {
          outputLimitExceeded = true;
          stdout += chunk.toString().slice(0, EXECUTION_LIMITS.MAX_OUTPUT_BUFFER_BYTES - stdout.length);
          try {
            proc.kill('SIGKILL');
          } catch {}
        } else {
          stdout += chunk.toString();
        }
      });

      // Collect stderr with output buffer cap
      proc.stderr.on('data', (chunk) => {
        if (stderr.length + chunk.length > EXECUTION_LIMITS.MAX_OUTPUT_BUFFER_BYTES) {
          stderr += chunk.toString().slice(0, EXECUTION_LIMITS.MAX_OUTPUT_BUFFER_BYTES - stderr.length);
        } else {
          stderr += chunk.toString();
        }
      });

      proc.on('close', (exitCode) => {
        clearTimeout(timeoutTimer);
        if (forceKillTimer) clearTimeout(forceKillTimer);
        const executionTimeMs = Date.now() - startTime;

        if (timedOut) {
          resolve({
            stdout: stdout.trim(),
            stderr: 'Execution timed out (Time Limit Exceeded).',
            exitCode: 124,
            statusDescription: 'Time Limit Exceeded',
            executionTimeMs,
            memoryKb: 0,
          });
          return;
        }

        if (outputLimitExceeded) {
          resolve({
            stdout: stdout.trim(),
            stderr: 'Process terminated: Output limit exceeded (64KB cap).',
            exitCode: 1,
            statusDescription: 'Output Limit Exceeded',
            executionTimeMs,
            memoryKb: 0,
          });
          return;
        }

        if (exitCode !== 0) {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim() || `Process exited with error code ${exitCode}`,
            exitCode: exitCode ?? 1,
            statusDescription: 'Runtime Error',
            executionTimeMs,
            memoryKb: 0,
          });
          return;
        }

        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
          statusDescription: 'Accepted',
          executionTimeMs,
          memoryKb: 0,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutTimer);
        if (forceKillTimer) clearTimeout(forceKillTimer);
        resolve({
          stdout: '',
          stderr: `Execution spawn error: ${err.message}`,
          exitCode: 1,
          statusDescription: 'Runtime Error',
          executionTimeMs: Date.now() - startTime,
          memoryKb: 0,
        });
      });
    });
  }

  /**
   * Main entrypoint for compiling and executing code.
   * Isolates files in a transient directory and guarantees cleanup on finish.
   */
  async execute({ language, sourceCode, stdin = '', timeoutMs = EXECUTION_LIMITS.DEFAULT_TIMEOUT_MS }) {
    const langDef = languageRegistry.getLanguage(language);
    if (!langDef) {
      return {
        stdout: '',
        stderr: `Unsupported language: ${language}`,
        compileOutput: '',
        exitCode: 1,
        statusDescription: 'Invalid Language',
        executionTimeMs: 0,
        memoryKb: 0,
      };
    }

    if (!langDef.isAvailable) {
      return {
        stdout: '',
        stderr: `Language '${langDef.name}' is not installed or available in this server environment.`,
        compileOutput: '',
        exitCode: 1,
        statusDescription: 'Language Unavailable',
        executionTimeMs: 0,
        memoryKb: 0,
      };
    }

    // Create unique ephemeral directory
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepper-exec-'));
    const sourceFilePath = path.join(runDir, langDef.fileName);
    const outBinaryName = process.platform === 'win32' ? 'program.exe' : 'program';

    try {
      // 1. Write source file to isolated runDir
      fs.writeFileSync(sourceFilePath, sourceCode, 'utf8');

      // 2. Compilation step (for C, C++, Java)
      let compileOutput = '';
      if (langDef.isCompiled) {
        const compileRes = await this.compileSource({
          langDef,
          runDir,
          outName: outBinaryName,
        });

        if (!compileRes.success) {
          return {
            stdout: '',
            stderr: compileRes.compileOutput,
            compileOutput: compileRes.compileOutput,
            exitCode: compileRes.exitCode,
            statusDescription: compileRes.statusDescription,
            executionTimeMs: compileRes.compileTimeMs,
            memoryKb: 0,
          };
        }
        compileOutput = compileRes.compileOutput;
      }

      // 3. Execution step
      let executable;
      let args;

      if (langDef.slug === 'c' || langDef.slug === 'cpp') {
        executable = path.join(runDir, outBinaryName);
        args = [];
      } else if (langDef.slug === 'java') {
        executable = 'java';
        args = [EXECUTION_LIMITS.JAVA_MAX_HEAP, '-cp', '.', 'Solution'];
      } else {
        executable = langDef.runExecutable;
        args = langDef.getRunArgs(langDef.fileName);
      }

      const runRes = await this.runProgram({
        executable,
        args,
        runDir,
        stdin,
        timeoutMs,
      });

      return {
        success: runRes.exitCode === 0,
        stdout: runRes.stdout,
        stderr: runRes.stderr,
        compileOutput,
        exitCode: runRes.exitCode,
        statusDescription: runRes.statusDescription,
        executionTimeMs: runRes.executionTimeMs,
        memoryKb: runRes.memoryKb,
      };
    } finally {
      // 4. Guaranteed Ephemeral File Cleanup
      try {
        fs.rmSync(runDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

const codeExecutionService = new CodeExecutionService();
export default codeExecutionService;
