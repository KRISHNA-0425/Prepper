import test from 'node:test';
import assert from 'node:assert/strict';
import { Judge0Service, encodeBase64, decodeBase64, JUDGE0_STATUS, DEFAULT_LANGUAGE_CATALOG } from '../services/coding/judge0.service.js';
import testCaseService from '../services/coding/testCase.service.js';
import codeEvaluationService from '../services/coding/codeEvaluation.service.js';
import codingExecutionService, { MAX_CODE_SIZE_BYTES } from '../services/coding/codingExecution.service.js';

test('1. Base64 encoding and decoding helpers', () => {
  const sample = 'console.log("Hello, Prepper AI!");\n';
  const encoded = encodeBase64(sample);
  const decoded = decodeBase64(encoded);

  assert.equal(decoded, sample);
  assert.equal(encodeBase64(''), '');
  assert.equal(decodeBase64(''), '');
  assert.equal(decodeBase64(null), '');
});

test('2. TestCaseService - Output normalization and comparison', () => {
  // Whitespace and CRLF normalization
  const out1 = '42\r\n';
  const out2 = '42   \n';
  assert.equal(testCaseService.normalizeOutput(out1), '42');
  assert.equal(testCaseService.normalizeOutput(out2), '42');
  assert.equal(testCaseService.compareOutputs(out1, out2), true);

  // Numeric float tolerance
  assert.equal(testCaseService.compareOutputs('3.1415926', '3.141593'), true);
  assert.equal(testCaseService.compareOutputs('100.0', '100'), true);
  assert.equal(testCaseService.compareOutputs('hello', 'world'), false);
});

test('3. TestCaseService - Hidden test case masking for client security', () => {
  const rawResults = [
    {
      testCaseIndex: 1,
      passed: true,
      input: '2 7 11 15\n9',
      expectedOutput: '0 1',
      actualOutput: '0 1',
      executionTimeMs: 12,
      memoryKb: 2048,
      statusDescription: 'Accepted',
      isHidden: false,
    },
    {
      testCaseIndex: 2,
      passed: false,
      input: 'SECRET_HIDDEN_INPUT_9999',
      expectedOutput: 'SECRET_EXPECTED_RESULT_9999',
      actualOutput: 'WRONG_ANSWER',
      executionTimeMs: 15,
      memoryKb: 2048,
      statusDescription: 'Wrong Answer',
      isHidden: true,
    },
  ];

  const sanitized = testCaseService.sanitizeResultsForClient(rawResults);

  // Visible test case retains details
  assert.equal(sanitized[0].input, '2 7 11 15\n9');
  assert.equal(sanitized[0].expectedOutput, '0 1');
  assert.equal(sanitized[0].isHidden, false);

  // Hidden test case inputs and expected outputs are strictly masked
  assert.equal(sanitized[1].input, '[HIDDEN TEST CASE]');
  assert.equal(sanitized[1].expectedOutput, '[HIDDEN EXPECTED OUTPUT]');
  assert.equal(sanitized[1].actualOutput, '[HIDDEN ACTUAL OUTPUT]');
  assert.equal(sanitized[1].isHidden, true);
});

test('4. CodeEvaluationService - Deterministic fallback calculation', () => {
  const fallback = codeEvaluationService.generateFallbackEvaluation({
    passedTestCases: 4,
    totalTestCases: 5,
    sourceCode: 'function solve(nums) { for (let n of nums) {} return 0; }',
    language: 'javascript',
    problem: { title: 'Array Challenge' },
  });

  assert.equal(fallback.status, 'completed');
  assert.equal(fallback.correctness, 80);
  assert.equal(typeof fallback.score, 'number');
  assert.equal(fallback.timeComplexity, 'O(n)');
  assert.ok(fallback.strengths.length > 0);
  assert.ok(fallback.weaknesses.length > 0);
});

test('5. CodingExecutionService - Payload and size limits validation', () => {
  // Empty source code
  assert.throws(
    () => {
      codingExecutionService.validatePayload({
        sourceCode: '   ',
        languageId: 63,
        interviewId: 'mock_id',
        problemIndex: 0,
      });
    },
    { message: 'Source code cannot be empty' }
  );

  // Exceeds 64KB limit
  const hugeCode = 'x'.repeat(MAX_CODE_SIZE_BYTES + 100);
  assert.throws(
    () => {
      codingExecutionService.validatePayload({
        sourceCode: hugeCode,
        languageId: 63,
        interviewId: 'mock_id',
        problemIndex: 0,
      });
    },
    /exceeds maximum allowed size of 64KB/
  );

  // Valid payload passes without throwing
  assert.doesNotThrow(() => {
    codingExecutionService.validatePayload({
      sourceCode: 'console.log("ok");',
      languageId: 63,
      interviewId: 'mock_id',
      problemIndex: 0,
    });
  });
});

test('6. Judge0Service - Default language catalog metadata fallback', async () => {
  const service = new Judge0Service('http://127.0.0.1:9999'); // Non-existent port to test fallback
  const languages = await service.getLanguages();

  assert.ok(Array.isArray(languages));
  assert.ok(languages.length >= 6);

  const js = languages.find((l) => l.slug === 'javascript');
  const py = languages.find((l) => l.slug === 'python');
  const cpp = languages.find((l) => l.slug === 'cpp');

  assert.ok(js && js.id === 63);
  assert.ok(py && py.id === 71);
  assert.ok(cpp && cpp.id === 54);
});
