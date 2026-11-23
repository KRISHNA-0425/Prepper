import test from 'node:test';
import assert from 'node:assert/strict';
import codingExecutionService from '../services/coding/codingExecution.service.js';
import testCaseService from '../services/coding/testCase.service.js';
import judge0Service, { JUDGE0_STATUS } from '../services/coding/judge0.service.js';

test('Coding API - Run Code visible test cases flow', async (t) => {
  // Mock interview object
  const mockUserId = 'user_abc123';
  const mockInterview = {
    _id: 'interview_xyz789',
    userId: mockUserId,
    status: 'Incompleted',
    expiresAt: new Date(Date.now() + 3600000),
    codingProblems: [
      {
        problemId: 'prob_1',
        title: 'Two Sum Target',
        visibleTestCases: [
          { input: '2 7 11 15\n9', expectedOutput: '0 1', isHidden: false },
        ],
        hiddenTestCases: [
          { input: 'SECRET_INPUT_99', expectedOutput: 'SECRET_OUTPUT_99', isHidden: true },
        ],
      },
    ],
  };

  // Temporarily stub verifyInterviewAccess
  const originalVerify = codingExecutionService.verifyInterviewAccess;
  codingExecutionService.verifyInterviewAccess = async () => mockInterview;

  // Temporarily stub testCaseService.executeTestCases
  const originalExecute = testCaseService.executeTestCases;
  testCaseService.executeTestCases = async ({ testCases }) => {
    // Verify that runCode only sent visible test cases (1 test case, not hidden!)
    assert.equal(testCases.length, 1);
    assert.equal(testCases[0].isHidden, false);

    return {
      passedCount: 1,
      totalCount: 1,
      allPassed: true,
      maxTimeMs: 15,
      maxMemoryKb: 1024,
      results: [
        {
          testCaseIndex: 1,
          passed: true,
          input: testCases[0].input,
          expectedOutput: testCases[0].expectedOutput,
          actualOutput: '0 1',
          executionTimeMs: 15,
          memoryKb: 1024,
          statusDescription: 'Accepted',
          isHidden: false,
        },
      ],
    };
  };

  try {
    const result = await codingExecutionService.runCode({
      userId: mockUserId,
      interviewId: 'interview_xyz789',
      problemIndex: 0,
      languageId: 63,
      language: 'javascript',
      sourceCode: 'console.log("0 1");',
    });

    assert.equal(result.success, true);
    assert.equal(result.passedCount, 1);
    assert.equal(result.totalCount, 1);
    assert.equal(result.allPassed, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].passed, true);
  } finally {
    codingExecutionService.verifyInterviewAccess = originalVerify;
    testCaseService.executeTestCases = originalExecute;
  }
});

test('Coding API - Ownership and lifecycle access controls', async () => {
  // Test completed interview rejection
  const completedInterview = {
    _id: 'int_1',
    userId: 'user_owner',
    status: 'Completed',
  };

  const originalFindById = (await import('../models/interview.model.js')).default.findById;
  (await import('../models/interview.model.js')).default.findById = async () => completedInterview;

  try {
    await assert.rejects(
      async () => {
        await codingExecutionService.verifyInterviewAccess('int_1', 'user_owner');
      },
      { message: 'Interview session has already been completed' }
    );
  } finally {
    (await import('../models/interview.model.js')).default.findById = originalFindById;
  }

  // Test unauthorized user rejection
  const activeInterview = {
    _id: 'int_2',
    userId: 'user_owner',
    status: 'Incompleted',
  };

  (await import('../models/interview.model.js')).default.findById = async () => activeInterview;

  try {
    await assert.rejects(
      async () => {
        await codingExecutionService.verifyInterviewAccess('int_2', 'user_stranger');
      },
      { message: 'Unauthorized: You do not own this interview session' }
    );
  } finally {
    (await import('../models/interview.model.js')).default.findById = originalFindById;
  }
});
