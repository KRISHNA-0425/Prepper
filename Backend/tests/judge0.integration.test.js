import test from 'node:test';
import assert from 'node:assert/strict';
import judge0Service, { JUDGE0_STATUS } from '../services/coding/judge0.service.js';

test('Judge0 Integration Test Suite (Local Self-Hosted Instance)', async (t) => {
  const health = await judge0Service.checkHealth();

  if (!health.healthy) {
    t.skip(`Skipping Judge0 integration tests: Local instance not reachable at ${judge0Service.baseUrl} (${health.error || 'Unavailable'}).`);
    return;
  }

  // 1. Language Retrieval
  await t.test('Integration: Retrieve supported languages from live instance', async () => {
    const languages = await judge0Service.getLanguages(true);
    assert.ok(Array.isArray(languages));
    assert.ok(languages.length > 0);

    const hasJs = languages.some((l) => l.slug === 'javascript');
    const hasPy = languages.some((l) => l.slug === 'python');
    assert.ok(hasJs, 'Judge0 must report JavaScript support');
    assert.ok(hasPy, 'Judge0 must report Python support');
  });

  // 2. JavaScript Execution
  await t.test('Integration: Execute JavaScript program', async () => {
    const result = await judge0Service.executeCode({
      sourceCode: 'console.log(7 * 6);',
      languageId: 63, // Node.js
    });

    assert.equal(result.passed, true);
    assert.equal(result.statusId, JUDGE0_STATUS.ACCEPTED);
    assert.equal(result.stdout.trim(), '42');
  });

  // 3. Python 3 Execution
  await t.test('Integration: Execute Python 3 program', async () => {
    const result = await judge0Service.executeCode({
      sourceCode: 'print(sum([1, 2, 3, 4, 5]))',
      languageId: 71, // Python 3
    });

    assert.equal(result.passed, true);
    assert.equal(result.statusId, JUDGE0_STATUS.ACCEPTED);
    assert.equal(result.stdout.trim(), '15');
  });

  // 4. C++ Compilation and Execution
  await t.test('Integration: Execute C++ program', async () => {
    const result = await judge0Service.executeCode({
      sourceCode: '#include <iostream>\nint main() { std::cout << "Hello C++\\n"; return 0; }',
      languageId: 54, // C++
    });

    assert.equal(result.passed, true);
    assert.equal(result.statusId, JUDGE0_STATUS.ACCEPTED);
    assert.equal(result.stdout.trim(), 'Hello C++');
  });

  // 5. Compilation Error Handling
  await t.test('Integration: Handle C++ compilation error', async () => {
    const result = await judge0Service.executeCode({
      sourceCode: 'int main() { INVALID_SYNTAX_ERROR return 0; }',
      languageId: 54,
    });

    assert.equal(result.statusId, JUDGE0_STATUS.COMPILATION_ERROR);
    assert.ok(result.compileOutput.length > 0);
  });

  // 6. Runtime Error Handling
  await t.test('Integration: Handle Python runtime exception', async () => {
    const result = await judge0Service.executeCode({
      sourceCode: 'raise ValueError("Simulated runtime failure")',
      languageId: 71,
    });

    assert.equal(result.passed, false);
    assert.ok(result.stderr.includes('ValueError'));
  });

  // 7. Timeout (Time Limit Exceeded)
  await t.test('Integration: Handle Time Limit Exceeded (TLE)', async () => {
    const result = await judge0Service.executeCode({
      sourceCode: 'while True: pass',
      languageId: 71,
      cpuTimeLimit: 1.0,
      wallTimeLimit: 2.0,
    });

    assert.equal(result.passed, false);
    assert.equal(result.statusId, JUDGE0_STATUS.TIME_LIMIT_EXCEEDED);
  });
});
