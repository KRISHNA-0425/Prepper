/**
 * @file languageRegistry.js
 * Extensible, dynamic language runtime registry for Prepper AI.
 * Discovers and validates genuine compiler/interpreter availability in the active host environment
 * (local developer machine or Render deployment).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { EXECUTION_LIMITS } from './executionLimits.js';

export class LanguageRegistry {
  constructor() {
    this.languages = new Map();
    this.initialized = false;
    this.registerDefinitions();
  }

  /**
   * Registers all supported target programming language definitions.
   */
  registerDefinitions() {
    // 1. JavaScript (Node.js) — Primary, guaranteed in Node environment
    this.languages.set('javascript', {
      slug: 'javascript',
      aliases: ['js', 'node', 'nodejs'],
      name: 'JavaScript (Node.js)',
      monacoLang: 'javascript',
      extension: 'js',
      fileName: 'solution.js',
      isCompiled: false,
      runExecutable: process.execPath || 'node',
      getRunArgs: (fileName) => [EXECUTION_LIMITS.NODE_MAX_OLD_SPACE, fileName],
      starterCode: `const fs = require('fs');

function solve() {
    // Read all input from standard input
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    
    // Process input and output results
    console.log(input);
}

solve();
`,
      isAvailable: true,
      version: process.version,
    });

    // 2. Python 3
    this.languages.set('python', {
      slug: 'python',
      aliases: ['py', 'python3'],
      name: 'Python 3',
      monacoLang: 'python',
      extension: 'py',
      fileName: 'solution.py',
      isCompiled: false,
      runExecutable: 'python', // dynamically resolved to python3 or python
      getRunArgs: (fileName) => ['-u', fileName], // -u: unbuffered stdout
      starterCode: `import sys

def solve():
    # Read all input from standard input
    input_data = sys.stdin.read().strip()
    if not input_data:
        return
        
    print(input_data)

if __name__ == '__main__':
    solve()
`,
      isAvailable: false,
      version: null,
    });

    // 3. C++ (G++)
    this.languages.set('cpp', {
      slug: 'cpp',
      aliases: ['c++', 'g++'],
      name: 'C++ (G++)',
      monacoLang: 'cpp',
      extension: 'cpp',
      fileName: 'solution.cpp',
      isCompiled: true,
      compileExecutable: 'g++',
      getCompileArgs: (fileName, outName) => ['-O2', '-std=c++17', fileName, '-o', outName],
      runExecutable: null, // set to compiled executable
      getRunArgs: () => [],
      starterCode: `#include <iostream>
#include <string>

using namespace std;

int main() {
    // Optimize standard I/O operations
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string line;
    while (getline(cin, line)) {
        cout << line << "\\n";
    }

    return 0;
}
`,
      isAvailable: false,
      version: null,
    });

    // 4. C (GCC)
    this.languages.set('c', {
      slug: 'c',
      aliases: ['gcc'],
      name: 'C (GCC)',
      monacoLang: 'c',
      extension: 'c',
      fileName: 'solution.c',
      isCompiled: true,
      compileExecutable: 'gcc',
      getCompileArgs: (fileName, outName) => ['-O2', '-std=c11', fileName, '-o', outName],
      runExecutable: null,
      getRunArgs: () => [],
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    char buffer[1024];
    while (fgets(buffer, sizeof(buffer), stdin)) {
        fputs(buffer, stdout);
    }
    return 0;
}
`,
      isAvailable: false,
      version: null,
    });

    // 5. Java (OpenJDK)
    this.languages.set('java', {
      slug: 'java',
      aliases: ['openjdk', 'jdk'],
      name: 'Java (OpenJDK)',
      monacoLang: 'java',
      extension: 'java',
      fileName: 'Solution.java',
      isCompiled: true,
      compileExecutable: 'javac',
      getCompileArgs: (fileName) => [fileName],
      runExecutable: 'java',
      getRunArgs: () => [EXECUTION_LIMITS.JAVA_MAX_HEAP, 'Solution'],
      starterCode: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        while (scanner.hasNextLine()) {
            System.out.println(scanner.nextLine());
        }
    }
}
`,
      isAvailable: false,
      version: null,
    });
  }

  /**
   * Helper to probe executable version with short timeout.
   */
  probeCommand(cmd, versionArg = '--version') {
    try {
      const res = spawnSync(cmd, [versionArg], {
        timeout: 2000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (res.status === 0) {
        const out = (res.stdout || res.stderr || '').trim().split('\n')[0];
        if (!out.toLowerCase().includes('not found') && !out.toLowerCase().includes('cannot find')) {
          return { available: true, version: out };
        }
      }
    } catch {
      // Command failed or not found
    }
    return { available: false, version: null };
  }

  /**
   * Dynamically inspects host environment to find active compilers and interpreters.
   */
  detectAvailableLanguages() {
    // 1. JavaScript is always available (running in Node.js)
    const js = this.languages.get('javascript');
    if (js) {
      js.isAvailable = true;
      js.version = process.version;
    }

    // 2. Python: Probe 'python3' first, then 'python'
    const py = this.languages.get('python');
    if (py) {
      let pyCheck = this.probeCommand('python3');
      if (pyCheck.available) {
        py.isAvailable = true;
        py.runExecutable = 'python3';
        py.version = pyCheck.version;
      } else {
        pyCheck = this.probeCommand('python');
        if (pyCheck.available) {
          py.isAvailable = true;
          py.runExecutable = 'python';
          py.version = pyCheck.version;
        } else {
          py.isAvailable = false;
        }
      }
    }

    // 3. C++ (G++)
    const cpp = this.languages.get('cpp');
    if (cpp) {
      const gppCheck = this.probeCommand('g++');
      cpp.isAvailable = gppCheck.available;
      cpp.version = gppCheck.version;
    }

    // 4. C (GCC)
    const c = this.languages.get('c');
    if (c) {
      const gccCheck = this.probeCommand('gcc');
      c.isAvailable = gccCheck.available;
      c.version = gccCheck.version;
    }

    // 5. Java (both javac and java must be available)
    const java = this.languages.get('java');
    if (java) {
      const javacCheck = this.probeCommand('javac', '-version');
      const javaCheck = this.probeCommand('java', '-version');
      java.isAvailable = javacCheck.available && javaCheck.available;
      java.version = javaCheck.version || javacCheck.version;
    }

    this.initialized = true;
  }

  /**
   * Returns list of languages that are genuinely executable in the active environment.
   */
  getAvailableLanguages() {
    if (!this.initialized) {
      this.detectAvailableLanguages();
    }

    const available = [];
    for (const [, lang] of this.languages) {
      if (lang.isAvailable) {
        available.push({
          slug: lang.slug,
          name: lang.name,
          monacoLang: lang.monacoLang,
          extension: lang.extension,
          isCompiled: lang.isCompiled,
          compiler: lang.compileExecutable || lang.runExecutable || 'node',
          version: lang.version,
          starterCode: lang.starterCode,
        });
      }
    }
    return available;
  }

  /**
   * Resolves a language definition by slug or alias.
   */
  getLanguage(identifier) {
    if (!this.initialized) {
      this.detectAvailableLanguages();
    }

    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();

    // Direct match
    if (this.languages.has(clean)) {
      return this.languages.get(clean);
    }

    // Alias search
    for (const [, lang] of this.languages) {
      if (lang.aliases?.includes(clean)) {
        return lang;
      }
    }

    return null;
  }

  isLanguageAvailable(identifier) {
    const lang = this.getLanguage(identifier);
    return Boolean(lang && lang.isAvailable);
  }
}

const languageRegistry = new LanguageRegistry();
export default languageRegistry;
