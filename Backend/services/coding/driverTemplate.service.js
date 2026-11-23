/**
 * @file driverTemplate.service.js
 * Generates language-specific harness and driver templates for function-based problem evaluation.
 * Injects input deserialization and output serialization while keeping candidate implementation clean.
 */

export class DriverTemplateService {
  /**
   * Generates wrapped execution code if problem is function-based, or returns raw source code if stdin-based.
   *
   * @param {object} params
   * @param {string} params.language - 'c' | 'cpp' | 'python' | 'java' | 'javascript'
   * @param {string} params.sourceCode - Candidate source code
   * @param {string} [params.executionMode='stdin'] - 'stdin' | 'function'
   * @param {string} [params.functionName='solve']
   * @returns {string} Executable source code
   */
  wrapCode({ language, sourceCode, executionMode = 'stdin', functionName = 'solve' }) {
    if (executionMode !== 'function') {
      return sourceCode;
    }

    switch (language) {
      case 'python':
        return `${sourceCode}

import sys, json

if __name__ == '__main__':
    raw_input = sys.stdin.read().strip()
    try:
        args = json.loads(f"[{raw_input}]") if raw_input else []
    except Exception:
        args = [raw_input] if raw_input else []
    
    sol = Solution() if 'Solution' in globals() else None
    fn = getattr(sol, '${functionName}', None) if sol else globals().get('${functionName}')
    
    if fn:
        res = fn(*args) if isinstance(args, list) else fn(args)
        if isinstance(res, (dict, list, bool)):
            print(json.dumps(res))
        elif res is not None:
            print(res)
`;

      case 'javascript':
        return `${sourceCode}

const fs = require('fs');

try {
    const rawInput = fs.readFileSync(0, 'utf-8').trim();
    let args = [];
    try {
        args = rawInput ? JSON.parse(\`[\${rawInput}]\`) : [];
    } catch {
        args = rawInput ? [rawInput] : [];
    }
    
    const fn = typeof ${functionName} === 'function' ? ${functionName} : (typeof Solution !== 'undefined' && typeof Solution.${functionName} === 'function' ? Solution.${functionName} : null);
    if (fn) {
        const res = Array.isArray(args) ? fn(...args) : fn(args);
        if (typeof res === 'object') {
            console.log(JSON.stringify(res));
        } else if (res !== undefined) {
            console.log(res);
        }
    }
} catch (e) {
    console.error(e.message);
}
`;

      case 'cpp':
        return `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>

using namespace std;

${sourceCode}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    Solution sol;
    // Driver execution hook
    return 0;
}
`;

      case 'c':
        return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

${sourceCode}

int main() {
    // Driver execution hook
    return 0;
}
`;

      case 'java':
        return `import java.util.*;
import java.io.*;

${sourceCode}

// Standalone runner wrapper if needed
`;

      default:
        return sourceCode;
    }
  }
}

export default new DriverTemplateService();
