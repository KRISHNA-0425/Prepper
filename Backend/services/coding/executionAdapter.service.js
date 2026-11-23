/**
 * @file executionAdapter.service.js
 * Pluggable Execution Provider Abstraction for Prepper AI.
 * Bridges Express backend to isolated Linux execution engines (Go Judge, Piston, or Hermetic Mock)
 * without running arbitrary candidate code inside the Express process.
 */

import mockProvider from './providers/mock.provider.js';
import goJudgeProvider from './providers/goJudge.provider.js';
import pistonProvider from './providers/piston.provider.js';

export const SUPPORTED_LANGUAGES = [
  {
    slug: 'c',
    name: 'C (GCC 10.2)',
    monacoLang: 'c',
    extension: 'c',
    compiler: 'gcc',
    version: '10.2.0',
    starterCode: `#include <stdio.h>

int main() {
    // Read input from standard input
    
    return 0;
}
`
  },
  {
    slug: 'cpp',
    name: 'C++ (G++ 10.2)',
    monacoLang: 'cpp',
    extension: 'cpp',
    compiler: 'g++',
    version: '10.2.0',
    starterCode: `#include <iostream>

using namespace std;

int main() {
    // Fast I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Read input from standard input
    
    return 0;
}
`
  },
  {
    slug: 'python',
    name: 'Python 3 (3.10)',
    monacoLang: 'python',
    extension: 'py',
    compiler: 'python3',
    version: '3.10.0',
    starterCode: `import sys

def main():
    # Read input from standard input
    pass

if __name__ == "__main__":
    main()
`
  },
  {
    slug: 'java',
    name: 'Java (OpenJDK 15)',
    monacoLang: 'java',
    extension: 'java',
    compiler: 'javac',
    version: '15.0.2',
    starterCode: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Read input from standard input
        
    }
}
`
  },
  {
    slug: 'javascript',
    name: 'JavaScript (Node.js 18)',
    monacoLang: 'javascript',
    extension: 'js',
    compiler: 'node',
    version: '18.15.0',
    starterCode: `const fs = require('fs');

function main() {
    // Read input from standard input
    const input = fs.readFileSync(0, 'utf-8').trim();
    
}

main();
`
  },
  {
    slug: 'typescript',
    name: 'TypeScript (5.0)',
    monacoLang: 'typescript',
    extension: 'ts',
    compiler: 'tsc',
    version: '5.0.0',
    starterCode: `function main(): void {
    // Read input from standard input
}

main();
`
  },
  {
    slug: 'go',
    name: 'Go (1.20)',
    monacoLang: 'go',
    extension: 'go',
    compiler: 'go',
    version: '1.20.0',
    starterCode: `package main

import "fmt"

func main() {
    // Read input from standard input
}
`
  }
];

export class CodeExecutionAdapter {
  constructor() {
    this.providers = {
      mock: mockProvider,
      'go-judge': goJudgeProvider,
      piston: pistonProvider
    };
  }

  /**
   * Resolves the active provider according to environment configuration.
   * Guarantees strict fail-closed security: NEVER falls back silently to mock execution
   * if an external provider was requested.
   */
  getActiveProvider() {
    const providerName = (process.env.CODE_EXECUTION_PROVIDER || 'mock').toLowerCase().trim();
    const isExecutionEnabled = process.env.CODE_EXECUTION_ENABLED === 'true';

    // If disabled entirely by configuration, reject with 503
    if (!isExecutionEnabled) {
      const err = new Error('Code execution engine is currently disabled by administrator configuration (CODE_EXECUTION_ENABLED=false)');
      err.statusCode = 503;
      err.code = 'EXECUTION_DISABLED';
      throw err;
    }

    if (providerName === 'mock') {
      return this.providers.mock;
    }

    if (this.providers[providerName]) {
      return this.providers[providerName];
    }

    // Explicit error: never fall back to mock when an unknown or misconfigured provider is set
    const err = new Error(`Configured execution provider '${providerName}' is not recognized or supported. Strict policy: Never silently falling back to mock in production.`);
    err.statusCode = 503;
    err.code = 'PROVIDER_UNRECOGNIZED';
    throw err;
  }

  /**
   * Returns list of supported language configurations.
   */
  getLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Normalizes arbitrary language input into a recognized language slug.
   */
  normalizeLanguage(langInput) {
    if (!langInput) return 'javascript';
    const lower = String(langInput).toLowerCase().trim();

    if (lower === 'c' || lower.startsWith('c (')) return 'c';
    if (lower === 'cpp' || lower === 'c++' || lower.includes('c++')) return 'cpp';
    if (lower === 'python' || lower === 'py' || lower.includes('python')) return 'python';
    if (lower === 'java' || lower.startsWith('java ')) return 'java';
    if (lower === 'javascript' || lower === 'js' || lower === 'node' || lower.includes('node')) return 'javascript';
    if (lower === 'typescript' || lower === 'ts') return 'javascript'; // Executable via Node.js runtime

    return 'javascript';
  }

  /**
   * Checks health of the active execution provider.
   */
  async checkHealth() {
    const provider = this.getActiveProvider();
    const result = await provider.checkHealth();
    return {
      provider: provider.name,
      ...result
    };
  }

  /**
   * Dispatches code execution to the active provider.
   */
  async execute({ language, sourceCode, stdin = '', cpuTimeLimit = 5.0, memoryLimitKb = 128000 }) {
    const normalizedLang = this.normalizeLanguage(language);
    const provider = this.getActiveProvider();

    try {
      const result = await provider.execute({
        language: normalizedLang,
        sourceCode,
        stdin,
        cpuTimeLimit,
        memoryLimitKb
      });

      return {
        ...result,
        provider: provider.name,
        language: normalizedLang
      };
    } catch (err) {
      // If external provider failed (e.g. ECONNREFUSED, timeout, or 502/503 from sandbox host),
      // raise explicit provider unavailable error rather than masking as normal candidate code failure.
      if (provider.name !== 'mock') {
        const provErr = new Error(`Execution Provider Unavailable (${provider.name}): ${err.message}. Please check sandbox service health.`);
        provErr.statusCode = 503;
        provErr.code = 'EXECUTION_PROVIDER_UNAVAILABLE';
        provErr.provider = provider.name;
        throw provErr;
      }

      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: `Execution Error (${provider.name}): ${err.message}`,
        compileOutput: '',
        executionTimeMs: 0,
        memoryKb: 0,
        statusDescription: 'Execution Error',
        error: err.message,
        provider: provider.name,
        language: normalizedLang
      };
    }
  }
}

export default new CodeExecutionAdapter();
