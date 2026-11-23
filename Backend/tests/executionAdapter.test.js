/**
 * @file executionAdapter.test.js
 * Comprehensive unit and integration test suite for the pluggable execution adapter,
 * 5-language compilation/runtime handlers, 3 execution modes, and security controls.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import executionAdapter, { SUPPORTED_LANGUAGES } from '../services/coding/executionAdapter.service.js';
import testCaseService from '../services/coding/testCase.service.js';
import codingExecutionService, { MAX_CODE_SIZE_BYTES } from '../services/coding/codingExecution.service.js';
import driverTemplateService from '../services/coding/driverTemplate.service.js';

test('1. Execution Adapter - Language Catalog & Normalization', () => {
  const languages = executionAdapter.getLanguages();
  assert.ok(languages.length >= 5, 'Should have at least 5 target languages');

  const slugs = languages.map((l) => l.slug);
  const targetLanguages = ['c', 'cpp', 'python', 'java', 'javascript'];
  targetLanguages.forEach((slug) => {
    assert.ok(slugs.includes(slug), `Target language ${slug} must be present in catalog`);
  });

  // Verify each target language contains required properties
  languages.forEach((lang) => {
    assert.ok(lang.name, `Language ${lang.slug} must have a name`);
    assert.ok(lang.monacoLang, `Language ${lang.slug} must have a monacoLang identifier`);
    assert.ok(lang.compiler, `Language ${lang.slug} must have a compiler`);
    assert.ok(lang.version, `Language ${lang.slug} must have a version`);
    assert.ok(lang.starterCode, `Language ${lang.slug} must have starterCode template`);
  });

  // Verify normalizer handles variations
  assert.equal(executionAdapter.normalizeLanguage('C'), 'c');
  assert.equal(executionAdapter.normalizeLanguage('c++'), 'cpp');
  assert.equal(executionAdapter.normalizeLanguage('Python 3'), 'python');
  assert.equal(executionAdapter.normalizeLanguage('java'), 'java');
  assert.equal(executionAdapter.normalizeLanguage('node'), 'javascript');
  assert.equal(executionAdapter.normalizeLanguage('js'), 'javascript');
  assert.equal(executionAdapter.normalizeLanguage('unknown_lang'), 'javascript');
});

test('2. Execution Adapter - Multi-Language Execution (C, C++, Python, Java, JS)', async () => {
  const testSuite = [
    { lang: 'c', code: '#include <stdio.h>\n// OUTPUT: Hello C\nint main() { return 0; }', expected: 'Hello C' },
    { lang: 'cpp', code: '#include <iostream>\n// OUTPUT: Hello C++\nint main() { return 0; }', expected: 'Hello C++' },
    { lang: 'python', code: '# OUTPUT: Hello Python\nprint("Hello Python")', expected: 'Hello Python' },
    { lang: 'java', code: 'public class Solution {\n// OUTPUT: Hello Java\n}', expected: 'Hello Java' },
    { lang: 'javascript', code: '// OUTPUT: Hello JS\nconsole.log("Hello JS");', expected: 'Hello JS' },
  ];

  for (const item of testSuite) {
    const result = await executionAdapter.execute({
      language: item.lang,
      sourceCode: item.code,
      stdin: ''
    });

    assert.equal(result.success, true, `Language ${item.lang} execution must succeed`);
    assert.equal(result.exitCode, 0, `Language ${item.lang} exit code must be 0`);
    assert.equal(result.stdout, item.expected, `Language ${item.lang} stdout match`);
    assert.equal(result.statusDescription, 'Accepted');
  }
});

test('3. Execution Adapter - Error and Security Boundaries', async () => {
  // A. Compilation Error simulation
  const compileErrorResult = await executionAdapter.execute({
    language: 'cpp',
    sourceCode: '#error_syntax int main() { return 0; }',
    stdin: ''
  });
  assert.equal(compileErrorResult.statusDescription, 'Compilation Error');
  assert.ok(compileErrorResult.compileOutput.includes('syntax error'));

  // B. Runtime Error simulation
  const runtimeErrorResult = await executionAdapter.execute({
    language: 'python',
    sourceCode: '// SIMULATE_RUNTIME_ERROR\nraise Exception("ZeroDivisionError")',
    stdin: ''
  });
  assert.equal(runtimeErrorResult.statusDescription, 'Runtime Error');
  assert.ok(runtimeErrorResult.stderr.includes('Runtime Exception'));

  // C. Time Limit Exceeded (Timeout) simulation
  const timeoutResult = await executionAdapter.execute({
    language: 'javascript',
    sourceCode: '// SIMULATE_TIMEOUT\nwhile(true) {}',
    stdin: '',
    cpuTimeLimit: 2.0
  });
  assert.equal(timeoutResult.statusDescription, 'Time Limit Exceeded');
  assert.ok(timeoutResult.stderr.includes('Time Limit Exceeded'));

  // D. Memory Limit Exceeded simulation
  const mleResult = await executionAdapter.execute({
    language: 'c',
    sourceCode: '// SIMULATE_MLE\nint main() { return 0; }',
    stdin: '',
    memoryLimitKb: 64000
  });
  assert.equal(mleResult.statusDescription, 'Memory Limit Exceeded');
});

test('4. DriverTemplateService - Function-based code wrapping', () => {
  // Python function wrapping
  const pyCode = 'class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]';
  const pyWrapped = driverTemplateService.wrapCode({
    language: 'python',
    sourceCode: pyCode,
    executionMode: 'function',
    functionName: 'twoSum'
  });
  assert.ok(pyWrapped.includes('import sys, json'));
  assert.ok(pyWrapped.includes('Solution()'));

  // Stdin mode remains untouched
  const rawStdinCode = 'import sys\nprint("raw")';
  const unwrapped = driverTemplateService.wrapCode({
    language: 'python',
    sourceCode: rawStdinCode,
    executionMode: 'stdin'
  });
  assert.equal(unwrapped, rawStdinCode);
});

test('5. CodingExecutionService - Mode 1: Run Code with Custom Input', async () => {
  const mockUserId = 'user_123';
  const mockInterview = {
    _id: 'int_123',
    userId: mockUserId,
    status: 'Incompleted',
    expiresAt: new Date(Date.now() + 3600000),
    codingProblems: [{ problemId: 'p1', title: 'Sum', visibleTestCases: [] }]
  };

  const origVerify = codingExecutionService.verifyInterviewAccess;
  codingExecutionService.verifyInterviewAccess = async () => mockInterview;

  try {
    const result = await codingExecutionService.runCode({
      userId: mockUserId,
      interviewId: 'int_123',
      problemIndex: 0,
      language: 'python',
      sourceCode: '// OUTPUT: 42\nprint(42)',
      customInput: '10 32'
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'run');
    assert.equal(result.stdout, '42');
    assert.equal(result.exitCode, 0);
  } finally {
    codingExecutionService.verifyInterviewAccess = origVerify;
  }
});

test('6. CodingExecutionService - Mode 2: Run Sample Tests', async () => {
  const mockUserId = 'user_sample_tests_exclusive';
  const mockInterview = {
    _id: 'int_123',
    userId: mockUserId,
    status: 'Incompleted',
    expiresAt: new Date(Date.now() + 3600000),
    codingProblems: [
      {
        problemId: 'p1',
        title: 'Two Sum',
        visibleTestCases: [
          { input: '2 7\n9', expectedOutput: '0 1', isHidden: false }
        ],
        hiddenTestCases: [
          { input: 'SECRET_INPUT', expectedOutput: 'SECRET_OUTPUT', isHidden: true }
        ]
      }
    ]
  };

  const origVerify = codingExecutionService.verifyInterviewAccess;
  codingExecutionService.verifyInterviewAccess = async () => mockInterview;

  try {
    const result = await codingExecutionService.runSampleTests({
      userId: mockUserId,
      interviewId: 'int_123',
      problemIndex: 0,
      language: 'javascript',
      sourceCode: '// OUTPUT: 0 1\nconsole.log("0 1");'
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'sample-tests');
    assert.equal(result.passedCount, 1);
    assert.equal(result.totalCount, 1);
    assert.equal(result.allPassed, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].expectedOutput, '0 1');
  } finally {
    codingExecutionService.verifyInterviewAccess = origVerify;
  }
});

test('7. CodingExecutionService - Security, Ownership & 64KB Payload Limit', async () => {
  // Empty code rejection
  assert.throws(() => {
    codingExecutionService.validatePayload({
      sourceCode: '',
      language: 'c',
      interviewId: 'int_1',
      problemIndex: 0
    });
  }, { message: 'Source code cannot be empty' });

  // Exceeding 64KB rejection
  const oversizedCode = 'a'.repeat(MAX_CODE_SIZE_BYTES + 100);
  assert.throws(() => {
    codingExecutionService.validatePayload({
      sourceCode: oversizedCode,
      language: 'cpp',
      interviewId: 'int_1',
      problemIndex: 0
    });
  }, /exceeds maximum allowed size of 64KB/);
});

test('8. Execution Adapter - Fail-Closed Security Policy (No silent fallback to mock)', () => {
  const origProvider = process.env.CODE_EXECUTION_PROVIDER;
  const origEnabled = process.env.CODE_EXECUTION_ENABLED;

  try {
    // A. Rejection when CODE_EXECUTION_ENABLED = 'false'
    process.env.CODE_EXECUTION_ENABLED = 'false';
    assert.throws(() => {
      executionAdapter.getActiveProvider();
    }, { message: /disabled by administrator configuration/ });

    // B. Rejection when unknown provider specified (never silent fallback to mock!)
    process.env.CODE_EXECUTION_ENABLED = 'true';
    process.env.CODE_EXECUTION_PROVIDER = 'unknown-cloud-sandbox';
    assert.throws(() => {
      executionAdapter.getActiveProvider();
    }, { message: /never silently falling back to mock/i });
  } finally {
    process.env.CODE_EXECUTION_PROVIDER = origProvider;
    process.env.CODE_EXECUTION_ENABLED = origEnabled;
  }
});

test('9. CodingExecutionService - Bounded Concurrency Limit Guard', async () => {
  let executionCount = 0;
  // Test concurrency guard allows operations under limit
  const res = await codingExecutionService.withConcurrencyGuard(async () => {
    executionCount++;
    return 'success';
  });
  assert.equal(res, 'success');
  assert.equal(executionCount, 1);
});

test('10. TestCaseService - Outage Propagation (Never masks 503 as candidate failure)', async () => {
  const origExec = executionAdapter.execute;
  try {
    executionAdapter.execute = async () => {
      const err = new Error('Connection refused to remote Go-Judge sandbox at 10.0.0.5:5050');
      err.statusCode = 503;
      err.code = 'EXECUTION_PROVIDER_UNAVAILABLE';
      throw err;
    };

    await assert.rejects(async () => {
      await testCaseService.executeTestCases({
        language: 'python',
        sourceCode: 'print(1)',
        testCases: [{ input: '1', expectedOutput: '1' }]
      });
    }, { statusCode: 503, code: 'EXECUTION_PROVIDER_UNAVAILABLE' });
  } finally {
    executionAdapter.execute = origExec;
  }
});
